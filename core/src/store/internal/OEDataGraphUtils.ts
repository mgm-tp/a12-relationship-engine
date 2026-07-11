/*
 * SPDX-License-Identifier: EUPL-1.2 OR LicenseRef-commercial
 *
 * Copyright (c) 2012-2026 mgm technology partners GmbH
 *
 * Dual License
 * ------------
 * This source file is part of the mgm A12 Platform and available under
 * a choice of two different licenses:
 *
 * 1. Open-Source License - EUPL v1.2
 *    You may redistribute and/or modify this file under the terms of the
 *    European Union Public License, version 1.2 - see https://eupl.eu/.
 *
 * 2. Commercial License
 *    Alternatively, you may obtain a commercial license from
 *    mgm technology partners GmbH, that permits use of this software
 *    under different terms (including support and maintenance services).
 *
 *    Please contact a12-license@mgm-tp.com for more information.
 *
 * You must select and comply with exactly one of the above license options.
 *
 * Warranty Disclaimer (applies to either option)
 * ----------------------------------------------
 * THIS SOFTWARE IS PROVIDED "AS IS" AND WITHOUT WARRANTY OF ANY KIND,
 * WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NON-INFRINGEMENT, EXCEPT WHERE SUCH DISCLAIMERS ARE HELD TO BE
 * LEGALLY INVALID. SEE THE RESPECTIVE LICENSE TEXT FOR DETAILS.
 */

import type { JSONDocument } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import { DataGraph as OEDataGraph } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import type { Relationship, RelationshipModel } from "@com.mgmtp.a12.dataservices/dataservices-access";

import type { DocumentGraph } from "./state.js";
import type { ChangelogSelectors } from "./selectors/changelog.js";

/**
 * Centralized utility namespace for all OE Link operations.
 *
 * The OE Link is an experimental API. All traversal, querying, and
 * extension logic is consolidated here so that future OE API changes
 * require updating only this module.
 * @internal
 */
export namespace OEDataGraphUtils {
	export function findLinkEntry(
		oeDataGraph: OEDataGraph,
		params: {
			readonly relationshipModel: string;
			readonly source: { readonly role: string; readonly docRef: string };
			readonly target: { readonly role: string; readonly docRef: string };
		}
	): [Relationship.LinkRef, JSONDocument | undefined] | [undefined, undefined] {
		const hit = OEDataGraph.findEntryByEntities({
			relationship: params.relationshipModel,
			source: params.source,
			target: params.target
		})(oeDataGraph);

		if (!hit) {
			return [undefined, undefined];
		}

		const linkRef: Relationship.LinkRef = {
			id: hit.entry.linkId,
			linkDescriptor: {
				relationshipModel: params.relationshipModel,
				entities: [
					{ role: params.source.role, docRef: params.source.docRef },
					{ role: params.target.role, docRef: params.target.docRef }
				]
			}
		};

		return [linkRef, findLinkDocument(oeDataGraph, hit.entry.linkId)];
	}

	/**
	 * Looks up a link entry by ID with a direct-lookup-first, fallback-scan strategy.
	 * The fallback scan handles exclude mode where OE indexes by the listed (target) entity.
	 * TODO: replace fallback scan once OE exposes a lens-based ID lookup API.
	 */
	export function findLinkEntryById(
		oeDataGraph: OEDataGraph,
		linkId: string,
		sourceRole: string,
		sourceDocRef: string,
		relationshipName: string,
		targetRole: string
	): [Relationship.LinkRef, JSONDocument | undefined] | [undefined, undefined] {
		// Direct lookup: works in normal mode where sourceDocRef is the OE index key.
		const directEntry =
			oeDataGraph.links?.linksBySourceId[sourceDocRef]?.[relationshipName]?.[targetRole]?.linkEntries?.[linkId];

		if (directEntry) {
			const linkRef: Relationship.LinkRef = {
				id: linkId,
				linkDescriptor: {
					relationshipModel: relationshipName,
					entities: [
						{ role: sourceRole, docRef: sourceDocRef },
						{ role: targetRole, docRef: directEntry.targetDocRef }
					]
				}
			};

			return [linkRef, oeDataGraph.links?.documentsById[directEntry.targetDocRef]];
		}

		// Fallback scan: handles exclude mode where the OE indexes by the target (listed) entity.
		const links = oeDataGraph.links;

		if (!links) {
			return [undefined, undefined];
		}

		for (const [candidateDocRef, relationships] of Object.entries(links.linksBySourceId)) {
			const linkEntry = relationships?.[relationshipName]?.[targetRole]?.linkEntries?.[linkId];

			if (!linkEntry) {
				continue;
			}

			const linkRef: Relationship.LinkRef = {
				id: linkId,
				linkDescriptor: {
					relationshipModel: relationshipName,
					entities: [
						{ role: sourceRole, docRef: sourceDocRef },
						{ role: targetRole, docRef: candidateDocRef }
					]
				}
			};

			return [linkRef, links.documentsById[linkEntry.targetDocRef]];
		}

		return [undefined, undefined];
	}

	export function findLinkDocument(oeDataGraph: OEDataGraph, linkId: string): JSONDocument | undefined {
		const links = oeDataGraph.links;

		if (!links) {
			return undefined;
		}

		for (const relationships of Object.values(links.linksBySourceId)) {
			for (const roles of Object.values(relationships ?? {})) {
				for (const slot of Object.values(roles ?? {})) {
					const linkEntry = slot?.linkEntries?.[linkId];

					if (linkEntry) {
						return links.documentsById[linkEntry.targetDocRef];
					}
				}
			}
		}

		return undefined;
	}

	export function patchLinks(
		oeDataGraph: OEDataGraph,
		addedLinks: readonly ChangelogSelectors.AddedLinkDetail[],
		targetRole: string,
		relationshipModel: RelationshipModel
	): OEDataGraph {
		if (addedLinks.length === 0) {
			return oeDataGraph;
		}

		const { linkDocumentModel } = relationshipModel.content;

		const targetEntityCharacteristics = relationshipModel.content.entityCharacteristics.find(
			(e) => e.role === targetRole
		);

		if (!targetEntityCharacteristics) {
			return oeDataGraph;
		}

		let dataGraph: OEDataGraph = oeDataGraph;
		const linkDocEntries: { docRef: string; document: JSONDocument }[] = [];

		for (const added of addedLinks) {
			const { linkDescriptor } = added.linkRef;

			const targetEntity = linkDescriptor.entities.find((e) => e.role === targetRole);

			if (!targetEntity) {
				continue;
			}

			dataGraph = OEDataGraph.patchLinks(
				{
					sourceDocRef: targetEntity.docRef,
					relationship: linkDescriptor.relationshipModel,
					targetRole,
					type: "CHILD"
				},
				{
					linkId: added.linkId,
					targetDocRef: targetEntity.docRef,
					documentModelName: targetEntityCharacteristics.documentModel
				}
			)(dataGraph);

			if (added.linkDocument && linkDocumentModel) {
				dataGraph = OEDataGraph.patchLinks(
					{
						sourceDocRef: targetEntity.docRef,
						relationship: linkDescriptor.relationshipModel,
						targetRole,
						type: "LINK"
					},
					{
						linkId: added.linkId,
						targetDocRef: added.linkId,
						documentModelName: linkDocumentModel
					}
				)(dataGraph);

				linkDocEntries.push({ docRef: added.linkId, document: added.linkDocument as JSONDocument });
			}
		}

		if (linkDocEntries.length > 0) {
			dataGraph = OEDataGraph.patchLinkDocuments(linkDocEntries)(dataGraph);
		}

		return dataGraph;
	}

	export function patchLinkDocuments(oeDataGraph: OEDataGraph, documentGraph: DocumentGraph): OEDataGraph {
		const entries: { docRef: string; document: JSONDocument }[] = [];

		for (const link of Object.values(documentGraph.links.byId)) {
			const { linkDocRef } = link;

			if (!linkDocRef) {
				continue;
			}

			const dgDoc = documentGraph.documents.byDocRef[linkDocRef];

			if (dgDoc?.loadingState !== "loaded") {
				continue;
			}

			// Cannot be type guarded because link document has different handling so it doesn't come with a default id & modelId prop
			const linkDocument = dgDoc.document as JSONDocument;
			entries.push({ docRef: linkDocRef, document: linkDocument });
			const linkId = link.linkRef.id;

			if (linkId !== linkDocRef) {
				entries.push({ docRef: linkId, document: linkDocument });
			}
		}

		if (entries.length === 0) {
			return oeDataGraph;
		}

		return OEDataGraph.patchLinkDocuments(entries)(oeDataGraph);
	}

	export function patchDocuments(oeDataGraph: OEDataGraph, documentGraph: DocumentGraph): OEDataGraph {
		const entries: JSONDocument[] = [];

		for (const jsonDocument of oeDataGraph.documents) {
			if (!jsonDocument) {
				continue;
			}

			const docRef = jsonDocument.id;

			if (
				documentGraph.documents.byDocRef[docRef] &&
				documentGraph.documents.byDocRef[docRef].loadingState === "loaded"
			) {
				entries.push(jsonDocument);
			}
		}

		if (entries.length === 0) {
			return oeDataGraph;
		}

		return OEDataGraph.patchDocuments(entries)(oeDataGraph);
	}
}

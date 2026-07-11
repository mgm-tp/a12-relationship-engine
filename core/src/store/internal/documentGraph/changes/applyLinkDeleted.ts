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

import { DocumentGraph, type Changelog } from "../../state.js";

function removeLinkFromIndex(
	linkIdsByDocId: { [docId: string]: string[] | undefined },
	docRefs: string[],
	linkId: string
): { [docId: string]: string[] | undefined } {
	const updated: { [docId: string]: string[] | undefined } = { ...linkIdsByDocId };

	for (const docRef of docRefs) {
		const list = updated[docRef];

		if (!list) {
			continue;
		}

		const filtered = list.filter((id) => id !== linkId);

		if (filtered.length === 0) {
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
			delete updated[docRef];
		} else {
			updated[docRef] = filtered;
		}
	}

	return updated;
}

function removeLinkDocumentNode(
	byDocRef: DocumentGraph.Documents["byDocRef"],
	linkDocRef: string | null | undefined
): DocumentGraph.Documents["byDocRef"] {
	if (!linkDocRef || !(linkDocRef in byDocRef)) {
		return byDocRef;
	}

	const { [linkDocRef]: _removed, ...remaining } = byDocRef;

	return remaining;
}

function pruneOrphanedDocuments(
	byDocRef: DocumentGraph.Documents["byDocRef"],
	orphanedDocRefs: Set<string>
): Record<string, DocumentGraph.Document> {
	const prunedByDocRef: Record<string, DocumentGraph.Document> = {};

	for (const [docRef, doc] of Object.entries(byDocRef)) {
		if (!orphanedDocRefs.has(docRef)) {
			prunedByDocRef[docRef] = doc;
		}
	}

	return prunedByDocRef;
}

function rebuildLinksAfterPruning(
	linksById: DocumentGraph.LinksById,
	orphanedLinkIds: Set<string>
): { byId: DocumentGraph.LinksById; linkIdsByDocId: { [docId: string]: string[] | undefined } } {
	const byId: DocumentGraph.LinksById = {};
	const linkIdsByDocId: { [docId: string]: string[] | undefined } = {};

	for (const [linkId, link] of Object.entries(linksById)) {
		if (orphanedLinkIds.has(linkId)) {
			continue;
		}

		byId[linkId] = link;
		const entityDocRefs = link.linkRef.linkDescriptor.entities
			.map((entity) => entity.docRef)
			.filter((docRef): docRef is string => !!docRef);

		for (const docRef of entityDocRefs) {
			const existing = linkIdsByDocId[docRef];

			if (existing) {
				existing.push(linkId);
			} else {
				linkIdsByDocId[docRef] = [linkId];
			}
		}
	}

	return { byId, linkIdsByDocId };
}

function collectOrphanedSubtree(
	links: DocumentGraph.Links,
	documents: DocumentGraph.Documents,
	targetDocRefs: string[]
): { orphanedDocRefs: Set<string>; orphanedLinkIds: Set<string> } {
	const orphanedDocRefs = new Set<string>();
	const orphanedLinkIds = new Set<string>();
	const visited = new Set<string>();

	const queue = targetDocRefs.filter((docRef) => docRef !== DocumentGraph.ROOT_DOC_REF);

	while (queue.length > 0) {
		const docRef = queue.shift();

		if (!docRef) {
			break;
		}

		if (visited.has(docRef) || docRef === DocumentGraph.ROOT_DOC_REF) {
			continue;
		}

		visited.add(docRef);

		if (!(docRef in documents.byDocRef)) {
			continue;
		}

		const docLinkIds = links.linkIdsByDocId[docRef];

		let hasExternalIncoming = false;

		if (docLinkIds) {
			for (const linkId of docLinkIds) {
				if (orphanedLinkIds.has(linkId)) {
					continue;
				}

				const link = links.byId[linkId];

				if (!link) {
					continue;
				}

				const entities = link.linkRef.linkDescriptor.entities;
				const isTarget = entities.some((entity, i) => i > 0 && entity.docRef === docRef);

				if (!isTarget) {
					continue;
				}

				const sourceDocRef = entities[0]?.docRef;

				if (sourceDocRef && !orphanedDocRefs.has(sourceDocRef)) {
					hasExternalIncoming = true;
					break;
				}
			}
		}

		if (hasExternalIncoming) {
			continue;
		}

		orphanedDocRefs.add(docRef);

		if (!docLinkIds) {
			continue;
		}

		for (const linkId of docLinkIds) {
			if (orphanedLinkIds.has(linkId)) {
				continue;
			}

			const link = links.byId[linkId];

			if (!link) {
				continue;
			}

			orphanedLinkIds.add(linkId);

			if (link.linkDocRef) {
				orphanedDocRefs.add(link.linkDocRef);
			}

			for (const entity of link.linkRef.linkDescriptor.entities) {
				if (entity.docRef && !visited.has(entity.docRef) && !orphanedDocRefs.has(entity.docRef)) {
					queue.push(entity.docRef);
				}
			}
		}
	}

	return { orphanedDocRefs, orphanedLinkIds };
}

/** @internal */
export function applyLinkDeleted(documentGraph: DocumentGraph, change: Changelog.LinkDeleted): DocumentGraph {
	const { linkId, linkRef } = change;

	if (!(linkId in documentGraph.links.byId)) {
		return documentGraph;
	}

	const { [linkId]: removedLink, ...remaining } = documentGraph.links.byId;

	const docRefs = linkRef.linkDescriptor.entities
		.map((entity) => entity.docRef)
		.filter((docRef): docRef is string => !!docRef);

	const linkIdsByDocId = removeLinkFromIndex(documentGraph.links.linkIdsByDocId, docRefs, linkId);

	const byDocRef = removeLinkDocumentNode(documentGraph.documents.byDocRef, removedLink.linkDocRef);

	const updatedLinks: DocumentGraph.Links = { byId: remaining, linkIdsByDocId };
	const updatedDocuments: DocumentGraph.Documents = { byDocRef };

	const targetDocRefs = linkRef.linkDescriptor.entities
		.filter((_entity, i) => i > 0)
		.map((entity) => entity.docRef)
		.filter((docRef): docRef is string => !!docRef);

	const { orphanedDocRefs, orphanedLinkIds } = collectOrphanedSubtree(updatedLinks, updatedDocuments, targetDocRefs);

	if (orphanedDocRefs.size === 0 && orphanedLinkIds.size === 0) {
		return {
			...documentGraph,
			documents: updatedDocuments,
			links: updatedLinks
		};
	}

	const prunedByDocRef = pruneOrphanedDocuments(byDocRef, orphanedDocRefs);
	const { byId: prunedById, linkIdsByDocId: prunedLinkIdsByDocId } = rebuildLinksAfterPruning(
		remaining,
		orphanedLinkIds
	);

	return {
		...documentGraph,
		documents: { byDocRef: prunedByDocRef },
		links: { byId: prunedById, linkIdsByDocId: prunedLinkIdsByDocId }
	};
}

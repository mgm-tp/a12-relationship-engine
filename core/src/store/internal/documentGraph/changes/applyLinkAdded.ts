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

import type { ReferencedModel } from "@com.mgmtp.a12.client/client-core";
import type { ModelGraph } from "@com.mgmtp.a12.dataservices/dataservices-access";

import { pipe } from "../lenses/lensUtils.js";
import type { Changelog, DocumentGraph } from "../../state.js";
// eslint-disable-next-line no-restricted-imports
import { generateLinkDocDocRef } from "../../../../internal/documentGraph/core/impl/links.js";
import { byIdLens, byDocRefLens, linkIdsByDocIdLens } from "../lenses/documentGraphLenses.js";

import { getLinkDocumentModelNameFromGraph } from "./shared/getLinkDocumentModelNameFromGraph.js";

/** @internal */
export function applyLinkAdded(
	documentGraph: DocumentGraph,
	change: Changelog.LinkAdded,
	_modelsInScene: ReferencedModel.Instance[],
	modelGraph?: ModelGraph
): DocumentGraph {
	const { linkId, linkDocument, linkRef } = change;

	const docRefs = collectInvolvedDocRefs(change);
	const existingLink = documentGraph.links.byId[linkId];
	const linkDocRef = resolveLinkDocRef(linkId, linkDocument, existingLink);
	const newLink = createOrUpdateLink(change, linkDocRef, existingLink);

	const updatedLinkIdsByDocId = appendLinkIdToInvolvedDocs(documentGraph.links.linkIdsByDocId, docRefs, linkId);

	let updatedByDocRef = ensurePlaceholderDocumentNodes(documentGraph.documents.byDocRef, docRefs);

	if (linkDocument && linkDocRef) {
		const linkDocumentModelName = resolveLinkDocumentModelName(
			updatedByDocRef,
			linkDocRef,
			linkRef.linkDescriptor.relationshipModel,
			modelGraph
		);

		if (!linkDocumentModelName) {
			return documentGraph;
		}

		updatedByDocRef = {
			...updatedByDocRef,
			[linkDocRef]: {
				docRef: linkDocRef,
				document: linkDocument,
				documentModelName: linkDocumentModelName,
				loadingState: "loaded"
			}
		};
	}

	return assembleGraph(documentGraph, linkId, newLink, updatedLinkIdsByDocId, updatedByDocRef);
}

function collectInvolvedDocRefs(change: Changelog.LinkAdded): string[] {
	return change.linkRef.linkDescriptor.entities
		.map((entity) => entity.docRef)
		.filter((docRef): docRef is string => !!docRef);
}

function resolveLinkDocRef(
	linkId: string,
	linkDocument: object | undefined,
	existingLink: DocumentGraph.Link | undefined
): string | null | undefined {
	return existingLink?.linkDocRef ?? (linkDocument ? generateLinkDocDocRef(linkId) : undefined);
}

function createOrUpdateLink(
	change: Changelog.LinkAdded,
	linkDocRef: string | null | undefined,
	existingLink: DocumentGraph.Link | undefined
): DocumentGraph.Link {
	return {
		linkRef: change.linkRef,
		...(linkDocRef !== undefined ? { linkDocRef } : {})
	};
}

function appendLinkIdToInvolvedDocs(
	linkIdsByDocId: { [docId: string]: string[] | undefined },
	docRefs: string[],
	linkId: string
): { [docId: string]: string[] | undefined } {
	const updated = { ...linkIdsByDocId };

	for (const docRef of docRefs) {
		const list = updated[docRef] ? [...updated[docRef]] : [];

		if (!list.includes(linkId)) {
			list.push(linkId);
		}

		updated[docRef] = list;
	}

	return updated;
}

function ensurePlaceholderDocumentNodes(
	byDocRef: Record<string, DocumentGraph.Document>,
	docRefs: string[]
): Record<string, DocumentGraph.Document> {
	const updated = { ...byDocRef };

	for (const docRef of docRefs) {
		if (!updated[docRef]) {
			updated[docRef] = { docRef, loadingState: "missing" };
		}
	}

	return updated;
}

function resolveLinkDocumentModelName(
	byDocRef: Record<string, DocumentGraph.Document>,
	linkDocRef: string,
	relationshipModelId: string,
	modelGraph: ModelGraph | undefined
): string | undefined {
	const existingNode = byDocRef[linkDocRef];

	if (existingNode && existingNode.loadingState === "loaded") {
		return existingNode.documentModelName;
	}

	return getLinkDocumentModelNameFromGraph(relationshipModelId, modelGraph);
}

function assembleGraph(
	documentGraph: DocumentGraph,
	linkId: string,
	newLink: DocumentGraph.Link,
	updatedLinkIdsByDocId: { [docId: string]: string[] | undefined },
	updatedByDocRef: Record<string, DocumentGraph.Document>
): DocumentGraph {
	return pipe(
		documentGraph,
		byDocRefLens.set(updatedByDocRef),
		byIdLens.set({ ...documentGraph.links.byId, [linkId]: newLink }),
		linkIdsByDocIdLens.set(updatedLinkIdsByDocId)
	);
}

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

import { pipe } from "../lenses/lensUtils.js";
import { DocumentGraph, type Changelog } from "../../state.js";
import { byIdLens, byDocRefLens, linkIdsByDocIdLens } from "../lenses/documentGraphLenses.js";

/** @internal */
export function applySubDocumentGraphAdded(
	documentGraph: DocumentGraph,
	change: Changelog.SubDocumentGraphAdded
): DocumentGraph {
	const mergedByDocRef = mergeDocumentsExcludingRoot(documentGraph.documents.byDocRef, change.documents);
	const mergedLinksById = mergeLinks(documentGraph.links.byId, change.links);
	const rebuiltLinkIdsByDocId = rebuildLinkIdsByDocId(mergedLinksById);

	return pipe(
		documentGraph,
		byDocRefLens.set(mergedByDocRef),
		byIdLens.set(mergedLinksById),
		linkIdsByDocIdLens.set(rebuiltLinkIdsByDocId)
	);
}

function mergeDocumentsExcludingRoot(
	existing: Readonly<Record<string, DocumentGraph.Document>>,
	incoming: Readonly<Record<string, DocumentGraph.Document>>
): Record<string, DocumentGraph.Document> {
	const merged: Record<string, DocumentGraph.Document> = { ...existing };

	for (const [docRef, document] of Object.entries(incoming)) {
		if (docRef === DocumentGraph.ROOT_DOC_REF) {
			continue;
		}

		merged[docRef] = document;
	}

	return merged;
}

function mergeLinks(
	existing: DocumentGraph.LinksById,
	incoming: ReadonlyArray<DocumentGraph.Link>
): DocumentGraph.LinksById {
	const merged: DocumentGraph.LinksById = { ...existing };

	for (const incomingLink of incoming) {
		const linkId = incomingLink.linkRef.id;
		const existingLink = merged[linkId];

		if (!existingLink) {
			merged[linkId] = incomingLink;
			continue;
		}

		merged[linkId] = {
			linkRef: incomingLink.linkRef,
			linkDocRef: incomingLink.linkDocRef ?? existingLink.linkDocRef
		};
	}

	return merged;
}

function rebuildLinkIdsByDocId(linksById: DocumentGraph.LinksById): { [docId: string]: string[] | undefined } {
	const linkIdsByDocId: { [docId: string]: string[] | undefined } = {};

	for (const link of Object.values(linksById)) {
		const [firstEntity, secondEntity] = link.linkRef.linkDescriptor.entities;
		appendLinkId(linkIdsByDocId, firstEntity?.docRef, link.linkRef.id);
		appendLinkId(linkIdsByDocId, secondEntity?.docRef, link.linkRef.id);
	}

	return linkIdsByDocId;
}

function appendLinkId(
	linkIdsByDocId: { [docId: string]: string[] | undefined },
	docRef: string | undefined,
	linkId: string
): void {
	if (!docRef) {
		return;
	}

	linkIdsByDocId[docRef] = (linkIdsByDocId[docRef] ?? []).concat(linkId);
}

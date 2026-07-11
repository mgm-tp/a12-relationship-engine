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

import type { Lens } from "@com.mgmtp.a12.client/client-core";

import type { DocumentGraph } from "../../state.js";

import { atKey, compose } from "./lensUtils.js";

/** @internal */
export const byDocRefLens: Lens<DocumentGraph, Record<string, DocumentGraph.Document>> = {
	get: (graph) => graph.documents.byDocRef,
	set: (newByDocRef) => (graph) => ({
		...graph,
		documents: { ...graph.documents, byDocRef: newByDocRef }
	})
};

/** @internal */
export const byIdLens: Lens<DocumentGraph, DocumentGraph.LinksById> = {
	get: (graph) => graph.links.byId,
	set: (newById) => (graph) => ({
		...graph,
		links: { ...graph.links, byId: newById }
	})
};

/** @internal */
export const linkIdsByDocIdLens: Lens<DocumentGraph, { [docId: string]: string[] | undefined }> = {
	get: (graph) => graph.links.linkIdsByDocId,
	set: (newLinkIdsByDocId) => (graph) => ({
		...graph,
		links: { ...graph.links, linkIdsByDocId: newLinkIdsByDocId }
	})
};

/** @internal */
export function documentLens(docRef: string): Lens<DocumentGraph, DocumentGraph.Document | undefined> {
	return compose(byDocRefLens, atKey<DocumentGraph.Document | undefined>(docRef, undefined));
}

/** @internal */
export function linkLens(linkId: string): Lens<DocumentGraph, DocumentGraph.Link | undefined> {
	return compose(byIdLens, atKey<DocumentGraph.Link | undefined>(linkId, undefined));
}

/** @internal */
export function linkIdsForDocLens(docRef: string): Lens<DocumentGraph, string[] | undefined> {
	return compose(linkIdsByDocIdLens, atKey<string[] | undefined>(docRef, undefined));
}

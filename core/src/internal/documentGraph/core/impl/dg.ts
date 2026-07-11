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

/**
 * @packageDocumentation
 * @module documentGraph/core
 * @experimental
 */
import { merge } from "lodash-es";

import type { DgChange } from "../slices.js";
import type { DeepReadonly } from "../utilityTypes.js";
import type { DgMerged } from "../changeLog/changeLog.js";
import type { DgDocument, DocumentGraph } from "../documentGraph.js";

/**
 * @returns a new {@link DocumentGraph}
 */
export function createDG(): DeepReadonly<DocumentGraph> {
	return {
		documents: {
			byDocRef: {}
		},
		links: {
			byId: {},
			linkIdsByDocId: {}
		}
	};
}

/**
 * The docs and links of the `partialDg` DG is merged with the `dg` DG (first argument).
 * The merging handles the case where docs or links exist in both DGs; in this case the
 * doc properties of `partialDg` takes precedence, like loadingStates. Thus, we mean more a "merge into".
 */
export function mergeInto(args: {
	dg: DeepReadonly<DocumentGraph>;
	partialDg: DeepReadonly<DocumentGraph>;
}): [DeepReadonly<DocumentGraph>, DgChange[]] {
	const { dg, partialDg } = args;
	// First merge documents including a merge of the internal structures
	let docs = dg.documents.byDocRef;
	const partDocs = partialDg.documents.byDocRef;

	for (const docId in partDocs) {
		if (Object.prototype.hasOwnProperty.call(partDocs, docId)) {
			docs = {
				...docs,
				[docId]: mergeDgDocument({ doc: docs[docId], newDoc: partDocs[docId] })
			};
		}
	}

	// then merge links
	const byId = { ...partialDg.links.byId, ...dg.links.byId };

	let linkIdsByDocId = dg.links.linkIdsByDocId as { [docId: string]: string[] };
	const partLinkIdsByDocId = partialDg.links.linkIdsByDocId;

	for (const docId in partLinkIdsByDocId) {
		if (Object.prototype.hasOwnProperty.call(partLinkIdsByDocId, docId)) {
			const mergedList = [...(partialDg.links.linkIdsByDocId[docId] ?? []), ...(linkIdsByDocId[docId] ?? [])];
			const sortedList = mergedList.sort((a, b) => byId[a].rank - byId[b].rank);

			linkIdsByDocId = {
				...linkIdsByDocId,
				[docId]: sortedList
			};
		}
	}

	const change: DgMerged = { kind: "dgMerged" };

	return [
		{
			documents: {
				byDocRef: docs
			},
			links: {
				// Note about order : same as above
				byId,
				linkIdsByDocId
			}
		},
		[change]
	];

	function mergeDgDocument(p: {
		doc: DeepReadonly<DgDocument> | undefined;
		newDoc: DeepReadonly<DgDocument>;
	}): DeepReadonly<DgDocument> {
		const { doc, newDoc } = p;

		if (doc === undefined) {
			return newDoc;
		}

		// merge docs if both are loaded, values from newDoc take precedence
		if (doc.loadingState === "loaded" && newDoc.loadingState === "loaded") {
			return merge({}, doc, newDoc);
		}

		// old doc wins if loaded and newDoc not yet loaded
		if (doc.loadingState === "loaded" && newDoc.loadingState !== "loaded") {
			return doc;
		}

		// new wins if it has "better" loadingState
		switch (newDoc.loadingState) {
			case "error":
			case "loaded":
			case "loading":
				return newDoc;
			case "missing":
				return doc;
		}
	}
}

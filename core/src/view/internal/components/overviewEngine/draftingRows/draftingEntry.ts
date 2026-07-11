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

import type { ChangelogSelectors } from "../../../../../store/index.js";

/**
 * Converts a `DraftingDocumentEntry` (locally created, not yet in DS) to an OE-compatible
 * `JSONDocument` that can be prepended to the link pane table data.
 * @internal
 */
export function toDraftingDocument(entry: ChangelogSelectors.DraftingDocumentEntry): JSONDocument {
	const doc = entry.document as Record<string, unknown>;
	const existingMeta = (doc["__meta"] ?? {}) as Record<string, unknown>;

	return {
		...doc,
		id: entry.docRef,
		modelId: entry.documentModelName,
		linkId: entry.linkId,
		__meta: {
			...existingMeta,
			docRef: entry.docRef,
			documentModelName: entry.documentModelName,
			__drafting: true
		}
	} satisfies JSONDocument;
}

/**
 * Converts a `DraftingLinkEntry` (link added in exclude mode with a target document snapshot)
 * to an OE-compatible `JSONDocument` for prepending to the link pane table data.
 * @internal
 */
export function toDraftingLink(entry: ChangelogSelectors.DraftingLinkEntry): JSONDocument {
	const doc = entry.targetDocument as Record<string, unknown>;
	const existingMeta = (doc["__meta"] ?? {}) as Record<string, unknown>;

	return {
		...doc,
		id: entry.targetDocRef,
		modelId: entry.targetDocumentModelName,
		linkId: entry.linkId,
		__meta: {
			...existingMeta,
			docRef: entry.targetDocRef,
			documentModelName: entry.targetDocumentModelName,
			__drafting: true,
			__draftingLink: true
		}
	} satisfies JSONDocument;
}

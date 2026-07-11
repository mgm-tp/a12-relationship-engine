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

import { JSONDocument } from "@com.mgmtp.a12.overviewengine/overviewengine-core";

/**
 * Merges live document graph data into an OE table row.
 *
 * The row's `id` is its docRef. If a loaded document exists for that docRef,
 * its user-data fields are merged into the row while preserving OE-internal
 * fields (keys starting with `__`).
 *
 * Returns the original row reference if no patching is needed (referential equality).
 * @internal
 */
export function patchRowWithLatestChange(row: JSONDocument, latestDocument: object | undefined): JSONDocument {
	if (!latestDocument) {
		return row;
	}

	// Merge document fields into the row, preserving OE-internal fields
	const patched: { -readonly [K in keyof JSONDocument]?: JSONDocument[K] } = { ...row };
	let changed = false;

	// Keys that belong to the OE row identity
	const OE_ROW_IDENTITY_KEYS = new Set(["id", "modelId", "linkId"]);

	for (const [key, value] of Object.entries(latestDocument)) {
		if (OE_ROW_IDENTITY_KEYS.has(key)) {
			continue;
		}

		if (patched[key] !== value) {
			patched[key] = value;
			changed = true;
		}
	}

	return changed ? (JSONDocument.isInstance(patched) ? patched : row) : row;
}

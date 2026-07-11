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

import type { ModelReference } from "@com.mgmtp.a12.base/base-model-api";

import type { OverviewModel } from "../../../../../models/overview-model.js";

import type { ColumnClassification } from "./types.js";
import { classifyColumn } from "./column-classifier.js";

/**
 * Remaps a column's elementRef based on its classification.
 *
 * For "target" and "relationship" classifications, strips the wrapper
 * prefix from the elementRef, leaving only the original document model
 * field reference (e.g., "I4_field_dbbc9" → "field_dbbc9").
 *
 * For "rootGroup" classifications, the elementRef is kept as-is since
 * it references the root group wrapper itself.
 *
 * For "unmatched" classifications, the elementRef is left unmodified.
 *
 * @param classification - The column's classification.
 * @returns The remapped elementRef string.
 */
export function remapColumnElementRef(classification: ColumnClassification): string {
	switch (classification.kind) {
		case "target": {
			return classification.originalElementId;
		}

		case "relationship": {
			return classification.originalElementId;
		}

		case "rootGroup": {
			// Root group wrapper — keep the elementRef as-is; it refers
			// to the group itself, not a field within it
			return classification.groupId;
		}

		case "unmatched": {
			// Unmatched prefix — leave unmodified
			return classification.elementRef;
		}
	}
}

/**
 * Processes all columns of an overview model, classifying and remapping
 * each column's elementRef based on the generated doc analysis.
 *
 * @param columns - The overview model's columns array.
 * @param targetPrefix - The target group prefix.
 * @param relationshipPrefix - The relationship group prefix.
 * @returns An object with remapped columns and warning list.
 */
export function processAllColumns(
	columns: readonly OverviewModel.ReferenceColumn[],
	targetPrefix: string,
	relationshipPrefix: string | undefined
): {
	readonly remappedColumns: readonly OverviewModel.ReferenceColumn[];
	readonly warnings: readonly string[];
} {
	const remappedColumns: OverviewModel.ReferenceColumn[] = [];
	const warnings: string[] = [];

	for (const column of columns) {
		const classification = classifyColumn(column.elementRef, targetPrefix, relationshipPrefix);

		if (classification.kind === "unmatched") {
			warnings.push(`Column ${column.id}: elementRef "${column.elementRef}" did not match known prefixes`);
			remappedColumns.push(column);
			continue;
		}

		const remappedElementRef = remapColumnElementRef(classification);

		remappedColumns.push({
			...column,
			elementRef: remappedElementRef
		});
	}

	return { remappedColumns, warnings };
}

/**
 * Strips the document-model-for-overview reference from an overview model's
 * header.modelReferences, replacing it with the actual target document model ref.
 *
 * @param modelReferences - The current modelReferences array.
 * @param targetDocumentModelId - The target document model ID.
 * @returns Updated modelReferences with document-model-for-overview replaced.
 */
export function replaceDocumentModelForOverviewRef(
	modelReferences: readonly ModelReference[],
	targetDocumentModelId: string
): ModelReference[] {
	const filtered = modelReferences.filter((ref) => ref.purpose !== "document-model-for-overview");

	return [
		...filtered,
		{
			purpose: "document-model-for-overview",
			modelType: "document",
			reference: targetDocumentModelId,
			alias: "DM"
		}
	];
}

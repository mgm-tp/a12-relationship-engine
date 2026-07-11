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

import type { ColumnClassification } from "./types.js";

/**
 * Classifies a column's elementRef based on the target and relationship
 * group prefixes identified during generated document analysis.
 *
 * The classification algorithm:
 * 1. If elementRef starts with the relationship group prefix → "relationship"
 * 2. If elementRef starts with the target group prefix → "target"
 * 3. If elementRef matches a root group ID pattern (e.g., "G2") → "rootGroup"
 * 4. If elementRef starts with "field_" or "group_" (unprefixed refs) → "target"
 * 5. If elementRef has no underscore (single-word ref) → "target"
 * 6. Otherwise → "unmatched"
 *
 * @param elementRef - The column's elementRef value.
 * @param targetPrefix - The target group prefix (e.g., "I4_").
 * @param relationshipPrefix - The relationship group prefix (e.g., "I5_"), or undefined.
 * @returns A ColumnClassification discriminated union.
 */
export function classifyColumn(
	elementRef: string | undefined,
	targetPrefix: string,
	relationshipPrefix: string | undefined
): ColumnClassification {
	if (!elementRef) {
		return { kind: "unmatched", elementRef: "(empty)" };
	}

	// Check against relationship prefix first (relationship columns are more specific)
	if (relationshipPrefix && elementRef.startsWith(relationshipPrefix)) {
		const originalElementId = elementRef.slice(relationshipPrefix.length);

		return { kind: "relationship", originalElementId, existsInLinkDoc: false };
	}

	// Check against target prefix
	if (targetPrefix && elementRef.startsWith(targetPrefix)) {
		const originalElementId = elementRef.slice(targetPrefix.length);

		return { kind: "target", originalElementId };
	}

	// Check if elementRef matches a root group ID pattern (e.g., "G2", "G3")
	if (/^G\d+$/.test(elementRef)) {
		return { kind: "rootGroup", groupId: elementRef };
	}

	// Unprefixed elementRef starting with known field/group prefix:
	// These are direct references to the target document model fields.
	if (elementRef.startsWith("field_") || elementRef.startsWith("group_")) {
		return { kind: "target", originalElementId: elementRef };
	}

	// Single-word elementRef (no underscore) — target by convention
	if (!elementRef.includes("_")) {
		return { kind: "target", originalElementId: elementRef };
	}

	// Prefixed but doesn't match known prefixes — likely from an unknown
	// generated doc wrapper, or a future pattern
	return { kind: "unmatched", elementRef };
}

/** Resolves the generated-doc wrapper prefix for an element ID. */
export function resolveWrapperPrefix(elementId: string | undefined): string {
	if (!elementId) {
		return "";
	}

	const firstSegment = elementId.split("_")[0] ?? elementId;

	return `${firstSegment}_`;
}

/** Returns true for generated wrapper refs like `G2_field_*`. */
export function isGeneratedWrapperElementRef(elementRef: string | undefined): boolean {
	return typeof elementRef === "string" && /^G\d+_/.test(elementRef);
}

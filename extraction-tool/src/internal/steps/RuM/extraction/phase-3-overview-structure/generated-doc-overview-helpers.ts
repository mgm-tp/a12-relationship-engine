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

import { getModelReferences } from "../model-accessors/header-accessors.js";

import { findElementById, deserializeReferencedModel } from "./referenced-document-model-lookup.js";

/** Returns the generated-doc wrapper reference ID (____generated marker) from an overview model. */
export function findGeneratedDocModelId(overview: object): string | undefined {
	const generatedDocRef = getModelReferences(overview).find(
		(ref) =>
			ref.purpose === "document-model-for-overview" &&
			typeof ref.reference === "string" &&
			ref.reference.includes("____generated")
	);

	return generatedDocRef?.reference;
}

/** Returns true when elementId exists in rawReferencedDm as a Field, or as a Group matching the usageType filter. */
export function elementExistsInReferencedModel(
	rawReferencedDm: unknown,
	elementId: string,
	usageTypeFilter: readonly string[] | undefined,
	resolveModel: (id: string) => unknown
): boolean {
	const dm = deserializeReferencedModel(rawReferencedDm, resolveModel);
	const element = findElementById(dm, elementId);

	if (element === undefined) {
		return false;
	}

	if (element.type === "Field") {
		return true;
	}

	if (element.type === "Group" && usageTypeFilter !== undefined) {
		return usageTypeFilter.includes(element.usageType ?? "");
	}

	return false;
}

/** Replaces the `document-model-for-overview` reference with a `query-model-for-overview` reference. */
export function replaceDocumentModelForOverviewRefWithQueryRef(
	modelReferences: ReadonlyArray<{
		readonly purpose?: string;
		readonly modelType: string;
		readonly reference: string;
		readonly alias?: string;
	}>,
	queryModelId: string
): ReadonlyArray<{
	readonly purpose?: string;
	readonly modelType: string;
	readonly reference: string;
	readonly alias?: string;
}> {
	const queryReference = {
		purpose: "query-model-for-overview" as const,
		modelType: "query" as const,
		reference: queryModelId
	};
	const updatedRefs = modelReferences
		.filter((ref) => ref.purpose !== "document-model-for-overview")
		.map((ref) => (ref.purpose === "query-model-for-overview" ? queryReference : ref));

	if (!updatedRefs.some((ref) => ref.purpose === "query-model-for-overview")) {
		return [...updatedRefs, queryReference];
	}

	return updatedRefs;
}

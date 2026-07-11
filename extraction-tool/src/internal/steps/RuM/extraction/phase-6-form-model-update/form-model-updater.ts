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
import type { GenericModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import type { FinalRuM, BindingResult } from "../types.js";
import { isFormModel } from "../model-accessors/type-guards.js";
import { getHeader, getAnnotations, getModelReferences } from "../model-accessors/header-accessors.js";

import type { UpdateFormModelOptions } from "./types.js";

/**
 * Collects all relationship UI model IDs from BindingResult and FinalRuM arrays.
 *
 * The plan specifies that modelReferences entries are added for ALL bindings,
 * regardless of element existence (GAP-11). The source for RuM model IDs comes
 * from both P1 (BindingResult.ruModel) and P2 (FinalRuM.model) to ensure
 * completeness across the pipeline.
 *
 * @returns An array of unique RuM model IDs in insertion order.
 */
function collectRuMModelIds(bindingResults: readonly BindingResult[], finalRuMs: readonly FinalRuM[]): string[] {
	const seen = new Set<string>();
	const ids: string[] = [];

	for (const br of bindingResults) {
		const ruId = br.ruModel.header.id;

		if (!seen.has(ruId)) {
			seen.add(ruId);
			ids.push(ruId);
		}
	}

	for (const fr of finalRuMs) {
		const ruId = fr.model.header.id;

		if (!seen.has(ruId)) {
			seen.add(ruId);
			ids.push(ruId);
		}
	}

	return ids;
}

/**
 * Collects legacy overview/link-form references that belong to extracted bindings.
 *
 * These IDs are copied into converted RuM modelReferences by P1 using the
 * binding-source purposes "overview", "form", and "link". Only overview/form
 * model references are considered so non-keepModels pruning stays scoped to
 * legacy binding targets.
 */
function collectPrunableBindingReferenceIds(
	bindingResults: readonly BindingResult[],
	finalRuMs: readonly FinalRuM[]
): ReadonlySet<string> {
	const ids = new Set<string>();

	for (const br of bindingResults) {
		collectPrunableBindingReferenceIdsFromRefs(br.ruModel.header.modelReferences ?? [], ids);
	}

	for (const fr of finalRuMs) {
		collectPrunableBindingReferenceIdsFromRefs(fr.model.header.modelReferences ?? [], ids);
	}

	return ids;
}

function collectPrunableBindingReferenceIdsFromRefs(refs: readonly ModelReference[], ids: Set<string>): void {
	for (const ref of refs) {
		if (isExtractedBindingTargetReference(ref)) {
			ids.add(ref.reference);
		}
	}
}

function isExtractedBindingTargetReference(ref: ModelReference): boolean {
	return (
		(ref.purpose === "overview" || ref.purpose === "form" || ref.purpose === "link") &&
		(ref.modelType === "overview" || ref.modelType === "form")
	);
}

/**
 * Updates a form model with modelReferences for relationship UI models.
 *
 * Performs the following operations:
 * 1. Removes the `bindingConfiguration` annotation (unless keepModels=true)
 * 2. Adds modelReferences entries for all RuM models with
 *    purpose: "relationship-ui" and modelType: "relationship-ui"
 *    (GAP-11: UNCONDITIONAL for all bindings regardless of element existence)
 * 3. Prunes extracted-binding legacy `bindingReference` entries when keepModels=false
 * 4. Deduplicates against existing form model references
 * 5. Sorts modelReferences: existing refs first, new RuM refs appended in stable order
 *
 * This is a pure function with no context access. It reads from the form model
 * using header-accessors and returns a new updated form model object.
 *
 * @param formModel - The form model to update.
 * @param bindingResults - Binding results from P1 (source of RuM model IDs).
 * @param finalRuMs - Final enriched RuMs from P2 (source of RuM model IDs).
 * @param options - Update options controlling whether to keep annotations.
 * @returns A new GenericModel with updated modelReferences and annotations.
 */
export function updateFormModel(
	formModel: GenericModel,
	bindingResults: readonly BindingResult[],
	finalRuMs: readonly FinalRuM[],
	options: UpdateFormModelOptions
): GenericModel {
	// Read existing data via header-accessors (sanctioned sites)
	const existingHeader = getHeader(formModel);
	const existingAnnotations = getAnnotations(formModel);
	const existingRefs = getModelReferences(formModel);

	// Step 1: Remove bindingConfiguration annotation (unless keepModels)
	const updatedAnnotations = options.keepModels
		? existingAnnotations
		: existingAnnotations.filter((ann) => ann.name !== "bindingConfiguration");

	// Step 2: Prune extracted-binding legacy bindingReference refs for non-keepModels only
	const prunableReferenceIds = collectPrunableBindingReferenceIds(bindingResults, finalRuMs);
	const retainedExistingRefs = options.keepModels
		? existingRefs
		: existingRefs.filter((ref) => ref.purpose !== "bindingReference" || !prunableReferenceIds.has(ref.reference));

	// Step 3: Collect unique RuM model IDs from both P1 and P2
	const ruModelIds = collectRuMModelIds(bindingResults, finalRuMs);

	// Step 4: Build new modelReferences entries (GAP-11: unconditional)
	const newRuMRefs: readonly ModelReference[] = ruModelIds.map((id) => ({
		purpose: "relationship-ui" as const,
		modelType: "relationship-ui" as const,
		reference: id
	}));

	// Step 5: Deduplicate against retained form model references
	const uniqueNewRefs = newRuMRefs.filter(
		(ref) => !retainedExistingRefs.some((er) => er.reference === ref.reference && er.modelType === ref.modelType)
	);

	// Step 6: Sort — retained refs first, new RuM refs appended in stable order
	const sortedRefs: readonly ModelReference[] = [...retainedExistingRefs, ...uniqueNewRefs];

	if (!isFormModel(formModel)) {
		// Preserve legacy behavior for non-form model callers while avoiding unsafe assumptions.
		return {
			...formModel,
			header: {
				...(existingHeader ?? {}),
				annotations: [...updatedAnnotations],
				modelReferences: [...sortedRefs]
			}
		};
	}

	// Step 7: Return updated form model (new object, no mutations)
	return {
		...formModel,
		header: {
			...(existingHeader ?? {}),
			annotations: [...updatedAnnotations],
			modelReferences: [...sortedRefs]
		}
	};
}

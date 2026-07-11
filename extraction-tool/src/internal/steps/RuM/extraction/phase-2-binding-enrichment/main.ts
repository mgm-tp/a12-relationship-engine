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

import type { RelationshipUiModel } from "../../relationship-ui-model.js";

import { enrichBindingLabels } from "./label-enricher.js";
import { upgradeDropdownBindings } from "./dropdown-upgrader.js";
import { regenerateMissingQueryModels } from "./query-regenerator.js";
import type { FinalRuM, BindingResult, EnrichmentContext } from "./types.js";

function getBindingModel(binding: BindingResult): RelationshipUiModel {
	return binding.relationshipUiModel ?? binding.ruModel;
}

function getBindingRelationName(binding: BindingResult): string {
	return binding.relationshipName ?? binding.ruModel.content.relationshipName;
}

function getBindingTargetRole(binding: BindingResult): string {
	return binding.targetRole ?? binding.ruModel.content.targetRole;
}

/**
 * Phase 2 orchestrator: enriches extracted binding results through a
 * sequential pipeline of enrichment sub-steps.
 *
 * Flow:
 * 1. Enrich binding labels from relationship model entity characteristics
 * 2. Upgrade DropDownSelection bindings from overview refs to query model refs
 * 3. Regenerate missing query models for referenced query model IDs
 * 4. (Skipped) updateBindingModelReferences — module does not exist yet
 * 5. Assemble FinalRuM for each binding with collected data
 *
 * @param bindingResults - The extracted binding results from P1.
 * @param context - Enrichment context providing model resolution.
 * @returns An array of FinalRuM with fully enriched relationship UI models.
 */
export function enrichBindings(
	bindingResults: readonly BindingResult[],
	context: EnrichmentContext
): readonly FinalRuM[] {
	// Step 1: Enrich labels from relationship model entity characteristics
	const labelEnriched = enrichBindingLabels(bindingResults, context);

	// Step 2: Upgrade DropDownSelection bindings from overview refs to query refs
	const upgraded = upgradeDropdownBindings(labelEnriched, context);

	// Step 3: Regenerate missing query models
	const generatedQueryModelMap = new Map<string, object>(
		upgraded.additionalQueryModels.map((queryModel) => [queryModel.header.id, queryModel])
	);

	const contextWithGeneratedQueries: EnrichmentContext = {
		...context,
		resolveModel: (modelId: string): object | undefined => {
			const generatedQuery = generatedQueryModelMap.get(modelId);

			if (generatedQuery !== undefined) {
				return generatedQuery;
			}

			return context.resolveModel(modelId);
		}
	};

	const regenerated = regenerateMissingQueryModels(upgraded.updatedBindings, contextWithGeneratedQueries);

	// Step 4: updateBindingModelReferences — NOT YET IMPLEMENTED
	// The ref-updater module (phase-2-binding-enrichment/ref-updater.ts) does
	// not exist yet. This step will be added when the module is created.

	// Step 5: Assemble FinalRuM for each binding with combined additional data
	const allAdditionalQueryModels = [...upgraded.additionalQueryModels, ...regenerated.regeneratedQueryModels];

	return regenerated.updatedBindings.map(
		(binding): FinalRuM => ({
			rumModel: getBindingModel(binding),
			additionalQueryModels: allAdditionalQueryModels,
			bindingName: binding.bindingName,
			elementId: binding.elementId,
			relationshipName: getBindingRelationName(binding),
			targetRole: getBindingTargetRole(binding)
		})
	);
}

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

import type { LocalizedModelText } from "@com.mgmtp.a12.utils/utils-localization";
import type { RelationshipModel } from "@com.mgmtp.a12.dataservices/dataservices-access";

import { isRelationshipModel } from "../model-accessors/type-guards.js";
import type { RelationshipUiModel } from "../../relationship-ui-model.js";
import { hasNonEmptyLabels, isValidLocalizedModelText } from "../model-accessors/localization-helpers.js";

import type { BindingResult, EnrichmentContext } from "./types.js";

export { hasNonEmptyLabels };

function getBindingModel(binding: BindingResult): RelationshipUiModel {
	return binding.relationshipUiModel ?? binding.ruModel;
}

function getBindingRelationshipName(binding: BindingResult): string {
	return binding.relationshipName ?? binding.ruModel.content.relationshipName;
}

function getBindingTargetRole(binding: BindingResult): string {
	return binding.targetRole ?? binding.ruModel.content.targetRole;
}

/**
 * Enriches binding labels by loading relationship models and extracting
 * labels from matching entity characteristics.
 *
 * For each BindingResult with missing/empty header.labels:
 * 1. Loads the relationship model via context.resolveModel()
 * 2. Guards with isRelationshipModel()
 * 3. Extracts labels from entity characteristics matching the target role
 * 4. Merges by locale (GAP-13)
 * 5. Only enriches when relationship provides non-empty labels (GAP-12)
 */
export function enrichBindingLabels(
	bindings: readonly BindingResult[],
	context: EnrichmentContext
): readonly BindingResult[] {
	return bindings.map((binding) => enrichSingleBindingLabel(binding, context));
}

/**
 * Merges existing labels with supplement labels by locale.
 * Relationship labels supplement, never replace existing binding labels (GAP-13).
 */
function mergeLabelsByLocale(
	existing: LocalizedModelText | undefined,
	supplement: LocalizedModelText
): LocalizedModelText {
	if (!existing) {
		return supplement;
	}

	const existingLocales = new Set(existing.map((entry) => entry.locale));
	const newEntries = supplement.filter((entry) => !existingLocales.has(entry.locale));

	return [...existing, ...newEntries];
}

/** Finds the labels for the entity characteristic matching the target role. */
function findEntityCharacteristicLabels(
	relationshipModel: RelationshipModel,
	targetRole: string
): LocalizedModelText | undefined {
	const { content } = relationshipModel;

	if (typeof content !== "object" || content === null) {
		throw new Error("Model is missing content");
	}

	const entityCharacteristics = content.entityCharacteristics;

	if (!Array.isArray(entityCharacteristics)) {
		return undefined;
	}

	const relationshipCharacteristic = entityCharacteristics.find((characteristic) => characteristic.role === targetRole);

	if (!relationshipCharacteristic || !isValidLocalizedModelText(relationshipCharacteristic.labels)) {
		return undefined;
	}

	return relationshipCharacteristic.labels;
}

/**
 * Enriches a single binding by extracting labels from the relationship model.
 * Only enriches when the binding lacks non-empty header labels and the relationship
 * provides non-empty labels (GAP-12). Merges by locale (GAP-13).
 */
function enrichSingleBindingLabel(binding: BindingResult, context: EnrichmentContext): BindingResult {
	const relationshipUiModel = getBindingModel(binding);

	if (relationshipUiModel.content.component.componentType !== "DropDownSelection") {
		return binding;
	}

	const currentLabel = relationshipUiModel.header.labels;

	// Load relationship model
	const relationshipModel = context.resolveModel(getBindingRelationshipName(binding));

	if (!relationshipModel || !isRelationshipModel(relationshipModel)) {
		return binding;
	}

	// GAP-8: entityCharacteristics is an Array, accessed by role
	const relationshipLabels = findEntityCharacteristicLabels(relationshipModel, getBindingTargetRole(binding));

	// GAP-12: Only enrich if relationship provides non-empty labels
	if (!relationshipLabels || !hasNonEmptyLabels(relationshipLabels)) {
		return binding;
	}

	// GAP-13: Merge by locale — relationship labels supplement, never replace
	const mergedLabels = mergeLabelsByLocale(currentLabel, relationshipLabels);

	return {
		...binding,
		relationshipUiModel: {
			...relationshipUiModel,
			header: {
				...relationshipUiModel.header,
				labels: mergedLabels
			}
		}
	};
}

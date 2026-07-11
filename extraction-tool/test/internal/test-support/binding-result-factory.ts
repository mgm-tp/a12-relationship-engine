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

import { RUM_VERSION } from "../../../src/internal/steps/RuM/extraction/constants.js";
import type { BindingResult } from "../../../src/internal/steps/RuM/extraction/types.js";
import type { RelationshipUiModel } from "../../../src/internal/steps/RuM/relationship-ui-model.js";

/**
 * Typed overrides for building dropdown BindingResult fixtures.
 * Derives override fields from source types instead of duplicating local shapes.
 */
export type DropDownBindingResultOverrides = Partial<
	Pick<
		RelationshipUiModel.ComponentConfiguration,
		| "availableItemsOverviewModel"
		| "selectedItemsOverviewModel"
		| "availableItemsQueryModel"
		| "selectedItemQueryModel"
		| "elementRef"
	>
> &
	Partial<
		Pick<BindingResult, "bindingName" | "elementId" | "pageSizeMigrations" | "relationshipName" | "targetRole">
	> & {
		readonly bindingId?: string;
		readonly modelReferences?: readonly ModelReference[];
	};

/**
 * Creates a real dropdown BindingResult fixture without unsafe casts.
 */
export function createDropDownBindingResult(overrides: DropDownBindingResultOverrides = {}): BindingResult {
	const bindingId = overrides.bindingId ?? "test-binding-id";
	const relationshipName = overrides.relationshipName ?? "test-relationship";
	const targetRole = overrides.targetRole ?? "test-role";
	const pageSizeMigrations = [...(overrides.pageSizeMigrations ?? [])];
	const component: RelationshipUiModel.ComponentConfiguration = {
		componentType: "DropDownSelection",
		...(overrides.availableItemsOverviewModel === undefined
			? {}
			: { availableItemsOverviewModel: overrides.availableItemsOverviewModel }),
		...(overrides.selectedItemsOverviewModel === undefined
			? {}
			: { selectedItemsOverviewModel: overrides.selectedItemsOverviewModel }),
		...(overrides.availableItemsQueryModel === undefined
			? {}
			: { availableItemsQueryModel: overrides.availableItemsQueryModel }),
		...(overrides.selectedItemQueryModel === undefined
			? {}
			: { selectedItemQueryModel: overrides.selectedItemQueryModel }),
		...(overrides.elementRef === undefined ? {} : { elementRef: overrides.elementRef })
	};
	const relationshipUiModel: RelationshipUiModel = {
		header: {
			id: `${bindingId}_RuM`,
			modelType: "relationship-ui",
			modelVersion: RUM_VERSION,
			modelReferences: [...(overrides.modelReferences ?? [])]
		},
		content: {
			relationshipName,
			targetRole,
			component
		}
	};

	return {
		ruModel: relationshipUiModel,
		relationshipUiModel,
		bindingName: overrides.bindingName ?? "test-binding",
		elementId: overrides.elementId ?? "test-element",
		relationshipName,
		targetRole,
		pageSizeMigrations,
		rowActionMigrations: [],
		rowActivationMigrations: [],
		overviewLabelMigrations: [],
		queryModels: [],
		migrations: {
			pageSizeMigrations,
			rowActionMigrations: [],
			rowActivationMigrations: [],
			overviewLabelMigrations: [],
			rowActions: [],
			rowActivations: [],
			modificationConfigFlags: { extendParentActivityDescriptor: false }
		}
	};
}

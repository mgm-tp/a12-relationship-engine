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

import { EventName, RUM_VERSION } from "../constants.js";
import type { RelationshipUiModel } from "../../relationship-ui-model.js";
import type { BindingModel, ModificationConfiguration } from "../../../binding/binding-model.js";
import type { BindingResult, PipelineContext, RowActionMigration, RowActivationMigration } from "../types.js";

import { convertComponents } from "./component-converter.js";
import { classifyComponent } from "./component-classifier.js";
import { buildButtonsForComponent } from "./button-builder.js";
import { BindingConversionError } from "./binding-conversion-error.js";
import { extractDirectHostLabel } from "./direct-host-label-extractor.js";
import { collectPageSizes, collectOverviewLabelMigrations } from "./migration-collectors.js";

/**
 * Resolves the binding display name via the fallback chain:
 * `binding.details.name` → `binding.details.relationshipName` → `"default-name"`.
 */
function resolveBindingName(bindingName: string, relationshipName: string): string {
	if (bindingName.length > 0) {
		return bindingName;
	}

	if (relationshipName.length > 0) {
		return relationshipName;
	}

	return "default-name";
}

/**
 * Normalizes a binding name for use in model IDs:
 * replaces spaces and underscores with hyphens.
 */
function normalizeBindingName(name: string): string {
	return name.replace(/[\s_]+/g, "-");
}

/**
 * Generates the model ID for the relationship UI model.
 *
 * Pattern: `{formModelId}-binding-{normalizedName}_RuM`
 */
function generateBindingModelId(formModelId: string, normalizedName: string): string {
	return `${formModelId}-binding-${normalizedName}_RuM`;
}

/**
 * Adds a single row-action migration entry to the given array.
 */
function addRowActionMigration(
	migrations: Array<RowActionMigration>,
	overviewModelId: string,
	actionType: string,
	icon: string,
	options?: { destructive?: boolean }
): void {
	migrations.push({
		overviewModelId,
		actionType,
		icon,
		destructive: options?.destructive
	});
}

/**
 * Builds target-compatible activity configuration for the RuM content.
 */
function buildModificationConfiguration(
	legacyConfig: ModificationConfiguration | undefined
): RelationshipUiModel.ModificationConfiguration | undefined {
	if (legacyConfig === undefined) {
		return undefined;
	}

	const modificationConfiguration: RelationshipUiModel.ModificationConfiguration = {
		...(legacyConfig.extendParentActivityDescriptor === true ? { extendParentActivityDescriptor: true as const } : {}),
		...(legacyConfig.activityDescriptor !== undefined ? { activityDescriptor: legacyConfig.activityDescriptor } : {})
	};

	return Object.keys(modificationConfiguration).length > 0 ? modificationConfiguration : undefined;
}

/**
 * Builds row-action migrations for a converted component.
 */
function collectRowActionMigrations(
	kind: "DualPaneSelection" | "TableList" | "DropDownSelection",
	component: RelationshipUiModel.ComponentConfiguration,
	legacyModels: readonly { readonly use: string; readonly name: string }[]
): RowActionMigration[] {
	const migrations: Array<RowActionMigration> = [];
	const hasEditForm = component.linkFormModel !== undefined;
	const linkOverviewModelId = component.selectedItemsOverviewModel ?? legacyModels.find((m) => m.use === "link")?.name;

	if (kind === "TableList") {
		const editSelectedOverviewModelId = component.editConfiguration?.selectedItemsOverviewModel;

		if (editSelectedOverviewModelId !== undefined) {
			addRowActionMigration(migrations, editSelectedOverviewModelId, EventName.DeleteLink, "remove_circle", {
				destructive: true
			});
			addRowActionMigration(migrations, editSelectedOverviewModelId, EventName.RestoreLink, "add_circle");

			if (hasEditForm) {
				addRowActionMigration(migrations, editSelectedOverviewModelId, EventName.EditLinkDocument, "edit");
			}
		}
	}

	// Fact 9: Plain DualPaneSelection receives selected-pane default row actions.
	// DropDownSelection must NOT inherit selected-pane row-action defaults.
	if (kind === "DualPaneSelection" && linkOverviewModelId !== undefined) {
		addRowActionMigration(migrations, linkOverviewModelId, EventName.DeleteLink, "remove_circle", {
			destructive: true
		});
		addRowActionMigration(migrations, linkOverviewModelId, EventName.RestoreLink, "add_circle");

		if (hasEditForm) {
			addRowActionMigration(migrations, linkOverviewModelId, EventName.EditLinkDocument, "edit");
		}
	}

	const candidateOverviewModelId =
		kind === "TableList"
			? (component.editConfiguration?.availableItemsOverviewModel ?? component.availableItemsOverviewModel)
			: component.availableItemsOverviewModel;

	if (candidateOverviewModelId !== undefined) {
		addRowActionMigration(migrations, candidateOverviewModelId, EventName.AddLink, "add");
	}

	return migrations;
}

/**
 * Builds row-activation migrations for a converted component.
 */
function collectRowActivationMigrations(
	kind: "DualPaneSelection" | "TableList" | "DropDownSelection",
	component: RelationshipUiModel.ComponentConfiguration,
	legacyModels: readonly { readonly use: string; readonly name: string }[]
): RowActivationMigration[] {
	const linkOverviewModelId = component.selectedItemsOverviewModel ?? legacyModels.find((m) => m.use === "link")?.name;

	if (kind === "DropDownSelection") {
		return [];
	}

	if (kind === "DualPaneSelection") {
		return [
			...(component.availableItemsOverviewModel !== undefined
				? [
						{
							overviewModelId: component.availableItemsOverviewModel,
							activation: { type: "event", event: EventName.AddLink } as const
						}
					]
				: []),
			...(linkOverviewModelId !== undefined
				? [
						{
							overviewModelId: linkOverviewModelId,
							activation: { type: "event", event: EventName.DeleteLink } as const
						}
					]
				: [])
		];
	}

	return [
		...(component.selectedItemsOverviewModel !== undefined
			? [{ overviewModelId: component.selectedItemsOverviewModel, activation: { type: "non_interactive" } as const }]
			: []),
		...(component.editConfiguration?.availableItemsOverviewModel !== undefined
			? [
					{
						overviewModelId: component.editConfiguration.availableItemsOverviewModel,
						activation: { type: "event", event: EventName.AddLink } as const
					}
				]
			: []),
		...(component.editConfiguration?.selectedItemsOverviewModel !== undefined
			? [
					{
						overviewModelId: component.editConfiguration.selectedItemsOverviewModel,
						activation: { type: "event", event: EventName.DeleteLink } as const
					}
				]
			: [])
	];
}

/**
 * Converts a single legacy `BindingModel` into a structured `BindingResult`.
 *
 * Orchestrates the full conversion pipeline for one binding:
 * 1. Resolve and normalize binding name
 * 2. Classify legacy components
 * 3. Convert to new-format component structure
 * 4. Build button elements
 * 5. Collect scalar migrations
 * 6. Construct the Relationship UI model with header and content
 * 7. Wrap failures in BindingConversionError with the original cause
 *
 * @param binding - The legacy binding model to convert.
 * @param context - Pipeline context with form model and resolution helpers.
 * @returns A `BindingResult` with the extracted data.
 */
export function convertLegacyBinding(binding: BindingModel, context: PipelineContext): BindingResult {
	try {
		const formModelId = context.formModelId;
		const rolesAnnotations = context.rolesAnnotations;
		const elementId = binding.elementId;

		// Step 1: Resolve binding name
		const bindingName = resolveBindingName(binding.details.name, binding.details.relationshipName);
		const normalizedName = normalizeBindingName(bindingName);

		// Step 2: Classify components
		const kind = classifyComponent(binding.details.components);

		// Step 3: Convert to new-format component structure
		const convertedComponent = convertComponents(kind, context);
		const directHostLabel = extractDirectHostLabel(context.formModel, elementId);

		// Step 4: Build buttons and attach to component
		const buttons = buildButtonsForComponent(
			kind,
			binding.details.modificationConfiguration,
			convertedComponent.linkFormModel
		);

		const component = buttons.length > 0 ? { ...convertedComponent, buttons } : convertedComponent;
		const modificationConfiguration = buildModificationConfiguration(binding.details.modificationConfiguration);

		// Step 5: Collect scalar migrations
		const pageSizeMigrations = [...collectPageSizes(kind)];
		const rowActionMigrations = collectRowActionMigrations(kind.kind, component, kind.component.models ?? []);
		const rowActivationMigrations = collectRowActivationMigrations(kind.kind, component, kind.component.models ?? []);
		const overviewLabelMigrations = [...collectOverviewLabelMigrations(kind)];

		// Step 6: Build model references from component
		const modelReferences: Array<{
			reference: string;
			modelType: string;
			purpose: string;
		}> = [];

		if (component.availableItemsOverviewModel !== undefined) {
			modelReferences.push({
				reference: component.availableItemsOverviewModel,
				modelType: "overview",
				purpose: "overview"
			});
		}

		if (component.selectedItemsOverviewModel !== undefined) {
			modelReferences.push({
				reference: component.selectedItemsOverviewModel,
				modelType: "overview",
				purpose: "overview"
			});
		}

		if (component.linkFormModel !== undefined) {
			modelReferences.push({
				reference: component.linkFormModel,
				modelType: "form",
				purpose: "link"
			});
		}

		// Deduplicate internal duplicates within the RuM's own references
		const uniqueRefs = modelReferences.filter(
			(ref, index, self) =>
				self.findIndex((r) => r.reference === ref.reference && r.modelType === ref.modelType) === index
		);

		// Step 7: Generate model ID
		const modelId = generateBindingModelId(formModelId, normalizedName);

		// Step 8: Construct the full Relationship UI model
		const ruModel: RelationshipUiModel = {
			header: {
				id: modelId,
				modelType: "relationship-ui",
				modelVersion: RUM_VERSION,
				modelReferences: uniqueRefs,
				annotations: [...rolesAnnotations],
				...(kind.kind === "DualPaneSelection" && directHostLabel !== undefined ? { labels: directHostLabel } : {})
			},
			content: {
				relationshipName: binding.details.relationshipName,
				targetRole: binding.details.targetRole,
				component,
				...(modificationConfiguration !== undefined ? { modificationConfiguration } : {})
			}
		};

		return {
			ruModel,
			bindingName,
			elementId,
			pageSizeMigrations,
			rowActionMigrations,
			rowActivationMigrations,
			overviewLabelMigrations
		};
	} catch (error) {
		throw new BindingConversionError(context.formModelId, binding.elementId, binding.details?.relationshipName, {
			cause: error
		});
	}
}

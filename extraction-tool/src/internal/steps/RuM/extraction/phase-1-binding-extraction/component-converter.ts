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

import type { ComponentKind, PipelineContext } from "../types.js";
import type { RelationshipUiModel } from "../../relationship-ui-model.js";
import { getModelReferences } from "../model-accessors/header-accessors.js";
import type { ComponentConfiguration } from "../../../binding/binding-model.js";
import { isValidLocalizedModelText } from "../model-accessors/localization-helpers.js";

import { narrowComponentProps } from "./component-props.js";

/**
 * Internal structure for resolved model purposes during conversion.
 */
interface ResolvedModels {
	readonly availableItemsOverviewModel?: string;
	readonly selectedItemsOverviewModel?: string;
	readonly linkFormModel?: string;
}

/**
 * Resolves the model type for a given model reference name by looking it up
 * in the form model's model references.
 */
function resolveModelType(modelReferences: readonly ModelReference[], referenceName: string): string | undefined {
	return modelReferences.find((ref) => ref.reference === referenceName)?.modelType;
}

/**
 * Resolves legacy component `models[]` entries into target model references.
 */
function resolveComponentModels(
	models: readonly { readonly name: string; readonly use: string }[],
	modelReferences: readonly ModelReference[]
): ResolvedModels {
	let availableItemsOverviewModel: string | undefined;
	let selectedItemsOverviewModel: string | undefined;
	let linkFormModel: string | undefined;

	for (const model of models) {
		if (model.use === "candidate") {
			availableItemsOverviewModel = model.name;
		} else if (model.use === "link") {
			const modelType = resolveModelType(modelReferences, model.name);

			if (modelType === "overview") {
				selectedItemsOverviewModel = model.name;
			} else if (modelType === "form") {
				linkFormModel = model.name;
			}
		}
	}

	return { availableItemsOverviewModel, selectedItemsOverviewModel, linkFormModel };
}

/**
 * Normalizes legacy dimension input to a CSS value string, or `undefined`.
 */
function getDimensionValue(value: string | number | undefined): string | undefined {
	if (typeof value === "number") {
		return String(value);
	}

	return typeof value === "string" ? value : undefined;
}

/**
 * Builds the edit configuration for a TableList with a nested DualPane
 * sub-component.
 */
function buildEditConfiguration(
	dualPaneComponent: ComponentConfiguration,
	modelReferences: readonly ModelReference[]
): RelationshipUiModel.EditConfiguration {
	const dualPaneProps = narrowComponentProps(dualPaneComponent.props);
	const resolved = resolveComponentModels(dualPaneComponent.models, modelReferences);

	const dialogTitle = isValidLocalizedModelText(dualPaneProps.editDialogTitle?.label)
		? dualPaneProps.editDialogTitle.label
		: undefined;
	const dialogWidth = getDimensionValue(dualPaneProps.editDialogWidth);
	const dialogMaxWidth = getDimensionValue(dualPaneProps.editDialogMaxWidth);
	const dialogMaxHeight = getDimensionValue(dualPaneProps.editDialogMaxHeight);
	const height = getDimensionValue(dualPaneProps.height);

	return {
		availableItemsOverviewModel: resolved.availableItemsOverviewModel ?? "",
		selectedItemsOverviewModel: resolved.selectedItemsOverviewModel ?? "",
		...(dialogTitle !== undefined ? { dialogTitle } : {}),
		...(dialogWidth !== undefined ? { dialogWidth } : {}),
		...(dialogMaxWidth !== undefined ? { dialogMaxWidth } : {}),
		...(dialogMaxHeight !== undefined ? { dialogMaxHeight } : {}),
		...(height !== undefined ? { height } : {})
	};
}

/**
 * Converts a classified `ComponentKind` into the new-format
 * `RelationshipUiModel.ComponentConfiguration`.
 *
 * Maps legacy component configurations to the target model structure,
 * resolving overview/form model references from the form model's
 * `modelReferences` header.
 */
export function convertComponents(
	kind: ComponentKind,
	ctx: PipelineContext
): RelationshipUiModel.ComponentConfiguration {
	const modelReferences = getModelReferences(ctx.formModel);
	const props = narrowComponentProps(kind.component.props);

	const resolved = resolveComponentModels(kind.component.models, modelReferences);

	let resolvedLinkFormModel = resolved.linkFormModel;

	const editConfig =
		kind.kind === "TableList" && kind.dualPaneComponent !== undefined
			? buildEditConfiguration(kind.dualPaneComponent, modelReferences)
			: undefined;

	if (!resolvedLinkFormModel && kind.kind === "TableList" && kind.dualPaneComponent !== undefined) {
		const dualPaneResolved = resolveComponentModels(kind.dualPaneComponent.models, modelReferences);

		if (dualPaneResolved.linkFormModel) {
			resolvedLinkFormModel = dualPaneResolved.linkFormModel;
		}
	}

	const height = getDimensionValue(props.height);

	const tableDialogWidth = getDimensionValue(props.editDialogWidth);
	const tableDialogMaxWidth = getDimensionValue(props.editDialogMaxWidth);
	const tableDialogMaxHeight = getDimensionValue(props.editDialogMaxHeight);

	let mergedEditConfig = editConfig;

	if (tableDialogWidth !== undefined || tableDialogMaxWidth !== undefined || tableDialogMaxHeight !== undefined) {
		mergedEditConfig = {
			...(editConfig ?? { availableItemsOverviewModel: "", selectedItemsOverviewModel: "" }),
			...(tableDialogWidth !== undefined ? { dialogWidth: tableDialogWidth } : {}),
			...(tableDialogMaxWidth !== undefined ? { dialogMaxWidth: tableDialogMaxWidth } : {}),
			...(tableDialogMaxHeight !== undefined ? { dialogMaxHeight: tableDialogMaxHeight } : {})
		};
	}

	return {
		componentType: kind.kind,
		availableItemsOverviewModel: resolved.availableItemsOverviewModel,
		selectedItemsOverviewModel: resolved.selectedItemsOverviewModel,
		...(resolvedLinkFormModel !== undefined ? { linkFormModel: resolvedLinkFormModel } : {}),
		...(height !== undefined ? { height } : {}),
		...(mergedEditConfig !== undefined ? { editConfiguration: mergedEditConfig } : {})
	};
}

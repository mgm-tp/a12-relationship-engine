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

import { vi } from "vitest";

import type { GenericModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import { extractionTransform } from "../../src/internal/steps/RuM/extraction/index.js";
import { DOCUMENT_MODEL_VERSION } from "../../src/internal/steps/RuM/extraction/constants.js";
import { loadFixtureModel, createFixtureContext } from "../internal/test-support/fixture-context-factory.js";
import { buildModelIndex, type ModelIndex, type IndexedModel } from "../internal/test-support/model-index.js";

import { isRecord } from "./fixture-utils.js";

export const PRODUCT_BRAND_DIRECT_OVERVIEW_ID = "ProductBrand_Product_SelectedItemsOverview";
export const PRODUCT_BRAND_DIRECT_TABLELIST_ID = `${PRODUCT_BRAND_DIRECT_OVERVIEW_ID}-tableList`;
export const PRODUCT_BRAND_DIRECT_QUERY_ID = `${PRODUCT_BRAND_DIRECT_OVERVIEW_ID}-query`;
export const PRODUCT_BRAND_EDIT_CLONE_ID = `${PRODUCT_BRAND_DIRECT_OVERVIEW_ID}-edit`;

const PRODUCT_BRAND_FIXTURES = [
	"products/ProductBrand/relationship.json",
	"products/ProductBrand/document-model.json",
	"products/ProductBrand/link-document-model.json",
	"products/ProductBrand/overview-available.json",
	"products/ProductBrand/overview-selected.json",
	"products/ProductBrand/overview-edit-selected.json"
] as const;
const FORM_FIXTURE_PATH = "products/ProductBrand/form.json";

export interface ProductBrandFixtureModel extends IndexedModel {
	readonly header: IndexedModel["header"] & { readonly labels?: readonly LocalizedText[] };
	readonly content?: unknown;
}

export interface LocalizedText {
	readonly locale?: string;
	readonly text?: string;
}

export interface ExtractedComponent {
	readonly componentType?: string;
	readonly availableItemsOverviewModel?: string;
	readonly selectedItemsOverviewModel?: string;
	readonly height?: string;
	readonly editConfiguration?: {
		readonly selectedItemsOverviewModel?: string;
		readonly height?: string;
	};
}

export interface ProductBrandTransformResult {
	readonly updatedForm: ProductBrandFixtureModel;
	readonly tableListRuM: ProductBrandFixtureModel;
	readonly dropDownRuM: ProductBrandFixtureModel | undefined;
	readonly tableListComponent: ExtractedComponent;
	readonly addedModelIds: readonly string[];
	readonly addedOverviewIds: readonly string[];
	readonly index: ModelIndex<IndexedModel>;
	readonly findModel: (id: string) => ProductBrandFixtureModel | undefined;
}

/** Runs the ProductBrand TableList fixture through extraction. */
export function transformProductBrandTableList(
	keepModels: boolean,
	mutateBinding?: (binding: BindingEntry) => BindingEntry
): ProductBrandTransformResult {
	const formModel = createSharedSelectedOverviewFormModel(mutateBinding);
	const initialModels = [
		...PRODUCT_BRAND_FIXTURES.map(loadFixtureModel),
		formModel,
		createDocumentModel("Brand-document"),
		createDocumentModel("Product-document")
	].map(toFixtureModel);
	const harness = createFixtureContext({ models: initialModels, config: { keepModels } });
	const updatedForm = toFixtureModel(
		extractionTransform(formModel, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, harness.context)
	);
	const addedModels = harness.getAddedModels().map(toFixtureModel);
	const modelSet = keepModels
		? [...initialModels, ...addedModels, updatedForm]
		: mergeSurvivingModels(initialModels, addedModels, updatedForm, harness.getDeletedIds());
	const allModels = modelSet.map(withPath);
	const relationshipUiModels = addedModels.filter((model) => model.header.modelType === "relationship-ui");
	const tableListRuM = requireModel(
		relationshipUiModels.find((model) => getComponent(model).componentType === "TableList"),
		"ProductBrand TableList relationship-ui"
	);

	return {
		updatedForm,
		tableListRuM,
		dropDownRuM: relationshipUiModels.find((model) => getComponent(model).componentType === "DropDownSelection"),
		tableListComponent: getComponent(tableListRuM),
		addedModelIds: addedModels.map((model) => model.header.id),
		addedOverviewIds: addedModels
			.filter((model) => model.header.modelType === "overview")
			.map((model) => model.header.id),
		index: buildModelIndex<IndexedModel>(allModels),
		findModel: (id) => allModels.find((model) => model.header.id === id)
	};
}

/** Returns the first header reference matching the purpose. */
export function getSingleHeaderRef(model: ProductBrandFixtureModel, purpose: string): string {
	const refs = (model.header.modelReferences ?? []).flatMap((reference) =>
		isReference(reference, purpose) ? [reference.reference] : []
	);

	if (refs.length !== 1) {
		throw new Error(`Expected one ${model.header.id} ${purpose} ref`);
	}

	return refs[0];
}

/** Returns the extracted component object. */
export function getComponent(model: ProductBrandFixtureModel): ExtractedComponent {
	const component = isRecord(model.content) ? model.content.component : undefined;

	return isRecord(component) ? component : {};
}

/** Returns row action event names from an overview model. */
export function getRowActionEvents(model: ProductBrandFixtureModel): readonly string[] {
	const rowActionGroup = isRecord(model.content) ? model.content.rowActionGroup : undefined;
	const actions = isRecord(rowActionGroup) && Array.isArray(rowActionGroup.actions) ? rowActionGroup.actions : [];

	return actions.flatMap((action) => (isRecord(action) && typeof action.event === "string" ? [action.event] : []));
}

/** Returns a header label text by locale. */
export function labelText(model: ProductBrandFixtureModel, locale: string): string | undefined {
	return model.header.labels?.find((label) => label.locale === locale)?.text;
}

/** Requires an optional value in test setup code. */
export function requireModel<Model>(model: Model | undefined, description: string): Model {
	if (model === undefined) {
		throw new Error(`Expected ${description} to be present`);
	}

	return model;
}

/**
 * Creates an in-memory form model where the nested edit configuration points to the direct
 * selected overview (PRODUCT_BRAND_DIRECT_OVERVIEW_ID) instead of the separate DualPane
 * selected-items overview committed in the fixture. This collapses direct and edit to a shared
 * base overview, exercising the keepModels clone-routing logic under a shared-overview scenario
 * and enabling both -tableList and -edit clones to derive from the same source overview.
 */
function createSharedSelectedOverviewFormModel(mutateBinding?: (binding: BindingEntry) => BindingEntry): GenericModel {
	const formModel = structuredClone(loadFixtureModel(FORM_FIXTURE_PATH)) as MutableGenericModel;
	const bindings = parseBindings(annotationValue(formModel, "bindingConfiguration")).map((binding) => {
		if (binding.details?.name !== "ProductBrandTable") {
			return binding;
		}

		const routedBinding = routeNestedEditSelectionToDirectOverview(binding);

		return mutateBinding?.(routedBinding) ?? routedBinding;
	});

	formModel.header.annotations = (formModel.header.annotations ?? []).map((annotation) =>
		annotation.name === "bindingConfiguration" ? { ...annotation, value: JSON.stringify(bindings) } : annotation
	);
	formModel.header.modelReferences = (formModel.header.modelReferences ?? []).filter(
		(reference) => reference.reference !== "ProductBrand_Product_SelectedItems_DualPane_OM"
	);

	return formModel as GenericModel;
}

function routeNestedEditSelectionToDirectOverview(binding: BindingEntry): BindingEntry {
	return {
		...binding,
		details: {
			...binding.details,
			components: (binding.details?.components ?? []).map((component) =>
				component.id === "edit-products"
					? {
							...component,
							models: component.models.map((model) =>
								model.use === "link" ? { ...model, name: PRODUCT_BRAND_DIRECT_OVERVIEW_ID } : model
							)
						}
					: component
			)
		}
	};
}

function createDocumentModel(id: string): GenericModel {
	return {
		header: { id, modelType: "document", modelVersion: DOCUMENT_MODEL_VERSION },
		content: { modelInfo: { name: id }, modelRoot: { rootGroups: [] } }
	} as unknown as GenericModel;
}

function mergeSurvivingModels(
	initialModels: readonly ProductBrandFixtureModel[],
	addedModels: readonly ProductBrandFixtureModel[],
	updatedForm: ProductBrandFixtureModel,
	deletedIds: readonly string[]
): readonly ProductBrandFixtureModel[] {
	const deletedIdSet = new Set(deletedIds);
	const byId = new Map<string, ProductBrandFixtureModel>();

	for (const model of [...initialModels, ...addedModels, updatedForm]) {
		if (!deletedIdSet.has(model.header.id)) {
			byId.set(model.header.id, model);
		}
	}

	return [...byId.values()];
}

function withPath(model: ProductBrandFixtureModel): ProductBrandFixtureModel {
	return { ...model, path: `${model.header.id}.json` };
}

function toFixtureModel(model: GenericModel): ProductBrandFixtureModel {
	return { ...(model as ProductBrandFixtureModel), path: `${(model as ProductBrandFixtureModel).header.id}.json` };
}

function annotationValue(model: MutableGenericModel, name: string): string | undefined {
	return model.header.annotations?.find((annotation) => annotation.name === name)?.value;
}

function parseBindings(value: string | undefined): readonly BindingEntry[] {
	const parsedValue = value === undefined ? [] : (JSON.parse(value) as unknown);

	return Array.isArray(parsedValue) ? parsedValue.filter(isBindingEntry) : [];
}

interface MutableGenericModel {
	header: { annotations?: ModelAnnotation[]; modelReferences?: ModelReference[] };
}
interface ModelAnnotation {
	readonly name?: string;
	readonly value?: string;
}
interface ModelReference {
	readonly purpose?: string;
	readonly reference?: string;
}
interface BindingEntry {
	readonly details?: { readonly name?: string; readonly components?: readonly BindingComponent[] };
}
interface BindingComponent {
	readonly id?: string;
	readonly props?: Record<string, unknown>;
	readonly models: readonly BindingComponentModel[];
}
interface BindingComponentModel {
	readonly name: string;
	readonly use: string;
}

function isReference(value: unknown, purpose: string): value is { readonly reference: string } {
	return isRecord(value) && value.purpose === purpose && typeof value.reference === "string";
}

function isBindingEntry(value: unknown): value is BindingEntry {
	return isRecord(value) && (value.details === undefined || isRecord(value.details));
}

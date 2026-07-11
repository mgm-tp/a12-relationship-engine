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
import { loadFixtureModel, createFixtureContext } from "../internal/test-support/fixture-context-factory.js";
import { buildModelIndex, type ModelIndex, type IndexedModel } from "../internal/test-support/model-index.js";
import { FORM_MODEL_VERSION, DOCUMENT_MODEL_VERSION } from "../../src/internal/steps/RuM/extraction/constants.js";

import { isRecord } from "./fixture-utils.js";

/** Available-items query ID generated for the CategoryCategory DropDown binding. */
export const CATEGORY_AVAILABLE_QUERY_ID = "Category-form-binding-ChildCategoryDropDown-available-query";
/** Selected-item query ID generated for the CategoryCategory DropDown binding. */
export const CATEGORY_SELECTED_QUERY_ID = "Category-form-binding-ChildCategoryDropDown-selected-query";
/** Available-items query ID generated for the PolicyHolder DropDown binding. */
export const POLICY_HOLDER_AVAILABLE_QUERY_ID = "PolicyHolder-form-binding-PolicyHolderBinding-available-query";
/** Selected-item query ID generated for the PolicyHolder DropDown binding. */
export const POLICY_HOLDER_SELECTED_QUERY_ID = "PolicyHolder-form-binding-PolicyHolderBinding-selected-query";

const LINK_FORM_ID = "Category-link-form";

/** Minimal header annotation shape for test assertions. */
export interface FixtureAnnotation {
	readonly name?: string;
	readonly value?: string;
}

/** Minimal header model-reference shape for test assertions. */
export interface FixtureModelRef {
	readonly purpose?: string;
	readonly modelType?: string;
	readonly reference?: string;
}

/** Fixture model with typed header annotations and model references. */
export interface FixtureModel extends IndexedModel {
	readonly header: IndexedModel["header"] & {
		readonly modelVersion?: string;
		readonly annotations?: readonly FixtureAnnotation[];
		readonly modelReferences?: readonly FixtureModelRef[];
	};
	readonly content?: unknown;
}

/** Output of a single DropDown extraction run. */
export interface DropDownExtractionResult {
	readonly addedModels: readonly FixtureModel[];
	readonly addedQueryIds: readonly string[];
	readonly updatedForm: FixtureModel;
	readonly rumModel: FixtureModel;
	readonly index: ModelIndex<FixtureModel>;
}

const CATEGORY_FIXTURE_PATHS = [
	"products/CategoryCategory/relationship.json",
	"products/CategoryCategory/overview-available.json"
] as const;

const POLICY_HOLDER_FIXTURE_PATHS = [
	"scdm/PolicyHolder/relationship.json",
	"scdm/PolicyHolder/overview-available.json"
] as const;

function createSimpleDocumentModel(id: string): GenericModel {
	return { header: { id, modelType: "document", modelVersion: DOCUMENT_MODEL_VERSION } } as unknown as GenericModel;
}

function createInlineLinkFormModel(): GenericModel {
	return {
		header: {
			id: LINK_FORM_ID,
			modelType: "form",
			modelVersion: FORM_MODEL_VERSION,
			annotations: [],
			modelReferences: []
		}
	} as unknown as GenericModel;
}

interface MutableForm {
	header: {
		id: string;
		modelType: string;
		modelVersion: string;
		annotations?: FixtureAnnotation[];
		modelReferences?: FixtureModelRef[];
	};
	content?: unknown;
}

interface BindingEntry {
	readonly details?: {
		readonly name?: string;
		readonly components?: readonly { readonly models?: readonly { readonly name: string; readonly use: string }[] }[];
	};
}

function annotationValue(form: MutableForm, name: string): string | undefined {
	return form.header.annotations?.find((annotation) => annotation.name === name)?.value;
}

function parseBindingConfig(value: string | undefined): readonly BindingEntry[] {
	if (value === undefined) {
		return [];
	}

	const parsed = JSON.parse(value) as unknown;

	return Array.isArray(parsed) ? (parsed as readonly BindingEntry[]) : [];
}

function createDropDownOnlyForm(): GenericModel {
	const form = structuredClone(loadFixtureModel("products/CategoryCategory/form.json")) as unknown as MutableForm;
	const dropDownBindings = parseBindingConfig(annotationValue(form, "bindingConfiguration")).filter(
		(binding) => binding.details?.name === "ChildCategoryDropDown"
	);

	form.header.annotations = (form.header.annotations ?? []).map((annotation) =>
		annotation.name === "bindingConfiguration" ? { ...annotation, value: JSON.stringify(dropDownBindings) } : annotation
	);

	return form as unknown as GenericModel;
}

function createDropDownFormWithLinkModel(): GenericModel {
	const form = structuredClone(loadFixtureModel("products/CategoryCategory/form.json")) as unknown as MutableForm;
	const dropDownBindings = parseBindingConfig(annotationValue(form, "bindingConfiguration"))
		.filter((binding) => binding.details?.name === "ChildCategoryDropDown")
		.map((binding) => ({
			...binding,
			details: {
				...binding.details,
				components: (binding.details?.components ?? []).map((component) => ({
					...component,
					models: [
						...(component.models ?? []).filter((m) => m.use === "candidate"),
						{ name: LINK_FORM_ID, use: "link" }
					]
				}))
			}
		}));

	form.header.annotations = (form.header.annotations ?? []).map((annotation) =>
		annotation.name === "bindingConfiguration" ? { ...annotation, value: JSON.stringify(dropDownBindings) } : annotation
	);
	form.header.modelReferences = [
		...(form.header.modelReferences ?? []),
		{ modelType: "form", purpose: "bindingReference", reference: LINK_FORM_ID }
	];

	return form as unknown as GenericModel;
}

function runExtraction(
	form: GenericModel,
	otherWorkspaceModels: readonly GenericModel[],
	keepModels: boolean
): DropDownExtractionResult {
	const allWorkspaceModels = [form, ...otherWorkspaceModels];
	const harness = createFixtureContext({ models: allWorkspaceModels, config: { keepModels } });
	const updatedForm = toFixtureModel(
		extractionTransform(form, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, harness.context)
	);
	const addedModels = harness.getAddedModels().map(toFixtureModel);
	const addedQueryIds = addedModels.filter((m) => m.header.modelType === "query").map((m) => m.header.id);
	const rumModel = requireModel(
		addedModels.find((m) => m.header.modelType === "relationship-ui"),
		"DropDown relationship-ui"
	);
	const allModels = [...allWorkspaceModels.map(toFixtureModel), ...addedModels, updatedForm];
	const byId = new Map(allModels.map((m) => [m.header.id, m]));
	const index = buildModelIndex<FixtureModel>([...byId.values()].map((m) => ({ ...m, path: `${m.header.id}.json` })));

	return { addedModels, addedQueryIds, updatedForm, rumModel, index };
}

function toFixtureModel(model: GenericModel): FixtureModel {
	const m = model as unknown as FixtureModel;

	return { ...m, path: `${m.header.id}.json` };
}

function requireModel(model: FixtureModel | undefined, description: string): FixtureModel {
	if (model === undefined) {
		throw new Error(`Expected ${description} to be present`);
	}

	return model;
}

/**
 * Runs CategoryCategory DropDown extraction with the given keepModels flag.
 * The form is filtered to contain only the ChildCategoryDropDown binding.
 */
export function runCategoryCategoryDropDownExtraction(keepModels: boolean): DropDownExtractionResult {
	return runExtraction(
		createDropDownOnlyForm(),
		[...CATEGORY_FIXTURE_PATHS.map(loadFixtureModel), createSimpleDocumentModel("Category-document")],
		keepModels
	);
}

/**
 * Runs CategoryCategory DropDown extraction where the DropDown component references
 * a link form model. This triggers the edit button in the generated RuM.
 */
export function runDropDownWithLinkFormExtraction(): DropDownExtractionResult {
	return runExtraction(
		createDropDownFormWithLinkModel(),
		[
			...CATEGORY_FIXTURE_PATHS.map(loadFixtureModel),
			createSimpleDocumentModel("Category-document"),
			createInlineLinkFormModel()
		],
		false
	);
}

/**
 * Runs PolicyHolder DropDown extraction (keepModels=false).
 * The PolicyHolder binding has `modificationConfiguration.addButtonLabel`, which
 * triggers the add button in the generated RuM.
 */
export function runPolicyHolderDropDownExtraction(): DropDownExtractionResult {
	return runExtraction(
		loadFixtureModel("scdm/PolicyHolder/form.json"),
		[
			...POLICY_HOLDER_FIXTURE_PATHS.map(loadFixtureModel),
			createSimpleDocumentModel("PolicyHolder-document"),
			createSimpleDocumentModel("Policy-document")
		],
		false
	);
}

/** Returns the RuM component button elements as an opaque array. */
export function getButtons(rumModel: FixtureModel): readonly Record<string, unknown>[] {
	if (!isRecord(rumModel.content)) {
		return [];
	}

	const component = rumModel.content.component;

	if (!isRecord(component)) {
		return [];
	}

	return Array.isArray(component.buttons) ? (component.buttons as Record<string, unknown>[]) : [];
}

/** Returns true when the RuM has a button with the given event name. */
export function hasButton(rumModel: FixtureModel, event: string): boolean {
	return getButtons(rumModel).some((button) => button.event === event);
}

/** Returns the RuM header model references array. */
export function getRumModelRefs(rumModel: FixtureModel): readonly FixtureModelRef[] {
	return rumModel.header.modelReferences ?? [];
}

/** Returns the form header annotations array. */
export function getFormAnnotations(form: FixtureModel): readonly FixtureAnnotation[] {
	return form.header.annotations ?? [];
}

/** Returns the form header model references array. */
export function getFormModelRefs(form: FixtureModel): readonly FixtureModelRef[] {
	return form.header.modelReferences ?? [];
}

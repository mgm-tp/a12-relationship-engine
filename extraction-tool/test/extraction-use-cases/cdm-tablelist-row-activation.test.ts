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

import { it, vi, expect, describe } from "vitest";

import type { GenericModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import { extractionTransform } from "../../src/internal/steps/RuM/extraction/index.js";
import { DOCUMENT_MODEL_VERSION } from "../../src/internal/steps/RuM/extraction/constants.js";
import { loadFixtureModel, createFixtureContext } from "../internal/test-support/fixture-context-factory.js";

import { isRecord, getRowActivation } from "./fixture-utils.js";

const CLAIM_LOCATION_BINDING_NAME = "binding-ClaimLocation";
const CLAIM_LOCATION_SELECTED_OVERVIEW_ID = "ClaimLocation_location_SelectedItemsOverview";
const CLAIM_LOCATION_EDIT_OVERVIEW_ID = `${CLAIM_LOCATION_SELECTED_OVERVIEW_ID}-edit`;
const ADDRESS_OVERVIEW_ID = "Address-overview";

interface ExtractionResult {
	readonly rumModel: GenericModel;
	readonly survivingModels: readonly GenericModel[];
	readonly findModel: (id: string) => GenericModel | undefined;
}

describe("CDM TableList row activation", () => {
	it("omits direct selected rowActivation for CDM TableList output", () => {
		const result = runClaimLocationCdmExtraction();
		const directOverview = requireModel(
			result.findModel(CLAIM_LOCATION_SELECTED_OVERVIEW_ID),
			CLAIM_LOCATION_SELECTED_OVERVIEW_ID
		);

		expect(getSelectedItemsOverviewModel(result.rumModel)).toBe(CLAIM_LOCATION_SELECTED_OVERVIEW_ID);
		expect(getRowActivation(directOverview)).toBeUndefined();
	});

	it("keeps selected edit activation for CDM TableList output", () => {
		const result = runClaimLocationCdmExtraction();
		const editOverview = requireModel(
			result.findModel(CLAIM_LOCATION_EDIT_OVERVIEW_ID),
			CLAIM_LOCATION_EDIT_OVERVIEW_ID
		);

		expect(getEditSelectedItemsOverviewModel(result.rumModel)).toBe(CLAIM_LOCATION_EDIT_OVERVIEW_ID);
		expect(getRowActivation(editOverview)).toEqual({ type: "event", event: "event_delete_link" });
	});

	it("keeps exact candidate activation for CDM edit and DualPane paths", () => {
		const result = runClaimLocationCdmExtraction();
		const availableOverview = requireModel(result.findModel(ADDRESS_OVERVIEW_ID), ADDRESS_OVERVIEW_ID);
		const addLinkOverviewIds = findOverviewIdsByRowActivation(result, { type: "event", event: "event_add_link" });

		expect(getEditAvailableItemsOverviewModel(result.rumModel)).toBe(ADDRESS_OVERVIEW_ID);
		expect(getRowActivation(availableOverview)).toEqual({ type: "event", event: "event_add_link" });
		expect(addLinkOverviewIds).toEqual([ADDRESS_OVERVIEW_ID]);
	});
});

function runClaimLocationCdmExtraction(): ExtractionResult {
	const formModel = createClaimLocationOnlyFormModel();
	const workspaceModels: GenericModel[] = [
		formModel,
		loadFixtureModel("shared/relationship-models/ClaimLocation.json"),
		loadFixtureModel("shared/overview-models/Address-overview.json"),
		loadFixtureModel("shared/overview-models/ClaimLocation_location_SelectedItemsOverview.json"),
		loadFixtureModel("shared/document-models/Address-document.json"),
		loadFixtureModel("shared/document-models/Claim-document.json"),
		loadFixtureModel("shared/document-models/ContractCDM.json"),
		loadFixtureModel("shared/document-models/ClaimLocation_claim____generated.json"),
		loadFixtureModel("shared/document-models/ClaimLocation_location____generated.json"),
		createDocumentModel("Contract-document")
	];
	const harness = createFixtureContext({ models: workspaceModels, config: { keepModels: false } });
	const updatedForm = extractionTransform(formModel, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, harness.context);
	const deletedIds = new Set(harness.getDeletedIds());
	const survivingModels = [...workspaceModels, ...harness.getAddedModels(), updatedForm].filter(
		(model) => !deletedIds.has(getHeader(model).id)
	);
	const rumModel = requireModel(
		harness.getAddedModels().find((model) => getHeader(model).modelType === "relationship-ui"),
		"ClaimLocation relationship-ui"
	);

	return {
		rumModel,
		survivingModels,
		findModel: (id) => survivingModels.findLast((model) => getHeader(model).id === id)
	};
}

function findOverviewIdsByRowActivation(result: ExtractionResult, activation: unknown): readonly string[] {
	return result.survivingModels.flatMap((model) =>
		getHeader(model).modelType === "overview" && JSON.stringify(getRowActivation(model)) === JSON.stringify(activation)
			? [getHeader(model).id]
			: []
	);
}

function createClaimLocationOnlyFormModel(): GenericModel {
	const formModel = structuredClone(loadFixtureModel("shared/form-models/multi-binding-form.json")) as MutableFormModel;
	const bindingAnnotation = formModel.header.annotations?.find(
		(annotation) => annotation.name === "bindingConfiguration"
	);
	const bindings = parseBindings(bindingAnnotation?.value).filter(
		(binding) => binding.details?.name === CLAIM_LOCATION_BINDING_NAME
	);

	if (bindingAnnotation !== undefined) {
		bindingAnnotation.value = JSON.stringify(bindings);
	}

	formModel.header.modelReferences = (formModel.header.modelReferences ?? []).filter(
		(reference) =>
			reference.modelType === "document" ||
			reference.reference === ADDRESS_OVERVIEW_ID ||
			reference.reference === CLAIM_LOCATION_SELECTED_OVERVIEW_ID
	);

	return formModel as GenericModel;
}

function getSelectedItemsOverviewModel(rumModel: GenericModel): string | undefined {
	const component = getRumComponent(rumModel);

	return typeof component.selectedItemsOverviewModel === "string" ? component.selectedItemsOverviewModel : undefined;
}

function getEditSelectedItemsOverviewModel(rumModel: GenericModel): string | undefined {
	const component = getRumComponent(rumModel);
	const editConfiguration = isRecord(component.editConfiguration) ? component.editConfiguration : undefined;

	return typeof editConfiguration?.selectedItemsOverviewModel === "string"
		? editConfiguration.selectedItemsOverviewModel
		: undefined;
}

function getEditAvailableItemsOverviewModel(rumModel: GenericModel): string | undefined {
	const component = getRumComponent(rumModel);
	const editConfiguration = isRecord(component.editConfiguration) ? component.editConfiguration : undefined;

	return typeof editConfiguration?.availableItemsOverviewModel === "string"
		? editConfiguration.availableItemsOverviewModel
		: undefined;
}

function getRumComponent(rumModel: GenericModel): Record<string, unknown> {
	const content = getContent(rumModel);
	const component = content !== undefined && isRecord(content.component) ? content.component : undefined;

	return requireModel(component, "relationship-ui component");
}

function createDocumentModel(id: string): GenericModel {
	return {
		header: { id, modelType: "document", modelVersion: DOCUMENT_MODEL_VERSION },
		content: { modelInfo: { name: id }, modelRoot: { rootGroups: [] } }
	} as unknown as GenericModel;
}

function getHeader(model: GenericModel): { readonly id: string; readonly modelType: string } {
	const header = (model as { readonly header?: unknown }).header;

	if (!isRecord(header) || typeof header.id !== "string" || typeof header.modelType !== "string") {
		throw new Error("Expected model header with id and modelType");
	}

	return { id: header.id, modelType: header.modelType };
}

function getContent(model: GenericModel): Record<string, unknown> | undefined {
	const content = (model as { readonly content?: unknown }).content;

	return isRecord(content) ? content : undefined;
}

function parseBindings(value: string | undefined): readonly BindingEntry[] {
	const parsedValue = value === undefined ? [] : (JSON.parse(value) as unknown);

	return Array.isArray(parsedValue) ? parsedValue.filter(isBindingEntry) : [];
}

function isBindingEntry(value: unknown): value is BindingEntry {
	return isRecord(value) && isRecord(value.details);
}

function requireModel<Model>(model: Model | undefined, description: string): Model {
	if (model === undefined) {
		throw new Error(`Expected ${description} to be present`);
	}

	return model;
}

interface MutableFormModel {
	header: {
		annotations?: BindingAnnotation[];
		modelReferences?: ModelReference[];
	};
}

interface BindingAnnotation {
	readonly name?: string;
	value?: string;
}

interface ModelReference {
	readonly modelType?: string;
	readonly reference?: string;
}

interface BindingEntry {
	readonly details?: { readonly name?: string };
}

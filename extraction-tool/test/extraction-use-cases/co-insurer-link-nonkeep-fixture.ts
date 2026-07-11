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
import { buildModelIndex, type ModelIndex } from "../internal/test-support/model-index.js";
import { DOCUMENT_MODEL_VERSION } from "../../src/internal/steps/RuM/extraction/constants.js";
import {
	loadFixtureModel,
	loadFixtureModels,
	createFixtureContext
} from "../internal/test-support/fixture-context-factory.js";

import { isRecord } from "./fixture-utils.js";
import { toFixtureModel, type FixtureModel } from "./location-dualpane-fixture.js";

/** Base selected items overview for the CoInsurer DualPane LINK fixture. */
export const CO_INSURER_SELECTED_OVERVIEW_ID = "CoInsurerLinks-overview";
/** Query model generated to back the selected overview in non-keepModels mode. */
export const CO_INSURER_QUERY_MODEL_ID = `${CO_INSURER_SELECTED_OVERVIEW_ID}-query`;
/** Generated document model backing the selected items overview (queued for deletion in non-keepModels). */
export const CO_INSURER_GENERATED_DOCUMENT_ID = "CoInsurer_businessPartner____generated";
/** -edit clone id; must NOT appear in non-keepModels DualPane output. */
export const CO_INSURER_EDIT_CLONE_ID = `${CO_INSURER_SELECTED_OVERVIEW_ID}-edit`;

/**
 * Result returned by runCoInsurerDualPaneNonKeepExtraction.
 */
export interface CoInsurerNonKeepResult {
	readonly workspaceModels: readonly FixtureModel[];
	readonly addedModels: readonly FixtureModel[];
	readonly updatedForm: FixtureModel;
	readonly deletedIds: readonly string[];
	readonly survivingModels: readonly FixtureModel[];
	readonly index: ModelIndex<FixtureModel>;
	readonly findAddedById: (id: string) => FixtureModel | undefined;
	readonly findSurvivingById: (id: string) => FixtureModel | undefined;
}

const FIXTURE_PATHS = [
	"shared/relationship-models/CoInsurer.json",
	"shared/overview-models/CoInsurerLinks-overview.json",
	"shared/overview-models/BusinessPartner_AvailableItemsOverview.json",
	"shared/document-models/CoInsurer_contract____generated.json",
	"shared/document-models/BusinessPartner-document.json"
] as const;

/**
 * Runs the CoInsurer DualPane LINK fixture through extraction with keepModels: false.
 *
 * The Contract-form is filtered to only the DualPane binding to isolate DualPane behavior —
 * the TableList binding would otherwise generate an -edit clone via its edit-selected path,
 * which would obscure the DualPane non-keepModels invariant (no -edit clone).
 */
export function runCoInsurerDualPaneNonKeepExtraction(): CoInsurerNonKeepResult {
	const formModel = createDualPaneOnlyContractForm();
	const workspaceModels = [
		...loadFixtureModels(FIXTURE_PATHS),
		formModel,
		createContractDocumentModel(),
		createLinkDocumentModel(),
		createGeneratedBusinessPartnerDoc()
	].map(toFixtureModel);
	const harness = createFixtureContext({ models: workspaceModels, config: { keepModels: false } });
	const updatedForm = toFixtureModel(
		extractionTransform(formModel, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, harness.context)
	);
	const addedModels = harness.getAddedModels().map(toFixtureModel);
	const deletedIds = harness.getDeletedIds();
	const survivingModels = mergeSurvivingModels(workspaceModels, addedModels, updatedForm, deletedIds);
	const index = buildModelIndex<FixtureModel>(survivingModels.map(withPath));

	return {
		workspaceModels,
		addedModels,
		updatedForm,
		deletedIds,
		survivingModels,
		index,
		findAddedById: (id) => addedModels.find((model) => model.header.id === id),
		findSurvivingById: (id) => survivingModels.find((model) => model.header.id === id)
	};
}

/**
 * Loads Contract-form from fixture and strips all bindings except CoInsurerBinding_DualPane.
 * Also removes the PolicyHolder bindingReference from modelReferences, since that binding is
 * filtered out — unresolvable refs are preserved by P4 (not pruned), so the test would fail
 * the "all bindingReferences pruned" assertion if the PolicyHolder ref remains.
 */
function createDualPaneOnlyContractForm(): GenericModel {
	const form = structuredClone(loadFixtureModel("shared/form-models/Contract-form.json")) as MutableForm;
	const bindingAnnotation = form.header.annotations?.find((annotation) => annotation.name === "bindingConfiguration");

	if (bindingAnnotation) {
		const allBindings = JSON.parse(bindingAnnotation.value) as unknown[];
		bindingAnnotation.value = JSON.stringify(allBindings.filter(isDualPaneBinding));
	}

	// Remove PolicyHolder-owned bindingReference (belongs to the filtered-out binding)
	form.header.modelReferences = (form.header.modelReferences ?? []).filter(
		(ref) => !isRecord(ref) || ref.reference !== "PolicyHolderLinks-overview"
	);

	return form as GenericModel;
}

/** Returns true when a raw binding object is the CoInsurer DualPane binding. */
function isDualPaneBinding(binding: unknown): boolean {
	if (!isRecord(binding)) {
		return false;
	}

	const details = isRecord(binding.details) ? binding.details : {};

	return details.name === "CoInsurerBinding_DualPane";
}

/** Minimal Contract document model (just needs a valid header for workspace resolution). */
function createContractDocumentModel(): GenericModel {
	return {
		header: { id: "Contract-document", modelType: "document", modelVersion: DOCUMENT_MODEL_VERSION },
		content: { modelRoot: { rootGroups: [] } }
	} as GenericModel;
}

/** Link document model for CoInsurer with the field used in column linkRef assertions. */
function createLinkDocumentModel(): GenericModel {
	return {
		header: { id: "CoInsurerAdditionalFields", modelType: "document", modelVersion: DOCUMENT_MODEL_VERSION },
		content: {
			modelRoot: {
				rootGroups: [
					{
						type: "Group",
						id: "G1",
						name: "additionalFields",
						Group: {
							repeatability: 1,
							elements: [
								{ type: "Field", id: "field_de37b", name: "field_de37b", Field: { fieldType: { type: "StringType" } } }
							]
						}
					}
				]
			}
		}
	} as GenericModel;
}

/**
 * Generated document backing CoInsurerLinks-overview, built with includeConfig.reference so
 * extraction correctly emits LINK/CHILD column refs instead of treating includes as opaque.
 */
function createGeneratedBusinessPartnerDoc(): GenericModel {
	return {
		header: {
			id: CO_INSURER_GENERATED_DOCUMENT_ID,
			modelType: "document",
			modelVersion: DOCUMENT_MODEL_VERSION,
			modelReferences: [
				{ alias: "Contract-document", modelType: "document", purpose: "include", reference: "Contract-document" },
				{
					alias: "CoInsurerAdditionalFields",
					modelType: "document",
					purpose: "include",
					reference: "CoInsurerAdditionalFields"
				}
			]
		},
		content: {
			modelRoot: {
				rootGroups: [
					includedGroup("G2", "target", "I4", "contract", "Contract-document"),
					includedGroup("G3", "relationship", "I5", "additionalFields", "CoInsurerAdditionalFields")
				]
			}
		}
	} as GenericModel;
}

function includedGroup(
	groupId: string,
	groupName: string,
	includeId: string,
	includeName: string,
	reference: string
): unknown {
	return {
		type: "Group",
		id: groupId,
		name: groupName,
		Group: {
			repeatability: 1,
			elements: [
				{ type: "Group", id: includeId, name: includeName, Group: { repeatability: 1, includeConfig: { reference } } }
			]
		}
	};
}

function mergeSurvivingModels(
	initial: readonly FixtureModel[],
	added: readonly FixtureModel[],
	updatedForm: FixtureModel,
	deletedIds: readonly string[]
): readonly FixtureModel[] {
	const deletedSet = new Set(deletedIds);
	const byId = new Map<string, FixtureModel>();

	for (const model of [...initial, ...added, updatedForm]) {
		if (!deletedSet.has(model.header.id)) {
			byId.set(model.header.id, model);
		}
	}

	return [...byId.values()];
}

function withPath(model: FixtureModel): FixtureModel {
	return { ...model, path: `${model.header.id}.json` };
}

interface MutableForm {
	header: {
		id: string;
		modelType: string;
		modelVersion: string;
		annotations?: Array<{ name: string; value: string }>;
		modelReferences?: unknown[];
	};
	content?: unknown;
}

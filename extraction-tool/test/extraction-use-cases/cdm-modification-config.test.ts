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
import { FORM_MODEL_VERSION } from "../../src/internal/steps/RuM/extraction/constants.js";
import type { ModelNotFoundError } from "../../src/internal/steps/RuM/extraction/model-not-found-error.js";
import { loadFixtureModel, createFixtureContext } from "../internal/test-support/fixture-context-factory.js";

import { isRecord } from "./fixture-utils.js";

/** RuM id for the PolicyHolder fixture binding (button-label-only case). */
const POLICY_HOLDER_RUM_ID = "PolicyHolder-form-binding-PolicyHolderBinding_RuM";

const POLICY_DOCUMENT_ID = "Policy-document";

/** Runs extraction on the ModificationConfig SCDM fixture with keepModels enabled. */
function runModificationConfigExtraction(): readonly GenericModel[] {
	const formModel = loadFixtureModel("scdm/ModificationConfig/form.json");
	const harness = createFixtureContext({
		fixturePaths: ["scdm/ModificationConfig/relationship.json", "scdm/ModificationConfig/overview-selected.json"],
		models: [makeDocumentModel(POLICY_DOCUMENT_ID)],
		config: { keepModels: true }
	});

	extractionTransform(formModel, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, harness.context);

	return harness.getAddedModels();
}

/** Runs extraction on the PolicyHolder SCDM fixture (add-button-label-only config). */
function runPolicyHolderExtraction(): readonly GenericModel[] {
	const formModel = loadFixtureModel("scdm/PolicyHolder/form.json");
	const harness = createFixtureContext({
		fixturePaths: ["scdm/PolicyHolder/relationship.json", "scdm/PolicyHolder/overview-available.json"],
		models: [makeDocumentModel(POLICY_DOCUMENT_ID)],
		config: { keepModels: true }
	});

	extractionTransform(formModel, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, harness.context);

	return harness.getAddedModels();
}

/** Creates a minimal form binding without any modificationConfiguration. */
function makeFormWithNoModificationConfig(): GenericModel {
	return {
		header: {
			id: "NoConfig-form",
			modelType: "form",
			modelVersion: FORM_MODEL_VERSION,
			annotations: [
				{
					name: "bindingConfiguration",
					value: JSON.stringify([
						{
							type: "relationship",
							elementId: "section-main",
							details: {
								name: "PolicyBeneficiaryBinding",
								relationshipName: "PolicyBeneficiary",
								targetRole: "beneficiary",
								metaInformation: { version: "1.0.0" },
								components: [
									{
										id: "comp-1",
										name: "DualPaneSelection",
										models: [{ name: "PolicyBeneficiary_SelectedItemsOverview", use: "link" }]
									}
								]
							}
						}
					])
				}
			],
			modelReferences: [
				{ modelType: "document", purpose: "data binding", reference: "Policy-document" },
				{
					modelType: "overview",
					purpose: "bindingReference",
					reference: "PolicyBeneficiary_SelectedItemsOverview"
				}
			]
		},
		content: {
			screens: [
				{
					id: "screen-main",
					name: "Main",
					screenElements: [{ type: "Section", id: "section-main", screenElements: [] }]
				}
			]
		}
	} as unknown as GenericModel;
}

function makeDocumentModel(id: string): GenericModel {
	return {
		header: { id, modelType: "document", modelVersion: FORM_MODEL_VERSION },
		content: { modelInfo: { name: id }, modelRoot: { rootGroups: [] } }
	} as unknown as GenericModel;
}

/**
 * Returns the modificationConfiguration object from the RuM content for the
 * given RuM id, or undefined if absent. Asserts the RuM was produced.
 */
function getModificationConfig(addedModels: readonly GenericModel[], rumId: string): unknown {
	const rum = addedModels.find(
		(m) =>
			isRecord(m) &&
			isRecord((m as { header?: unknown }).header) &&
			(m as { header: { id: unknown } }).header.id === rumId
	);

	expect(rum, `Expected RuM "${rumId}" to be produced by extraction`).toBeDefined();
	const content = isRecord(rum) ? (rum as { content?: unknown }).content : undefined;

	return isRecord(content) ? (content as { modificationConfiguration?: unknown }).modificationConfiguration : undefined;
}

describe("CDM modificationConfiguration preservation", () => {
	it("throws when the fixture references a missing generated document", () => {
		expect(runModificationConfigExtraction).toThrowError(
			expect.objectContaining<Partial<ModelNotFoundError>>({
				name: "ModelNotFoundError",
				modelId: "PolicyBeneficiary_SelectedItemsOverview____generated"
			})
		);
	});

	it("surfaces the same model-not-found error on repeated extraction", () => {
		expect(runModificationConfigExtraction).toThrowError(
			expect.objectContaining<Partial<ModelNotFoundError>>({
				name: "ModelNotFoundError",
				modelId: "PolicyBeneficiary_SelectedItemsOverview____generated"
			})
		);
	});

	it("modificationConfiguration button-label-only fields omitted from RuM", () => {
		const addedModels = runPolicyHolderExtraction();
		const modConfig = getModificationConfig(addedModels, POLICY_HOLDER_RUM_ID);

		expect(modConfig).toBeUndefined();
	});

	it("throws for no-config forms when the referenced generated document is missing", () => {
		const formModel = makeFormWithNoModificationConfig();
		const harness = createFixtureContext({
			fixturePaths: ["scdm/ModificationConfig/relationship.json", "scdm/ModificationConfig/overview-selected.json"],
			models: [makeDocumentModel(POLICY_DOCUMENT_ID)],
			config: { keepModels: true }
		});

		expect(() =>
			extractionTransform(formModel, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, harness.context)
		).toThrowError(
			expect.objectContaining<Partial<ModelNotFoundError>>({
				name: "ModelNotFoundError",
				modelId: "PolicyBeneficiary_SelectedItemsOverview____generated"
			})
		);
	});
});

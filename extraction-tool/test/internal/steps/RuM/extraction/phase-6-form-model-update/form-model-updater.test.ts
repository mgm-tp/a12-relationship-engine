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

import { it, expect, describe } from "vitest";

import type { ModelReference } from "@com.mgmtp.a12.base/base-model-api";
import type { GenericModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import { RUM_VERSION } from "../../../../../../src/internal/steps/RuM/extraction/constants.js";
import type { FinalRuM, BindingResult } from "../../../../../../src/internal/steps/RuM/extraction/types.js";
import { updateFormModel } from "../../../../../../src/internal/steps/RuM/extraction/phase-6-form-model-update/form-model-updater.js";
import {
	getAnnotations,
	getModelReferences
} from "../../../../../../src/internal/steps/RuM/extraction/model-accessors/header-accessors.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createFormModel(overrides?: {
	annotations?: ReadonlyArray<{ readonly name: string; readonly value?: string }>;
	modelReferences?: ReadonlyArray<{
		readonly reference: string;
		readonly modelType: string;
		readonly purpose?: string;
	}>;
}): GenericModel {
	return {
		header: {
			id: "TestForm",
			modelType: "form",
			modelVersion: "1.0.0",
			annotations: [
				{ name: "bindingConfiguration", value: "{}" },
				{ name: "roles", value: "test-role" },
				...(overrides?.annotations ?? [])
			],
			modelReferences: [
				{ reference: "PersonDM", modelType: "document", purpose: "document" },
				{ reference: "LinkForm", modelType: "form", purpose: "form" },
				...(overrides?.modelReferences ?? [])
			]
		}
	};
}

function createBindingResult(overrides?: {
	modelId?: string;
	bindingName?: string;
	elementId?: string;
	modelReferences?: readonly ModelReference[];
}): BindingResult {
	const modelId = overrides?.modelId ?? "TestForm-binding-binding1_RuM";

	return {
		ruModel: {
			header: {
				id: modelId,
				modelType: "relationship-ui",
				modelVersion: RUM_VERSION,
				modelReferences: [...(overrides?.modelReferences ?? [])],
				annotations: []
			},
			content: {
				relationshipName: "TestRel",
				targetRole: "Target",
				component: { componentType: "DualPaneSelection" }
			}
		},
		bindingName: overrides?.bindingName ?? "binding1",
		elementId: overrides?.elementId ?? "elem1",
		pageSizeMigrations: [],
		rowActionMigrations: [],
		rowActivationMigrations: [],
		overviewLabelMigrations: []
	};
}

function createFinalRuM(overrides?: {
	modelId?: string;
	elementId?: string;
	formModelId?: string;
	modelReferences?: readonly ModelReference[];
}): FinalRuM {
	const modelId = overrides?.modelId ?? "TestForm-binding-binding1_RuM";

	return {
		model: {
			header: {
				id: modelId,
				modelType: "relationship-ui",
				modelVersion: RUM_VERSION,
				modelReferences: [...(overrides?.modelReferences ?? [])],
				annotations: []
			},
			content: {
				relationshipName: "TestRel",
				targetRole: "Target",
				component: { componentType: "DualPaneSelection" }
			}
		},
		elementId: overrides?.elementId ?? "elem1",
		formModelId: overrides?.formModelId ?? "TestForm"
	};
}

function createLegacyBindingReferences(): readonly ModelReference[] {
	return [
		{ reference: "TeamCandidates-overview", modelType: "overview", purpose: "overview" },
		{ reference: "TeamPerson_Person_LinkOverview-overview", modelType: "overview", purpose: "overview" },
		{ reference: "TeamPerson_LinkForm", modelType: "form", purpose: "form" }
	];
}

// ---------------------------------------------------------------------------
// updateFormModel
// ---------------------------------------------------------------------------

describe("updateFormModel", () => {
	it("should remove bindingConfiguration annotation when keepModels=false", () => {
		const formModel = createFormModel();
		const result = updateFormModel(formModel, [], [], { keepModels: false });

		const annotations = getAnnotations(result);
		const hasBindingConfig = annotations.some((a) => a.name === "bindingConfiguration");
		expect(hasBindingConfig).toBe(false);
	});

	it("should keep bindingConfiguration annotation when keepModels=true", () => {
		const formModel = createFormModel();
		const result = updateFormModel(formModel, [], [], { keepModels: true });

		const annotations = getAnnotations(result);
		const hasBindingConfig = annotations.some((a) => a.name === "bindingConfiguration");
		expect(hasBindingConfig).toBe(true);
	});

	it("should keep non-bindingConfiguration annotations", () => {
		const formModel = createFormModel();
		const result = updateFormModel(formModel, [], [], { keepModels: false });

		const annotations = getAnnotations(result);
		const hasRoles = annotations.some((a) => a.name === "roles");
		expect(hasRoles).toBe(true);
	});

	it("should add modelReferences for RuM model IDs from bindingResults", () => {
		const formModel = createFormModel();
		const br = createBindingResult({ modelId: "TestForm-binding-binding1_RuM" });
		const result = updateFormModel(formModel, [br], [], { keepModels: false });

		const refs = getModelReferences(result);
		const ruRef = refs.find((r) => r.modelType === "relationship-ui");
		expect(ruRef).toBeDefined();
		expect(ruRef?.reference).toBe("TestForm-binding-binding1_RuM");
		expect(ruRef?.purpose).toBe("relationship-ui");
	});

	it("should add modelReferences for RuM model IDs from finalRuMs", () => {
		const formModel = createFormModel();
		const fr = createFinalRuM({ modelId: "TestForm-binding-binding1_RuM" });
		const result = updateFormModel(formModel, [], [fr], { keepModels: false });

		const refs = getModelReferences(result);
		const ruRef = refs.find((r) => r.modelType === "relationship-ui");
		expect(ruRef).toBeDefined();
		expect(ruRef?.reference).toBe("TestForm-binding-binding1_RuM");
	});

	it("should deduplicate RuM model IDs from both bindingResults and finalRuMs", () => {
		const formModel = createFormModel();
		const br = createBindingResult({ modelId: "UniqueFromBR_RuM" });
		const fr = createFinalRuM({ modelId: "UniqueFromFR_RuM" });
		const brDuplicate = createBindingResult({ modelId: "Dup_RuM" });
		const frDuplicate = createFinalRuM({ modelId: "Dup_RuM" });

		const result = updateFormModel(formModel, [br, brDuplicate], [fr, frDuplicate], { keepModels: false });

		const refs = getModelReferences(result);
		const ruRefs = refs.filter((r) => r.modelType === "relationship-ui");
		expect(ruRefs).toHaveLength(3);
		expect(ruRefs.map((r) => r.reference).sort()).toEqual(["Dup_RuM", "UniqueFromBR_RuM", "UniqueFromFR_RuM"]);
	});

	it("should not duplicate RuM refs that already exist in form model references", () => {
		const formModel = createFormModel({
			modelReferences: [
				{ reference: "TestForm-binding-binding1_RuM", modelType: "relationship-ui", purpose: "relationship-ui" }
			]
		});
		const br = createBindingResult({ modelId: "TestForm-binding-binding1_RuM" });
		const result = updateFormModel(formModel, [br], [], { keepModels: false });

		const refs = getModelReferences(result);
		const ruRefs = refs.filter((r) => r.modelType === "relationship-ui");
		expect(ruRefs).toHaveLength(1);
	});

	it("should preserve existing modelReferences with correct ordering: existing first, then new", () => {
		const formModel = createFormModel();
		const br = createBindingResult({ modelId: "TestForm-binding-binding1_RuM" });
		const result = updateFormModel(formModel, [br], [], { keepModels: false });

		const refs = getModelReferences(result);
		expect(refs[0].reference).toBe("PersonDM");
		expect(refs[1].reference).toBe("LinkForm");
		// New RuM refs appended at end
		const ruRefs = refs.filter((r) => r.modelType === "relationship-ui");
		expect(ruRefs[0].reference).toBe("TestForm-binding-binding1_RuM");
	});

	it("non-keepModels prunes extracted legacy bindingReference refs and appends relationship-ui refs", () => {
		const legacyRefs = createLegacyBindingReferences();
		const formModel = createFormModel({
			modelReferences: [
				{ reference: "TeamCandidates-overview", modelType: "overview", purpose: "bindingReference" },
				{
					reference: "TeamPerson_Person_LinkOverview-overview",
					modelType: "overview",
					purpose: "bindingReference"
				},
				{ reference: "TeamPerson_LinkForm", modelType: "form", purpose: "bindingReference" },
				{ reference: "Team-document", modelType: "document", purpose: "documentModel" }
			]
		});
		const br = createBindingResult({ modelId: "Team-binding-teamPersons_RuM", modelReferences: legacyRefs });
		const fr = createFinalRuM({ modelId: "Team-binding-teamPersons_RuM", modelReferences: legacyRefs });

		const result = updateFormModel(formModel, [br], [fr], { keepModels: false });

		const refs = getModelReferences(result);
		expect(refs).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({ reference: "TeamCandidates-overview", purpose: "bindingReference" }),
				expect.objectContaining({
					reference: "TeamPerson_Person_LinkOverview-overview",
					purpose: "bindingReference"
				}),
				expect.objectContaining({ reference: "TeamPerson_LinkForm", purpose: "bindingReference" })
			])
		);
		expect(refs).toEqual(expect.arrayContaining([expect.objectContaining({ reference: "Team-document" })]));
		expect(refs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					reference: "Team-binding-teamPersons_RuM",
					modelType: "relationship-ui",
					purpose: "relationship-ui"
				})
			])
		);
		expect(getAnnotations(result).some((a) => a.name === "bindingConfiguration")).toBe(false);
	});

	it("non-keepModels does not prune unrelated bindingReference refs", () => {
		const formModel = createFormModel({
			modelReferences: [{ reference: "UnrelatedHistory-overview", modelType: "overview", purpose: "bindingReference" }]
		});
		const br = createBindingResult({ modelReferences: createLegacyBindingReferences() });

		const result = updateFormModel(formModel, [br], [], { keepModels: false });

		expect(getModelReferences(result)).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ reference: "UnrelatedHistory-overview", purpose: "bindingReference" })
			])
		);
	});

	it("keepModels preserves extracted legacy bindingReference refs and bindingConfiguration", () => {
		const legacyRefs = createLegacyBindingReferences();
		const formModel = createFormModel({
			modelReferences: [
				{ reference: "TeamCandidates-overview", modelType: "overview", purpose: "bindingReference" },
				{
					reference: "TeamPerson_Person_LinkOverview-overview",
					modelType: "overview",
					purpose: "bindingReference"
				},
				{ reference: "TeamPerson_LinkForm", modelType: "form", purpose: "bindingReference" }
			]
		});
		const fr = createFinalRuM({ modelId: "Team-binding-teamPersons_RuM", modelReferences: legacyRefs });

		const result = updateFormModel(formModel, [], [fr], { keepModels: true });

		expect(getModelReferences(result)).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ reference: "TeamCandidates-overview", purpose: "bindingReference" }),
				expect.objectContaining({
					reference: "TeamPerson_Person_LinkOverview-overview",
					purpose: "bindingReference"
				}),
				expect.objectContaining({ reference: "TeamPerson_LinkForm", purpose: "bindingReference" }),
				expect.objectContaining({ reference: "Team-binding-teamPersons_RuM", purpose: "relationship-ui" })
			])
		);
		expect(getAnnotations(result).some((a) => a.name === "bindingConfiguration")).toBe(true);
	});

	it("non-keepModels prunes candidate overview, selected overview, and link form refs by reference id", () => {
		const formModel = createFormModel({
			modelReferences: [
				{ reference: "TeamCandidates-overview", modelType: "overview", purpose: "bindingReference" },
				{
					reference: "TeamPerson_Person_LinkOverview-overview",
					modelType: "overview",
					purpose: "bindingReference"
				},
				{ reference: "TeamPerson_LinkForm", modelType: "form", purpose: "bindingReference" }
			]
		});
		const br = createBindingResult({
			modelReferences: [{ reference: "TeamCandidates-overview", modelType: "overview", purpose: "overview" }]
		});
		const fr = createFinalRuM({
			modelReferences: [
				{ reference: "TeamPerson_Person_LinkOverview-overview", modelType: "overview", purpose: "overview" },
				{ reference: "TeamPerson_LinkForm", modelType: "form", purpose: "form" }
			]
		});

		const result = updateFormModel(formModel, [br], [fr], { keepModels: false });

		const bindingReferenceIds = getModelReferences(result)
			.filter((ref) => ref.purpose === "bindingReference")
			.map((ref) => ref.reference);
		expect(bindingReferenceIds).not.toContain("TeamCandidates-overview");
		expect(bindingReferenceIds).not.toContain("TeamPerson_Person_LinkOverview-overview");
		expect(bindingReferenceIds).not.toContain("TeamPerson_LinkForm");
	});

	it("should handle empty bindingResults and finalRuMs", () => {
		const formModel = createFormModel();
		const result = updateFormModel(formModel, [], [], { keepModels: false });

		const refs = getModelReferences(result);
		expect(refs).toHaveLength(2); // Only the two original refs
	});

	it("should handle form model with no annotations", () => {
		const formModel = {
			header: {
				id: "TestForm",
				modelType: "form",
				modelVersion: "1.0.0",
				modelReferences: []
			}
		};
		const br = createBindingResult({ modelId: "TestForm-binding-binding1_RuM" });
		const result = updateFormModel(formModel, [br], [], { keepModels: false });

		const refs = getModelReferences(result);
		const ruRef = refs.find((r) => r.modelType === "relationship-ui");
		expect(ruRef?.reference).toBe("TestForm-binding-binding1_RuM");
	});

	it("should handle form model with no header at all", () => {
		const formModel = {};
		const br = createBindingResult({ modelId: "TestForm-binding-binding1_RuM" });
		const result = updateFormModel(formModel, [br], [], { keepModels: false });

		const refs = getModelReferences(result);
		const ruRef = refs.find((r) => r.modelType === "relationship-ui");
		expect(ruRef?.reference).toBe("TestForm-binding-binding1_RuM");
	});

	it("should return a new object (pure function)", () => {
		const formModel = createFormModel();
		const result = updateFormModel(formModel, [], [], { keepModels: false });

		expect(result).not.toBe(formModel);
	});

	it("should preserve other model properties beyond header", () => {
		const formModel = {
			header: {
				id: "TestForm",
				modelType: "form",
				modelVersion: "1.0.0",
				modelReferences: [],
				annotations: [{ name: "bindingConfiguration", value: "{}" }]
			},
			content: {
				locales: [{ code: "en" }],
				elements: []
			}
		};
		const result = updateFormModel(formModel, [], [], { keepModels: false });

		const resultRecord = result as Record<string, unknown>;
		const content = resultRecord.content as Record<string, unknown>;
		expect(content.locales).toBeDefined();
	});
});

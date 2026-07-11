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

import type { WorkspaceModel, MigrationStepContext } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import { RUM_VERSION } from "../../../../../../src/internal/steps/RuM/extraction/constants.js";
import { flushState } from "../../../../../../src/internal/steps/RuM/extraction/phase-8-write-flush/index.js";

function createMockContext(): MigrationStepContext {
	return {
		addModel: vi.fn(),
		deleteModel: vi.fn(),
		findResource: vi.fn(),
		findModel: vi.fn(),
		resolveModel: vi.fn(),
		resolveResource: vi.fn(),
		addResource: vi.fn(),
		deleteCurrentModel: vi.fn(),
		deleteResource: vi.fn()
	};
}

function createModel(id: string, modelType = "relationship-ui"): object {
	return {
		header: {
			id,
			modelType,
			modelVersion: RUM_VERSION,
			annotations: [],
			modelReferences: []
		},
		content: {}
	};
}

describe("flushState", () => {
	it("should add all models from state to context", () => {
		const context = createMockContext();
		const model1 = createModel("Model1");
		const model2 = createModel("Model2");

		const state = {
			models: new Map<string, object>([
				["Model1", model1],
				["Model2", model2]
			]),
			deletionIds: new Set<string>()
		};

		flushState(state, context, { keepModels: false, outputDir: "" });

		expect(context.addModel).toHaveBeenCalledTimes(2);
		expect(context.addModel).toHaveBeenCalledWith({
			model: model1,
			path: "Model1.json"
		});
		expect(context.addModel).toHaveBeenCalledWith({
			model: model2,
			path: "Model2.json"
		});
	});

	it("should call deleteModel for each deletion ID when keepModels=false", () => {
		const context = createMockContext();
		const model = createModel("KeepModel");

		const state = {
			models: new Map<string, object>([["KeepModel", model]]),
			deletionIds: new Set<string>(["DeleteModel1", "DeleteModel2"])
		};

		flushState(state, context, { keepModels: false, outputDir: "" });

		expect(context.deleteModel).toHaveBeenCalledTimes(2);
		expect(context.deleteModel).toHaveBeenCalledWith("DeleteModel1");
		expect(context.deleteModel).toHaveBeenCalledWith("DeleteModel2");
	});

	it("should NOT call deleteModel when keepModels=true", () => {
		const context = createMockContext();
		const model = createModel("KeepModel");

		const state = {
			models: new Map<string, object>([["KeepModel", model]]),
			deletionIds: new Set<string>(["DeleteModel1"])
		};

		flushState(state, context, { keepModels: true, outputDir: "" });

		expect(context.addModel).toHaveBeenCalledTimes(1);
		expect(context.deleteModel).not.toHaveBeenCalled();
	});

	it("should skip base overview models when keepModels=true", () => {
		const context = createMockContext();
		const baseOverview = createModel("CoInsurerLinks-overview", "overview");
		const relationshipCloneOverview = createModel("CoInsurerLinks-overview--CoInsurer", "overview");
		const editOverview = createModel("CoInsurerLinks-overview-edit", "overview");
		const tableListOverview = createModel("CoInsurerLinks-overview-tableList", "overview");
		const nonOverview = createModel("CoInsurerLinks-overview-query", "query");

		const state = {
			models: new Map<string, object>([
				["CoInsurerLinks-overview", baseOverview],
				["CoInsurerLinks-overview--CoInsurer", relationshipCloneOverview],
				["CoInsurerLinks-overview-edit", editOverview],
				["CoInsurerLinks-overview-tableList", tableListOverview],
				["CoInsurerLinks-overview-query", nonOverview]
			]),
			deletionIds: new Set<string>()
		};

		flushState(state, context, { keepModels: true, outputDir: "" });

		expect(context.addModel).toHaveBeenCalledTimes(4);
		expect(context.addModel).not.toHaveBeenCalledWith({ model: baseOverview, path: "CoInsurerLinks-overview.json" });
		expect(context.addModel).toHaveBeenCalledWith({
			model: relationshipCloneOverview,
			path: "CoInsurerLinks-overview--CoInsurer.json"
		});
		expect(context.addModel).toHaveBeenCalledWith({
			model: editOverview,
			path: "CoInsurerLinks-overview-edit.json"
		});
		expect(context.addModel).toHaveBeenCalledWith({
			model: tableListOverview,
			path: "CoInsurerLinks-overview-tableList.json"
		});
		expect(context.addModel).toHaveBeenCalledWith({
			model: nonOverview,
			path: "CoInsurerLinks-overview-query.json"
		});
	});

	it("should write relationship clone overview models with double-dash IDs when keepModels=true", () => {
		const context = createMockContext();
		const relationshipCloneOverview = createModel("ProductCandidates-overview--BundleProduct", "overview");

		const state = {
			models: new Map<string, object>([["ProductCandidates-overview--BundleProduct", relationshipCloneOverview]]),
			deletionIds: new Set<string>()
		};

		flushState(state, context, { keepModels: true, outputDir: "" });

		expect(context.addModel).toHaveBeenCalledTimes(1);
		expect(context.addModel).toHaveBeenCalledWith({
			model: relationshipCloneOverview,
			path: "ProductCandidates-overview--BundleProduct.json"
		});
	});

	it("should keep writing base overview models when keepModels=false", () => {
		const context = createMockContext();
		const baseOverview = createModel("ProductCandidates-overview", "overview");

		const state = {
			models: new Map<string, object>([["ProductCandidates-overview", baseOverview]]),
			deletionIds: new Set<string>()
		};

		flushState(state, context, { keepModels: false, outputDir: "" });

		expect(context.addModel).toHaveBeenCalledTimes(1);
		expect(context.addModel).toHaveBeenCalledWith({
			model: baseOverview,
			path: "ProductCandidates-overview.json"
		});
	});

	it("should handle empty models and deletion IDs", () => {
		const context = createMockContext();

		const state = {
			models: new Map<string, object>(),
			deletionIds: new Set<string>()
		};

		flushState(state, context, { keepModels: false, outputDir: "" });

		expect(context.addModel).not.toHaveBeenCalled();
		expect(context.deleteModel).not.toHaveBeenCalled();
	});

	it("should handle models with no deletion IDs", () => {
		const context = createMockContext();
		const model = createModel("OnlyModel");

		const state = {
			models: new Map<string, object>([["OnlyModel", model]]),
			deletionIds: new Set<string>()
		};

		flushState(state, context, { keepModels: false, outputDir: "" });

		expect(context.addModel).toHaveBeenCalledTimes(1);
		expect(context.deleteModel).not.toHaveBeenCalled();
	});

	it("should handle deletion IDs with no models", () => {
		const context = createMockContext();

		const state = {
			models: new Map<string, object>(),
			deletionIds: new Set<string>(["OrphanDeletion"])
		};

		flushState(state, context, { keepModels: false, outputDir: "" });

		expect(context.addModel).not.toHaveBeenCalled();
		expect(context.deleteModel).toHaveBeenCalledTimes(1);
		expect(context.deleteModel).toHaveBeenCalledWith("OrphanDeletion");
	});

	it("should pass correct path format `${id}.json` for each model when outputDir is empty", () => {
		const context = createMockContext();
		const model = createModel("TestModel-123");

		const state = {
			models: new Map<string, object>([["TestModel-123", model]]),
			deletionIds: new Set<string>()
		};

		flushState(state, context, { keepModels: false, outputDir: "" });

		expect(context.addModel).toHaveBeenCalledWith({
			model,
			path: "TestModel-123.json"
		});
	});

	it("should prefix model paths with outputDir when provided", () => {
		const context = createMockContext();
		const model1 = createModel("ContractCDM-form-binding-abc_RuM");
		const model2 = createModel("ContractCDM-form-binding-abc_query");

		const state = {
			models: new Map<string, object>([
				["ContractCDM-form-binding-abc_RuM", model1],
				["ContractCDM-form-binding-abc_query", model2]
			]),
			deletionIds: new Set<string>()
		};

		flushState(state, context, { keepModels: false, outputDir: "showcase/resources/models/scdm" });

		expect(context.addModel).toHaveBeenCalledTimes(2);
		expect(context.addModel).toHaveBeenCalledWith({
			model: model1,
			path: "showcase/resources/models/scdm/ContractCDM-form-binding-abc_RuM.json"
		});
		expect(context.addModel).toHaveBeenCalledWith({
			model: model2,
			path: "showcase/resources/models/scdm/ContractCDM-form-binding-abc_query.json"
		});
	});

	it("should handle nested outputDir paths", () => {
		const context = createMockContext();
		const model = createModel("SomeModel");

		const state = {
			models: new Map<string, object>([["SomeModel", model]]),
			deletionIds: new Set<string>()
		};

		flushState(state, context, { keepModels: false, outputDir: "a/b/c/d" });

		expect(context.addModel).toHaveBeenCalledWith({
			model,
			path: "a/b/c/d/SomeModel.json"
		});
	});

	it("should use standard outputDir paths when sharedTargetDir and formModelIdToPreserve are absent", () => {
		const context = createMockContext();
		const model1 = createModel("FormModel");
		const model2 = createModel("GeneratedOverview", "overview");

		const state = {
			models: new Map<string, object>([
				["FormModel", model1],
				["GeneratedOverview", model2]
			]),
			deletionIds: new Set<string>()
		};

		flushState(state, context, { keepModels: false, outputDir: "dir/subdir" });

		expect(context.addModel).toHaveBeenCalledWith({
			model: model1,
			path: "dir/subdir/FormModel.json"
		});
		expect(context.addModel).toHaveBeenCalledWith({
			model: model2,
			path: "dir/subdir/GeneratedOverview.json"
		});
	});

	it("should write the preserved form model to outputDir when its id matches formModelIdToPreserve", () => {
		const context = createMockContext();
		const formModel = createModel("MyForm", "form");
		const otherModel = createModel("GeneratedOverview", "overview");

		const state = {
			models: new Map<string, object>([
				["MyForm", formModel],
				["GeneratedOverview", otherModel]
			]),
			deletionIds: new Set<string>()
		};

		flushState(state, context, {
			keepModels: false,
			outputDir: "A/forms",
			sharedTargetDir: "shared",
			formModelIdToPreserve: "MyForm"
		});

		expect(context.addModel).toHaveBeenCalledWith({
			model: formModel,
			path: "A/forms/MyForm.json"
		});
		expect(context.addModel).toHaveBeenCalledWith({
			model: otherModel,
			path: "shared/GeneratedOverview.json"
		});
	});

	it("should route non-FM models to sharedTargetDir when both routing options are present", () => {
		const context = createMockContext();
		const rum = createModel("Rel_RuM");
		const query = createModel("Rel_query", "query");
		const overview = createModel("Rel-overview--Ctx", "overview");

		const state = {
			models: new Map<string, object>([
				["Rel_RuM", rum],
				["Rel_query", query],
				["Rel-overview--Ctx", overview]
			]),
			deletionIds: new Set<string>()
		};

		flushState(state, context, {
			keepModels: false,
			outputDir: "B/forms",
			sharedTargetDir: "shared",
			formModelIdToPreserve: "AnotherForm"
		});

		expect(context.addModel).toHaveBeenCalledWith({ model: rum, path: "shared/Rel_RuM.json" });
		expect(context.addModel).toHaveBeenCalledWith({ model: query, path: "shared/Rel_query.json" });
		expect(context.addModel).toHaveBeenCalledWith({ model: overview, path: "shared/Rel-overview--Ctx.json" });
	});

	it("should write to workspace root (id.json) when sharedTargetDir is empty string and model is not the FM", () => {
		const context = createMockContext();
		const model = createModel("SomeOverview", "overview");

		const state = {
			models: new Map<string, object>([["SomeOverview", model]]),
			deletionIds: new Set<string>()
		};

		flushState(state, context, {
			keepModels: false,
			outputDir: "A/forms",
			sharedTargetDir: "",
			formModelIdToPreserve: "TheForm"
		});

		expect(context.addModel).toHaveBeenCalledWith({
			model,
			path: "SomeOverview.json"
		});
	});

	it("should write to custom/id.json when sharedTargetDir is 'custom' and model is not the FM", () => {
		const context = createMockContext();
		const model = createModel("SomeOverview", "overview");

		const state = {
			models: new Map<string, object>([["SomeOverview", model]]),
			deletionIds: new Set<string>()
		};

		flushState(state, context, {
			keepModels: false,
			outputDir: "A/forms",
			sharedTargetDir: "custom",
			formModelIdToPreserve: "TheForm"
		});

		expect(context.addModel).toHaveBeenCalledWith({
			model,
			path: "custom/SomeOverview.json"
		});
	});

	it("should write a workspace-existing non-FM model back to its original workspace path", () => {
		const context = createMockContext();
		const existingOverview = createModel("ExistingOverview", "overview");

		vi.mocked(context.findModel).mockImplementation((id: string): WorkspaceModel | undefined => {
			if (id === "ExistingOverview") {
				return {
					header: {
						id: "ExistingOverview",
						modelType: "overview",
						modelVersion: "1.0.0",
						annotations: [],
						modelReferences: []
					},
					path: "91_RelationshipOMs/ExistingOverview.json"
				};
			}

			return undefined;
		});

		const state = {
			models: new Map<string, object>([["ExistingOverview", existingOverview]]),
			deletionIds: new Set<string>()
		};

		flushState(state, context, {
			keepModels: false,
			outputDir: "A/forms",
			sharedTargetDir: "",
			formModelIdToPreserve: "TheForm"
		});

		expect(context.addModel).toHaveBeenCalledWith({
			model: existingOverview,
			path: "91_RelationshipOMs/ExistingOverview.json"
		});
	});

	it("should route a freshly generated non-FM model to sharedTargetDir when findModel returns undefined", () => {
		const context = createMockContext();
		const newRuM = createModel("ContractCDM-form_RuM", "relationship-ui");

		// findModel returns undefined for all IDs (default vi.fn() behaviour)
		const state = {
			models: new Map<string, object>([["ContractCDM-form_RuM", newRuM]]),
			deletionIds: new Set<string>()
		};

		flushState(state, context, {
			keepModels: false,
			outputDir: "A/forms",
			sharedTargetDir: "",
			formModelIdToPreserve: "TheForm"
		});

		expect(context.addModel).toHaveBeenCalledWith({
			model: newRuM,
			path: "ContractCDM-form_RuM.json"
		});
	});

	it("should write a re-run model back to its existing workspace path (idempotency)", () => {
		const context = createMockContext();
		const previouslyGeneratedRuM = createModel("ContractCDM-form_RuM", "relationship-ui");

		vi.mocked(context.findModel).mockImplementation((id: string): WorkspaceModel | undefined => {
			if (id === "ContractCDM-form_RuM") {
				return {
					header: {
						id: "ContractCDM-form_RuM",
						modelType: "relationship-ui",
						modelVersion: "1.0.0",
						annotations: [],
						modelReferences: []
					},
					path: "ContractCDM-form_RuM.json"
				};
			}

			return undefined;
		});

		const state = {
			models: new Map<string, object>([["ContractCDM-form_RuM", previouslyGeneratedRuM]]),
			deletionIds: new Set<string>()
		};

		flushState(state, context, {
			keepModels: false,
			outputDir: "A/forms",
			sharedTargetDir: "",
			formModelIdToPreserve: "TheForm"
		});

		expect(context.addModel).toHaveBeenCalledWith({
			model: previouslyGeneratedRuM,
			path: "ContractCDM-form_RuM.json"
		});
	});

	it("should still skip base overview models when keepModels=true even with routing options set", () => {
		const context = createMockContext();
		const baseOverview = createModel("MyLinks-overview", "overview");
		const cloneOverview = createModel("MyLinks-overview--Context", "overview");
		const formModel = createModel("MyForm", "form");

		const state = {
			models: new Map<string, object>([
				["MyLinks-overview", baseOverview],
				["MyLinks-overview--Context", cloneOverview],
				["MyForm", formModel]
			]),
			deletionIds: new Set<string>()
		};

		flushState(state, context, {
			keepModels: true,
			outputDir: "A/forms",
			sharedTargetDir: "",
			formModelIdToPreserve: "MyForm"
		});

		expect(context.addModel).not.toHaveBeenCalledWith({
			model: baseOverview,
			path: expect.any(String)
		});
		expect(context.addModel).toHaveBeenCalledWith({
			model: cloneOverview,
			path: "MyLinks-overview--Context.json"
		});
		expect(context.addModel).toHaveBeenCalledWith({
			model: formModel,
			path: "A/forms/MyForm.json"
		});
		expect(context.addModel).toHaveBeenCalledTimes(2);
	});
});

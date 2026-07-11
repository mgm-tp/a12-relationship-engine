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

import type { WorkspaceModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import {
	doFormModelsSpanMultipleDirs,
	getOrComputeWorkspaceFormSpan
} from "../../../../../../src/internal/steps/RuM/extraction/phase-8-write-flush/workspace-span-check.js";

function createFormModel(id: string, path: string, withBindingAnnotation = true): WorkspaceModel {
	return {
		header: {
			id,
			modelType: "form",
			modelVersion: "1.0",
			annotations: withBindingAnnotation ? [{ name: "bindingConfiguration", value: "[]" }] : []
		},
		path
	};
}

function createOverviewModel(id: string, path: string): WorkspaceModel {
	return {
		header: {
			id,
			modelType: "overview",
			modelVersion: "1.0",
			annotations: []
		},
		path
	};
}

describe("doFormModelsSpanMultipleDirs", () => {
	it("returns false for an empty workspace", () => {
		expect(doFormModelsSpanMultipleDirs([])).toBe(false);
	});

	it("returns false for a single extraction-eligible form model", () => {
		const models = [createFormModel("FormA", "A/FormA.json")];

		expect(doFormModelsSpanMultipleDirs(models)).toBe(false);
	});

	it("returns false when two extraction-eligible form models are in the SAME directory", () => {
		const models = [createFormModel("FormA", "resources/FormA.json"), createFormModel("FormB", "resources/FormB.json")];

		expect(doFormModelsSpanMultipleDirs(models)).toBe(false);
	});

	it("returns true when two extraction-eligible form models are in DIFFERENT directories", () => {
		const models = [createFormModel("FormA", "A/FormA.json"), createFormModel("FormB", "B/FormB.json")];

		expect(doFormModelsSpanMultipleDirs(models)).toBe(true);
	});

	it("returns true when one eligible form model is in the workspace root and one is in a subdir", () => {
		const models = [createFormModel("FormRoot", "FormRoot.json"), createFormModel("FormSub", "subdir/FormSub.json")];

		expect(doFormModelsSpanMultipleDirs(models)).toBe(true);
	});

	it("returns false when form models without bindingConfiguration are in different directories", () => {
		const models = [createFormModel("FormA", "A/FormA.json", false), createFormModel("FormB", "B/FormB.json", false)];

		expect(doFormModelsSpanMultipleDirs(models)).toBe(false);
	});

	it("returns false when non-form models are in different directories", () => {
		const models = [
			createOverviewModel("OverviewA", "A/OverviewA.json"),
			createOverviewModel("OverviewB", "B/OverviewB.json")
		];

		expect(doFormModelsSpanMultipleDirs(models)).toBe(false);
	});

	it("returns false when one eligible form model is in A/ and one ineligible form model is in B/", () => {
		const models = [
			createFormModel("FormEligible", "A/FormEligible.json", true),
			createFormModel("FormIneligible", "B/FormIneligible.json", false)
		];

		expect(doFormModelsSpanMultipleDirs(models)).toBe(false);
	});
});

describe("getOrComputeWorkspaceFormSpan", () => {
	it("returns the same result as doFormModelsSpanMultipleDirs for a spanning workspace", () => {
		const models: readonly WorkspaceModel[] = [
			createFormModel("FormA", "A/FormA.json"),
			createFormModel("FormB", "B/FormB.json")
		];

		expect(getOrComputeWorkspaceFormSpan(models)).toBe(true);
	});

	it("returns the same result as doFormModelsSpanMultipleDirs for a non-spanning workspace", () => {
		const models: readonly WorkspaceModel[] = [
			createFormModel("FormA", "resources/FormA.json"),
			createFormModel("FormB", "resources/FormB.json")
		];

		expect(getOrComputeWorkspaceFormSpan(models)).toBe(false);
	});

	it("caches the result so the same array reference returns the same value", () => {
		const models: readonly WorkspaceModel[] = [
			createFormModel("FormA", "A/FormA.json"),
			createFormModel("FormB", "B/FormB.json")
		];

		const first = getOrComputeWorkspaceFormSpan(models);
		const second = getOrComputeWorkspaceFormSpan(models);

		expect(first).toBe(second);
		expect(first).toBe(true);
	});

	it("treats different array references as independent cache entries", () => {
		const modelsA: readonly WorkspaceModel[] = [createFormModel("FormA", "A/FormA.json")];
		const modelsB: readonly WorkspaceModel[] = [
			createFormModel("FormA", "A/FormA.json"),
			createFormModel("FormB", "B/FormB.json")
		];

		expect(getOrComputeWorkspaceFormSpan(modelsA)).toBe(false);
		expect(getOrComputeWorkspaceFormSpan(modelsB)).toBe(true);
	});
});

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

import type { MigrationStepContext } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import { OVERVIEW_MODEL_VERSION } from "../../../../../../src/internal/steps/RuM/extraction/constants.js";
import { ExtractionState } from "../../../../../../src/internal/steps/RuM/extraction/extraction-state.js";
import { ModelNotFoundError } from "../../../../../../src/internal/steps/RuM/extraction/model-not-found-error.js";
import { ensureOverviewInState } from "../../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/overview-state-populator.js";

function createValidOverview(id: string): object {
	return {
		header: {
			id,
			modelType: "overview",
			modelVersion: OVERVIEW_MODEL_VERSION,
			modelReferences: []
		},
		content: {
			columns: []
		}
	};
}

function createRelationshipModel(id: string): object {
	return {
		header: { id, modelType: "relationship", modelVersion: "4.0.0" },
		content: { duplicatesAllowed: false, entityCharacteristics: [] }
	};
}

describe("ensureOverviewInState", () => {
	it("throws ModelNotFoundError when context is undefined", () => {
		const state = new ExtractionState();
		const overviewId = "MyOverview";

		expect(() => ensureOverviewInState(overviewId, state, undefined)).toThrow(ModelNotFoundError);
		expect(() => ensureOverviewInState(overviewId, state, undefined)).toThrow(`Model not found: ${overviewId}`);
	});

	it("does not throw when overview is already in state", () => {
		const state = new ExtractionState();
		const overviewId = "ExistingOverview";
		state.put(createValidOverview(overviewId));

		expect(() => ensureOverviewInState(overviewId, state, undefined)).not.toThrow();
	});

	it("throws ModelNotFoundError when findModel returns undefined", () => {
		const state = new ExtractionState();
		const overviewId = "MissingOverview";
		const context = {
			findModel: vi.fn().mockReturnValue(undefined),
			resolveModel: vi.fn()
		};

		expect(() => ensureOverviewInState(overviewId, state, context as unknown as MigrationStepContext)).toThrow(
			ModelNotFoundError
		);
		expect(() => ensureOverviewInState(overviewId, state, context as unknown as MigrationStepContext)).toThrow(
			`Model not found: ${overviewId}`
		);
	});

	it("throws ModelNotFoundError when resolveModel returns undefined", () => {
		const state = new ExtractionState();
		const overviewId = "UnresolvableOverview";
		const workspaceModel = { header: { id: overviewId, modelType: "overview" }, path: `${overviewId}.json` };
		const context = {
			findModel: vi.fn().mockReturnValue(workspaceModel),
			resolveModel: vi.fn().mockReturnValue(undefined)
		};

		expect(() => ensureOverviewInState(overviewId, state, context as unknown as MigrationStepContext)).toThrow(
			ModelNotFoundError
		);
		expect(() => ensureOverviewInState(overviewId, state, context as unknown as MigrationStepContext)).toThrow(
			`Model not found: ${overviewId}`
		);
	});

	it("throws ModelNotFoundError when resolved model is not an overview", () => {
		const state = new ExtractionState();
		const overviewId = "WrongTypeModel";
		const workspaceModel = { header: { id: overviewId, modelType: "overview" }, path: `${overviewId}.json` };
		const context = {
			findModel: vi.fn().mockReturnValue(workspaceModel),
			resolveModel: vi.fn().mockReturnValue(createRelationshipModel(overviewId))
		};

		expect(() => ensureOverviewInState(overviewId, state, context as unknown as MigrationStepContext)).toThrow(
			ModelNotFoundError
		);
		expect(() => ensureOverviewInState(overviewId, state, context as unknown as MigrationStepContext)).toThrow(
			`Model not found: ${overviewId}`
		);
	});

	it("populates state when model resolves to a valid overview", () => {
		const state = new ExtractionState();
		const overviewId = "ValidOverview";
		const validOverview = createValidOverview(overviewId);
		const workspaceModel = { header: { id: overviewId, modelType: "overview" }, path: `${overviewId}.json` };
		const context = {
			findModel: vi.fn().mockReturnValue(workspaceModel),
			resolveModel: vi.fn().mockReturnValue(validOverview)
		};

		expect(() => ensureOverviewInState(overviewId, state, context as unknown as MigrationStepContext)).not.toThrow();
		expect(state.has(overviewId)).toBe(true);
		expect(state.overviewModelIds).toContain(overviewId);
	});
});

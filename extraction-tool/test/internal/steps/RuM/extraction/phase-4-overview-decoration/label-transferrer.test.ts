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

import type { OverviewModel } from "../../../../../../src/models/overview-model.js";
import { RUM_VERSION } from "../../../../../../src/internal/steps/RuM/extraction/constants.js";
import type { FinalRuM } from "../../../../../../src/internal/steps/RuM/extraction/phase-2-binding-enrichment/types.js";
import { decorateOverviews } from "../../../../../../src/internal/steps/RuM/extraction/phase-4-overview-decoration/index.js";
import type {
	Mutable,
	OverviewDecorationState,
	OverviewDecorationContext
} from "../../../../../../src/internal/steps/RuM/extraction/phase-4-overview-decoration/types.js";

import { createOverviewModelFixture } from "./test-helpers.js";

type ComponentType = "DualPaneSelection" | "TableList" | "DropDownSelection";

// ---------------------------------------------------------------------------
// Mock state factory
// ---------------------------------------------------------------------------

function createMockState(): OverviewDecorationState {
	return {
		put: vi.fn(),
		draftOM: vi.fn((id: string, recipe: (draft: Mutable<OverviewModel>) => void) => {
			recipe(createOverviewModelFixture(id));
		}),
		draftRuM: vi.fn(),
		get: vi.fn(),
		has: vi.fn(() => false)
	};
}

function createPipelineContext(overrides?: Partial<OverviewDecorationContext>): OverviewDecorationContext {
	return {
		overviewContextMap: overrides?.overviewContextMap ?? new Map(),
		pageSizeMigrations: [],
		rowActionMigrations: [],
		rowActivationMigrations: [],
		overviewLabelMigrations: [],
		cloneMap: overrides?.cloneMap ?? new Map(),
		multiContextRemap: overrides?.multiContextRemap ?? new Map(),
		tableListDirectSelectedOverviewIds: overrides?.tableListDirectSelectedOverviewIds ?? new Set(),
		candidatePageSizeMap: overrides?.candidatePageSizeMap ?? new Map(),
		isCdm: false
	};
}

function createFinalRuM(
	rumId: string,
	label: Array<{ locale: string; text: string }> | undefined,
	componentType: ComponentType,
	selectedOverviewId: string
): FinalRuM {
	return {
		rumModel: {
			header: {
				id: rumId,
				modelType: "relationship-ui" as const,
				modelVersion: RUM_VERSION,
				...(label !== undefined ? { labels: label } : {})
			},
			content: {
				relationshipName: "TestRelation",
				targetRole: "test",
				component: {
					componentType,
					selectedItemsOverviewModel: selectedOverviewId,
					...(componentType === "TableList"
						? {
								availableItemsOverviewModel: "candidate-overview",
								editConfiguration: {
									availableItemsOverviewModel: "candidate-overview",
									selectedItemsOverviewModel: `${selectedOverviewId}-edit`
								}
							}
						: {})
				}
			}
		},
		additionalQueryModels: [],
		bindingName: `binding-${rumId}`,
		elementId: `${rumId}-element`,
		relationshipName: "TestRelation",
		targetRole: "test"
	};
}

// ---------------------------------------------------------------------------
// Tests: Transfer label behavior
// ---------------------------------------------------------------------------

describe("decorateOverviews transfer label path", () => {
	it("does not copy or clear DualPane RuM header.labels", () => {
		const finalRuMs = [
			createFinalRuM("rum-1", [{ locale: "en", text: "Addresses" }], "DualPaneSelection", "Links-overview")
		];
		const state = createMockState();

		decorateOverviews(createPipelineContext(), state, finalRuMs);

		expect(state.draftRuM).not.toHaveBeenCalled();
		expect(finalRuMs[0]!.rumModel.header.labels).toEqual([{ locale: "en", text: "Addresses" }]);
	});

	it("does not copy or clear TableList RuM header.labels", () => {
		const finalRuMs = [
			createFinalRuM("rum-1", [{ locale: "en", text: "Insured Persons" }], "TableList", "Links-overview")
		];
		const state = createMockState();

		decorateOverviews(createPipelineContext(), state, finalRuMs);

		expect(state.draftRuM).not.toHaveBeenCalled();
		expect(finalRuMs[0]!.rumModel.header.labels).toEqual([{ locale: "en", text: "Insured Persons" }]);
	});

	it("leaves DropDown labels untouched", () => {
		const finalRuMs = [
			createFinalRuM("rum-1", [{ locale: "en", text: "Selection" }], "DropDownSelection", "some-overview")
		];
		const state = createMockState();

		decorateOverviews(createPipelineContext(), state, finalRuMs);

		expect(state.draftRuM).not.toHaveBeenCalled();
		expect(finalRuMs[0]!.rumModel.header.labels).toEqual([{ locale: "en", text: "Selection" }]);
	});

	it("does not mutate DualPane labels when clone mappings are present", () => {
		const finalRuMs = [createFinalRuM("rum-1", [{ locale: "en", text: "CoInsurers" }], "TableList", "Links-overview")];
		const cloneMap = new Map<string, string>([["Links-overview", "Links-overview-edit"]]);
		const relToClone = new Map<string, string>([["TestRelation", "Links-overview--TestRelation"]]);
		const multiContextRemap = new Map<string, ReadonlyMap<string, string>>([["Links-overview", relToClone]]);
		const state = createMockState();

		decorateOverviews(createPipelineContext({ cloneMap, multiContextRemap }), state, finalRuMs);

		expect(state.draftRuM).not.toHaveBeenCalled();
		expect(finalRuMs[0]!.rumModel.header.labels).toEqual([{ locale: "en", text: "CoInsurers" }]);
	});

	it("does nothing when finalRuMs array is empty", () => {
		const finalRuMs: readonly FinalRuM[] = [];
		const state = createMockState();

		decorateOverviews(createPipelineContext(), state, finalRuMs);

		expect(state.draftRuM).not.toHaveBeenCalled();
	});
});

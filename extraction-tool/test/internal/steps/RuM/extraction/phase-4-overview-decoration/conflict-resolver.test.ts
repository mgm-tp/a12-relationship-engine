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

import { RUM_VERSION } from "../../../../../../src/internal/steps/RuM/extraction/constants.js";
import type { FinalRuM } from "../../../../../../src/internal/steps/RuM/extraction/phase-2-binding-enrichment/types.js";
import { decorateOverviews } from "../../../../../../src/internal/steps/RuM/extraction/phase-4-overview-decoration/index.js";
import type {
	OverviewDecorationState,
	OverviewDecorationContext
} from "../../../../../../src/internal/steps/RuM/extraction/phase-4-overview-decoration/types.js";

function createPipelineContext(): OverviewDecorationContext {
	return {
		overviewContextMap: new Map(),
		pageSizeMigrations: [],
		rowActionMigrations: [],
		rowActivationMigrations: [],
		overviewLabelMigrations: [],
		cloneMap: new Map(),
		multiContextRemap: new Map(),
		tableListDirectSelectedOverviewIds: new Set(),
		candidatePageSizeMap: new Map(),
		isCdm: false
	};
}

function createState(): OverviewDecorationState {
	return {
		put: vi.fn(),
		draftOM: vi.fn(),
		draftRuM: vi.fn(),
		get: vi.fn(),
		has: vi.fn(() => false)
	};
}

function createFinalRuM(
	rumId: string,
	selectedOverviewId: string,
	componentType: "DualPaneSelection" | "TableList",
	label?: Array<{ locale: string; text: string }>
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
								availableItemsOverviewModel: `${selectedOverviewId}-candidate`,
								editConfiguration: {
									availableItemsOverviewModel: `${selectedOverviewId}-candidate`,
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

describe("decorateOverviews conflict-removal cleanup", () => {
	it("does not require label transfer helpers and keeps finalRuMs unchanged", () => {
		const finalRuMs = [
			createFinalRuM("rum-1", "Links-overview", "DualPaneSelection"),
			createFinalRuM("rum-2", "Links-overview", "TableList")
		];
		const state = createState();

		decorateOverviews(createPipelineContext(), state, finalRuMs);

		expect(finalRuMs[0]!.rumModel.content.component?.selectedItemsOverviewModel).toBe("Links-overview");
		expect(finalRuMs[1]!.rumModel.content.component?.selectedItemsOverviewModel).toBe("Links-overview");
		expect(state.draftRuM).not.toHaveBeenCalled();
		expect(state.draftOM).not.toHaveBeenCalled();
	});

	it("does not throw with overlapping selected overview ids", () => {
		const finalRuMs = [
			createFinalRuM("rum-1", "Shared-overview", "DualPaneSelection"),
			createFinalRuM("rum-2", "Shared-overview", "TableList")
		];
		const context = createPipelineContext();
		const state = createState();

		expect(() => {
			decorateOverviews(context, state, finalRuMs);
		}).not.toThrow();
	});

	it("does not alter overview labels when no overview migrations are configured", () => {
		const finalRuM = createFinalRuM("rum-1", "Candidates-overview", "TableList", [{ locale: "en", text: "Original" }]);
		const state = createState();
		const context = createPipelineContext();

		decorateOverviews(context, state, [finalRuM]);

		expect(finalRuM.rumModel.header.labels).toEqual([{ locale: "en", text: "Original" }]);
	});
});

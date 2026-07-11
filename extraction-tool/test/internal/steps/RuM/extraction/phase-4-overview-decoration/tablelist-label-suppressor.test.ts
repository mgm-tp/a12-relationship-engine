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

import type { OverviewModel } from "../../../../../../src/models/overview-model.js";
import type { RelationshipUiModel } from "../../../../../../src/internal/steps/RuM/relationship-ui-model.js";
import { clearTableListDirectSelectedOverviewLabels } from "../../../../../../src/internal/steps/RuM/extraction/phase-4-overview-decoration/tablelist-label-suppressor.js";
import type {
	Mutable,
	OverviewDecorationState,
	OverviewDecorationContext
} from "../../../../../../src/internal/steps/RuM/extraction/phase-4-overview-decoration/types.js";

import { createOverviewModelFixture } from "./test-helpers.js";

function createOverviewModel(
	id: string,
	labels: readonly { locale: string; text: string }[] = []
): Mutable<OverviewModel> {
	const model = createOverviewModelFixture(id);
	model.header.labels = [...labels];

	return model;
}

function createMockState(initialOverviews: readonly Mutable<OverviewModel>[]): OverviewDecorationState {
	const storedOverviews = new Map(initialOverviews.map((overview) => [overview.header.id, overview]));

	return {
		put(model: object): void {
			const modelId = (model as { header?: { id?: string } }).header?.id;

			if (modelId) {
				storedOverviews.set(modelId, JSON.parse(JSON.stringify(model)) as Mutable<OverviewModel>);
			}
		},
		draftOM(id: string, recipe: (draft: Mutable<OverviewModel>) => void): void {
			const existing = storedOverviews.get(id) ?? createOverviewModel(id);
			const mutable = JSON.parse(JSON.stringify(existing)) as Mutable<OverviewModel>;

			recipe(mutable);
			storedOverviews.set(id, mutable);
		},
		draftRuM(_id: string, _recipe: (draft: Mutable<RelationshipUiModel>) => void): void {
			// No-op for tests
		},
		get(id: string): object | undefined {
			return storedOverviews.get(id);
		},
		has(id: string): boolean {
			return storedOverviews.has(id);
		}
	};
}

function createPipelineContext(tableListDirectSelectedOverviewIds: ReadonlySet<string>): OverviewDecorationContext {
	return {
		overviewContextMap: new Map(),
		pageSizeMigrations: [],
		candidatePageSizeMap: new Map(),
		rowActionMigrations: [],
		rowActivationMigrations: [],
		overviewLabelMigrations: [],
		cloneMap: new Map(),
		multiContextRemap: new Map(),
		tableListDirectSelectedOverviewIds,
		isCdm: false
	};
}

describe("clearTableListDirectSelectedOverviewLabels", () => {
	it("clears labels for IDs in the suppression set", () => {
		const overviewId = "ProductBrand_SelectedItemsOverview-tableList";
		const state = createMockState([createOverviewModel(overviewId, [{ locale: "en", text: "Existing Label" }])]);

		clearTableListDirectSelectedOverviewLabels(createPipelineContext(new Set([overviewId])), state);

		expect((state.get(overviewId) as OverviewModel).header.labels).toEqual([]);
	});

	it("does not touch IDs outside the suppression set", () => {
		const overviewId = "ProductBrand_SelectedItemsOverview-tableList";
		const state = createMockState([createOverviewModel(overviewId, [{ locale: "en", text: "Existing Label" }])]);

		clearTableListDirectSelectedOverviewLabels(createPipelineContext(new Set(["OtherOverview-tableList"])), state);

		expect((state.get(overviewId) as OverviewModel).header.labels).toEqual([{ locale: "en", text: "Existing Label" }]);
	});

	it("skips suppressed IDs that are absent from state", () => {
		const state = createMockState([]);

		expect(() =>
			clearTableListDirectSelectedOverviewLabels(createPipelineContext(new Set(["MissingOverview-tableList"])), state)
		).not.toThrow();
		expect(state.get("MissingOverview-tableList")).toBeUndefined();
	});
});

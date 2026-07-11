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
import { orchestrateRowActivations } from "../../../../../../src/internal/steps/RuM/extraction/phase-4-overview-decoration/row-activation-orchestrator.js";
import type {
	Mutable,
	OverviewDecorationState,
	OverviewDecorationContext
} from "../../../../../../src/internal/steps/RuM/extraction/phase-4-overview-decoration/types.js";

import { createOverviewModelFixture } from "./test-helpers.js";

function createOverviewModel(id: string): Mutable<OverviewModel> {
	return createOverviewModelFixture(id);
}

function createMockState(initialOverviews: readonly Mutable<OverviewModel>[] = []): {
	state: OverviewDecorationState;
	draftedOverviews: Map<string, Mutable<OverviewModel>>;
} {
	const storedOverviews = new Map<string, Mutable<OverviewModel>>();
	const draftedOverviews = new Map<string, Mutable<OverviewModel>>();

	for (const overview of initialOverviews) {
		storedOverviews.set(overview.header.id, JSON.parse(JSON.stringify(overview)) as Mutable<OverviewModel>);
	}

	const state: OverviewDecorationState = {
		put(model: object): void {
			const modelId = (model as { header?: { id?: string } }).header?.id;

			if (modelId) {
				storedOverviews.set(modelId, JSON.parse(JSON.stringify(model)) as Mutable<OverviewModel>);
			}
		},
		draftOM(id: string, recipe: (draft: Mutable<OverviewModel>) => void): void {
			const existing = draftedOverviews.get(id) ?? storedOverviews.get(id) ?? createOverviewModel(id);
			const mutable = JSON.parse(JSON.stringify(existing)) as Mutable<OverviewModel>;

			recipe(mutable);
			draftedOverviews.set(id, mutable);
		},
		draftRuM(_id: string, _recipe: (draft: Mutable<RelationshipUiModel>) => void): void {
			// No-op for tests
		},
		get(id: string): object | undefined {
			return draftedOverviews.get(id) ?? storedOverviews.get(id);
		},
		has(id: string): boolean {
			return draftedOverviews.has(id) || storedOverviews.has(id);
		}
	};

	return { state, draftedOverviews };
}

function createPipelineContext(
	rowActivationMigrations: OverviewDecorationContext["rowActivationMigrations"],
	isCdm = false
): OverviewDecorationContext {
	return {
		overviewContextMap: new Map(),
		pageSizeMigrations: [],
		rowActionMigrations: [],
		rowActivationMigrations,
		overviewLabelMigrations: [],
		cloneMap: new Map(),
		multiContextRemap: new Map(),
		candidatePageSizeMap: new Map(),
		tableListDirectSelectedOverviewIds: new Set<string>(),
		isCdm
	};
}

describe("orchestrateRowActivations", () => {
	it("writes event activation to the overview", () => {
		const { state, draftedOverviews } = createMockState([createOverviewModel("overview-1")]);
		const context = createPipelineContext([
			{ overviewModelId: "overview-1", activation: { type: "event", event: "event_add_link" } }
		]);

		orchestrateRowActivations(context, state);

		expect(draftedOverviews.get("overview-1")?.content.rowActivation).toEqual({
			type: "event",
			event: "event_add_link"
		});
	});

	it("writes non_interactive activation for non-CDM overviews", () => {
		const { state, draftedOverviews } = createMockState([createOverviewModel("overview-1")]);
		const context = createPipelineContext([{ overviewModelId: "overview-1", activation: { type: "non_interactive" } }]);

		orchestrateRowActivations(context, state);

		expect(draftedOverviews.get("overview-1")?.content.rowActivation).toEqual({ type: "non_interactive" });
	});

	it("skips non_interactive activation for CDM overviews", () => {
		const { state, draftedOverviews } = createMockState([createOverviewModel("overview-1")]);
		const context = createPipelineContext(
			[{ overviewModelId: "overview-1", activation: { type: "non_interactive" } }],
			true
		);

		orchestrateRowActivations(context, state);

		expect(draftedOverviews.size).toBe(0);
		expect(state.get("overview-1")).toEqual(createOverviewModel("overview-1"));
	});

	it("does not skip event activation for CDM overviews", () => {
		const { state, draftedOverviews } = createMockState([createOverviewModel("overview-1")]);
		const context = createPipelineContext(
			[{ overviewModelId: "overview-1", activation: { type: "event", event: "event_delete_link" } }],
			true
		);

		orchestrateRowActivations(context, state);

		expect(draftedOverviews.get("overview-1")?.content.rowActivation).toEqual({
			type: "event",
			event: "event_delete_link"
		});
	});

	it("does not mutate missing overviews", () => {
		const { state, draftedOverviews } = createMockState();
		const context = createPipelineContext([
			{ overviewModelId: "missing-overview", activation: { type: "event", event: "event_add_link" } }
		]);

		orchestrateRowActivations(context, state);

		expect(draftedOverviews.size).toBe(0);
		expect(state.has("missing-overview")).toBe(false);
	});

	it("uses the first activation migration per overview", () => {
		const { state, draftedOverviews } = createMockState([createOverviewModel("overview-1")]);
		const context = createPipelineContext([
			{ overviewModelId: "overview-1", activation: { type: "event", event: "event_add_link" } },
			{ overviewModelId: "overview-1", activation: { type: "event", event: "event_delete_link" } }
		]);

		orchestrateRowActivations(context, state);

		expect(draftedOverviews.get("overview-1")?.content.rowActivation).toEqual({
			type: "event",
			event: "event_add_link"
		});
	});

	it("preserves existing rowActionGroup.actions", () => {
		const { state, draftedOverviews } = createMockState([
			createOverviewModelFixture("overview-1", {
				rowActionGroup: {
					actions: [{ event: "event_delete_link", icon: { name: "remove_circle" } }]
				}
			})
		]);
		const context = createPipelineContext([
			{ overviewModelId: "overview-1", activation: { type: "event", event: "event_add_link" } }
		]);

		orchestrateRowActivations(context, state);

		expect(draftedOverviews.get("overview-1")?.content.rowActionGroup?.actions).toEqual([
			{ event: "event_delete_link", icon: { name: "remove_circle" } }
		]);
		expect(draftedOverviews.get("overview-1")?.content.rowActivation).toEqual({
			type: "event",
			event: "event_add_link"
		});
	});
});

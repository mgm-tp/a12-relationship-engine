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
import { orchestrateRowActions } from "../../../../../../src/internal/steps/RuM/extraction/phase-4-overview-decoration/row-action-orchestrator.js";
import type {
	Mutable,
	OverviewDecorationState,
	OverviewDecorationContext
} from "../../../../../../src/internal/steps/RuM/extraction/phase-4-overview-decoration/types.js";

import { createOverviewModelFixture } from "./test-helpers.js";

function createMockState(initialOverviewIds: readonly string[] = []): {
	state: OverviewDecorationState;
	draftedOverviews: Map<string, Mutable<OverviewModel>>;
} {
	const storedOverviews = new Map<string, Mutable<OverviewModel>>();
	const draftedOverviews = new Map<string, Mutable<OverviewModel>>();

	for (const overviewId of initialOverviewIds) {
		storedOverviews.set(overviewId, createOverviewModelFixture(overviewId));
	}

	const state: OverviewDecorationState = {
		put(model: object): void {
			const modelId = (model as { header?: { id?: string } }).header?.id;

			if (modelId) {
				storedOverviews.set(modelId, JSON.parse(JSON.stringify(model)) as Mutable<OverviewModel>);
			}
		},
		draftOM(id: string, recipe: (draft: Mutable<OverviewModel>) => void): void {
			const existing = draftedOverviews.get(id) ?? storedOverviews.get(id) ?? createOverviewModelFixture(id);
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
	rowActionMigrations: OverviewDecorationContext["rowActionMigrations"]
): OverviewDecorationContext {
	return {
		overviewContextMap: new Map(),
		pageSizeMigrations: [],
		rowActionMigrations,
		rowActivationMigrations: [],
		overviewLabelMigrations: [],
		cloneMap: new Map(),
		multiContextRemap: new Map(),
		candidatePageSizeMap: new Map(),
		tableListDirectSelectedOverviewIds: new Set<string>(),
		isCdm: false
	};
}

describe("orchestrateRowActions", () => {
	it("should apply a single row action to an overview", () => {
		const { state, draftedOverviews } = createMockState(["test-overview"]);
		const context = createPipelineContext([
			{ overviewModelId: "test-overview", actionType: "event_delete_link", icon: "remove_circle" }
		]);

		orchestrateRowActions(context, state);

		const overview = draftedOverviews.get("test-overview")!;

		expect(overview.content.rowActionGroup?.actions).toHaveLength(1);
		expect(overview.content.rowActionGroup!.actions![0]).toEqual({
			event: "event_delete_link",
			icon: { name: "remove_circle" },
			label: [
				{ locale: "en", text: "Remove" },
				{ locale: "de", text: "Entfernen" }
			],
			labelHidden: true
		});
	});

	it("should apply multiple row actions to the same overview", () => {
		const { state, draftedOverviews } = createMockState(["dual-overview"]);
		const context = createPipelineContext([
			{ overviewModelId: "dual-overview", actionType: "event_delete_link", icon: "remove_circle" },
			{ overviewModelId: "dual-overview", actionType: "event_restore_link", icon: "add_circle" }
		]);

		orchestrateRowActions(context, state);

		const overview = draftedOverviews.get("dual-overview")!;

		expect(overview.content.rowActionGroup?.actions).toHaveLength(2);
	});

	it("should deduplicate row actions with the same actionType (first writer wins)", () => {
		const { state, draftedOverviews } = createMockState(["dup-overview"]);
		const context = createPipelineContext([
			{ overviewModelId: "dup-overview", actionType: "event_delete_link", icon: "remove_circle" },
			{ overviewModelId: "dup-overview", actionType: "event_delete_link", icon: "delete_forever" }
		]);

		orchestrateRowActions(context, state);

		const overview = draftedOverviews.get("dup-overview")!;

		expect(overview.content.rowActionGroup?.actions).toHaveLength(1);
		// First writer's icon should win
		expect(overview.content.rowActionGroup!.actions![0].icon?.name).toBe("remove_circle");
	});

	it("should apply actions to different overviews independently", () => {
		const { state, draftedOverviews } = createMockState(["candidate-overview", "link-overview"]);
		const context = createPipelineContext([
			{ overviewModelId: "candidate-overview", actionType: "event_add_link", icon: "add" },
			{ overviewModelId: "link-overview", actionType: "event_delete_link", icon: "remove_circle" }
		]);

		orchestrateRowActions(context, state);

		expect(draftedOverviews.get("candidate-overview")!.content.rowActionGroup?.actions).toHaveLength(1);
		expect(draftedOverviews.get("link-overview")!.content.rowActionGroup?.actions).toHaveLength(1);
		expect(draftedOverviews.get("candidate-overview")!.content.rowActionGroup!.actions![0].event).toBe(
			"event_add_link"
		);
		expect(draftedOverviews.get("link-overview")!.content.rowActionGroup!.actions![0].event).toBe("event_delete_link");
	});

	it("should omit destructive flag for delete row actions when specified", () => {
		const { state, draftedOverviews } = createMockState(["test-overview"]);
		const context = createPipelineContext([
			{
				overviewModelId: "test-overview",
				actionType: "event_delete_link",
				icon: "remove_circle",
				destructive: true
			}
		]);

		orchestrateRowActions(context, state);

		const action = draftedOverviews.get("test-overview")!.content.rowActionGroup!.actions![0];

		expect(action.destructive).toBeUndefined();
	});

	it("should preserve destructive flag for non-delete row actions when specified", () => {
		const { state, draftedOverviews } = createMockState(["test-overview"]);
		const context = createPipelineContext([
			{ overviewModelId: "test-overview", actionType: "event_add_link", icon: "add", destructive: false }
		]);

		orchestrateRowActions(context, state);

		const action = draftedOverviews.get("test-overview")!.content.rowActionGroup!.actions![0];

		expect(action.destructive).toBe(false);
	});

	it("should do nothing when rowActionMigrations is empty", () => {
		const { state, draftedOverviews } = createMockState();
		const context = createPipelineContext([]);

		orchestrateRowActions(context, state);

		expect(draftedOverviews.size).toBe(0);
	});

	it("should create rowActionGroup when it does not exist on the draft", () => {
		const { state, draftedOverviews } = createMockState(["bare-overview"]);
		const context = createPipelineContext([
			{ overviewModelId: "bare-overview", actionType: "event_delete_link", icon: "remove_circle" }
		]);

		orchestrateRowActions(context, state);

		const overview = draftedOverviews.get("bare-overview")!;

		expect(overview.content.rowActionGroup).toBeDefined();
		expect(overview.content.rowActionGroup!.actions).toHaveLength(1);
	});

	it("should handle TableList edit clone actions (delete_link + restore_link)", () => {
		const { state, draftedOverviews } = createMockState(["Links-overview-edit"]);
		const context = createPipelineContext([
			{ overviewModelId: "Links-overview-edit", actionType: "event_delete_link", icon: "remove_circle" },
			{ overviewModelId: "Links-overview-edit", actionType: "event_restore_link", icon: "add_circle" }
		]);

		orchestrateRowActions(context, state);

		const overview = draftedOverviews.get("Links-overview-edit")!;

		expect(overview.content.rowActionGroup?.actions).toEqual([
			{
				event: "event_delete_link",
				icon: { name: "remove_circle" },
				label: [
					{ locale: "en", text: "Remove" },
					{ locale: "de", text: "Entfernen" }
				],
				labelHidden: true
			},
			{
				event: "event_restore_link",
				icon: { name: "add_circle" },
				label: [
					{ locale: "en", text: "Restore" },
					{ locale: "de", text: "Wiederherstellen" }
				],
				labelHidden: true
			}
		]);
	});

	it("should handle DualPane actions (delete_link + restore_link)", () => {
		const { state, draftedOverviews } = createMockState(["Links-overview"]);
		const context = createPipelineContext([
			{ overviewModelId: "Links-overview", actionType: "event_delete_link", icon: "remove_circle" },
			{ overviewModelId: "Links-overview", actionType: "event_restore_link", icon: "add_circle" }
		]);

		orchestrateRowActions(context, state);

		const overview = draftedOverviews.get("Links-overview")!;

		expect(overview.content.rowActionGroup?.actions).toHaveLength(2);
	});

	it("should add hidden accessible label to edit link document actions", () => {
		const { state, draftedOverviews } = createMockState(["Links-overview"]);
		const context = createPipelineContext([
			{ overviewModelId: "Links-overview", actionType: "event_edit_link_document", icon: "description" }
		]);

		orchestrateRowActions(context, state);

		const overview = draftedOverviews.get("Links-overview")!;

		expect(overview.content.rowActionGroup?.actions).toEqual([
			{
				event: "event_edit_link_document",
				icon: { name: "description" },
				label: [
					{ locale: "en", text: "Edit additional properties" },
					{ locale: "de", text: "Zusätzliche Eigenschaften bearbeiten" }
				],
				labelHidden: true
			}
		]);
	});

	it("should handle candidate overview actions (add_link)", () => {
		const { state, draftedOverviews } = createMockState(["Address-overview"]);
		const context = createPipelineContext([
			{ overviewModelId: "Address-overview", actionType: "event_add_link", icon: "add" }
		]);

		orchestrateRowActions(context, state);

		const overview = draftedOverviews.get("Address-overview")!;

		expect(overview.content.rowActionGroup?.actions).toHaveLength(1);
		expect(overview.content.rowActionGroup!.actions![0].event).toBe("event_add_link");
	});
});

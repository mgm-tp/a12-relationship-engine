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
import type { RelationshipUiModel } from "../../../../../../src/internal/steps/RuM/relationship-ui-model.js";
import {
	migratePageSizes,
	type OverviewDecorationLogger
} from "../../../../../../src/internal/steps/RuM/extraction/phase-4-overview-decoration/page-size-migrator.js";
import type {
	Mutable,
	OverviewDecorationState,
	OverviewDecorationContext
} from "../../../../../../src/internal/steps/RuM/extraction/phase-4-overview-decoration/types.js";

import { createOverviewModelFixture } from "./test-helpers.js";

function createOverviewModel(id: string): Mutable<OverviewModel> {
	return createOverviewModelFixture(id);
}

function createMockState(initialOverviewIds: readonly string[] = []): {
	state: OverviewDecorationState;
	draftedOverviews: Map<string, Mutable<OverviewModel>>;
} {
	const storedOverviews = new Map<string, Mutable<OverviewModel>>();
	const draftedOverviews = new Map<string, Mutable<OverviewModel>>();

	for (const overviewId of initialOverviewIds) {
		storedOverviews.set(overviewId, createOverviewModel(overviewId));
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
	pageSizeMigrations: OverviewDecorationContext["pageSizeMigrations"],
	candidatePageSizeMap: ReadonlyMap<string, number> = new Map()
): OverviewDecorationContext {
	return {
		overviewContextMap: new Map(),
		pageSizeMigrations,
		rowActionMigrations: [],
		rowActivationMigrations: [],
		overviewLabelMigrations: [],
		cloneMap: new Map(),
		multiContextRemap: new Map(),
		candidatePageSizeMap,
		tableListDirectSelectedOverviewIds: new Set<string>(),
		isCdm: false
	};
}

describe("migratePageSizes", () => {
	it("should apply a single page size migration to an overview", () => {
		const { state, draftedOverviews } = createMockState(["test-overview"]);
		const context = createPipelineContext([{ overviewModelId: "test-overview", pageSize: 25 }]);

		migratePageSizes(context, state);

		const overview = draftedOverviews.get("test-overview");

		expect(overview).toBeDefined();
		expect(overview!.content.configuration?.pagingSize).toBe(25);
	});

	it("should apply page size to multiple overviews independently", () => {
		const { state, draftedOverviews } = createMockState(["overview-a", "overview-b"]);
		const context = createPipelineContext([
			{ overviewModelId: "overview-a", pageSize: 10 },
			{ overviewModelId: "overview-b", pageSize: 50 }
		]);

		migratePageSizes(context, state);

		expect(draftedOverviews.get("overview-a")!.content.configuration?.pagingSize).toBe(10);
		expect(draftedOverviews.get("overview-b")!.content.configuration?.pagingSize).toBe(50);
	});

	it("should use max page size when multiple migrations agree on same overview", () => {
		const { state, draftedOverviews } = createMockState(["shared-overview"]);
		const context = createPipelineContext([
			{ overviewModelId: "shared-overview", pageSize: 50 },
			{ overviewModelId: "shared-overview", pageSize: 50 }
		]);

		migratePageSizes(context, state);

		expect(draftedOverviews.get("shared-overview")!.content.configuration?.pagingSize).toBe(50);
	});

	it("should use max value when conflicts exist (GAP-5)", () => {
		const { state, draftedOverviews } = createMockState(["conflict-overview"]);
		const context = createPipelineContext([
			{ overviewModelId: "conflict-overview", pageSize: 10 },
			{ overviewModelId: "conflict-overview", pageSize: 50 },
			{ overviewModelId: "conflict-overview", pageSize: 25 }
		]);

		migratePageSizes(context, state);

		expect(draftedOverviews.get("conflict-overview")!.content.configuration?.pagingSize).toBe(50);
	});

	it("should log a warning when conflicts are detected and a logger is provided", () => {
		const { state } = createMockState(["overview-a"]);
		const logger: OverviewDecorationLogger = { warn: vi.fn() };
		const context = createPipelineContext([
			{ overviewModelId: "overview-a", pageSize: 10 },
			{ overviewModelId: "overview-a", pageSize: 50 }
		]);

		migratePageSizes(context, state, logger);

		expect(logger.warn).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("GAP-5"));
		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("overview-a"));
		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("10, 50"));
		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("50"));
	});

	it("should not log warnings when no conflicts exist", () => {
		const { state } = createMockState(["overview-a", "overview-b"]);
		const logger: OverviewDecorationLogger = { warn: vi.fn() };
		const context = createPipelineContext([
			{ overviewModelId: "overview-a", pageSize: 25 },
			{ overviewModelId: "overview-b", pageSize: 50 }
		]);

		migratePageSizes(context, state, logger);

		expect(logger.warn).not.toHaveBeenCalled();
	});

	it("should do nothing when pageSizeMigrations is empty", () => {
		const { state, draftedOverviews } = createMockState();
		const context = createPipelineContext([]);

		migratePageSizes(context, state);

		expect(draftedOverviews.size).toBe(0);
	});

	it("should create configuration object when it does not exist on the draft", () => {
		const { state, draftedOverviews } = createMockState(["bare-overview"]);
		const context = createPipelineContext([{ overviewModelId: "bare-overview", pageSize: 30 }]);

		migratePageSizes(context, state);

		const overview = draftedOverviews.get("bare-overview")!;

		expect(overview.content.configuration).toBeDefined();
		expect(overview.content.configuration!.pagingSize).toBe(30);
	});

	it("should fall back to the candidate page size map when no migration entry exists", () => {
		const { state, draftedOverviews } = createMockState(["fallback-overview"]);
		const context = createPipelineContext([], new Map([["fallback-overview", 40]]));

		migratePageSizes(context, state);

		expect(draftedOverviews.get("fallback-overview")!.content.configuration?.pagingSize).toBe(40);
	});

	it("should prefer explicit page size migrations over candidate page size fallback values", () => {
		const { state, draftedOverviews } = createMockState(["fallback-overview"]);
		const context = createPipelineContext(
			[{ overviewModelId: "fallback-overview", pageSize: 25 }],
			new Map([["fallback-overview", 40]])
		);

		migratePageSizes(context, state);

		expect(draftedOverviews.get("fallback-overview")!.content.configuration?.pagingSize).toBe(25);
	});
});

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
import { migrateOverviewLabels } from "../../../../../../src/internal/steps/RuM/extraction/phase-4-overview-decoration/overview-label-migrator.js";
import type {
	Mutable,
	OverviewDecorationState,
	OverviewDecorationContext
} from "../../../../../../src/internal/steps/RuM/extraction/phase-4-overview-decoration/types.js";

import { createOverviewModelFixture } from "./test-helpers.js";

type TestLabels = ReadonlyArray<{ readonly locale: string; readonly text: string }>;

function createOverviewModel(id: string, labels?: TestLabels): Mutable<OverviewModel> {
	return createOverviewModelFixture(id, { labels: labels ? [...labels] : undefined });
}

function createMockState(
	initialOverviewIds: readonly string[] = [],
	initialOverviewLabels: ReadonlyMap<string, TestLabels> = new Map()
): {
	state: OverviewDecorationState;
	draftedOverviews: Map<string, Mutable<OverviewModel>>;
} {
	const storedOverviews = new Map<string, Mutable<OverviewModel>>();
	const draftedOverviews = new Map<string, Mutable<OverviewModel>>();

	for (const overviewId of initialOverviewIds) {
		storedOverviews.set(overviewId, createOverviewModel(overviewId, initialOverviewLabels.get(overviewId)));
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
	overviewLabelMigrations: OverviewDecorationContext["overviewLabelMigrations"]
): OverviewDecorationContext {
	return {
		overviewContextMap: new Map(),
		pageSizeMigrations: [],
		rowActionMigrations: [],
		rowActivationMigrations: [],
		overviewLabelMigrations,
		cloneMap: new Map(),
		multiContextRemap: new Map(),
		candidatePageSizeMap: new Map(),
		tableListDirectSelectedOverviewIds: new Set<string>(),
		isCdm: false
	};
}

describe("migrateOverviewLabels — basic routing", () => {
	it("should write pane labels to overview header.labels from a single migration", () => {
		const { state, draftedOverviews } = createMockState(["Address-overview"]);
		const context = createPipelineContext([
			{
				overviewModelId: "Address-overview",
				labels: [
					{ locale: "en", text: "Available Addresses" },
					{ locale: "de", text: "Verfugbare Adressen" }
				],
				source: "pane-label"
			}
		]);

		migrateOverviewLabels(context, state);

		const overview = draftedOverviews.get("Address-overview")!;

		expect(overview.header.labels).toBeDefined();
		expect(overview.header.labels).toHaveLength(2);
		expect(overview.header.labels![0]).toEqual({ locale: "en", text: "Available Addresses" });
		expect(overview.header.labels![1]).toEqual({ locale: "de", text: "Verfugbare Adressen" });
	});

	it("should apply labels to multiple overviews independently", () => {
		const { state, draftedOverviews } = createMockState(["candidate-overview", "link-overview"]);
		const context = createPipelineContext([
			{ overviewModelId: "candidate-overview", labels: [{ locale: "en", text: "Candidates" }], source: "pane-label" },
			{ overviewModelId: "link-overview", labels: [{ locale: "en", text: "Selected" }], source: "pane-label" }
		]);

		migrateOverviewLabels(context, state);

		expect(draftedOverviews.get("candidate-overview")!.header.labels![0].text).toBe("Candidates");
		expect(draftedOverviews.get("link-overview")!.header.labels![0].text).toBe("Selected");
	});

	it("should do nothing when overviewLabelMigrations is empty", () => {
		const { state, draftedOverviews } = createMockState();
		const context = createPipelineContext([]);

		migrateOverviewLabels(context, state);

		expect(draftedOverviews.size).toBe(0);
	});

	it("should handle labels with only a single locale", () => {
		const { state, draftedOverviews } = createMockState(["simple-overview"]);
		const context = createPipelineContext([
			{ overviewModelId: "simple-overview", labels: [{ locale: "en", text: "Simple Label" }], source: "pane-label" }
		]);

		migrateOverviewLabels(context, state);

		const overview = draftedOverviews.get("simple-overview")!;

		expect(overview.header.labels).toHaveLength(1);
		expect(overview.header.labels![0]).toEqual({ locale: "en", text: "Simple Label" });
	});

	it("should skip overviews not present in state", () => {
		const { state, draftedOverviews } = createMockState([]); // no overviews in state
		const context = createPipelineContext([
			{ overviewModelId: "non-existent-overview", labels: [{ locale: "en", text: "Label" }] }
		]);

		migrateOverviewLabels(context, state);

		expect(draftedOverviews.has("non-existent-overview")).toBe(false);
	});
});

describe("migrateOverviewLabels — source precedence", () => {
	it("pane-label overwrites existing relationship clone header labels", () => {
		const existingLabels = new Map([
			[
				"AvailableItems-overview--ProductBrand",
				[
					{ locale: "en", text: "Source available heading" },
					{ locale: "de", text: "Quellüberschrift verfügbar" }
				]
			]
		]);
		const { state, draftedOverviews } = createMockState(["AvailableItems-overview--ProductBrand"], existingLabels);
		const context = createPipelineContext([
			{
				overviewModelId: "AvailableItems-overview--ProductBrand",
				labels: [
					{ locale: "en", text: "Available products" },
					{ locale: "de", text: "Verfügbare Produkte" }
				],
				source: "pane-label"
			}
		]);

		migrateOverviewLabels(context, state);

		expect(draftedOverviews.get("AvailableItems-overview--ProductBrand")!.header.labels).toEqual([
			{ locale: "en", text: "Available products" },
			{ locale: "de", text: "Verfügbare Produkte" }
		]);
	});

	it("nested-edit-pane-label overwrites existing edit clone header labels", () => {
		const existingLabels = new Map([
			[
				"SelectedItems-overview-edit",
				[
					{ locale: "en", text: "Source edit selected heading" },
					{ locale: "de", text: "Quellüberschrift Bearbeitung" }
				]
			]
		]);
		const { state, draftedOverviews } = createMockState(["SelectedItems-overview-edit"], existingLabels);
		const context = createPipelineContext([
			{
				overviewModelId: "SelectedItems-overview-edit",
				labels: [
					{ locale: "en", text: "Edit Selected" },
					{ locale: "de", text: "Auswahl bearbeiten" }
				],
				source: "nested-edit-pane-label"
			}
		]);

		migrateOverviewLabels(context, state);

		expect(draftedOverviews.get("SelectedItems-overview-edit")!.header.labels).toEqual([
			{ locale: "en", text: "Edit Selected" },
			{ locale: "de", text: "Auswahl bearbeiten" }
		]);
	});

	it("pane-label wins over registry for the same overview", () => {
		const { state, draftedOverviews } = createMockState(["SelectedItems-overview"]);
		const context = createPipelineContext([
			{
				overviewModelId: "SelectedItems-overview",
				labels: [{ locale: "en", text: "Registry Label" }],
				source: "registry"
			},
			{
				overviewModelId: "SelectedItems-overview",
				labels: [{ locale: "en", text: "Explicit Pane Label" }],
				source: "pane-label"
			}
		]);

		migrateOverviewLabels(context, state);

		expect(draftedOverviews.get("SelectedItems-overview")!.header.labels![0].text).toBe("Explicit Pane Label");
	});

	it("registry fallback is applied when no explicit migration targets the overview", () => {
		const { state, draftedOverviews } = createMockState(["SelectedItems-overview"]);
		const context = createPipelineContext([
			{
				overviewModelId: "SelectedItems-overview",
				labels: [{ locale: "en", text: "Registry Sibling Label" }],
				source: "registry"
			}
		]);

		migrateOverviewLabels(context, state);

		expect(draftedOverviews.get("SelectedItems-overview")!.header.labels![0].text).toBe("Registry Sibling Label");
	});

	it("nested-edit-pane-label has same priority as pane-label; first-writer wins at same priority", () => {
		const { state, draftedOverviews } = createMockState(["Edit-overview"]);
		const context = createPipelineContext([
			{
				overviewModelId: "Edit-overview",
				labels: [{ locale: "en", text: "Nested Edit Label" }],
				source: "nested-edit-pane-label"
			},
			{
				overviewModelId: "Edit-overview",
				labels: [{ locale: "en", text: "Pane Label (should be skipped)" }],
				source: "pane-label"
			}
		]);

		migrateOverviewLabels(context, state);

		// Both have priority 2; first in iteration order wins
		expect(draftedOverviews.get("Edit-overview")!.header.labels![0].text).toBe("Nested Edit Label");
	});

	it("selected pane-label routes to base selected/table overview, not to edit clone", () => {
		const { state, draftedOverviews } = createMockState(["Link-overview", "Link-overview-edit"]);
		// This simulates what happens AFTER expansion: a selected pane-label expands to
		// {base} and {tableList} (when tableList exists). The -edit clone must NOT receive
		// the pane-label (since edit-clone labels come only from nested-edit-pane-label).
		const context = createPipelineContext([
			{
				overviewModelId: "Link-overview",
				labels: [{ locale: "en", text: "Selected products" }],
				source: "pane-label"
			},
			// Separate nested-edit migration targeting the -edit clone
			{
				overviewModelId: "Link-overview-edit",
				labels: [{ locale: "en", text: "Edit Selected" }],
				source: "nested-edit-pane-label"
			}
		]);

		migrateOverviewLabels(context, state);

		// Base link overview gets pane-label
		expect(draftedOverviews.get("Link-overview")!.header.labels![0].text).toBe("Selected products");
		// -edit clone gets nested-edit-pane-label, not the main selected label
		expect(draftedOverviews.get("Link-overview-edit")!.header.labels![0].text).toBe("Edit Selected");
	});

	it("base + RelName routing: pane-label available applies to both base and --RelName clone", () => {
		// This tests that two SEPARATE expanded migrations (one per target) are applied correctly.
		// In practice the expansion happens in index.ts; here we test that the migrator applies both.
		const { state, draftedOverviews } = createMockState(["Candidate-overview", "Candidate-overview--ProductBrand"]);
		const context = createPipelineContext([
			{
				overviewModelId: "Candidate-overview",
				labels: [{ locale: "en", text: "Available products" }],
				source: "pane-label"
			},
			{
				overviewModelId: "Candidate-overview--ProductBrand",
				labels: [{ locale: "en", text: "Available products" }],
				source: "pane-label"
			}
		]);

		migrateOverviewLabels(context, state);

		expect(draftedOverviews.get("Candidate-overview")!.header.labels![0].text).toBe("Available products");
		expect(draftedOverviews.get("Candidate-overview--ProductBrand")!.header.labels![0].text).toBe("Available products");
	});

	it("full precedence chain: pane-label > registry > legacy-no-source", () => {
		const { state, draftedOverviews } = createMockState(["SharedOverview"]);
		const context = createPipelineContext([
			{
				overviewModelId: "SharedOverview",
				labels: [{ locale: "en", text: "Legacy fallback" }]
				// source: undefined → priority 4
			},
			{
				overviewModelId: "SharedOverview",
				labels: [{ locale: "en", text: "Registry sibling" }],
				source: "registry"
				// priority 3
			},
			{
				overviewModelId: "SharedOverview",
				labels: [{ locale: "en", text: "Explicit pane label" }],
				source: "pane-label"
				// priority 2
			}
		]);

		migrateOverviewLabels(context, state);

		expect(draftedOverviews.get("SharedOverview")!.header.labels![0].text).toBe("Explicit pane label");
	});

	it("registry determinism: first binding in iteration order provides the registry label", () => {
		const { state, draftedOverviews } = createMockState(["Shared-selected-overview"]);
		// Registry fallback: two registry migrations targeting the same overview.
		// Only the first (by sort-stable iteration order) should win.
		const context = createPipelineContext([
			{
				overviewModelId: "Shared-selected-overview",
				labels: [{ locale: "en", text: "First binding registry label" }],
				source: "registry"
			},
			{
				overviewModelId: "Shared-selected-overview",
				labels: [{ locale: "en", text: "Second binding registry label (skipped)" }],
				source: "registry"
			}
		]);

		migrateOverviewLabels(context, state);

		// First-writer wins at same priority level
		expect(draftedOverviews.get("Shared-selected-overview")!.header.labels![0].text).toBe(
			"First binding registry label"
		);
	});
});

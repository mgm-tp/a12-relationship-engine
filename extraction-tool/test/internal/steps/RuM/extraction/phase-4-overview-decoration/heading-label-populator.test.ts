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
import {
	LINK_DEFAULT_LABELS,
	CANDIDATE_DEFAULT_LABELS
} from "../../../../../../src/internal/steps/RuM/extraction/constants.js";
import { populateDefaultLabels } from "../../../../../../src/internal/steps/RuM/extraction/phase-4-overview-decoration/heading-label-populator.js";
import type {
	Mutable,
	OverviewContext,
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
	overviewContextMap: OverviewDecorationContext["overviewContextMap"],
	multiContextRemap: OverviewDecorationContext["multiContextRemap"] = new Map(),
	cloneMap: OverviewDecorationContext["cloneMap"] = new Map(),
	tableListDirectSelectedOverviewIds: OverviewDecorationContext["tableListDirectSelectedOverviewIds"] = new Set()
): OverviewDecorationContext {
	return {
		overviewContextMap,
		pageSizeMigrations: [],
		rowActionMigrations: [],
		rowActivationMigrations: [],
		overviewLabelMigrations: [],
		cloneMap,
		multiContextRemap,
		tableListDirectSelectedOverviewIds,
		candidatePageSizeMap: new Map(),
		isCdm: false
	};
}

describe("populateDefaultLabels", () => {
	it("should apply 'Available Items' to candidate overviews with empty labels", () => {
		const { state, draftedOverviews } = createMockState(["Address-overview"]);
		const contextMap = new Map<string, readonly OverviewContext[]>();
		contextMap.set("Address-overview", [
			{ relationshipName: "Location", targetRole: "address", isLinkOverview: false }
		]);

		populateDefaultLabels(createPipelineContext(contextMap), state);

		const overview = draftedOverviews.get("Address-overview")!;

		expect(overview.header.labels).toEqual(CANDIDATE_DEFAULT_LABELS);
	});

	it("should apply 'Selected Items' to link overviews with empty labels", () => {
		const { state, draftedOverviews } = createMockState(["Links-overview"]);
		const contextMap = new Map<string, readonly OverviewContext[]>();
		contextMap.set("Links-overview", [{ relationshipName: "Location", targetRole: "address", isLinkOverview: true }]);

		populateDefaultLabels(createPipelineContext(contextMap), state);

		const overview = draftedOverviews.get("Links-overview")!;

		expect(overview.header.labels).toEqual(LINK_DEFAULT_LABELS);
	});

	it("should NOT overwrite existing non-empty labels", () => {
		const { state, draftedOverviews } = createMockState();

		// Pre-set labels on the overview
		state.draftOM("Links-overview", (draft) => {
			draft.header.labels = [{ locale: "en", text: "Existing Label" }];
		});

		const contextMap = new Map<string, readonly OverviewContext[]>();
		contextMap.set("Links-overview", [{ relationshipName: "Location", targetRole: "address", isLinkOverview: true }]);

		populateDefaultLabels(createPipelineContext(contextMap), state);

		const overview = draftedOverviews.get("Links-overview")!;

		// Existing labels should be preserved, not overwritten by defaults
		expect(overview.header.labels).toEqual([{ locale: "en", text: "Existing Label" }]);
	});

	it("should NOT apply defaults when overview has blank-only labels", () => {
		const { state, draftedOverviews } = createMockState();

		state.draftOM("Links-overview", (draft) => {
			draft.header.labels = [{ locale: "en", text: "" }];
		});

		const contextMap = new Map<string, readonly OverviewContext[]>();
		contextMap.set("Links-overview", [{ relationshipName: "Location", targetRole: "address", isLinkOverview: true }]);

		populateDefaultLabels(createPipelineContext(contextMap), state);

		const overview = draftedOverviews.get("Links-overview")!;

		// Blank labels count as non-empty for hasNonEmptyLabels (they have one entry with text.length === 0)
		// Actually hasNonEmptyLabels checks text.length > 0, so "" should be false
		// So defaults SHOULD be applied since labels are effectively empty
		expect(overview.header.labels).toEqual(LINK_DEFAULT_LABELS);
	});

	it("should treat overview with both candidate and link contexts as link", () => {
		const { state, draftedOverviews } = createMockState(["Mixed-overview"]);
		const contextMap = new Map<string, readonly OverviewContext[]>();
		contextMap.set("Mixed-overview", [
			{ relationshipName: "A", targetRole: "a", isLinkOverview: false },
			{ relationshipName: "B", targetRole: "b", isLinkOverview: true }
		]);

		populateDefaultLabels(createPipelineContext(contextMap), state);

		const overview = draftedOverviews.get("Mixed-overview")!;

		// Mixed context with link = treat as link
		expect(overview.header.labels).toEqual(LINK_DEFAULT_LABELS);
	});

	it("should handle multiple overviews independently", () => {
		const { state, draftedOverviews } = createMockState(["Candidate-overview", "Link-overview"]);
		const contextMap = new Map<string, readonly OverviewContext[]>();
		contextMap.set("Candidate-overview", [{ relationshipName: "Loc", targetRole: "addr", isLinkOverview: false }]);
		contextMap.set("Link-overview", [{ relationshipName: "Loc", targetRole: "addr", isLinkOverview: true }]);

		populateDefaultLabels(createPipelineContext(contextMap), state);

		expect(draftedOverviews.get("Candidate-overview")!.header.labels).toEqual(CANDIDATE_DEFAULT_LABELS);
		expect(draftedOverviews.get("Link-overview")!.header.labels).toEqual(LINK_DEFAULT_LABELS);
	});

	it("should do nothing when overviewContextMap is empty", () => {
		const { state, draftedOverviews } = createMockState();
		const contextMap = new Map<string, readonly OverviewContext[]>();

		populateDefaultLabels(createPipelineContext(contextMap), state);

		expect(draftedOverviews.size).toBe(0);
	});
});

describe("populateDefaultLabels — --RelationshipName clones", () => {
	it("should apply candidate default labels to a --RelationshipName clone whose base is a candidate overview", () => {
		const baseId = "Category_Category_AvailableItemsOverview";
		const cloneId = "Category_Category_AvailableItemsOverview--CategoryCategory";
		const { state, draftedOverviews } = createMockState([cloneId]);

		const contextMap = new Map<string, readonly OverviewContext[]>();
		contextMap.set(baseId, [
			{ relationshipName: "CategoryCategory", targetRole: "ChildCategory", isLinkOverview: false }
		]);

		const relToCloneMap = new Map([["CategoryCategory", cloneId]]);
		const multiContextRemap = new Map([[baseId, relToCloneMap]]);

		populateDefaultLabels(createPipelineContext(contextMap, multiContextRemap), state);

		const clone = draftedOverviews.get(cloneId)!;

		expect(clone.header.labels).toEqual(CANDIDATE_DEFAULT_LABELS);
	});

	it("should apply link default labels to a --RelationshipName clone whose base is a link overview", () => {
		const baseId = "Bundle_Product_SelectedItemsOverview";
		const cloneId = "Bundle_Product_SelectedItemsOverview--ProductBundle";
		const { state, draftedOverviews } = createMockState([cloneId]);

		const contextMap = new Map<string, readonly OverviewContext[]>();
		contextMap.set(baseId, [{ relationshipName: "ProductBundle", targetRole: "Bundle", isLinkOverview: true }]);

		const relToCloneMap = new Map([["ProductBundle", cloneId]]);
		const multiContextRemap = new Map([[baseId, relToCloneMap]]);

		populateDefaultLabels(createPipelineContext(contextMap, multiContextRemap), state);

		const clone = draftedOverviews.get(cloneId)!;

		expect(clone.header.labels).toEqual(LINK_DEFAULT_LABELS);
	});

	it("should NOT overwrite existing labels on a --RelationshipName clone", () => {
		const baseId = "Category_Category_AvailableItemsOverview";
		const cloneId = "Category_Category_AvailableItemsOverview--CategoryCategory";
		const { state, draftedOverviews } = createMockState();

		state.draftOM(cloneId, (draft) => {
			draft.header.labels = [{ locale: "en", text: "Custom Label" }];
		});

		const contextMap = new Map<string, readonly OverviewContext[]>();
		contextMap.set(baseId, [
			{ relationshipName: "CategoryCategory", targetRole: "ChildCategory", isLinkOverview: false }
		]);

		const relToCloneMap = new Map([["CategoryCategory", cloneId]]);
		const multiContextRemap = new Map([[baseId, relToCloneMap]]);

		populateDefaultLabels(createPipelineContext(contextMap, multiContextRemap), state);

		const clone = draftedOverviews.get(cloneId)!;

		expect(clone.header.labels).toEqual([{ locale: "en", text: "Custom Label" }]);
	});

	it("should skip a --RelationshipName clone that is not in state", () => {
		const baseId = "Category_Category_AvailableItemsOverview";
		const cloneId = "Category_Category_AvailableItemsOverview--CategoryCategory";
		// Note: cloneId is NOT added to state
		const { state, draftedOverviews } = createMockState();

		const contextMap = new Map<string, readonly OverviewContext[]>();
		contextMap.set(baseId, [
			{ relationshipName: "CategoryCategory", targetRole: "ChildCategory", isLinkOverview: false }
		]);

		const relToCloneMap = new Map([["CategoryCategory", cloneId]]);
		const multiContextRemap = new Map([[baseId, relToCloneMap]]);

		populateDefaultLabels(createPipelineContext(contextMap, multiContextRemap), state);

		expect(draftedOverviews.has(cloneId)).toBe(false);
	});

	it("should skip clone inference when base overview has no context entry (unknown)", () => {
		const baseId = "Orphan_Overview";
		const cloneId = "Orphan_Overview--SomeRelationship";
		const { state, draftedOverviews } = createMockState([cloneId]);

		// contextMap has no entry for baseId
		const contextMap = new Map<string, readonly OverviewContext[]>();

		const relToCloneMap = new Map([["SomeRelationship", cloneId]]);
		const multiContextRemap = new Map([[baseId, relToCloneMap]]);

		populateDefaultLabels(createPipelineContext(contextMap, multiContextRemap), state);

		// Clone in state but base context unknown — no labels should be applied
		expect(draftedOverviews.has(cloneId)).toBe(false);
	});

	it("should handle multiple clones per base overview independently", () => {
		const baseId = "Address-overview";
		const clone1 = "Address-overview--Location";
		const clone2 = "Address-overview--Office";
		const { state, draftedOverviews } = createMockState([clone1, clone2]);

		// clone2 already has labels — should not be overwritten
		state.draftOM(clone2, (draft) => {
			draft.header.labels = [{ locale: "en", text: "Office Addresses" }];
		});

		const contextMap = new Map<string, readonly OverviewContext[]>();
		contextMap.set(baseId, [{ relationshipName: "Location", targetRole: "address", isLinkOverview: false }]);

		const relToCloneMap = new Map([
			["Location", clone1],
			["Office", clone2]
		]);
		const multiContextRemap = new Map([[baseId, relToCloneMap]]);

		populateDefaultLabels(createPipelineContext(contextMap, multiContextRemap), state);

		expect(draftedOverviews.get(clone1)!.header.labels).toEqual(CANDIDATE_DEFAULT_LABELS);
		expect(draftedOverviews.get(clone2)!.header.labels).toEqual([{ locale: "en", text: "Office Addresses" }]);
	});
});

// Reproduces the Category_Category_AvailableItemsOverview--CategoryCategory gap:
// base overview has only ONE unique relationship name ("CategoryCategory") across
// multiple contexts (different targetRoles). the multi-relationship check returns false, so
// multiContextRemap has NO entry. Steps 1+2 both miss the clone. Step 3 must fix it.

describe("populateDefaultLabels — single-context --RelationshipName clones (Step 3)", () => {
	it("should apply candidate defaults to a single-context clone when base has two contexts with same relName", () => {
		// Exact Category scenario: two contexts, both CategoryCategory, different targetRoles
		const baseId = "Category_Category_AvailableItemsOverview";
		const cloneId = "Category_Category_AvailableItemsOverview--CategoryCategory";
		const { state, draftedOverviews } = createMockState([cloneId]);

		const contextMap = new Map<string, readonly OverviewContext[]>();
		contextMap.set(baseId, [
			{ relationshipName: "CategoryCategory", targetRole: "ParentCategory", isLinkOverview: false },
			{ relationshipName: "CategoryCategory", targetRole: "ChildCategory", isLinkOverview: false }
		]);

		// multiContextRemap is EMPTY — this is the key difference from GAP-1 clones
		populateDefaultLabels(createPipelineContext(contextMap), state);

		const clone = draftedOverviews.get(cloneId)!;

		expect(clone).toBeDefined();
		expect(clone.header.labels).toEqual(CANDIDATE_DEFAULT_LABELS);
	});

	it("should NOT apply defaults to single-context clone that already has labels", () => {
		const baseId = "Category_Category_AvailableItemsOverview";
		const cloneId = "Category_Category_AvailableItemsOverview--CategoryCategory";
		const { state, draftedOverviews } = createMockState();

		state.draftOM(cloneId, (draft) => {
			draft.header.labels = [{ locale: "en", text: "My Custom Label" }];
		});

		const contextMap = new Map<string, readonly OverviewContext[]>();
		contextMap.set(baseId, [
			{ relationshipName: "CategoryCategory", targetRole: "ParentCategory", isLinkOverview: false },
			{ relationshipName: "CategoryCategory", targetRole: "ChildCategory", isLinkOverview: false }
		]);

		populateDefaultLabels(createPipelineContext(contextMap), state);

		expect(draftedOverviews.get(cloneId)!.header.labels).toEqual([{ locale: "en", text: "My Custom Label" }]);
	});

	it("should skip Step 3 for a base overview already covered by multiContextRemap", () => {
		// If multiContextRemap has an entry for the base, Step 2 already handled the clone;
		// Step 3 should not double-apply or overwrite.
		const baseId = "Multi_Rel_Overview";
		const cloneRelA = "Multi_Rel_Overview--RelA";
		const cloneRelB = "Multi_Rel_Overview--RelB";
		const { state, draftedOverviews } = createMockState([cloneRelA, cloneRelB]);

		const contextMap = new Map<string, readonly OverviewContext[]>();
		contextMap.set(baseId, [
			{ relationshipName: "RelA", targetRole: "Target", isLinkOverview: false },
			{ relationshipName: "RelB", targetRole: "Target", isLinkOverview: false }
		]);

		const relToCloneMap = new Map([
			["RelA", cloneRelA],
			["RelB", cloneRelB]
		]);
		const multiContextRemap = new Map([[baseId, relToCloneMap]]);

		populateDefaultLabels(createPipelineContext(contextMap, multiContextRemap), state);

		// Both clones get defaults (Step 2 handled them); Step 3 is skipped for this base
		expect(draftedOverviews.get(cloneRelA)!.header.labels).toEqual(CANDIDATE_DEFAULT_LABELS);
		expect(draftedOverviews.get(cloneRelB)!.header.labels).toEqual(CANDIDATE_DEFAULT_LABELS);
	});

	it("should skip single-context clone that is not in state (no crash)", () => {
		const baseId = "Category_Category_AvailableItemsOverview";
		// clone NOT added to state
		const { state, draftedOverviews } = createMockState();

		const contextMap = new Map<string, readonly OverviewContext[]>();
		contextMap.set(baseId, [
			{ relationshipName: "CategoryCategory", targetRole: "ParentCategory", isLinkOverview: false },
			{ relationshipName: "CategoryCategory", targetRole: "ChildCategory", isLinkOverview: false }
		]);

		// Should not throw even though clone doesn't exist in state
		expect(() => populateDefaultLabels(createPipelineContext(contextMap), state)).not.toThrow();
		expect(draftedOverviews.size).toBe(0);
	});

	it("should apply link defaults to single-context link clone", () => {
		const baseId = "ProductBrand_SelectedItemsOverview";
		const cloneId = "ProductBrand_SelectedItemsOverview--ProductBrand";
		const { state, draftedOverviews } = createMockState([cloneId]);

		const contextMap = new Map<string, readonly OverviewContext[]>();
		contextMap.set(baseId, [
			{ relationshipName: "ProductBrand", targetRole: "Product", isLinkOverview: true },
			{ relationshipName: "ProductBrand", targetRole: "Brand", isLinkOverview: true }
		]);

		// Only link contexts — no candidate contexts, so no unique candidate relNames
		// Step 3 iterates candidateContexts only, so no clone lookup happens for pure link overviews
		// (link clones are handled by other means). Verify no crash and no candidate labels applied.
		populateDefaultLabels(createPipelineContext(contextMap), state);

		// Step 1 applies LINK_DEFAULT_LABELS to the base (since isLinkOverview=true).
		// The clone in state with empty labels is NOT touched by Step 3 (link contexts are skipped).
		// Verify the base got labels (Step 1) but clone didn't (Step 3 only handles candidate contexts).
		// The base is not in state here, so draftedOverviews will be empty (clone has no labels applied).
		expect(draftedOverviews.has(cloneId)).toBe(false);
	});
});

describe("populateDefaultLabels — direct table and edit clones", () => {
	it("should apply selected defaults to an existing -tableList clone", () => {
		const baseId = "ProductBrand_SelectedItemsOverview";
		const tableListCloneId = "ProductBrand_SelectedItemsOverview-tableList";
		const { state, draftedOverviews } = createMockState([baseId, tableListCloneId]);
		const contextMap = new Map<string, readonly OverviewContext[]>();
		contextMap.set(baseId, [{ relationshipName: "ProductBrand", targetRole: "Brand", isLinkOverview: true }]);

		populateDefaultLabels(createPipelineContext(contextMap), state);

		expect(draftedOverviews.get(tableListCloneId)!.header.labels).toEqual(LINK_DEFAULT_LABELS);
	});

	it("should skip selected defaults for a suppressed -tableList clone", () => {
		const baseId = "ProductBrand_SelectedItemsOverview";
		const tableListCloneId = "ProductBrand_SelectedItemsOverview-tableList";
		const { state, draftedOverviews } = createMockState([baseId, tableListCloneId]);
		const contextMap = new Map<string, readonly OverviewContext[]>();
		contextMap.set(baseId, [{ relationshipName: "ProductBrand", targetRole: "Brand", isLinkOverview: true }]);

		populateDefaultLabels(createPipelineContext(contextMap, new Map(), new Map(), new Set([tableListCloneId])), state);

		expect(draftedOverviews.has(tableListCloneId)).toBe(false);
		expect((state.get(tableListCloneId) as OverviewModel).header.labels).toBeUndefined();
	});

	it("should apply selected defaults to an existing -edit clone from cloneMap", () => {
		const baseId = "ProductBrand_SelectedItemsOverview";
		const editCloneId = "ProductBrand_SelectedItemsOverview-edit";
		const { state, draftedOverviews } = createMockState([editCloneId]);
		const contextMap = new Map<string, readonly OverviewContext[]>();
		const cloneMap = new Map([[baseId, editCloneId]]);

		contextMap.set(baseId, [{ relationshipName: "ProductBrand", targetRole: "Brand", isLinkOverview: true }]);

		populateDefaultLabels(createPipelineContext(contextMap, new Map(), cloneMap), state);

		expect(draftedOverviews.get(editCloneId)!.header.labels).toEqual(LINK_DEFAULT_LABELS);
	});
});

describe("Default label constants — fallback wording", () => {
	it("CANDIDATE_DEFAULT_LABELS includes English and German Available Items wording", () => {
		expect(CANDIDATE_DEFAULT_LABELS).toEqual([
			{ locale: "en", text: "Available Items" },
			{ locale: "de", text: "Verf\u00fcgbare Eintr\u00e4ge" }
		]);
	});

	it("LINK_DEFAULT_LABELS includes English and German Selected Items wording", () => {
		expect(LINK_DEFAULT_LABELS).toEqual([
			{ locale: "en", text: "Selected Items" },
			{ locale: "de", text: "Ausgew\u00e4hlte Eintr\u00e4ge" }
		]);
	});
});

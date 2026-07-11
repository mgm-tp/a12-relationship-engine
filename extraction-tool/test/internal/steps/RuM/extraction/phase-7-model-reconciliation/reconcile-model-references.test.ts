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

import type { FormModel } from "../../../../../../src/models/form-model.js";
import { ExtractionState } from "../../../../../../src/internal/steps/RuM/extraction/extraction-state.js";
import {
	type ReconcileContext,
	reconcileAllModelReferences
} from "../../../../../../src/internal/steps/RuM/extraction/phase-7-model-reconciliation/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(overrides?: Partial<ReconcileContext>): ReconcileContext {
	return {
		overviewDocModelMap: new Map(),
		generatedQueryModelIds: new Set(),
		existingOverviewQueryRefs: new Map(),
		...overrides
	};
}

function makeState(...models: object[]): ExtractionState {
	const state = new ExtractionState();

	for (const model of models) {
		state.put(model);
	}

	return state;
}

function getRefs(state: ExtractionState, id: string): Array<{ purpose: string; modelType: string; reference: string }> {
	const model = state.get(id) as Record<string, unknown> | undefined;
	const header = model?.header as Record<string, unknown> | undefined;
	const refs = header?.modelReferences as Array<{ purpose: string; modelType: string; reference: string }> | undefined;

	return refs ?? [];
}

function createFormModel(
	screenElements: readonly FormModel.ScreenElement[],
	modelReferences: ReadonlyArray<{ purpose: string; modelType: string; reference: string }> = []
): FormModel {
	return {
		header: {
			id: "TestForm",
			modelType: "form",
			modelVersion: "1.0.0",
			annotations: [],
			modelReferences: [...modelReferences]
		},
		content: {
			screens: [
				{
					id: "screen-1",
					name: "Screen 1",
					screenElements
				}
			],
			subHeaderBox: { id: "sub-header-box" },
			footerBox: { id: "footer-box" },
			fieldConfiguration: {},
			groupConfiguration: {},
			defaults: {}
		}
	};
}

function createCustomScreenElement(
	id: string,
	reference?: string,
	overrides: Readonly<Partial<FormModel.CustomScreenElement>> = {}
): FormModel.CustomScreenElement {
	return {
		id,
		name: id,
		type: "CustomScreenElement",
		reference,
		annotations: [],
		...overrides
	};
}

function createSection(id: string, screenElements?: readonly FormModel.ScreenElement[]): FormModel.Section {
	return {
		id,
		name: id,
		type: "Section",
		screenElements,
		annotations: []
	};
}

function createMultiColumnSection(
	id: string,
	screenElements?: readonly FormModel.ScreenElement[]
): FormModel.MultiColumnSection {
	return {
		id,
		name: id,
		type: "MultiColumnSection",
		layout: { lg: "12" },
		screenElements,
		annotations: []
	};
}

function createDetailScreen(id: string, screenElements: readonly FormModel.ScreenElement[] = []): FormModel.Screen {
	return {
		id,
		name: id,
		screenElements,
		annotations: []
	};
}

function createDetachedRepeat(
	id: string,
	detailScreen: FormModel.Screen,
	overrides: Readonly<Partial<FormModel.DetachedRepeat>> = {}
): FormModel.DetachedRepeat {
	return {
		id,
		name: id,
		type: "DetachedRepeat",
		groupRef: "group-1",
		detailScreen,
		annotations: [],
		...overrides
	};
}

// ---------------------------------------------------------------------------
// RuM — DropDownSelection
// ---------------------------------------------------------------------------

describe("reconcileAllModelReferences — RuM DropDownSelection", () => {
	it("should derive 2 query refs for DropDownSelection with both query models set (no overview refs)", () => {
		const rum = {
			header: { id: "form-binding-test_RuM", modelType: "relationship-ui", modelReferences: [] },
			content: {
				relationshipName: "Rel",
				targetRole: "Target",
				component: {
					componentType: "DropDownSelection",
					availableItemsQueryModel: "form-available-query",
					selectedItemQueryModel: "form-selected-query"
				}
			}
		};
		const state = makeState(rum);

		reconcileAllModelReferences(state, makeContext());

		const refs = getRefs(state, "form-binding-test_RuM");

		expect(refs).toHaveLength(2);
		expect(refs[0]).toEqual({ purpose: "availableItemsQuery", modelType: "query", reference: "form-available-query" });
		expect(refs[1]).toEqual({ purpose: "selectedItemQuery", modelType: "query", reference: "form-selected-query" });
	});

	it("should emit only availableItemsQuery when selectedItemQueryModel is absent", () => {
		const rum = {
			header: { id: "form-binding-dd_RuM", modelType: "relationship-ui", modelReferences: [] },
			content: {
				relationshipName: "Rel",
				targetRole: "Target",
				component: {
					componentType: "DropDownSelection",
					availableItemsQueryModel: "form-available-query"
				}
			}
		};
		const state = makeState(rum);

		reconcileAllModelReferences(state, makeContext());

		const refs = getRefs(state, "form-binding-dd_RuM");

		expect(refs).toHaveLength(1);
		expect(refs[0]).toEqual({ purpose: "availableItemsQuery", modelType: "query", reference: "form-available-query" });
	});

	it("should produce empty refs for DropDownSelection with no query fields", () => {
		const rum = {
			header: { id: "form-binding-empty_RuM", modelType: "relationship-ui", modelReferences: [] },
			content: {
				relationshipName: "Rel",
				targetRole: "Target",
				component: { componentType: "DropDownSelection" }
			}
		};
		const state = makeState(rum);

		reconcileAllModelReferences(state, makeContext());

		expect(getRefs(state, "form-binding-empty_RuM")).toHaveLength(0);
	});

	it("should derive 4 refs for DropDownSelection with both query + overview models set", () => {
		const rum = {
			header: { id: "form-binding-dd-overview_RuM", modelType: "relationship-ui", modelReferences: [] },
			content: {
				relationshipName: "Rel",
				targetRole: "Target",
				component: {
					componentType: "DropDownSelection",
					selectedItemsOverviewModel: "SelectedOverview",
					availableItemsOverviewModel: "CandidateOverview",
					availableItemsQueryModel: "form-available-query",
					selectedItemQueryModel: "form-selected-query"
				}
			}
		};
		const state = makeState(rum);

		reconcileAllModelReferences(state, makeContext());

		const refs = getRefs(state, "form-binding-dd-overview_RuM");

		expect(refs).toHaveLength(4);
		expect(refs[0]).toEqual({ purpose: "availableItems", modelType: "overview", reference: "CandidateOverview" });
		expect(refs[1]).toEqual({ purpose: "selectedItems", modelType: "overview", reference: "SelectedOverview" });
		expect(refs[2]).toEqual({ purpose: "availableItemsQuery", modelType: "query", reference: "form-available-query" });
		expect(refs[3]).toEqual({ purpose: "selectedItemQuery", modelType: "query", reference: "form-selected-query" });
	});

	it("should derive only overview refs for DropDownSelection with no query fields", () => {
		const rum = {
			header: { id: "form-binding-dd-overview-only_RuM", modelType: "relationship-ui", modelReferences: [] },
			content: {
				relationshipName: "Rel",
				targetRole: "Target",
				component: {
					componentType: "DropDownSelection",
					selectedItemsOverviewModel: "SelectedOverview",
					availableItemsOverviewModel: "CandidateOverview"
				}
			}
		};
		const state = makeState(rum);

		reconcileAllModelReferences(state, makeContext());

		const refs = getRefs(state, "form-binding-dd-overview-only_RuM");

		expect(refs).toHaveLength(2);
		expect(refs[0]).toEqual({ purpose: "availableItems", modelType: "overview", reference: "CandidateOverview" });
		expect(refs[1]).toEqual({ purpose: "selectedItems", modelType: "overview", reference: "SelectedOverview" });
	});
});

// ---------------------------------------------------------------------------
// RuM — DualPaneSelection
// ---------------------------------------------------------------------------

describe("reconcileAllModelReferences — RuM DualPaneSelection", () => {
	it("should derive up to 5 refs for DualPaneSelection with all fields set", () => {
		const rum = {
			header: { id: "form-binding-dual_RuM", modelType: "relationship-ui", modelReferences: [] },
			content: {
				relationshipName: "Rel",
				targetRole: "Target",
				component: {
					componentType: "DualPaneSelection",
					availableItemsOverviewModel: "candidate-overview",
					selectedItemsOverviewModel: "link-overview",
					linkFormModel: "link-form",
					editConfiguration: {
						availableItemsOverviewModel: "edit-candidate-overview",
						selectedItemsOverviewModel: "edit-link-overview"
					}
				}
			}
		};
		const state = makeState(rum);

		reconcileAllModelReferences(state, makeContext());

		const refs = getRefs(state, "form-binding-dual_RuM");

		expect(refs).toHaveLength(5);
		expect(refs[0]).toEqual({ purpose: "availableItems", modelType: "overview", reference: "candidate-overview" });
		expect(refs[1]).toEqual({ purpose: "selectedItems", modelType: "overview", reference: "link-overview" });
		expect(refs[2]).toEqual({ purpose: "link", modelType: "form", reference: "link-form" });
		expect(refs[3]).toEqual({
			purpose: "availableItemsInEditModal",
			modelType: "overview",
			reference: "edit-candidate-overview"
		});
		expect(refs[4]).toEqual({
			purpose: "selectedItemsInEditModal",
			modelType: "overview",
			reference: "edit-link-overview"
		});
	});

	it("should exclude optional fields that are absent", () => {
		const rum = {
			header: { id: "form-binding-partial_RuM", modelType: "relationship-ui", modelReferences: [] },
			content: {
				relationshipName: "Rel",
				targetRole: "Target",
				component: {
					componentType: "DualPaneSelection",
					availableItemsOverviewModel: "candidate-overview",
					selectedItemsOverviewModel: "link-overview"
					// linkFormModel absent, editConfiguration absent
				}
			}
		};
		const state = makeState(rum);

		reconcileAllModelReferences(state, makeContext());

		const refs = getRefs(state, "form-binding-partial_RuM");

		expect(refs).toHaveLength(2);
		expect(refs[0]).toEqual({ purpose: "availableItems", modelType: "overview", reference: "candidate-overview" });
		expect(refs[1]).toEqual({ purpose: "selectedItems", modelType: "overview", reference: "link-overview" });
	});
});

// ---------------------------------------------------------------------------
// RuM — TableList
// ---------------------------------------------------------------------------

describe("reconcileAllModelReferences — RuM TableList", () => {
	it("should derive refs from TableList similarly to DualPaneSelection", () => {
		const rum = {
			header: { id: "form-binding-tl_RuM", modelType: "relationship-ui", modelReferences: [] },
			content: {
				relationshipName: "Rel",
				targetRole: "Target",
				component: {
					componentType: "TableList",
					selectedItemsOverviewModel: "link-overview",
					editConfiguration: {
						availableItemsOverviewModel: "edit-candidate-overview",
						selectedItemsOverviewModel: "edit-link-overview"
					}
				}
			}
		};
		const state = makeState(rum);

		reconcileAllModelReferences(state, makeContext());

		const refs = getRefs(state, "form-binding-tl_RuM");

		expect(refs).toHaveLength(3);
		expect(refs[0]).toEqual({ purpose: "selectedItems", modelType: "overview", reference: "link-overview" });
		expect(refs[1]).toEqual({
			purpose: "availableItemsInEditModal",
			modelType: "overview",
			reference: "edit-candidate-overview"
		});
		expect(refs[2]).toEqual({
			purpose: "selectedItemsInEditModal",
			modelType: "overview",
			reference: "edit-link-overview"
		});
	});
});

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

describe("reconcileAllModelReferences — Overview", () => {
	it("should derive only query ref when query model exists (query wins over document)", () => {
		const overview = {
			header: { id: "my-overview", modelType: "overview", modelReferences: [] },
			content: { columns: [] }
		};
		const state = makeState(overview);
		const context = makeContext({
			overviewDocModelMap: new Map([["my-overview", "TargetDM"]]),
			generatedQueryModelIds: new Set(["my-overview-query"])
		});

		reconcileAllModelReferences(state, context);

		const refs = getRefs(state, "my-overview");

		expect(refs).toHaveLength(1);
		expect(refs[0]).toEqual({
			purpose: "query-model-for-overview",
			modelType: "query",
			reference: "my-overview-query"
		});
	});

	it("should derive only doc ref with alias DM when no query model exists", () => {
		const overview = {
			header: { id: "my-overview", modelType: "overview", modelReferences: [] },
			content: { columns: [] }
		};
		const state = makeState(overview);
		const context = makeContext({
			overviewDocModelMap: new Map([["my-overview", "TargetDM"]])
		});

		reconcileAllModelReferences(state, context);

		const refs = getRefs(state, "my-overview");

		expect(refs).toHaveLength(1);
		expect(refs[0]).toEqual({
			purpose: "document-model-for-overview",
			modelType: "document",
			alias: "DM",
			reference: "TargetDM"
		});
	});

	it("should NOT match -new-query of a clone for a base overview (bug regression)", () => {
		// Base overview Bundle_Product_SelectedItemsOverview should not match
		// the clone's query model Bundle_Product_SelectedItemsOverview-new-query.
		// Instead, it should fall back to document-model-for-overview.
		const baseOverview = {
			header: { id: "Bundle_Product_SelectedItemsOverview", modelType: "overview", modelReferences: [] },
			content: { columns: [] }
		};
		const state = makeState(baseOverview);
		const context = makeContext({
			overviewDocModelMap: new Map([["Bundle_Product_SelectedItemsOverview", "ProductBundle_Product____generated"]]),
			generatedQueryModelIds: new Set(["Bundle_Product_SelectedItemsOverview-new-query"])
		});

		reconcileAllModelReferences(state, context);

		const refs = getRefs(state, "Bundle_Product_SelectedItemsOverview");

		expect(refs).toHaveLength(1);
		expect(refs[0]).toEqual({
			purpose: "document-model-for-overview",
			modelType: "document",
			alias: "DM",
			reference: "ProductBundle_Product____generated"
		});
	});

	it("should produce empty refs when overview is not in doc model map", () => {
		const overview = {
			header: { id: "orphan-overview", modelType: "overview", modelReferences: [] },
			content: { columns: [] }
		};
		const state = makeState(overview);

		reconcileAllModelReferences(state, makeContext());

		expect(getRefs(state, "orphan-overview")).toHaveLength(0);
	});

	it("should match -query suffix for -new and -edit overviews and emit only query ref", () => {
		const overviewNewQuery = {
			header: { id: "ov-new", modelType: "overview", modelReferences: [] },
			content: { columns: [] }
		};
		const overviewEditQuery = {
			header: { id: "ov-edit", modelType: "overview", modelReferences: [] },
			content: { columns: [] }
		};
		const state = makeState(overviewNewQuery, overviewEditQuery);
		const context = makeContext({
			overviewDocModelMap: new Map([
				["ov-new", "DM1"],
				["ov-edit", "DM2"]
			]),
			generatedQueryModelIds: new Set(["ov-new-query", "ov-edit-query"])
		});

		reconcileAllModelReferences(state, context);

		const newRefs = getRefs(state, "ov-new");
		const editRefs = getRefs(state, "ov-edit");

		expect(newRefs).toHaveLength(1);
		expect(newRefs[0]).toEqual({
			purpose: "query-model-for-overview",
			modelType: "query",
			reference: "ov-new-query"
		});
		expect(editRefs).toHaveLength(1);
		expect(editRefs[0]).toEqual({
			purpose: "query-model-for-overview",
			modelType: "query",
			reference: "ov-new-query"
		});
	});

	it("should match -available-query suffix for candidate overviews and emit only query ref", () => {
		const candidateOverview = {
			header: { id: "ov-candidate", modelType: "overview", modelReferences: [] },
			content: { columns: [] }
		};
		const state = makeState(candidateOverview);
		const context = makeContext({
			overviewDocModelMap: new Map([["ov-candidate", "DM1"]]),
			generatedQueryModelIds: new Set(["ov-candidate-available-query"])
		});

		reconcileAllModelReferences(state, context);

		const refs = getRefs(state, "ov-candidate");

		expect(refs).toHaveLength(1);
		expect(refs[0]).toEqual({
			purpose: "query-model-for-overview",
			modelType: "query",
			reference: "ov-candidate-available-query"
		});
	});

	it("should derive query ref for -new candidate clone (query-model-for-overview per Q20)", () => {
		// Candidate -new clones use query-model-for-overview, never
		// document-model-for-overview, per the Q20 mutual exclusion rule.
		const roleClone = {
			header: { id: "Address-overview-new", modelType: "overview", modelReferences: [] },
			content: { columns: [] }
		};
		const state = makeState(roleClone);
		const context = makeContext({
			overviewDocModelMap: new Map([["Address-overview-new", "AddressDM"]]),
			generatedQueryModelIds: new Set(["Address-overview-new-query"])
		});

		reconcileAllModelReferences(state, context);

		const refs = getRefs(state, "Address-overview-new");

		expect(refs).toHaveLength(1);
		expect(refs[0]).toEqual({
			purpose: "query-model-for-overview",
			modelType: "query",
			reference: "Address-overview-new-query"
		});
	});

	it("should preserve an existing query-backed edit clone ref that shares the base overview query", () => {
		const editOverview = {
			header: {
				id: "Bundle_Product_SelectedItemsOverview-edit",
				modelType: "overview",
				modelReferences: [
					{
						purpose: "query-model-for-overview",
						modelType: "query",
						reference: "Bundle_Product_SelectedItemsOverview-query"
					}
				]
			},
			content: { columns: [] }
		};
		const state = makeState(editOverview);

		reconcileAllModelReferences(
			state,
			makeContext({
				overviewDocModelMap: new Map([["Bundle_Product_SelectedItemsOverview-edit", "BundleDM"]]),
				existingOverviewQueryRefs: new Map([
					["Bundle_Product_SelectedItemsOverview-edit", "Bundle_Product_SelectedItemsOverview-query"]
				])
			})
		);

		expect(getRefs(state, "Bundle_Product_SelectedItemsOverview-edit")).toEqual([
			{
				purpose: "query-model-for-overview",
				modelType: "query",
				reference: "Bundle_Product_SelectedItemsOverview-query"
			}
		]);
	});

	it("should resolve -edit clones to the shared base -query when generated in that shape", () => {
		const editOverview = {
			header: { id: "LocationLinks-overview-edit", modelType: "overview", modelReferences: [] },
			content: { columns: [] }
		};
		const state = makeState(editOverview);

		reconcileAllModelReferences(
			state,
			makeContext({
				overviewDocModelMap: new Map([["LocationLinks-overview-edit", "LocationDM"]]),
				generatedQueryModelIds: new Set(["LocationLinks-overview-query"])
			})
		);

		expect(getRefs(state, "LocationLinks-overview-edit")).toEqual([
			{
				purpose: "query-model-for-overview",
				modelType: "query",
				reference: "LocationLinks-overview-query"
			}
		]);
	});
});

// ---------------------------------------------------------------------------
// Query model
// ---------------------------------------------------------------------------

describe("reconcileAllModelReferences — Query", () => {
	it("should derive document-model-for-query from targetDocumentModel", () => {
		const query = {
			header: { id: "my-query", modelType: "query", modelReferences: [] },
			content: {
				targetDocumentModel: "TargetDM",
				projectionName: "document",
				paging: { pageNumber: 0, pageSize: 20 },
				links: []
			}
		};
		const state = makeState(query);

		reconcileAllModelReferences(state, makeContext());

		const refs = getRefs(state, "my-query");

		expect(refs).toHaveLength(1);
		expect(refs[0]).toEqual({
			purpose: "document-model-for-query",
			modelType: "document",
			alias: "DM",
			reference: "TargetDM"
		});
	});

	it("should derive relationship-model-for-query from links[0].relationshipModel", () => {
		const query = {
			header: { id: "my-query-2", modelType: "query", modelReferences: [] },
			content: {
				targetDocumentModel: "TargetDM",
				projectionName: "document",
				paging: { pageNumber: 0, pageSize: 20 },
				links: [
					{
						relationshipModel: "MyRelationship",
						targetRole: "Product",
						maxDepth: 1,
						constraint: { operator: "exact_match", field: "/__meta/docRef", value: "${SourceDM, [/__meta/docRef]}" }
					}
				]
			}
		};
		const state = makeState(query);

		reconcileAllModelReferences(state, makeContext());

		const refs = getRefs(state, "my-query-2");

		expect(refs).toHaveLength(2);
		expect(refs[0]).toEqual({
			purpose: "document-model-for-query",
			modelType: "document",
			alias: "DM",
			reference: "TargetDM"
		});
		expect(refs[1]).toEqual({
			purpose: "relationship-model-for-query",
			modelType: "relationship",
			alias: "RM",
			reference: "MyRelationship"
		});
	});

	it("preserves an existing relationship-model-for-query header ref for regenerated linkless dropdown queries", () => {
		const query = {
			header: {
				id: "dropdown-query",
				modelType: "query",
				modelReferences: [
					{ purpose: "document-model-for-query", modelType: "document", alias: "DM", reference: "TargetDM" },
					{
						purpose: "relationship-model-for-query",
						modelType: "relationship",
						alias: "RM",
						reference: "ExistingRelationship"
					}
				]
			},
			content: {
				targetDocumentModel: "TargetDM",
				projectionName: "document",
				paging: { pageNumber: 0, pageSize: 20 },
				links: []
			}
		};
		const state = makeState(query);

		reconcileAllModelReferences(state, makeContext());

		expect(getRefs(state, "dropdown-query")).toEqual([
			{ purpose: "document-model-for-query", modelType: "document", alias: "DM", reference: "TargetDM" },
			{
				purpose: "relationship-model-for-query",
				modelType: "relationship",
				alias: "RM",
				reference: "ExistingRelationship"
			}
		]);
	});

	it("does not invent a relationship-model-for-query ref when links are empty and no existing RM ref is present", () => {
		const query = {
			header: { id: "my-query-empty", modelType: "query", modelReferences: [] },
			content: {
				targetDocumentModel: "TargetDM",
				projectionName: "document",
				paging: { pageNumber: 0, pageSize: 20 },
				links: []
			}
		};
		const state = makeState(query);

		reconcileAllModelReferences(state, makeContext());

		expect(getRefs(state, "my-query-empty")).toEqual([
			{ purpose: "document-model-for-query", modelType: "document", alias: "DM", reference: "TargetDM" }
		]);
	});

	it("should produce empty refs when targetDocumentModel is absent", () => {
		const query = {
			header: { id: "my-query-without-target", modelType: "query", modelReferences: [] },
			content: { projectionName: "document", paging: { pageNumber: 0, pageSize: 20 }, links: [] }
		};
		const state = makeState(query);

		reconcileAllModelReferences(state, makeContext());

		expect(getRefs(state, "my-query-without-target")).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Form model
// ---------------------------------------------------------------------------

describe("reconcileAllModelReferences — Form", () => {
	it("should derive relationship-ui refs from nested real FormModel screen elements", () => {
		const form = createFormModel(
			[
				createSection("section-1", [
					createCustomScreenElement("custom-in-section", "SectionRuM"),
					createMultiColumnSection("columns-1", [createCustomScreenElement("custom-in-columns", "MultiColumnRuM")])
				])
			],
			[{ purpose: "document", modelType: "document", reference: "PersonDM" }]
		);
		const state = makeState(form);

		reconcileAllModelReferences(state, makeContext());

		expect(getRefs(state, "TestForm")).toEqual([
			{ purpose: "document", modelType: "document", reference: "PersonDM" },
			{ purpose: "relationship-ui", modelType: "relationship-ui", reference: "SectionRuM" },
			{ purpose: "relationship-ui", modelType: "relationship-ui", reference: "MultiColumnRuM" }
		]);
	});

	it("should derive relationship-ui refs from DetachedRepeat annotation and detailScreen CustomScreenElement", () => {
		const form = createFormModel([
			createDetachedRepeat(
				"detached-repeat",
				createDetailScreen("detail-screen", [createCustomScreenElement("detail-custom", "DetailRuM")]),
				{ annotations: [{ name: "a12-relationship-ui-model-reference", value: "DetachedRepeatRuM" }] }
			)
		]);
		const state = makeState(form);

		reconcileAllModelReferences(state, makeContext());

		expect(getRefs(state, "TestForm")).toEqual([
			{ purpose: "relationship-ui", modelType: "relationship-ui", reference: "DetachedRepeatRuM" },
			{ purpose: "relationship-ui", modelType: "relationship-ui", reference: "DetailRuM" }
		]);
	});

	it("should preserve pre-existing non-relationship-ui refs", () => {
		const form = createFormModel(
			[createCustomScreenElement("custom-1", "TestForm-rum_RuM")],
			[
				{ purpose: "document", modelType: "document", reference: "PersonDM" },
				{ purpose: "form", modelType: "form", reference: "SubForm" }
			]
		);
		const state = makeState(form);

		reconcileAllModelReferences(state, makeContext());

		expect(getRefs(state, "TestForm")).toEqual([
			{ purpose: "document", modelType: "document", reference: "PersonDM" },
			{ purpose: "form", modelType: "form", reference: "SubForm" },
			{ purpose: "relationship-ui", modelType: "relationship-ui", reference: "TestForm-rum_RuM" }
		]);
	});

	it("should merge pre-existing relationship-ui refs with element-traversal-found ones", () => {
		const form = createFormModel(
			[createCustomScreenElement("custom-1", "NewRuM")],
			[
				{ purpose: "document", modelType: "document", reference: "PersonDM" },
				{ purpose: "relationship-ui", modelType: "relationship-ui", reference: "OldRuM" }
			]
		);
		const state = makeState(form);

		reconcileAllModelReferences(state, makeContext());

		// Pre-existing relationship-ui refs are preserved (P4 may have set them),
		// and element-traversal-found refs are merged in. Both "OldRuM" and
		// "NewRuM" should appear alongside the preserved non-RE ref.
		expect(getRefs(state, "TestForm")).toEqual([
			{ purpose: "document", modelType: "document", reference: "PersonDM" },
			{ purpose: "relationship-ui", modelType: "relationship-ui", reference: "NewRuM" },
			{ purpose: "relationship-ui", modelType: "relationship-ui", reference: "OldRuM" }
		]);
	});

	it("should handle form with no screen elements (no refs added)", () => {
		const form = createFormModel([], [{ purpose: "document", modelType: "document", reference: "DM" }]);
		const state = makeState(form);

		reconcileAllModelReferences(state, makeContext());

		expect(getRefs(state, "TestForm")).toEqual([{ purpose: "document", modelType: "document", reference: "DM" }]);
	});
});

// ---------------------------------------------------------------------------
// Canonical key ordering
// ---------------------------------------------------------------------------

describe("reconcileAllModelReferences — canonical key ordering", () => {
	it("should produce ref objects with keys in order: purpose, modelType, reference", () => {
		const rum = {
			header: { id: "order-test_RuM", modelType: "relationship-ui", modelReferences: [] },
			content: {
				relationshipName: "Rel",
				targetRole: "Target",
				component: {
					componentType: "DropDownSelection",
					availableItemsQueryModel: "q1",
					selectedItemQueryModel: "q2"
				}
			}
		};
		const state = makeState(rum);

		reconcileAllModelReferences(state, makeContext());

		const refs = getRefs(state, "order-test_RuM");

		expect(refs).toHaveLength(2);

		for (const ref of refs) {
			const keys = Object.keys(ref);

			expect(keys[0]).toBe("purpose");
			expect(keys[1]).toBe("modelType");
			expect(keys[2]).toBe("reference");
		}
	});
});

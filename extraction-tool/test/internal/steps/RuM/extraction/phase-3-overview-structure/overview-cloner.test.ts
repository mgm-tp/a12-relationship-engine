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
import { RUM_VERSION } from "../../../../../../src/internal/steps/RuM/extraction/constants.js";
import type {
	OverviewContext,
	OverviewStructureFinalRuM
} from "../../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/types.js";
import {
	resolveCloneId,
	createCleanClones,
	handleCandidateClones,
	resolveSingleContextCloneId
} from "../../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/overview-cloner.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createOverviewModel(id: string, labels?: Array<{ locale: string; text: string }>): OverviewModel {
	return {
		header: {
			id,
			modelType: "overview",
			modelVersion: "1.0.0",
			labels: labels ?? []
		},
		content: {
			configuration: { enableFilter: false },
			columns: [
				{ id: "col-1", elementRef: "field_1", sortable: true, width: 1 },
				{ id: "col-2", elementRef: "field_2", width: 1 }
			],
			rowActionGroup: {}
		}
	} as OverviewModel;
}

function createFinalRuMWithTableList(
	editSelectedOverviewId: string,
	relationshipName: string = "TestRelationship",
	targetRole: string = "test"
): OverviewStructureFinalRuM {
	return {
		rumModel: {
			header: { id: "test-rum", modelType: "relationship-ui", modelVersion: RUM_VERSION },
			content: {
				relationshipName,
				targetRole,
				component: {
					componentType: "TableList",
					editConfiguration: {
						availableItemsOverviewModel: "candidate-overview",
						selectedItemsOverviewModel: editSelectedOverviewId
					}
				}
			}
		},
		bindingName: "test-binding",
		elementId: "element-1",
		relationshipName,
		targetRole
	};
}

function createFinalRuMWithoutEdit(
	componentType: "DualPaneSelection" | "DropDownSelection" = "DualPaneSelection"
): OverviewStructureFinalRuM {
	return {
		rumModel: {
			header: { id: "test-rum", modelType: "relationship-ui", modelVersion: RUM_VERSION },
			content: {
				relationshipName: "TestRelationship",
				targetRole: "test",
				component: {
					componentType,
					selectedItemsOverviewModel: "some-overview"
				}
			}
		},
		bindingName: "test-binding",
		elementId: "element-1",
		relationshipName: "TestRelationship",
		targetRole: "test"
	};
}

function createFinalRuMWithDualPane(
	selectedOverviewId: string,
	relationshipName: string = "TestRelationship",
	targetRole: string = "test"
): OverviewStructureFinalRuM {
	return {
		rumModel: {
			header: { id: "test-rum", modelType: "relationship-ui", modelVersion: RUM_VERSION },
			content: {
				relationshipName,
				targetRole,
				component: {
					componentType: "DualPaneSelection",
					selectedItemsOverviewModel: selectedOverviewId,
					availableItemsOverviewModel: "candidate-overview"
				}
			}
		},
		bindingName: "test-binding",
		elementId: "element-1",
		relationshipName,
		targetRole
	};
}

// ---------------------------------------------------------------------------
// createCleanClones
// ---------------------------------------------------------------------------

describe("createCleanClones", () => {
	it("should create edit clone for TableList binding with editConfiguration", () => {
		const overviewModels = new Map<string, OverviewModel>();
		overviewModels.set("LocationLinks-overview", createOverviewModel("LocationLinks-overview"));

		const rum = createFinalRuMWithTableList("LocationLinks-overview", "Location", "address");
		const result = createCleanClones([rum], overviewModels, true);

		expect(result.cloneMap.size).toBe(1);
		expect(result.cloneMap.get("LocationLinks-overview")).toBe("LocationLinks-overview-edit");
		expect(result.cloneModels.size).toBe(1);
		expect(result.cloneModels.has("LocationLinks-overview-edit")).toBe(true);
	});

	it("should set clone ID to {base}-edit", () => {
		const overviewModels = new Map<string, OverviewModel>();
		overviewModels.set("CoInsurerLinks-overview", createOverviewModel("CoInsurerLinks-overview"));

		const rum = createFinalRuMWithTableList("CoInsurerLinks-overview", "CoInsurer", "businessPartner");
		const result = createCleanClones([rum], overviewModels, true);

		const cloneId = result.cloneMap.get("CoInsurerLinks-overview");
		expect(cloneId).toBe("CoInsurerLinks-overview-edit");
	});

	it("should create edit clone for DualPaneSelection selectedItemsOverviewModel when keepModels is true", () => {
		const overviewModels = new Map<string, OverviewModel>();
		overviewModels.set("LocationLinks-overview", createOverviewModel("LocationLinks-overview"));

		const rum = createFinalRuMWithDualPane("LocationLinks-overview", "Location", "address");
		const result = createCleanClones([rum], overviewModels, true);

		expect(result.cloneMap.size).toBe(1);
		expect(result.cloneMap.get("LocationLinks-overview")).toBe("LocationLinks-overview-edit");
		expect(result.cloneModels.size).toBe(1);
		expect(result.cloneModels.has("LocationLinks-overview-edit")).toBe(true);
	});

	it("should skip DualPaneSelection when keepModels is false", () => {
		const overviewModels = new Map<string, OverviewModel>();
		overviewModels.set("LocationLinks-overview", createOverviewModel("LocationLinks-overview"));

		const rum = createFinalRuMWithDualPane("LocationLinks-overview", "Location", "address");
		const result = createCleanClones([rum], overviewModels, false);

		expect(result.cloneMap.size).toBe(0);
		expect(result.cloneModels.size).toBe(0);
	});

	it("should skip DualPaneSelection when clone option disallows source overview", () => {
		const overviewModels = new Map<string, OverviewModel>();
		overviewModels.set("LocationLinks-overview", createOverviewModel("LocationLinks-overview"));

		const rum = createFinalRuMWithDualPane("LocationLinks-overview", "Location", "address");
		const result = createCleanClones([rum], overviewModels, true, {
			canCreateDualPaneEditClone: () => false
		});

		expect(result.cloneMap.size).toBe(0);
		expect(result.cloneModels.size).toBe(0);
	});

	it("should skip DropDownSelection bindings", () => {
		const overviewModels = new Map<string, OverviewModel>();
		overviewModels.set("some-overview", createOverviewModel("some-overview"));

		const rum = createFinalRuMWithoutEdit("DropDownSelection");
		const result = createCleanClones([rum], overviewModels, true);

		expect(result.cloneMap.size).toBe(0);
	});

	it("should skip TableList without editConfiguration", () => {
		const overviewModels = new Map<string, OverviewModel>();
		const rum: OverviewStructureFinalRuM = {
			rumModel: {
				header: { id: "test-rum", modelType: "relationship-ui", modelVersion: RUM_VERSION },
				content: {
					relationshipName: "Test",
					targetRole: "test",
					component: {
						componentType: "TableList"
					}
				}
			},
			bindingName: "test",
			elementId: "e1",
			relationshipName: "Test",
			targetRole: "test"
		};

		const result = createCleanClones([rum], overviewModels, true);
		expect(result.cloneMap.size).toBe(0);
	});

	it("should skip bindings where source overview model is not found", () => {
		const overviewModels = new Map<string, OverviewModel>(); // empty

		const rum = createFinalRuMWithTableList("NonExistentOverview");
		const result = createCleanClones([rum], overviewModels, true);

		expect(result.cloneMap.size).toBe(0);
		expect(result.cloneModels.size).toBe(0);
	});

	it("should skip DualPaneSelection when source overview model is not found", () => {
		const overviewModels = new Map<string, OverviewModel>(); // empty

		const rum = createFinalRuMWithDualPane("NonExistentOverview", "Location", "address");
		const result = createCleanClones([rum], overviewModels, true);

		expect(result.cloneMap.size).toBe(0);
		expect(result.cloneModels.size).toBe(0);
	});

	it("should deduplicate clones — same overview used by multiple bindings", () => {
		const overviewModels = new Map<string, OverviewModel>();
		overviewModels.set("LocationLinks-overview", createOverviewModel("LocationLinks-overview"));

		const rum1 = createFinalRuMWithTableList("LocationLinks-overview", "Location", "address");
		const rum2 = createFinalRuMWithTableList("LocationLinks-overview", "Location", "address");

		const result = createCleanClones([rum1, rum2], overviewModels, true);
		expect(result.cloneMap.size).toBe(1);
		expect(result.cloneModels.size).toBe(1);
	});

	it("should deduplicate when both TableList and DualPane reference the same source overview", () => {
		const overviewModels = new Map<string, OverviewModel>();
		overviewModels.set("LocationLinks-overview", createOverviewModel("LocationLinks-overview"));

		const tableListRum = createFinalRuMWithTableList("LocationLinks-overview", "Location", "address");
		const dualPaneRum = createFinalRuMWithDualPane("LocationLinks-overview", "Location", "address");

		const result = createCleanClones([tableListRum, dualPaneRum], overviewModels, true);
		expect(result.cloneMap.size).toBe(1);
		expect(result.cloneModels.size).toBe(1);
		expect(result.cloneMap.get("LocationLinks-overview")).toBe("LocationLinks-overview-edit");
	});

	it("should preserve source labels for TableList edit clones", () => {
		const labels = [{ locale: "en", text: "Original Label" }];
		const overviewModels = new Map<string, OverviewModel>();
		overviewModels.set("Links-overview", createOverviewModel("Links-overview", labels));

		const rum = createFinalRuMWithTableList("Links-overview");
		const result = createCleanClones([rum], overviewModels, true);

		const clone = result.cloneModels.get("Links-overview-edit")!;
		expect(clone.header.labels).toEqual(labels);
	});

	it("should keep empty source labels empty for edit clones", () => {
		const overviewModels = new Map<string, OverviewModel>();
		overviewModels.set("Links-overview", createOverviewModel("Links-overview"));

		const rum = createFinalRuMWithTableList("Links-overview");
		const result = createCleanClones([rum], overviewModels, true);

		const clone = result.cloneModels.get("Links-overview-edit")!;
		expect(clone.header.labels).toEqual([]);
	});

	it("should replace edit-clone overview refs with query model refs", () => {
		const overviewModels = new Map<string, OverviewModel>();
		overviewModels.set("Links-overview", {
			...createOverviewModel("Links-overview"),
			header: {
				...createOverviewModel("Links-overview").header,
				modelReferences: [
					{
						purpose: "document-model-for-overview",
						modelType: "document",
						reference: "Address-document"
					}
				]
			}
		});

		const rum = createFinalRuMWithTableList("Links-overview");
		const result = createCleanClones([rum], overviewModels, true);
		const clone = result.cloneModels.get("Links-overview-edit")!;

		expect(clone.header.modelReferences).toEqual([
			{
				purpose: "query-model-for-overview",
				modelType: "query",
				reference: "Links-overview-query"
			}
		]);
	});

	it("should set query ref to {overviewId}-query for DualPane edit clone (no -edit-query)", () => {
		const overviewModels = new Map<string, OverviewModel>();
		overviewModels.set("LocationLinks-overview", {
			...createOverviewModel("LocationLinks-overview"),
			header: {
				...createOverviewModel("LocationLinks-overview").header,
				modelReferences: [
					{
						purpose: "document-model-for-overview",
						modelType: "document",
						reference: "LocationLinks-document"
					}
				]
			}
		});

		const rum = createFinalRuMWithDualPane("LocationLinks-overview", "Location", "address");
		const result = createCleanClones([rum], overviewModels, true);
		const clone = result.cloneModels.get("LocationLinks-overview-edit")!;

		expect(clone.header.modelReferences).toEqual([
			{
				purpose: "query-model-for-overview",
				modelType: "query",
				reference: "LocationLinks-overview-query"
			}
		]);
	});
});

// ---------------------------------------------------------------------------
// handleCandidateClones
// ---------------------------------------------------------------------------

describe("handleCandidateClones", () => {
	it("should create GAP-1 clones for multi-context candidate overviews", () => {
		const overviewModels = new Map<string, OverviewModel>();
		overviewModels.set("Address-overview", createOverviewModel("Address-overview"));

		const contextMap = new Map<string, readonly OverviewContext[]>();
		contextMap.set("Address-overview", [
			{ relationshipName: "PostAddress", targetRole: "address", isLinkOverview: false, duplicatesAllowed: false },
			{ relationshipName: "Location", targetRole: "address", isLinkOverview: false, duplicatesAllowed: false }
		]);

		const result = handleCandidateClones(contextMap, overviewModels);
		expect(result.multiContextRemap.size).toBe(1);

		const relToClone = result.multiContextRemap.get("Address-overview")!;
		expect(relToClone.get("PostAddress")).toBe("Address-overview--PostAddress");
		expect(relToClone.get("Location")).toBe("Address-overview--Location");
		expect(result.cloneModels.size).toBe(2);
		expect(result.cloneModels.has("Address-overview--PostAddress")).toBe(true);
		expect(result.cloneModels.has("Address-overview--Location")).toBe(true);
	});

	it("should skip single-context candidate overviews", () => {
		const overviewModels = new Map<string, OverviewModel>();
		overviewModels.set("Single-overview", createOverviewModel("Single-overview"));

		const contextMap = new Map<string, readonly OverviewContext[]>();
		contextMap.set("Single-overview", [
			{ relationshipName: "Location", targetRole: "address", isLinkOverview: false, duplicatesAllowed: false }
		]);

		const result = handleCandidateClones(contextMap, overviewModels);
		expect(result.multiContextRemap.size).toBe(0);
		expect(result.cloneModels.size).toBe(0);
	});

	it("should skip link overviews even with multiple contexts", () => {
		const overviewModels = new Map<string, OverviewModel>();
		overviewModels.set("Links-overview", createOverviewModel("Links-overview"));

		const contextMap = new Map<string, readonly OverviewContext[]>();
		contextMap.set("Links-overview", [
			{ relationshipName: "Location", targetRole: "address", isLinkOverview: true, duplicatesAllowed: true },
			{ relationshipName: "PostAddress", targetRole: "address", isLinkOverview: true, duplicatesAllowed: true }
		]);

		const result = handleCandidateClones(contextMap, overviewModels);
		expect(result.multiContextRemap.size).toBe(0);
	});

	it("should preserve source labels for multi-context relationship-name clones", () => {
		const labels = [{ locale: "en", text: "Address" }];
		const overviewModels = new Map<string, OverviewModel>();
		overviewModels.set("Address-overview", createOverviewModel("Address-overview", labels));

		const contextMap = new Map<string, readonly OverviewContext[]>();
		contextMap.set("Address-overview", [
			{ relationshipName: "PostAddress", targetRole: "address", isLinkOverview: false, duplicatesAllowed: false },
			{ relationshipName: "Location", targetRole: "address", isLinkOverview: false, duplicatesAllowed: false }
		]);

		const result = handleCandidateClones(contextMap, overviewModels);
		const clone = result.cloneModels.get("Address-overview--PostAddress")!;
		expect(clone.header.labels).toEqual(labels);
	});

	it("should set query-model-for-overview purpose on candidate clones", () => {
		const overviewModels = new Map<string, OverviewModel>();
		const sourceModel = createOverviewModel("Address-overview");

		overviewModels.set("Address-overview", {
			...sourceModel,
			header: {
				...sourceModel.header,
				modelReferences: [
					{
						purpose: "document-model-for-overview",
						modelType: "document",
						reference: "Address-document"
					}
				]
			}
		});

		const contextMap = new Map<string, readonly OverviewContext[]>();
		contextMap.set("Address-overview", [
			{ relationshipName: "PostAddress", targetRole: "address", isLinkOverview: false, duplicatesAllowed: false },
			{ relationshipName: "Location", targetRole: "address", isLinkOverview: false, duplicatesAllowed: false }
		]);

		const result = handleCandidateClones(contextMap, overviewModels);
		const clone = result.cloneModels.get("Address-overview--PostAddress")!;
		const purposes = new Set((clone.header.modelReferences ?? []).map((ref) => ref.purpose));
		const queryRef = (clone.header.modelReferences ?? []).find((ref) => ref.purpose === "query-model-for-overview");

		expect(purposes.has("query-model-for-overview")).toBe(true);
		expect(purposes.has("document-model-for-overview")).toBe(false);
		expect(queryRef).toMatchObject({
			modelType: "query",
			reference: "Address-overview--PostAddress-query"
		});
	});

	it("should skip when source overview model not found", () => {
		const contextMap = new Map<string, readonly OverviewContext[]>();
		contextMap.set("Missing-overview", [
			{ relationshipName: "A", targetRole: "a", isLinkOverview: false, duplicatesAllowed: false },
			{ relationshipName: "B", targetRole: "b", isLinkOverview: false, duplicatesAllowed: false }
		]);

		const result = handleCandidateClones(contextMap, new Map());
		expect(result.multiContextRemap.size).toBe(0);
		expect(result.cloneModels.size).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// resolveSingleContextCloneId
// ---------------------------------------------------------------------------

describe("resolveSingleContextCloneId", () => {
	it("should return {id}--{relationshipName} when keepModels is true", () => {
		expect(resolveSingleContextCloneId("Address-overview", "PostAddress", true)).toBe("Address-overview--PostAddress");
	});

	it("should return original id when keepModels is false and candidate clone is not triggered", () => {
		expect(resolveSingleContextCloneId("Address-overview", "PostAddress", false, false)).toBe("Address-overview");
	});

	it("should return {id}--{relationshipName} when keepModels is false and candidate clone is triggered", () => {
		expect(resolveSingleContextCloneId("Address-overview", "PostAddress", false, true)).toBe(
			"Address-overview--PostAddress"
		);
	});
});

// ---------------------------------------------------------------------------
// resolveCloneId
// ---------------------------------------------------------------------------

describe("resolveCloneId", () => {
	it("should prefer edit clone over other remaps", () => {
		const cloneMap = new Map([["Links-overview", "Links-overview-edit"]]);
		const multiContextRemap = new Map();

		const result = resolveCloneId("Links-overview", "Location", cloneMap, multiContextRemap, false);
		expect(result).toBe("Links-overview-edit");
	});

	it("should use multi-context remap when no edit clone exists", () => {
		const cloneMap = new Map();
		const relToClone = new Map([["Location", "Address-overview--Location"]]);
		const multiContextRemap = new Map([["Address-overview", relToClone]]);

		const result = resolveCloneId("Address-overview", "Location", cloneMap, multiContextRemap, false);
		expect(result).toBe("Address-overview--Location");
	});

	it("should fall through to single-context path when no remap exists", () => {
		const result = resolveCloneId("Some-overview", "Location", new Map(), new Map(), true);
		expect(result).toBe("Some-overview--Location");
	});

	it("should return original id if keepModels is false and no remap exists", () => {
		const result = resolveCloneId("Some-overview", "Location", new Map(), new Map(), false);
		expect(result).toBe("Some-overview");
	});
});

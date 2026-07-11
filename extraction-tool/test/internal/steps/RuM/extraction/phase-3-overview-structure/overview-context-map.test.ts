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
import type { RelationshipUiModel } from "../../../../../../src/internal/steps/RuM/relationship-ui-model.js";
import { ModelNotFoundError } from "../../../../../../src/internal/steps/RuM/extraction/model-not-found-error.js";
import type {
	OverviewContext,
	OverviewStructureFinalRuM
} from "../../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/types.js";
import {
	buildOverviewContextMap,
	resolveDuplicatesAllowed,
	requiresMultiRelationshipCandidateClone
} from "../../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/overview-context-map.js";

function createComponentWithRefs(overrides?: {
	selectedItemsOverviewModel?: string;
	availableItemsOverviewModel?: string;
	editAvailableItemsOverviewModel?: string;
}): RelationshipUiModel.ComponentConfiguration {
	const componentType: "TableList" | "DualPaneSelection" = overrides?.editAvailableItemsOverviewModel
		? "TableList"
		: "DualPaneSelection";
	const result: Record<string, unknown> = { componentType };

	if (overrides?.selectedItemsOverviewModel) {
		result.selectedItemsOverviewModel = overrides.selectedItemsOverviewModel;
	}

	if (overrides?.availableItemsOverviewModel) {
		result.availableItemsOverviewModel = overrides.availableItemsOverviewModel;
	}

	if (overrides?.editAvailableItemsOverviewModel) {
		result.editConfiguration = {
			availableItemsOverviewModel: overrides.editAvailableItemsOverviewModel,
			selectedItemsOverviewModel: "edit-clone-id"
		};
	}

	return result as unknown as RelationshipUiModel.ComponentConfiguration;
}

function createFinalRuM(
	overrides: Partial<OverviewStructureFinalRuM> & { component?: RelationshipUiModel.ComponentConfiguration }
): OverviewStructureFinalRuM {
	return {
		rumModel: {
			header: { id: "test-rum", modelType: "relationship-ui", modelVersion: RUM_VERSION },
			content: {
				relationshipName: overrides.relationshipName ?? "TestRelationship",
				targetRole: overrides.targetRole ?? "test",
				component: overrides.component ?? createComponentWithRefs()
			}
		},
		bindingName: overrides.bindingName ?? "test-binding",
		elementId: overrides.elementId ?? "element-1",
		relationshipName: overrides.relationshipName ?? "TestRelationship",
		targetRole: overrides.targetRole ?? "test"
	};
}

function createRelationshipModel(duplicatesAllowed: unknown): object {
	return {
		header: { id: "relationship", modelType: "relationship", modelVersion: "39.0.0" },
		content: { duplicatesAllowed }
	};
}

function createModelResolver(models?: ReadonlyMap<string, object>): (modelId: string) => object | undefined {
	return (modelId: string): object | undefined => models?.get(modelId);
}

describe("resolveDuplicatesAllowed", () => {
	it("returns relationship duplicatesAllowed when boolean", () => {
		const resolver = createModelResolver(new Map([["ProductBundle", createRelationshipModel(true)]]));
		expect(resolveDuplicatesAllowed(resolver, "ProductBundle")).toBe(true);
	});

	it("throws ModelNotFoundError when relationship model is missing", () => {
		const resolver = createModelResolver(new Map([["Location", createRelationshipModel("true")]]));
		expect(() => resolveDuplicatesAllowed(resolver, "UnknownRelationship")).toThrow(ModelNotFoundError);
		expect(() => resolveDuplicatesAllowed(resolver, "UnknownRelationship")).toThrow(
			"Model not found: UnknownRelationship"
		);
	});

	it("falls back to false for non-boolean duplicatesAllowed values", () => {
		const resolver = createModelResolver(new Map([["Location", createRelationshipModel("true")]]));
		expect(resolveDuplicatesAllowed(resolver, "Location")).toBe(false);
	});

	it("throws ModelNotFoundError when resolved model is not a relationship model", () => {
		const nonRelationshipModel = {
			header: { id: "NotARelationship", modelType: "overview", modelVersion: "0.1.0" },
			content: { columns: [] }
		};
		const resolver = vi.fn().mockReturnValue(nonRelationshipModel);
		expect(() => resolveDuplicatesAllowed(resolver, "NotARelationship")).toThrow(ModelNotFoundError);
		expect(() => resolveDuplicatesAllowed(resolver, "NotARelationship")).toThrow("Model not found: NotARelationship");
	});
});

describe("buildOverviewContextMap", () => {
	it("adds resolved duplicatesAllowed to contexts", () => {
		const rum = createFinalRuM({
			relationshipName: "Location",
			targetRole: "address",
			component: createComponentWithRefs({ selectedItemsOverviewModel: "LocationLinks-overview" })
		});
		const result = buildOverviewContextMap(
			[rum],
			createModelResolver(new Map([["Location", createRelationshipModel(false)]]))
		);
		expect(result.get("LocationLinks-overview")).toEqual([
			{ relationshipName: "Location", targetRole: "address", isLinkOverview: true, duplicatesAllowed: false }
		]);
	});

	it("keeps LINK and CHILD relationship contexts separate on same overview", () => {
		const rum1 = createFinalRuM({
			relationshipName: "ProductBundle",
			targetRole: "bundle",
			component: createComponentWithRefs({ availableItemsOverviewModel: "Product-overview" })
		});
		const rum2 = createFinalRuM({
			relationshipName: "ProductBrand",
			targetRole: "brand",
			component: createComponentWithRefs({ availableItemsOverviewModel: "Product-overview" })
		});
		const result = buildOverviewContextMap(
			[rum1, rum2],
			createModelResolver(
				new Map([
					["ProductBundle", createRelationshipModel(true)],
					["ProductBrand", createRelationshipModel(false)]
				])
			)
		);
		const contexts = result.get("Product-overview")!;
		expect(contexts).toHaveLength(2);
		expect(contexts).toContainEqual({
			relationshipName: "ProductBundle",
			targetRole: "bundle",
			isLinkOverview: false,
			duplicatesAllowed: true
		});
		expect(contexts).toContainEqual({
			relationshipName: "ProductBrand",
			targetRole: "brand",
			isLinkOverview: false,
			duplicatesAllowed: false
		});
	});

	it("throws ModelNotFoundError when relationship model is missing", () => {
		const rum = createFinalRuM({
			relationshipName: "Unknown",
			targetRole: "address",
			component: createComponentWithRefs({ availableItemsOverviewModel: "Address-overview" })
		});
		expect(() => buildOverviewContextMap([rum], createModelResolver())).toThrow(ModelNotFoundError);
	});
});

describe("requiresMultiRelationshipCandidateClone", () => {
	function context(overrides: Partial<OverviewContext>): OverviewContext {
		return {
			relationshipName: overrides.relationshipName ?? "Location",
			targetRole: overrides.targetRole ?? "address",
			isLinkOverview: overrides.isLinkOverview ?? false,
			duplicatesAllowed: overrides.duplicatesAllowed ?? false
		};
	}

	it("returns false for empty/single/link-only contexts", () => {
		expect(requiresMultiRelationshipCandidateClone([])).toBe(false);
		expect(requiresMultiRelationshipCandidateClone([context({})])).toBe(false);
		expect(
			requiresMultiRelationshipCandidateClone([
				context({ isLinkOverview: true }),
				context({ relationshipName: "PostAddress", isLinkOverview: true })
			])
		).toBe(false);
	});

	it("returns true only for multi relationship candidate contexts", () => {
		expect(
			requiresMultiRelationshipCandidateClone([
				context({ relationshipName: "PostAddress" }),
				context({ relationshipName: "Location" })
			])
		).toBe(true);
		expect(
			requiresMultiRelationshipCandidateClone([
				context({ relationshipName: "Location" }),
				context({ relationshipName: "Location", targetRole: "fromAddress" })
			])
		).toBe(false);
	});
});

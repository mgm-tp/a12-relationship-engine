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

import type { Annotation } from "@com.mgmtp.a12.base/base-model-api";
import type { QueryModel } from "@com.mgmtp.a12.querymodel/querymodel-core";
import type { RelationshipModel } from "@com.mgmtp.a12.dataservices/dataservices-access";

import { RUM_VERSION } from "../../../../../../src/internal/steps/RuM/extraction/constants.js";
import type { RelationshipUiModel } from "../../../../../../src/internal/steps/RuM/relationship-ui-model.js";
import { regenerateMissingQueryModels } from "../../../../../../src/internal/steps/RuM/extraction/phase-2-binding-enrichment/query-regenerator.js";
import type {
	BindingResult,
	EnrichmentContext,
	PageSizeMigration,
	QueryRegeneratorResult
} from "../../../../../../src/internal/steps/RuM/extraction/phase-2-binding-enrichment/types.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createBindingWithQueryRefs(
	queryModelIds: string[],
	overrides?: {
		bindingName?: string;
		availableItemsOverviewModel?: string;
		selectedItemsOverviewModel?: string;
		pageSizes?: readonly PageSizeMigration[];
	}
): BindingResult {
	const relationshipName = "test-relationship";
	const targetRole = "test-role";
	const component: RelationshipUiModel.ComponentConfiguration = {
		componentType: "DropDownSelection",
		availableItemsQueryModel: queryModelIds[0],
		selectedItemQueryModel: queryModelIds[1],
		availableItemsOverviewModel: overrides?.availableItemsOverviewModel,
		selectedItemsOverviewModel: overrides?.selectedItemsOverviewModel
	};
	const ruModel: RelationshipUiModel = {
		header: {
			id: "test-binding_RuM",
			modelType: "relationship-ui",
			modelVersion: RUM_VERSION
		},
		content: { relationshipName, targetRole, component }
	};
	const pageSizeMigrations = overrides?.pageSizes ?? [];

	return {
		ruModel,
		relationshipUiModel: ruModel,
		bindingName: overrides?.bindingName ?? "test-binding",
		elementId: "test-element",
		relationshipName,
		targetRole,
		pageSizeMigrations: [...pageSizeMigrations],
		rowActionMigrations: [],
		rowActivationMigrations: [],
		overviewLabelMigrations: [],
		queryModels: [],
		migrations: {
			pageSizeMigrations: [...pageSizeMigrations],
			rowActionMigrations: [],
			rowActivationMigrations: [],
			overviewLabelMigrations: [],
			pageSizes: [...pageSizeMigrations],
			rowActions: [],
			rowActivations: [],
			modificationConfigFlags: { extendParentActivityDescriptor: false }
		}
	};
}

function createContext(
	resolveModel: (id: string) => object | undefined = () => undefined,
	overrides?: { rolesAnnotations?: readonly Annotation[] }
): EnrichmentContext {
	return { resolveModel, ...overrides };
}

function createRelationshipModel(overrides?: {
	relationshipId?: string;
	targetRole?: string;
	targetDocumentModel?: string;
	sourceRole?: string;
	sourceDocumentModel?: string;
}): RelationshipModel {
	const targetRole = overrides?.targetRole ?? "test-role";
	const sourceRole = overrides?.sourceRole ?? "source-role";
	const relationshipId = overrides?.relationshipId ?? "test-relationship";

	return {
		header: {
			id: relationshipId,
			modelType: "relationship",
			modelVersion: RUM_VERSION
		},
		content: {
			duplicatesAllowed: false,
			entityCharacteristics: [
				{
					role: targetRole,
					documentModel: overrides?.targetDocumentModel ?? "Target-document",
					ordered: false,
					linkConstraints: { multiplicity: { unbounded: true } }
				},
				{
					role: sourceRole,
					documentModel: overrides?.sourceDocumentModel ?? "Source-document",
					ordered: false,
					linkConstraints: { multiplicity: { unbounded: true } }
				}
			]
		}
	};
}

function expectSingleQueryModel(models: readonly QueryModel[]): QueryModel {
	expect(models).toHaveLength(1);

	return models[0];
}

function expectSingleRegeneratedQueryModel(result: QueryRegeneratorResult): QueryModel {
	return expectSingleQueryModel(result.regeneratedQueryModels);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("regenerateMissingQueryModels", () => {
	it("should regenerate query model when it does not exist on disk", () => {
		const binding = createBindingWithQueryRefs(["missing-query"]);
		const context = createContext(() => undefined);

		const result = regenerateMissingQueryModels([binding], context);
		const regenerated = expectSingleRegeneratedQueryModel(result);
		expect(regenerated.header.id).toBe("missing-query");
		expect(regenerated.header.modelType).toBe("query");
		expect(regenerated.header.annotations).toEqual([]);
		expect(regenerated.content).toMatchObject({
			targetDocumentModel: "",
			projectionName: "document",
			paging: { pageNumber: 0, pageSize: 50 },
			links: []
		});
		expect("entityModelId" in regenerated.content).toBe(false);
		expect("constraints" in regenerated.content).toBe(false);
		expect("pageSize" in regenerated.content).toBe(false);
	});

	it("should copy source form roles annotations to regenerated query headers", () => {
		const rolesAnnotations = [{ name: "roles", value: "admin" }];
		const binding = createBindingWithQueryRefs(["missing-query"]);
		const context = createContext(() => undefined, { rolesAnnotations });

		const result = regenerateMissingQueryModels([binding], context);
		const regenerated = expectSingleRegeneratedQueryModel(result);

		expect(regenerated.header.annotations).toEqual(rolesAnnotations);
		expect(regenerated.header.annotations?.[0]).toBe(rolesAnnotations[0]);
	});

	it("should skip query model that already exists on disk", () => {
		const existingQuery: object = {
			header: { id: "existing-query", modelType: "query", modelVersion: RUM_VERSION },
			content: { entityModelId: "PersonDM", pageSize: 50 }
		};
		const binding = createBindingWithQueryRefs(["existing-query"]);
		const context = createContext(() => existingQuery);

		const result = regenerateMissingQueryModels([binding], context);
		expect(result.regeneratedQueryModels).toHaveLength(0);
	});

	it("should regenerate when resolved model is not a query model", () => {
		const nonQueryModel: object = {
			header: { id: "not-a-query", modelType: "overview", modelVersion: "1.0.0" },
			content: {}
		};
		const binding = createBindingWithQueryRefs(["not-a-query"]);
		const context = createContext(() => nonQueryModel);

		const result = regenerateMissingQueryModels([binding], context);
		const regenerated = expectSingleRegeneratedQueryModel(result);
		expect(regenerated.header.id).toBe("not-a-query");
	});

	it("should process multiple query model references from a single binding", () => {
		const binding = createBindingWithQueryRefs(["missing-candidate", "missing-selected"]);
		const context = createContext(() => undefined);

		const result = regenerateMissingQueryModels([binding], context);
		expect(result.regeneratedQueryModels).toHaveLength(2);
		const ids = result.regeneratedQueryModels.map((q) => q.header.id);
		expect(ids).toContain("missing-candidate");
		expect(ids).toContain("missing-selected");
	});

	it("should de-duplicate query model references across multiple bindings", () => {
		const binding1 = createBindingWithQueryRefs(["shared-query"]);
		const binding2 = createBindingWithQueryRefs(["shared-query"]);
		const context = createContext(() => undefined);

		const result = regenerateMissingQueryModels([binding1, binding2], context);
		const regenerated = expectSingleRegeneratedQueryModel(result);
		expect(regenerated.header.id).toBe("shared-query");
	});

	it("should return deduplicated query model results", () => {
		const binding = createBindingWithQueryRefs(["query-a", "query-a", "query-b"]);
		const context = createContext(() => undefined);

		const result = regenerateMissingQueryModels([binding], context);
		expect(result.regeneratedQueryModels).toHaveLength(1);
	});

	it("should handle bindings with no query model references", () => {
		const binding = createBindingWithQueryRefs([]);
		const context = createContext();

		const result = regenerateMissingQueryModels([binding], context);
		expect(result.regeneratedQueryModels).toHaveLength(0);
	});

	it("should not fail on empty bindings array", () => {
		const context = createContext();
		const result = regenerateMissingQueryModels([], context);
		expect(result.regeneratedQueryModels).toEqual([]);
	});

	it("should collect referenced query models from component config", () => {
		const nonQueryModel: object = {
			header: { id: "candidate-query", modelType: "overview", modelVersion: "1.0.0" }
		};
		const binding = createBindingWithQueryRefs(["candidate-query", "selected-query"]);
		const context = createContext((id: string) => (id === "candidate-query" ? nonQueryModel : undefined));

		const result = regenerateMissingQueryModels([binding], context);
		expect(result.regeneratedQueryModels).toHaveLength(2);
	});

	it("should regenerate dropdown available/selected queries with clean query shape and header references", () => {
		const binding = createBindingWithQueryRefs(["my-binding-available-query", "my-binding-selected-query"]);
		const relationshipModel = createRelationshipModel({
			targetRole: "test-role",
			targetDocumentModel: "Address-document",
			relationshipId: "test-relationship"
		});
		const context = createContext((id: string) => (id === "test-relationship" ? relationshipModel : undefined));

		const result = regenerateMissingQueryModels([binding], context);

		expect(result.regeneratedQueryModels).toHaveLength(2);

		for (const query of result.regeneratedQueryModels) {
			expect(query.header.annotations).toEqual([]);
			expect(query.header.modelReferences).toEqual([
				{
					purpose: "document-model-for-query",
					modelType: "document",
					alias: "DM",
					reference: "Address-document"
				},
				{
					purpose: "relationship-model-for-query",
					modelType: "relationship",
					alias: "RM",
					reference: "test-relationship"
				}
			]);
			expect(query.content.targetDocumentModel).toBe("Address-document");
			expect(query.content.projectionName).toBe("document");
			expect(query.content.paging?.pageSize).toBe(50);
			expect(query.content.links).toEqual([]);
			expect("entityModelId" in query.content).toBe(false);
			expect("constraints" in query.content).toBe(false);
			expect("pageSize" in query.content).toBe(false);
		}
	});

	it("should set modelVersion on regenerated models", () => {
		const binding = createBindingWithQueryRefs(["missing-query"]);
		const context = createContext(() => undefined);

		const result = regenerateMissingQueryModels([binding], context);

		for (const query of result.regeneratedQueryModels) {
			expect(query.header.modelVersion).toBe("0.1.0");
		}
	});
});

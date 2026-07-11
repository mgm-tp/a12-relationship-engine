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

import type { LocalizedModelText } from "@com.mgmtp.a12.utils/utils-localization";
import type { RelationshipModel } from "@com.mgmtp.a12.dataservices/dataservices-access";

import { RUM_VERSION } from "../../../../../../src/internal/steps/RuM/extraction/constants.js";
import type { RelationshipUiModel } from "../../../../../../src/internal/steps/RuM/relationship-ui-model.js";
import type {
	BindingResult,
	EnrichmentContext
} from "../../../../../../src/internal/steps/RuM/extraction/phase-2-binding-enrichment/types.js";
import {
	hasNonEmptyLabels,
	enrichBindingLabels
} from "../../../../../../src/internal/steps/RuM/extraction/phase-2-binding-enrichment/label-enricher.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createBindingResult(overrides?: {
	label?: LocalizedModelText;
	bindingName?: string;
	relationshipName?: string;
	targetRole?: string;
	componentType?: RelationshipUiModel.ComponentType;
}): BindingResult {
	const relationshipName = overrides?.relationshipName ?? "test-relationship";
	const targetRole = overrides?.targetRole ?? "test-role";
	const componentType = overrides?.componentType ?? "DropDownSelection";
	const ruModel: RelationshipUiModel = {
		header: {
			id: "test-id",
			modelType: "relationship-ui",
			modelVersion: RUM_VERSION,
			...(overrides?.label !== undefined ? { labels: overrides.label } : {})
		},
		content: {
			relationshipName,
			targetRole,
			component: { componentType }
		}
	};

	return {
		ruModel,
		relationshipUiModel: ruModel,
		bindingName: overrides?.bindingName ?? "test-binding",
		elementId: "test-element",
		relationshipName,
		targetRole,
		pageSizeMigrations: [],
		rowActionMigrations: [],
		rowActivationMigrations: [],
		overviewLabelMigrations: [],
		queryModels: [],
		migrations: {
			pageSizeMigrations: [],
			rowActionMigrations: [],
			rowActivationMigrations: [],
			overviewLabelMigrations: [],
			pageSizes: [],
			rowActions: [],
			rowActivations: [],
			modificationConfigFlags: { extendParentActivityDescriptor: false }
		}
	};
}

function createRelationshipModel(
	characteristics?: ReadonlyArray<
		Partial<RelationshipModel["content"]["entityCharacteristics"][number]> &
			Pick<RelationshipModel["content"]["entityCharacteristics"][number], "role">
	>
): RelationshipModel {
	return {
		header: { id: "rel-id", modelType: "relationship", modelVersion: "1.0.0" },
		content: {
			duplicatesAllowed: false,
			entityCharacteristics:
				characteristics?.map((characteristic) => ({
					documentModel: characteristic.documentModel ?? "Target-document",
					ordered: characteristic.ordered ?? false,
					linkConstraints: characteristic.linkConstraints ?? { multiplicity: { unbounded: true } },
					...characteristic
				})) ?? []
		}
	};
}

function createContext(resolveModel: (id: string) => object | undefined = () => undefined): EnrichmentContext {
	return { resolveModel };
}

function getBindingModel(binding: BindingResult): RelationshipUiModel {
	return binding.relationshipUiModel ?? binding.ruModel;
}

function expectSingleBindingResult(results: readonly BindingResult[]): BindingResult {
	expect(results).toHaveLength(1);

	return results[0];
}

// ---------------------------------------------------------------------------
// Tests: hasNonEmptyLabels
// ---------------------------------------------------------------------------

describe("hasNonEmptyLabels", () => {
	it("should return false for null", () => {
		expect(hasNonEmptyLabels(null)).toBe(false);
	});

	it("should return false for undefined", () => {
		expect(hasNonEmptyLabels(undefined)).toBe(false);
	});

	it("should return false for an empty array", () => {
		expect(hasNonEmptyLabels([])).toBe(false);
	});

	it("should return false when all entries have empty text", () => {
		expect(hasNonEmptyLabels([{ locale: "en", text: "" }])).toBe(false);
	});

	it("should return true when at least one entry has non-empty text", () => {
		expect(hasNonEmptyLabels([{ locale: "en", text: "ok" }])).toBe(true);
	});

	it("should return true when mixed empty and non-empty entries", () => {
		expect(
			hasNonEmptyLabels([
				{ locale: "en", text: "" },
				{ locale: "de", text: "gultig" }
			])
		).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Tests: enrichBindingLabels
// ---------------------------------------------------------------------------

describe("enrichBindingLabels", () => {
	it("should not enrich when binding already has a non-empty label (GAP-12)", () => {
		const existingLabel: LocalizedModelText = [{ locale: "en", text: "Existing Label" }];
		const binding = createBindingResult({ label: existingLabel });
		const context = createContext(() =>
			createRelationshipModel([{ role: "test-role", labels: [{ locale: "en", text: "Relationship Label" }] }])
		);
		const result = enrichBindingLabels([binding], context);
		expect(getBindingModel(expectSingleBindingResult(result)).header.labels).toEqual(existingLabel);
	});

	it("should enrich DropDownSelection when binding has no label and relationship provides non-empty labels", () => {
		const binding = createBindingResult({ componentType: "DropDownSelection" });
		const context = createContext(() =>
			createRelationshipModel([{ role: "test-role", labels: [{ locale: "en", text: "Manager Selection" }] }])
		);
		const result = enrichBindingLabels([binding], context);
		const label = getBindingModel(expectSingleBindingResult(result)).header.labels;
		expect(label).toBeDefined();
		expect(label).toHaveLength(1);
		expect(label?.[0]?.text).toBe("Manager Selection");
	});

	it("should not enrich DualPaneSelection labels from relationship entity characteristics", () => {
		const binding = createBindingResult({ componentType: "DualPaneSelection" });
		const context = createContext(() =>
			createRelationshipModel([{ role: "test-role", labels: [{ locale: "en", text: "Should Not Apply" }] }])
		);
		const result = enrichBindingLabels([binding], context);

		expect(getBindingModel(expectSingleBindingResult(result)).header.labels).toBeUndefined();
	});

	it("should not enrich TableList labels from relationship entity characteristics", () => {
		const binding = createBindingResult({ componentType: "TableList" });
		const context = createContext(() =>
			createRelationshipModel([{ role: "test-role", labels: [{ locale: "en", text: "Should Not Apply" }] }])
		);
		const result = enrichBindingLabels([binding], context);

		expect(getBindingModel(expectSingleBindingResult(result)).header.labels).toBeUndefined();
	});

	it("should not enrich when binding label is empty string array and relationship labels are empty (GAP-12)", () => {
		const binding = createBindingResult({ label: [{ locale: "en", text: "" }] });
		const context = createContext(() =>
			createRelationshipModel([{ role: "test-role", labels: [{ locale: "en", text: "" }] }])
		);
		const result = enrichBindingLabels([binding], context);
		expect(getBindingModel(expectSingleBindingResult(result)).header.labels).toEqual([{ locale: "en", text: "" }]);
	});

	it("should not enrich when relationship model provides no matching entity characteristic", () => {
		const binding = createBindingResult();
		const context = createContext(() =>
			createRelationshipModel([{ role: "other-role", labels: [{ locale: "en", text: "Wrong Role" }] }])
		);
		const result = enrichBindingLabels([binding], context);
		expect(getBindingModel(expectSingleBindingResult(result)).header.labels).toBeUndefined();
	});

	it("should not enrich when relationship model has no entityCharacteristics", () => {
		const binding = createBindingResult();
		const context = createContext(() => createRelationshipModel(undefined));
		const result = enrichBindingLabels([binding], context);
		expect(getBindingModel(expectSingleBindingResult(result)).header.labels).toBeUndefined();
	});

	it("should not enrich when resolveModel returns undefined", () => {
		const binding = createBindingResult();
		const context = createContext(() => undefined);
		const result = enrichBindingLabels([binding], context);
		expect(getBindingModel(expectSingleBindingResult(result)).header.labels).toBeUndefined();
	});

	it("should not enrich when resolved model is not a relationship model", () => {
		const binding = createBindingResult();
		const context = createContext(() => ({
			header: { id: "other", modelType: "form", modelVersion: "1.0.0" }
		}));
		const result = enrichBindingLabels([binding], context);
		expect(getBindingModel(expectSingleBindingResult(result)).header.labels).toBeUndefined();
	});

	it("should merge relationship labels with existing binding labels by locale (GAP-13)", () => {
		const binding = createBindingResult({ label: [{ locale: "en", text: "Existing EN" }] });
		const context = createContext(() =>
			createRelationshipModel([{ role: "test-role", labels: [{ locale: "de", text: "DE Label" }] }])
		);
		const result = enrichBindingLabels([binding], context);
		const labels = getBindingModel(expectSingleBindingResult(result)).header.labels;
		expect(labels).toBeDefined();
		expect(labels).toHaveLength(2);
		expect(labels?.[0]).toEqual({ locale: "en", text: "Existing EN" });
		expect(labels?.[1]).toEqual({ locale: "de", text: "DE Label" });
	});

	it("should not overwrite existing locale with relationship label (GAP-13)", () => {
		const binding = createBindingResult({ label: [{ locale: "en", text: "Existing EN" }] });
		const context = createContext(() =>
			createRelationshipModel([{ role: "test-role", labels: [{ locale: "en", text: "Override EN" }] }])
		);
		const result = enrichBindingLabels([binding], context);
		const labels = getBindingModel(expectSingleBindingResult(result)).header.labels;
		expect(labels).toHaveLength(1);
		expect(labels?.[0]?.text).toBe("Existing EN");
	});

	it("should process multiple bindings independently", () => {
		const binding1 = createBindingResult({ bindingName: "binding-1", relationshipName: "rel-1", targetRole: "role-1" });
		const binding2 = createBindingResult({ bindingName: "binding-2", relationshipName: "rel-2", targetRole: "role-2" });

		const resolvedModels: Record<string, object> = {
			"rel-1": createRelationshipModel([{ role: "role-1", labels: [{ locale: "en", text: "Label 1" }] }]),
			"rel-2": createRelationshipModel([{ role: "role-2", labels: [{ locale: "en", text: "Label 2" }] }])
		};
		const context = createContext((id: string) => resolvedModels[id]);

		const result = enrichBindingLabels([binding1, binding2], context);
		expect(result).toHaveLength(2);
		const [firstBinding, secondBinding] = result;
		expect(getBindingModel(firstBinding).header.labels?.[0]?.text).toBe("Label 1");
		expect(getBindingModel(secondBinding).header.labels?.[0]?.text).toBe("Label 2");
	});

	it("should not fail on empty bindings array", () => {
		const context = createContext();
		const result = enrichBindingLabels([], context);
		expect(result).toEqual([]);
	});

	it("should throw when relationship model has missing content field due to requireContent", () => {
		const relModelNoContent: object = {
			header: { id: "rel-id", modelType: "relationship", modelVersion: "1.0.0" }
		};
		const binding = createBindingResult();
		const context = createContext(() => relModelNoContent);
		expect(() => enrichBindingLabels([binding], context)).toThrow("Model is missing content");
	});

	it("should throw when relationship model has null content field due to requireContent", () => {
		const relModelNullContent: object = {
			header: { id: "rel-id", modelType: "relationship", modelVersion: "1.0.0" },
			content: null
		};
		const binding = createBindingResult();
		const context = createContext(() => relModelNullContent);
		expect(() => enrichBindingLabels([binding], context)).toThrow("Model is missing content");
	});

	it("should handle find() returning undefined when entityCharacteristics is empty", () => {
		const binding = createBindingResult();
		const context = createContext(() => createRelationshipModel([]));
		const result = enrichBindingLabels([binding], context);
		expect(getBindingModel(expectSingleBindingResult(result)).header.labels).toBeUndefined();
	});

	it("should preserve DE labels from entityCharacteristics when merging with existing labels", () => {
		const binding = createBindingResult({ label: [{ locale: "en", text: "Existing EN" }] });
		const context = createContext(() =>
			createRelationshipModel([{ role: "test-role", labels: [{ locale: "de", text: "Deutsche Bezeichnung" }] }])
		);
		const result = enrichBindingLabels([binding], context);
		const labels = getBindingModel(expectSingleBindingResult(result)).header.labels;
		expect(labels).toBeDefined();
		expect(labels).toHaveLength(2);
		expect(labels?.[0]).toEqual({ locale: "en", text: "Existing EN" });
		expect(labels?.[1]).toEqual({ locale: "de", text: "Deutsche Bezeichnung" });
	});

	it("should preserve DE labels in entityCharacteristics multiple locales mixed", () => {
		const binding = createBindingResult();
		const context = createContext(() =>
			createRelationshipModel([
				{
					role: "test-role",
					labels: [
						{ locale: "en", text: "Manager Selection" },
						{ locale: "de", text: "Manager-Auswahl" }
					]
				}
			])
		);
		const result = enrichBindingLabels([binding], context);
		const labels = getBindingModel(expectSingleBindingResult(result)).header.labels;
		expect(labels).toBeDefined();
		expect(labels).toHaveLength(2);
		expect(labels?.[0]).toEqual({ locale: "en", text: "Manager Selection" });
		expect(labels?.[1]).toEqual({ locale: "de", text: "Manager-Auswahl" });
	});

	it("should set labels in LocalizedModelText format when enriching from entityCharacteristics", () => {
		const binding = createBindingResult();
		const context = createContext(() =>
			createRelationshipModel([
				{
					role: "test-role",
					labels: [{ locale: "en", text: "Person Selection" }]
				}
			])
		);
		const result = enrichBindingLabels([binding], context);
		const label = getBindingModel(expectSingleBindingResult(result)).header.labels;
		expect(label).toBeDefined();
		expect(Array.isArray(label)).toBe(true);
		expect(label).toHaveLength(1);
		expect(label?.[0]).toHaveProperty("locale");
		expect(label?.[0]).toHaveProperty("text");
		expect(typeof label?.[0]?.locale).toBe("string");
		expect(typeof label?.[0]?.text).toBe("string");
	});

	it("should enrich when binding label is empty array and relationship provides labels", () => {
		const binding = createBindingResult({ label: [] });
		const context = createContext(() =>
			createRelationshipModel([{ role: "test-role", labels: [{ locale: "en", text: "From Relationship" }] }])
		);
		const result = enrichBindingLabels([binding], context);
		const label = getBindingModel(expectSingleBindingResult(result)).header.labels;
		expect(label).toBeDefined();
		expect(label).toHaveLength(1);
		expect(label?.[0]?.text).toBe("From Relationship");
	});
});

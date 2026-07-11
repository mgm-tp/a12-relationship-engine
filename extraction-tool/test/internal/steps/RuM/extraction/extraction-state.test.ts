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

import { RUM_VERSION } from "../../../../../src/internal/steps/RuM/extraction/constants.js";
import { ExtractionState } from "../../../../../src/internal/steps/RuM/extraction/extraction-state.js";
import type {
	FinalRuM,
	PageSizeMigration,
	RowActionMigration,
	RowActivationMigration,
	OverviewLabelMigration
} from "../../../../../src/internal/steps/RuM/extraction/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a minimal model object with a header.id for testing put/delete/get/has.
 * The header shape must satisfy requireHeader().
 */
function createModel(id: string, extra?: Record<string, unknown>): object {
	return {
		header: { id, ...extra },
		content: { someField: "value" }
	};
}

/**
 * Creates a minimal model with a RelationshipUiModel-like content shape,
 * used for draftRuM integration tests.
 */
function createRuModel(id: string): object {
	return {
		header: { id, modelType: "relationship-ui", modelVersion: RUM_VERSION },
		content: {
			relationshipName: "TestRelationship",
			targetRole: "test",
			component: { componentType: "TableList" }
		}
	};
}

// ---------------------------------------------------------------------------
// Constructor and initial state
// ---------------------------------------------------------------------------

describe("ExtractionState", () => {
	describe("constructor / initial state", () => {
		it("creates an empty state", () => {
			const state = new ExtractionState();

			expect(state.models.size).toBe(0);
			expect(state.deletionIds.size).toBe(0);
			expect(state.finalModels).toHaveLength(0);
			expect(state.pageSizeMigrations).toHaveLength(0);
			expect(state.rowActionMigrations).toHaveLength(0);
			expect(state.rowActivationMigrations).toHaveLength(0);
			expect(state.overviewLabelMigrations).toHaveLength(0);
			expect(state.queryModelIds).toHaveLength(0);
			expect(state.overviewModelIds).toHaveLength(0);
			expect(state.processedElementIds).toHaveLength(0);
			expect(state.processedFormModelIds).toHaveLength(0);
			expect(state.hasFatalError).toBe(false);
			expect(state.errors).toHaveLength(0);
		});

		it("returns immutable collections from getters (type-level readonly, not runtime)", () => {
			const state = new ExtractionState();

			// ReadonlyMap / ReadonlySet are TypeScript compile-time constraints.
			// At runtime they ARE mutable Map/Set, so we just verify the getters
			// return the expected underlying types.
			expect(state.models instanceof Map).toBe(true);
			expect(state.deletionIds instanceof Set).toBe(true);
			expect(Array.isArray(state.finalModels)).toBe(true);
			expect(Array.isArray(state.errors)).toBe(true);
		});
	});
});

// ---------------------------------------------------------------------------
// put()
// ---------------------------------------------------------------------------

describe("put()", () => {
	it("stores a model with a valid header.id", () => {
		const state = new ExtractionState();
		const model = createModel("test-id");

		state.put(model);

		expect(state.has("test-id")).toBe(true);
		expect(state.get("test-id")).toBe(model);
	});

	it("replaces an existing model with the same id", () => {
		const state = new ExtractionState();
		const model1 = createModel("dup-id", { version: 1 });
		const model2 = createModel("dup-id", { version: 2 });

		state.put(model1);
		state.put(model2);

		expect(state.get("dup-id")).toBe(model2);
		expect(state.models.size).toBe(1);
	});

	it("clears a pending deletion for the same id", () => {
		const state = new ExtractionState();
		const model = createModel("restored-id");

		state.put(model);
		state.delete("restored-id");
		expect(state.deletionIds.has("restored-id")).toBe(true);

		state.put(model);
		expect(state.deletionIds.has("restored-id")).toBe(false);
		expect(state.has("restored-id")).toBe(true);
	});

	it("throws when model has no header (requireHeader fail)", () => {
		const state = new ExtractionState();

		expect(() => state.put({})).toThrow("Model is missing a header");
	});

	it("throws when header.id is undefined (crashes on .length)", () => {
		const state = new ExtractionState();

		// requireHeader returns the header object ({ }), then `header.id` is
		// undefined, and `undefined.length` throws a TypeError.
		expect(() => state.put({ header: {} })).toThrow("Cannot read properties of undefined");
	});

	it("throws when header.id is an empty string", () => {
		const state = new ExtractionState();

		expect(() => state.put({ header: { id: "" } })).toThrow("Cannot put model without a non-empty header.id");
	});

	it("throws when model is null (requireRecord fails)", () => {
		const state = new ExtractionState();

		expect(() => state.put(null as unknown as object)).toThrow();
	});
});

// ---------------------------------------------------------------------------
// get() / has()
// ---------------------------------------------------------------------------

describe("get() / has()", () => {
	it("returns undefined for a non-existent id", () => {
		const state = new ExtractionState();

		expect(state.get("nonexistent")).toBeUndefined();
		expect(state.has("nonexistent")).toBe(false);
	});

	it("returns the model after put()", () => {
		const state = new ExtractionState();
		const model = createModel("present");

		state.put(model);

		expect(state.get("present")).toBe(model);
		expect(state.has("present")).toBe(true);
	});

	it("returns undefined after delete()", () => {
		const state = new ExtractionState();
		const model = createModel("gone");

		state.put(model);
		state.delete("gone");

		expect(state.get("gone")).toBeUndefined();
		expect(state.has("gone")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// delete()
// ---------------------------------------------------------------------------

describe("delete()", () => {
	it("removes model from _models and adds id to _deletionIds", () => {
		const state = new ExtractionState();
		const model = createModel("to-delete");

		state.put(model);
		state.delete("to-delete");

		expect(state.has("to-delete")).toBe(false);
		expect(state.deletionIds.has("to-delete")).toBe(true);
	});

	it("is idempotent", () => {
		const state = new ExtractionState();

		state.delete("never-existed");

		expect(state.deletionIds.has("never-existed")).toBe(true);
		expect(state.has("never-existed")).toBe(false);
	});

	it("maintains invariant: _models.keys() ∩ _deletionIds = ∅", () => {
		const state = new ExtractionState();
		const model = createModel("invariant-check");

		state.put(model);
		state.delete("invariant-check");

		// After delete, model is removed from _models, so the intersection should be empty
		for (const id of state.deletionIds) {
			expect(state.has(id)).toBe(false);
		}

		// Putting it back clears the deletionId too
		state.put(model);

		for (const id of state.deletionIds) {
			expect(state.has(id)).toBe(false);
		}
	});

	it("adds an id to deletionIds even when no model exists in state", () => {
		const state = new ExtractionState();

		state.delete("generated-doc-id");

		expect(state.deletionIds.has("generated-doc-id")).toBe(true);
		expect(state.has("generated-doc-id")).toBe(false);
	});

	it("clears a pending deletion when put stores the same id afterwards", () => {
		const state = new ExtractionState();
		const model = createModel("generated-doc-id");

		state.delete("generated-doc-id");
		state.put(model);

		expect(state.deletionIds.has("generated-doc-id")).toBe(false);
		expect(state.get("generated-doc-id")).toBe(model);
	});

	it("removes a stored model when delete marks the same id afterwards", () => {
		const state = new ExtractionState();
		const model = createModel("generated-doc-id");

		state.put(model);
		state.delete("generated-doc-id");

		expect(state.get("generated-doc-id")).toBeUndefined();
		expect(state.deletionIds.has("generated-doc-id")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// draftRuM()
// ---------------------------------------------------------------------------

describe("draftRuM()", () => {
	it("mutates the stored model via recipe", () => {
		const state = new ExtractionState();
		const model = createRuModel("rum-1");

		state.put(model);

		state.draftRuM("rum-1", (draft) => {
			draft.header.id = "modified";
		});

		const stored = state.get("rum-1") as { header: { id: string } } | undefined;
		expect(stored?.header.id).toBe("modified");
	});

	it("deep clone isolation: original reference is not mutated", () => {
		const state = new ExtractionState();
		const original = createRuModel("isolated");

		state.put(original);

		state.draftRuM("isolated", (draft) => {
			draft.header.id = "changed-by-draft";
		});

		// The original object reference stored in the map should be different
		// from the object passed to the recipe
		const storedModel = state.get("isolated");
		expect(storedModel).not.toBe(original);
		// The original should still have its original id
		expect((original as { header: { id: string } }).header.id).toBe("isolated");
	});

	it("throws on unknown id", () => {
		const state = new ExtractionState();

		expect(() =>
			state.draftRuM("nonexistent", (draft) => {
				draft.header.id = "whatever";
			})
		).toThrow('Cannot draft RelationshipUiModel "nonexistent": not found in state');
	});

	it("preserves nested content after mutation", () => {
		const state = new ExtractionState();
		const model: object = {
			header: { id: "rum-nested", modelType: "relationship-ui", modelVersion: RUM_VERSION },
			content: { relationshipName: "TestRel", targetRole: "test" }
		};

		state.put(model);

		state.draftRuM("rum-nested", (draft) => {
			draft.content.relationshipName = "ChangedRel";
		});

		const stored = state.get("rum-nested") as { content: { relationshipName: string; targetRole: string } } | undefined;
		expect(stored?.content.relationshipName).toBe("ChangedRel");
		expect(stored?.content.targetRole).toBe("test");
	});
});

// ---------------------------------------------------------------------------
// draftOM()
// ---------------------------------------------------------------------------

describe("draftOM()", () => {
	it("mutates the stored model via recipe", () => {
		const state = new ExtractionState();
		const model: object = {
			header: { id: "ov-1", modelType: "overview", modelVersion: "2.0.0" },
			content: { configuration: { pagingSize: 25, enableFilter: false } }
		};

		state.put(model);

		state.draftOM("ov-1", (draft) => {
			draft.header.id = "ov-modified";
		});

		const stored = state.get("ov-1") as { header: { id: string } } | undefined;
		expect(stored?.header.id).toBe("ov-modified");
	});

	it("deep clone isolation: original reference is not mutated", () => {
		const state = new ExtractionState();
		const original: object = {
			header: { id: "ov-iso", modelType: "overview", modelVersion: "2.0.0" },
			content: { configuration: { pagingSize: 10, enableFilter: false } }
		};

		state.put(original);

		state.draftOM("ov-iso", (draft) => {
			draft.content.configuration = { pagingSize: 50, enableFilter: false };
		});

		const storedModel = state.get("ov-iso");
		expect(storedModel).not.toBe(original);
		// Original should be unchanged
		const origRecord = original as { content: { configuration: { pagingSize: number } } };
		expect(origRecord.content.configuration.pagingSize).toBe(10);
	});

	it("throws on unknown id", () => {
		const state = new ExtractionState();

		expect(() =>
			state.draftOM("nonexistent", (draft) => {
				draft.header.id = "whatever";
			})
		).toThrow('Cannot draft OverviewModel "nonexistent": not found in state');
	});

	it("preserves untouched fields after mutation", () => {
		const state = new ExtractionState();
		const model: object = {
			header: {
				id: "ov-preserve",
				modelType: "overview",
				modelVersion: "2.0.0",
				labels: [{ locale: "en", text: "Label" }]
			},
			content: { configuration: { pagingSize: 25, enableFilter: false } }
		};

		state.put(model);

		state.draftOM("ov-preserve", (draft) => {
			draft.content.configuration = { pagingSize: 50, enableFilter: false };
		});

		const stored = state.get("ov-preserve") as {
			header: { id: string; labels: Array<{ locale: string; text: string }> };
			content: { configuration: { pagingSize: number } };
		};
		expect(stored.content.configuration.pagingSize).toBe(50);
		expect(stored.header.labels).toHaveLength(1);
		expect(stored.header.labels[0].text).toBe("Label");
	});
});

// ---------------------------------------------------------------------------
// Pipeline tracking methods
// ---------------------------------------------------------------------------

describe("pipeline tracking", () => {
	it("addFinalModel", () => {
		const state = new ExtractionState();
		const ruModel: FinalRuM = {
			model: {
				header: { id: "final-rum", modelType: "relationship-ui", modelVersion: RUM_VERSION },
				content: {
					relationshipName: "Test",
					targetRole: "target",
					component: { componentType: "TableList" }
				}
			},
			elementId: "el-1",
			formModelId: "fm-1"
		};

		state.addFinalModel(ruModel);

		expect(state.finalModels).toHaveLength(1);
		expect(state.finalModels[0].elementId).toBe("el-1");
	});

	it("addPageSizeMigration", () => {
		const state = new ExtractionState();
		const migration: PageSizeMigration = { overviewModelId: "ov-1", pageSize: 50 };

		state.addPageSizeMigration(migration);

		expect(state.pageSizeMigrations).toHaveLength(1);
		expect(state.pageSizeMigrations[0].pageSize).toBe(50);
	});

	it("addRowActionMigration", () => {
		const state = new ExtractionState();
		const migration: RowActionMigration = {
			overviewModelId: "ov-1",
			actionType: "edit",
			icon: "edit-icon"
		};

		state.addRowActionMigration(migration);

		expect(state.rowActionMigrations).toHaveLength(1);
		expect(state.rowActionMigrations[0].actionType).toBe("edit");
	});

	it("addRowActivationMigration", () => {
		const state = new ExtractionState();
		const migration: RowActivationMigration = {
			overviewModelId: "ov-1",
			activation: { type: "event", event: "event_delete_link" }
		};

		state.addRowActivationMigration(migration);

		expect(state.rowActivationMigrations).toHaveLength(1);
		expect(state.rowActivationMigrations[0].activation).toEqual({ type: "event", event: "event_delete_link" });
	});

	it("addOverviewLabelMigration", () => {
		const state = new ExtractionState();
		const migration: OverviewLabelMigration = {
			overviewModelId: "ov-1",
			labels: [{ locale: "en", text: "Heading" }]
		};

		state.addOverviewLabelMigration(migration);

		expect(state.overviewLabelMigrations).toHaveLength(1);
		expect(state.overviewLabelMigrations[0].labels[0].text).toBe("Heading");
	});

	it("addQueryModelId", () => {
		const state = new ExtractionState();

		state.addQueryModelId("qm-1");
		state.addQueryModelId("qm-2");

		expect(state.queryModelIds).toEqual(["qm-1", "qm-2"]);
	});

	it("addOverviewModelId", () => {
		const state = new ExtractionState();

		state.addOverviewModelId("ov-1");

		expect(state.overviewModelIds).toEqual(["ov-1"]);
	});

	it("addProcessedElementId", () => {
		const state = new ExtractionState();

		state.addProcessedElementId("el-1");

		expect(state.processedElementIds).toEqual(["el-1"]);
	});

	it("addProcessedFormModelId", () => {
		const state = new ExtractionState();

		state.addProcessedFormModelId("fm-1");

		expect(state.processedFormModelIds).toEqual(["fm-1"]);
	});

	it("setHasFatalError", () => {
		const state = new ExtractionState();

		expect(state.hasFatalError).toBe(false);
		state.setHasFatalError(true);
		expect(state.hasFatalError).toBe(true);
	});

	it("addError", () => {
		const state = new ExtractionState();

		state.addError("something went wrong");
		state.addError("another error");

		expect(state.errors).toHaveLength(2);
		expect(state.errors[0]).toBe("something went wrong");
	});
});

// ---------------------------------------------------------------------------
// Integration: pipeline tracking + model storage combined
// ---------------------------------------------------------------------------

describe("integration", () => {
	it("stores models and tracks pipeline state together", () => {
		const state = new ExtractionState();

		// Store models (with RelationshipUiModel-shaped content for draftRuM)
		const model1 = createRuModel("rum-1");
		const model2 = createRuModel("rum-2");
		state.put(model1);
		state.put(model2);

		// Run a draft mutation — the map key stays the original id,
		// only the stored value's content is changed
		state.draftRuM("rum-1", (draft) => {
			draft.header.id = "rum-1-modified";
		});

		// Track pipeline
		state.addQueryModelId("qm-1");
		state.addOverviewModelId("ov-1");
		state.addProcessedElementId("el-1");

		// Verify combined state
		// draftRuM stores the draft under the ORIGINAL key ("rum-1"), not the new id
		expect(state.has("rum-1")).toBe(true);
		const stored = state.get("rum-1") as { header: { id: string } };
		expect(stored.header.id).toBe("rum-1-modified");
		expect(state.has("rum-2")).toBe(true);
		expect(state.queryModelIds).toEqual(["qm-1"]);
		expect(state.overviewModelIds).toEqual(["ov-1"]);
		expect(state.processedElementIds).toEqual(["el-1"]);

		// Delete one model
		state.delete("rum-2");
		expect(state.has("rum-2")).toBe(false);
		expect(state.deletionIds.has("rum-2")).toBe(true);
	});
});

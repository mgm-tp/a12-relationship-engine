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

import type { GenericModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import type { BindingResult, PipelineContext } from "../../../../../../src/internal/steps/RuM/extraction/types.js";
import { extractBindingModels } from "../../../../../../src/internal/steps/RuM/extraction/phase-1-binding-extraction/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a minimal form model with a bindingConfiguration annotation
 * containing the provided raw binding entries (already serialized to JSON).
 */
function makeFormModel(bindingEntries: object[]): GenericModel {
	return {
		header: {
			id: "TestForm",
			modelType: "form",
			modelVersion: "1.0.0",
			modelReferences: [{ reference: "CandidateOverview", modelType: "overview", purpose: "overview" }],
			annotations: [
				{
					name: "bindingConfiguration",
					value: JSON.stringify(bindingEntries)
				}
			]
		}
	} as unknown as GenericModel;
}

function makeContext(formModel: GenericModel): PipelineContext {
	return {
		formModel,
		formModelId: "TestForm",
		bindings: [],
		migrations: {
			pageSizeMigrations: [],
			rowActionMigrations: [],
			rowActivationMigrations: [],
			overviewLabelMigrations: []
		},
		keepModels: false,
		rolesAnnotations: []
	};
}

/**
 * A minimal valid binding model entry for use in tests.
 */
function makeBindingEntry(name: string, elementId: string): object {
	return {
		type: "relationship",
		elementId,
		details: {
			name,
			relationshipName: "TestRelationship",
			targetRole: "TargetRole",
			metaInformation: { version: "1.0.0" },
			components: [
				{
					name: "DropDownSelection",
					id: `test-${elementId}`,
					models: [{ name: "CandidateOverview", use: "candidate" }]
				}
			]
		}
	};
}

// ---------------------------------------------------------------------------
// extractBindingModels
// ---------------------------------------------------------------------------

describe("extractBindingModels", () => {
	it("should return empty result when no bindingConfiguration annotation exists", () => {
		const formModel = {
			header: {
				id: "TestForm",
				modelType: "form",
				modelVersion: "1.0.0",
				modelReferences: [],
				annotations: []
			}
		} as unknown as GenericModel;
		const result = extractBindingModels(formModel, makeContext(formModel));

		expect(result.bindings).toHaveLength(0);
		expect(result.p1Bindings).toHaveLength(0);
		expect(result.elementBindingMap.size).toBe(0);
	});

	it("should extract a single binding and map its elementId to ruModel.header.id", () => {
		const entry = makeBindingEntry("Relations", "section-abc12");
		const formModel = makeFormModel([entry]);
		const result = extractBindingModels(formModel, makeContext(formModel));

		expect(result.p1Bindings).toHaveLength(1);
		expect(result.elementBindingMap.get("section-abc12")).toBe("TestForm-binding-Relations_RuM");
	});

	it("should disambiguate two bindings with the same name by appending elementId", () => {
		// Two bindings with the same name but different elementIds — the classic
		// Brand-form case (section-d67f5 and section-8ec34 both named "Relations")
		const entry1 = makeBindingEntry("Relations", "section-d67f5");
		const entry2 = makeBindingEntry("Relations", "section-8ec34");
		const formModel = makeFormModel([entry1, entry2]);
		const result = extractBindingModels(formModel, makeContext(formModel));

		expect(result.p1Bindings).toHaveLength(2);

		const id1 = result.p1Bindings[0].ruModel.header.id;
		const id2 = result.p1Bindings[1].ruModel.header.id;

		// IDs must be distinct — no collision
		expect(id1).not.toBe(id2);

		// First binding gets the base name (no collision yet)
		expect(id1).toBe("TestForm-binding-Relations_RuM");

		// Second binding: base name with _RuM stripped + sanitized elementId + _RuM
		expect(id2).toBe("TestForm-binding-Relations-section-8ec34_RuM");

		// elementBindingMap must map each elementId to its own unique RuM id
		expect(result.elementBindingMap.get("section-d67f5")).toBe(id1);
		expect(result.elementBindingMap.get("section-8ec34")).toBe(id2);
	});

	it("should produce distinct header.ids for colliding names (no overwrite in state)", () => {
		const entry1 = makeBindingEntry("Relations", "elem-1111");
		const entry2 = makeBindingEntry("Relations", "elem-2222");
		const formModel = makeFormModel([entry1, entry2]);
		const result = extractBindingModels(formModel, makeContext(formModel));

		function extractBindingId(b: BindingResult): string {
			return b.ruModel.header.id;
		}

		const ids = result.p1Bindings.map(extractBindingId);
		const uniqueIds = new Set(ids);

		// All IDs must be distinct
		expect(uniqueIds.size).toBe(ids.length);
	});
});

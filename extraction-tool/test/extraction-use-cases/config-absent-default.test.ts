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

import { assertDeletionSafety } from "../internal/test-support/graph-validators.js";
import type { ModelIndex, IndexedModel } from "../internal/test-support/model-index.js";

import {
	requireModel,
	modelReferencesOf,
	headerRefsWithPurpose,
	LOCATION_QUERY_MODEL_ID,
	LOCATION_EDIT_OVERVIEW_ID,
	LOCATION_SELECTED_OVERVIEW_ID,
	LOCATION_GENERATED_DOCUMENT_ID,
	runLocationExtractionConfigAbsent
} from "./location-dualpane-fixture.js";

describe("extraction with keepModels config absent", () => {
	it("omitting keepModels config behaves as keepModels false", () => {
		const result = runLocationExtractionConfigAbsent();
		const selectedOverview = requireModel(
			result.findSurvivingById(LOCATION_SELECTED_OVERVIEW_ID),
			LOCATION_SELECTED_OVERVIEW_ID
		);

		// Base overview is query-backed in-place — same as keepModels: false
		expect(headerRefsWithPurpose(selectedOverview, "query-model-for-overview")).toEqual([LOCATION_QUERY_MODEL_ID]);
		expect(headerRefsWithPurpose(selectedOverview, "document-model-for-overview")).toEqual([]);
	});

	it("config-absent base overview mutated in-place", () => {
		const result = runLocationExtractionConfigAbsent();

		// The base overview ID is the surviving selected overview — no -edit clone
		expect(result.findSurvivingById(LOCATION_SELECTED_OVERVIEW_ID)).toBeDefined();
		expect(result.findAddedById(LOCATION_EDIT_OVERVIEW_ID)).toBeUndefined();
	});

	it("config-absent generated document deleted", () => {
		const result = runLocationExtractionConfigAbsent();

		expect(result.deletedIds).not.toHaveLength(0);
		expect(result.deletedIds).toEqual([LOCATION_GENERATED_DOCUMENT_ID]);
		assertDeletionSafety(result.index as ModelIndex<IndexedModel>, result.deletedIds);
	});

	it("config-absent no -edit clone produced", () => {
		const result = runLocationExtractionConfigAbsent();

		expect(result.findAddedById(LOCATION_EDIT_OVERVIEW_ID)).toBeUndefined();
		expect(result.addedModels.map((model) => model.header.id)).not.toContain(LOCATION_EDIT_OVERVIEW_ID);
	});

	it("config-absent legacy refs pruned", () => {
		const result = runLocationExtractionConfigAbsent();
		const bindingRefs = modelReferencesOf(result.updatedForm).filter(
			(reference) => reference.purpose === "bindingReference"
		);

		expect(bindingRefs).toHaveLength(0);
		expect(modelReferencesOf(result.updatedForm)).toEqual(
			expect.arrayContaining([expect.objectContaining({ purpose: "relationship-ui", modelType: "relationship-ui" })])
		);
	});
});

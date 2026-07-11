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
import { assertChildHasQueryShape } from "../internal/test-support/query-shape-validator.js";

import { getRowActivation } from "./fixture-utils.js";
import {
	requireModel,
	annotationsOf,
	modelReferencesOf,
	runLocationExtraction,
	LOCATION_QUERY_MODEL_ID,
	LOCATION_SELECTED_OVERVIEW_ID,
	LOCATION_GENERATED_DOCUMENT_ID
} from "./location-dualpane-fixture.js";

describe("DualPane CHILD extraction without keepModels", () => {
	it("non-keepModels DualPane CHILD selected overview mutated to query-backed in place", () => {
		const result = runLocationExtraction(false);
		const selectedOverview = requireModel(
			result.findSurvivingById(LOCATION_SELECTED_OVERVIEW_ID),
			LOCATION_SELECTED_OVERVIEW_ID
		);
		const queryModel = requireModel(result.findSurvivingById(LOCATION_QUERY_MODEL_ID), LOCATION_QUERY_MODEL_ID);

		expect(modelReferencesOf(selectedOverview)).toEqual([
			{ purpose: "query-model-for-overview", modelType: "query", reference: LOCATION_QUERY_MODEL_ID }
		]);
		expect(result.addedModels.map((model) => model.header.id)).not.toContain(`${LOCATION_SELECTED_OVERVIEW_ID}-edit`);
		expect(queryModel.header.modelType).toBe("query");
		expect(getRowActivation(selectedOverview)).toEqual({ type: "event", event: "event_delete_link" });
		assertChildHasQueryShape(queryModel);
	});

	it("non-keepModels DualPane CHILD generated document queued for deletion", () => {
		const result = runLocationExtraction(false);

		expect(result.deletedIds).not.toHaveLength(0);
		expect(result.deletedIds).toHaveLength(1);
		expect(result.deletedIds).toEqual([LOCATION_GENERATED_DOCUMENT_ID]);
	});

	it("non-keepModels DualPane CHILD bindingConfiguration annotation removed from form", () => {
		const result = runLocationExtraction(false);

		expect(annotationsOf(result.updatedForm).some((annotation) => annotation.name === "bindingConfiguration")).toBe(
			false
		);
	});

	it("non-keepModels DualPane CHILD legacy bindingReference entries pruned", () => {
		const result = runLocationExtraction(false);
		const bindingReferences = modelReferencesOf(result.updatedForm).filter(
			(reference) => reference.purpose === "bindingReference"
		);

		expect(bindingReferences).toHaveLength(0);
		expect(modelReferencesOf(result.updatedForm)).toEqual(
			expect.arrayContaining([expect.objectContaining({ purpose: "relationship-ui", modelType: "relationship-ui" })])
		);
	});

	it("non-keepModels DualPane CHILD no surviving reference to deleted generated doc", () => {
		const result = runLocationExtraction(false);
		const selectedOverview = requireModel(
			result.findSurvivingById(LOCATION_SELECTED_OVERVIEW_ID),
			LOCATION_SELECTED_OVERVIEW_ID
		);
		const deletedGeneratedIds = result.deletedIds.filter((id) => id.endsWith("____generated"));

		expect(result.deletedIds).not.toHaveLength(0);
		expect(deletedGeneratedIds).not.toHaveLength(0);
		expect(result.addedModels.map((model) => model.header.id)).not.toContain(LOCATION_GENERATED_DOCUMENT_ID);
		expect(
			modelReferencesOf(selectedOverview).some((reference) => reference.reference === LOCATION_GENERATED_DOCUMENT_ID)
		).toBe(false);
		assertDeletionSafety(result.index as ModelIndex<IndexedModel>, deletedGeneratedIds);
	});
});

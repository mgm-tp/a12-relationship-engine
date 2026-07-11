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
import { QUERY_MODEL_VERSION } from "../../src/internal/steps/RuM/extraction/constants.js";
import { assertOverviewTopology } from "../internal/test-support/overview-topology-validator.js";

import { getRowActivation } from "./fixture-utils.js";
import {
	getComponent,
	requireModel,
	annotationsOf,
	parseBindings,
	getRowActionEvents,
	headerRefsWithPurpose,
	loadTypedFixtureModel,
	runLocationExtraction,
	LOCATION_QUERY_MODEL_ID,
	LOCATION_EDIT_OVERVIEW_ID,
	LOCATION_SELECTED_OVERVIEW_ID,
	LOCATION_GENERATED_DOCUMENT_ID
} from "./location-dualpane-fixture.js";

describe("DualPane CHILD keepModels selected overview topology", () => {
	it("keepModels DualPane selected overview routes to -edit clone", () => {
		const result = runLocationExtraction(true);

		expect(getComponent(result.rumModel).selectedItemsOverviewModel).toBe(LOCATION_EDIT_OVERVIEW_ID);
		expect(result.findAddedById(LOCATION_EDIT_OVERVIEW_ID)).toBeDefined();
		assertOverviewTopology(result.rumModel.content, result.index as ModelIndex<IndexedModel>, { keepModels: true });
	});

	it("keepModels DualPane base overview is not mutated by extraction", () => {
		const result = runLocationExtraction(true);
		const baseFixture = loadTypedFixtureModel("shared/overview-models/LocationLinks-overview.json");

		expect(result.findAddedById(LOCATION_SELECTED_OVERVIEW_ID)).toBeUndefined();
		expect(headerRefsWithPurpose(baseFixture, "document-model-for-overview")).toEqual([LOCATION_GENERATED_DOCUMENT_ID]);
		expect(headerRefsWithPurpose(baseFixture, "query-model-for-overview")).toEqual([]);
	});

	it("keepModels DualPane bindingConfiguration annotation preserved on form", () => {
		const result = runLocationExtraction(true);
		const bindingAnnotation = annotationsOf(result.updatedForm).find(
			(annotation) => annotation.name === "bindingConfiguration"
		);

		expect(bindingAnnotation).toBeDefined();
		expect(parseBindings(bindingAnnotation?.value)).toEqual([
			expect.objectContaining({ details: expect.objectContaining({ relationshipName: "Location" }) })
		]);
	});

	it("keepModels DualPane edit overview has query-model-for-overview resolving to query", () => {
		const result = runLocationExtraction(true);
		const editOverview = requireModel(result.index.resolveRef(LOCATION_EDIT_OVERVIEW_ID), LOCATION_EDIT_OVERVIEW_ID);
		const queryModel = requireModel(result.index.resolveRef(LOCATION_QUERY_MODEL_ID), LOCATION_QUERY_MODEL_ID);

		expect(headerRefsWithPurpose(editOverview, "query-model-for-overview")).toEqual([LOCATION_QUERY_MODEL_ID]);
		expect(queryModel.header.modelType).toBe("query");
		expect(queryModel.header.modelVersion).toBe(QUERY_MODEL_VERSION);
	});

	it("keepModels DualPane no generated documents deleted", () => {
		const result = runLocationExtraction(true);
		const generatedDocuments = result.workspaceModels.filter((model) => model.header.id.endsWith("____generated"));

		expect(generatedDocuments.map((model) => model.header.id)).toEqual([LOCATION_GENERATED_DOCUMENT_ID]);
		expect(result.deletedIds).toEqual([]);
		assertDeletionSafety(result.index as ModelIndex<IndexedModel>, result.deletedIds);
	});

	it("keepModels DualPane generated selected overview has delete and restore row actions", () => {
		const result = runLocationExtraction(true);
		const editOverview = requireModel(result.index.resolveRef(LOCATION_EDIT_OVERVIEW_ID), LOCATION_EDIT_OVERVIEW_ID);

		expect(getRowActionEvents(editOverview)).toEqual(["event_delete_link", "event_restore_link"]);
		expect(getRowActionEvents(editOverview)).not.toContain("event_edit_link_document");
		expect(getRowActivation(editOverview)).toEqual({ type: "event", event: "event_delete_link" });
	});
});

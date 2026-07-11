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
import { assertLinkExcludeQueryShape } from "../internal/test-support/query-shape-validator.js";
import {
	assertLinkExcludeLinkReferences,
	assertNoMixedLinkReferenceTypes
} from "../internal/test-support/linkref-validator.js";

import { getRowActivation } from "./fixture-utils.js";
import { requireModel, annotationsOf, modelReferencesOf, headerRefsWithPurpose } from "./location-dualpane-fixture.js";
import {
	columns,
	linkReferenceTypes,
	toLinkReferenceOverview,
	linkReferenceRelationships
} from "./co-insurer-dualpane-fixture.js";
import {
	CO_INSURER_EDIT_CLONE_ID,
	CO_INSURER_QUERY_MODEL_ID,
	CO_INSURER_SELECTED_OVERVIEW_ID,
	CO_INSURER_GENERATED_DOCUMENT_ID,
	runCoInsurerDualPaneNonKeepExtraction
} from "./co-insurer-link-nonkeep-fixture.js";

/** Target-document element refs (Contract-document fields accessed via the I4 include). */
const TARGET_REFS = ["field_4e3fe", "field_6268b", "group_d1772"] as const;
/** Link-document element refs (CoInsurerAdditionalFields fields accessed via the I5 include). */
const LINK_REFS = ["field_de37b"] as const;

describe("DualPane LINK extraction without keepModels", () => {
	it("non-keepModels DualPane LINK no -edit clone generated for selected overview", () => {
		const result = runCoInsurerDualPaneNonKeepExtraction();

		expect(result.findAddedById(CO_INSURER_EDIT_CLONE_ID)).toBeUndefined();
		expect(result.addedModels.map((model) => model.header.id)).not.toContain(CO_INSURER_EDIT_CLONE_ID);
	});

	it("non-keepModels DualPane LINK selected overview mutated in-place to query-backed", () => {
		const result = runCoInsurerDualPaneNonKeepExtraction();
		const selectedOverview = requireModel(
			result.findSurvivingById(CO_INSURER_SELECTED_OVERVIEW_ID),
			CO_INSURER_SELECTED_OVERVIEW_ID
		);

		expect(headerRefsWithPurpose(selectedOverview, "query-model-for-overview")).toEqual([CO_INSURER_QUERY_MODEL_ID]);
		expect(headerRefsWithPurpose(selectedOverview, "document-model-for-overview")).toEqual([]);
		expect(result.findSurvivingById(CO_INSURER_QUERY_MODEL_ID)?.header.modelType).toBe("query");
		expect(getRowActivation(selectedOverview)).toEqual({ type: "event", event: "event_delete_link" });
	});

	it("non-keepModels DualPane LINK query shape preserved with content.exclude", () => {
		const result = runCoInsurerDualPaneNonKeepExtraction();
		const selectedQuery = requireModel(result.findSurvivingById(CO_INSURER_QUERY_MODEL_ID), CO_INSURER_QUERY_MODEL_ID);

		assertLinkExcludeQueryShape(selectedQuery);
		expect(result.addedModels.map((model) => model.header.id)).toContain(CO_INSURER_QUERY_MODEL_ID);
	});

	it("non-keepModels DualPane LINK generated document queued for deletion", () => {
		const result = runCoInsurerDualPaneNonKeepExtraction();

		expect(result.deletedIds).not.toHaveLength(0);
		expect(result.deletedIds).toContain(CO_INSURER_GENERATED_DOCUMENT_ID);
		expect(result.findSurvivingById(CO_INSURER_GENERATED_DOCUMENT_ID)).toBeUndefined();
	});

	it("non-keepModels DualPane LINK no surviving reference to deleted ID", () => {
		const result = runCoInsurerDualPaneNonKeepExtraction();
		const deletedGeneratedIds = result.deletedIds.filter((id) => id.endsWith("____generated"));

		expect(result.deletedIds).not.toHaveLength(0);
		expect(deletedGeneratedIds).not.toHaveLength(0);
		assertDeletionSafety(result.index as ModelIndex<IndexedModel>, deletedGeneratedIds);
		expect(result.survivingModels.map((model) => model.header.id)).not.toContain(CO_INSURER_GENERATED_DOCUMENT_ID);
	});

	it("non-keepModels DualPane LINK legacy bindingReference entries pruned", () => {
		const result = runCoInsurerDualPaneNonKeepExtraction();
		const bindingRefs = modelReferencesOf(result.updatedForm).filter(
			(reference) => reference.purpose === "bindingReference"
		);

		expect(bindingRefs).toHaveLength(0);
		expect(annotationsOf(result.updatedForm).some((annotation) => annotation.name === "bindingConfiguration")).toBe(
			false
		);
		expect(modelReferencesOf(result.updatedForm)).toEqual(
			expect.arrayContaining([expect.objectContaining({ purpose: "relationship-ui", modelType: "relationship-ui" })])
		);
	});

	it("non-keepModels DualPane LINK columns still follow LINK/CHILD split semantics", () => {
		const result = runCoInsurerDualPaneNonKeepExtraction();
		const selectedOverview = requireModel(
			result.findSurvivingById(CO_INSURER_SELECTED_OVERVIEW_ID),
			CO_INSURER_SELECTED_OVERVIEW_ID
		);
		const overviewForLinkRef = toLinkReferenceOverview(selectedOverview as unknown as IndexedModel);

		assertLinkExcludeLinkReferences(overviewForLinkRef, {
			targetDocumentElementRefs: TARGET_REFS,
			linkDocumentElementRefs: LINK_REFS
		});
		assertNoMixedLinkReferenceTypes(overviewForLinkRef);
		expect(linkReferenceTypes(selectedOverview as unknown as IndexedModel, TARGET_REFS)).toEqual([
			["CHILD"],
			["CHILD"],
			["CHILD"]
		]);
		expect(linkReferenceTypes(selectedOverview as unknown as IndexedModel, LINK_REFS)).toEqual([["LINK"]]);

		// Each linkReference must be relationship-scoped to CoInsurer
		for (const elementRefs of [TARGET_REFS, LINK_REFS]) {
			const relationships = linkReferenceRelationships(selectedOverview as unknown as IndexedModel, elementRefs);

			expect(relationships.flat()).not.toHaveLength(0);
			expect(relationships.flat().every((relationship) => relationship === "CoInsurer")).toBe(true);
		}

		expect(columns(selectedOverview as unknown as IndexedModel).every((col) => !col.elementRef.startsWith("I4_"))).toBe(
			true
		);
	});
});

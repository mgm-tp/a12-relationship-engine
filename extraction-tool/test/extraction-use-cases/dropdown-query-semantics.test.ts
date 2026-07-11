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

import { assertDropDownLegacyHasQueryShape } from "../internal/test-support/query-shape-validator.js";

import {
	hasButton,
	getButtons,
	getRumModelRefs,
	getFormModelRefs,
	getFormAnnotations,
	CATEGORY_SELECTED_QUERY_ID,
	CATEGORY_AVAILABLE_QUERY_ID,
	POLICY_HOLDER_SELECTED_QUERY_ID,
	POLICY_HOLDER_AVAILABLE_QUERY_ID,
	runDropDownWithLinkFormExtraction,
	runPolicyHolderDropDownExtraction,
	runCategoryCategoryDropDownExtraction
} from "./dropdown-query-fixture.js";

// ---------------------------------------------------------------------------
// DropDown — query artifact generation
// ---------------------------------------------------------------------------

describe("DropDown — query artifact generation", () => {
	it("DropDown generates available and selected query artifacts", () => {
		const result = runCategoryCategoryDropDownExtraction(false);

		expect(result.addedQueryIds).toContain(CATEGORY_AVAILABLE_QUERY_ID);
		expect(result.addedQueryIds).toContain(CATEGORY_SELECTED_QUERY_ID);
		expect(result.addedModels.filter((model) => model.header.modelType === "query")).toHaveLength(2);
	});

	it("DropDown query header refs in RuM resolve to query IDs", () => {
		const result = runCategoryCategoryDropDownExtraction(false);
		const refs = getRumModelRefs(result.rumModel);
		const availableRef = refs.find((ref) => ref.purpose === "availableItemsQuery");
		const selectedRef = refs.find((ref) => ref.purpose === "selectedItemQuery");

		expect(availableRef?.reference).toBe(CATEGORY_AVAILABLE_QUERY_ID);
		expect(availableRef?.modelType).toBe("query");
		expect(selectedRef?.reference).toBe(CATEGORY_SELECTED_QUERY_ID);
		expect(selectedRef?.modelType).toBe("query");
		expect(result.index.resolveRef(CATEGORY_AVAILABLE_QUERY_ID)?.header.modelType).toBe("query");
		expect(result.index.resolveRef(CATEGORY_SELECTED_QUERY_ID)?.header.modelType).toBe("query");
	});

	it("DropDown selected query uses legacy-HAS shape", () => {
		const result = runCategoryCategoryDropDownExtraction(false);
		const selectedQuery = result.index.resolveRef(CATEGORY_SELECTED_QUERY_ID);

		expect(selectedQuery).toBeDefined();
		assertDropDownLegacyHasQueryShape(selectedQuery);
	});

	it("DropDown produces no overview output", () => {
		const result = runCategoryCategoryDropDownExtraction(false);

		expect(result.addedModels.filter((model) => model.header.modelType === "overview")).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// DropDown — button semantics
// ---------------------------------------------------------------------------

describe("DropDown — button semantics", () => {
	it("DropDown edit button present only when linkFormModel exists", () => {
		const noLinkResult = runCategoryCategoryDropDownExtraction(false);
		const withLinkResult = runDropDownWithLinkFormExtraction();

		expect(hasButton(noLinkResult.rumModel, "event_edit_link_document")).toBe(false);
		expect(hasButton(withLinkResult.rumModel, "event_edit_link_document")).toBe(true);
	});

	it("DropDown add button present only for CDM policy-holder", () => {
		const categoryResult = runCategoryCategoryDropDownExtraction(false);
		const policyHolderResult = runPolicyHolderDropDownExtraction();

		expect(hasButton(categoryResult.rumModel, "event_add_document")).toBe(false);
		expect(hasButton(policyHolderResult.rumModel, "event_add_document")).toBe(true);

		// PolicyHolder adds query artifacts under its own IDs
		expect(policyHolderResult.addedQueryIds).toContain(POLICY_HOLDER_AVAILABLE_QUERY_ID);
		expect(policyHolderResult.addedQueryIds).toContain(POLICY_HOLDER_SELECTED_QUERY_ID);
	});

	it("DropDown policy-holder add button has icon add and labelHidden", () => {
		const result = runPolicyHolderDropDownExtraction();
		const addButton = getButtons(result.rumModel).find((button) => button.event === "event_add_document");

		expect(addButton).toBeDefined();
		expect(addButton?.labelHidden).toBe(true);
		expect(addButton?.icon).toEqual({ name: "add" });
		expect(Array.isArray(addButton?.label)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// non-keepModels DropDown — binding reference pruning
// ---------------------------------------------------------------------------

describe("non-keepModels DropDown — binding reference pruning", () => {
	it("non-keepModels DropDown prunes legacy binding refs", () => {
		const result = runCategoryCategoryDropDownExtraction(false);
		const annotations = getFormAnnotations(result.updatedForm);
		const refs = getFormModelRefs(result.updatedForm);
		const bindingRefs = refs.filter((ref) => ref.purpose === "bindingReference");

		expect(annotations.some((annotation) => annotation.name === "bindingConfiguration")).toBe(false);
		expect(bindingRefs.some((ref) => ref.reference === "Category_ChildCategory_AvailableItemsOverview")).toBe(false);
		expect(refs.some((ref) => ref.purpose === "relationship-ui")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// keepModels DropDown — binding reference preservation
// ---------------------------------------------------------------------------

describe("keepModels DropDown — binding reference preservation", () => {
	it("keepModels DropDown preserves legacy binding refs", () => {
		const result = runCategoryCategoryDropDownExtraction(true);
		const annotations = getFormAnnotations(result.updatedForm);
		const refs = getFormModelRefs(result.updatedForm);

		expect(annotations.some((annotation) => annotation.name === "bindingConfiguration")).toBe(true);
		expect(refs.some((ref) => ref.reference === "Category_ChildCategory_AvailableItemsOverview")).toBe(true);
		expect(refs.some((ref) => ref.purpose === "relationship-ui")).toBe(true);
	});
});

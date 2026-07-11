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

/**
 * Wave 3 — DropDown query content, button shape, and RuM header modelReferences snapshots
 * (Tasks 3.1, 3.3, 3.4). Each snapshot targets a single stable subtree paired with a semantic
 * assertion. Snapshot updates require a "why changed?" PR note.
 */

import { it, expect, describe } from "vitest";

import { record } from "./fixture-utils.js";
import {
	getButtons,
	getRumModelRefs,
	CATEGORY_SELECTED_QUERY_ID,
	CATEGORY_AVAILABLE_QUERY_ID,
	runDropDownWithLinkFormExtraction,
	runPolicyHolderDropDownExtraction,
	runCategoryCategoryDropDownExtraction
} from "./dropdown-query-fixture.js";

describe("Wave 3 — DropDown query content snapshots (Tasks 3.1)", () => {
	it("DropDown available query content matches canonical available shape", () => {
		const result = runCategoryCategoryDropDownExtraction(false);
		const content = record(result.index.resolveRef(CATEGORY_AVAILABLE_QUERY_ID)?.content);
		expect(content.targetDocumentModel).toBe("Category-document");
		expect(record(content.paging).pageSize).toBe(8);
		expect(content).toMatchInlineSnapshot(`
			{
			  "links": [
			    {
			      "constraint": {
			        "field": "/__meta/docRef",
			        "operator": "exact_match",
			        "value": "\${Category-document, [/__meta/docRef]}",
			      },
			      "maxDepth": 1,
			      "relationshipModel": "CategoryCategory",
			      "targetRole": "ParentCategory",
			    },
			  ],
			  "paging": {
			    "pageNumber": 0,
			    "pageSize": 8,
			  },
			  "projectionName": "document",
			  "targetDocumentModel": "Category-document",
			}
		`);
	});

	it("DropDown selected query content uses legacy-HAS shape with top-level has constraint", () => {
		const result = runCategoryCategoryDropDownExtraction(false);
		const content = record(result.index.resolveRef(CATEGORY_SELECTED_QUERY_ID)?.content);
		expect(record(content.constraint).operator).toBe("has");
		expect(record(content.paging).pageSize).toBe(1);
		expect(content).toMatchInlineSnapshot(`
			{
			  "constraint": {
			    "constraint": {
			      "field": "/__meta/docRef",
			      "operator": "exact_match",
			      "value": "\${Category-document, [/__meta/docRef]}",
			    },
			    "maxDepth": 1,
			    "operator": "has",
			    "relationshipModel": "CategoryCategory",
			    "targetRole": "ParentCategory",
			  },
			  "links": [
			    {
			      "constraint": {
			        "field": "/__meta/docRef",
			        "operator": "exact_match",
			        "value": "\${Category-document, [/__meta/docRef]}",
			      },
			      "maxDepth": 1,
			      "relationshipModel": "CategoryCategory",
			      "targetRole": "ParentCategory",
			    },
			  ],
			  "paging": {
			    "pageNumber": 0,
			    "pageSize": 1,
			  },
			  "projectionName": "document",
			  "targetDocumentModel": "Category-document",
			}
		`);
	});
});

describe("Wave 3 — DropDown button shape snapshots (Task 3.3)", () => {
	it("DropDown edit button has description icon and labelHidden", () => {
		const editButton = getButtons(runDropDownWithLinkFormExtraction().rumModel).find(
			(button) => button.event === "event_edit_link_document"
		);
		expect(editButton?.icon).toEqual({ name: "description" });
		expect(editButton?.labelHidden).toBe(true);
		expect(editButton).toMatchInlineSnapshot(`
			{
			  "event": "event_edit_link_document",
			  "icon": {
			    "name": "description",
			  },
			  "label": [
			    {
			      "locale": "en",
			      "text": "Edit additional properties",
			    },
			    {
			      "locale": "de",
			      "text": "Zusätzliche Eigenschaften bearbeiten",
			    },
			  ],
			  "labelHidden": true,
			}
		`);
	});

	it("DropDown add button has add icon and labelHidden", () => {
		const addButton = getButtons(runPolicyHolderDropDownExtraction().rumModel).find(
			(button) => button.event === "event_add_document"
		);
		expect(addButton?.icon).toEqual({ name: "add" });
		expect(addButton?.labelHidden).toBe(true);
		expect(addButton).toMatchInlineSnapshot(`
			{
			  "event": "event_add_document",
			  "icon": {
			    "name": "add",
			  },
			  "label": [
			    {
			      "locale": "en",
			      "text": "Add policy holder",
			    },
			    {
			      "locale": "de",
			      "text": "Versicherungsnehmer hinzufügen",
			    },
			  ],
			  "labelHidden": true,
			}
		`);
	});
});

describe("Wave 3 — DropDown RuM header modelReferences snapshot (Task 3.4)", () => {
	it("DropDown RuM modelReferences includes availableItemsQuery and selectedItemQuery, sorted", () => {
		const result = runCategoryCategoryDropDownExtraction(false);
		const refs = [...getRumModelRefs(result.rumModel)].sort((a, b) => (a.purpose ?? "").localeCompare(b.purpose ?? ""));
		expect(refs).toHaveLength(2);
		expect(refs).toMatchInlineSnapshot(`
			[
			  {
			    "modelType": "query",
			    "purpose": "availableItemsQuery",
			    "reference": "Category-form-binding-ChildCategoryDropDown-available-query",
			  },
			  {
			    "modelType": "query",
			    "purpose": "selectedItemQuery",
			    "reference": "Category-form-binding-ChildCategoryDropDown-selected-query",
			  },
			]
		`);
	});
});

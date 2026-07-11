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

import { headerRefsOf, contentRefsOf, buildModelIndex } from "./model-index.js";

const ADDRESS_DOCUMENT = makeModel({ id: "Address-document", modelType: "document" });
const ADDRESS_OVERVIEW = makeModel({
	id: "Address-overview",
	modelType: "overview",
	modelReferences: [
		{ purpose: "document-model-for-overview", modelType: "document", reference: "Address-document" },
		{ purpose: "query-model-for-overview", modelType: "query", reference: "Address-query" }
	],
	content: {
		component: {
			selectedItemsOverviewModel: "Address-selected-overview",
			models: [
				{ use: "candidate", name: "Address-candidate-overview" },
				{ use: "link", name: "Address-link-overview" }
			]
		}
	}
});
const ADDRESS_QUERY = makeModel({ id: "Address-query", modelType: "query" });

describe("buildModelIndex", () => {
	it("resolves known ids and returns undefined for unknown ids", () => {
		const index = buildModelIndex([ADDRESS_DOCUMENT, ADDRESS_OVERVIEW]);

		expect(index.resolveRef("Address-document")).toBe(ADDRESS_DOCUMENT);
		expect(index.resolveRef("Missing-document")).toBeUndefined();
	});

	it("filters models by header modelType", () => {
		const index = buildModelIndex([ADDRESS_DOCUMENT, ADDRESS_OVERVIEW, ADDRESS_QUERY]);

		expect(index.allByType("overview")).toEqual([ADDRESS_OVERVIEW]);
		expect(index.allByType("document")).toEqual([ADDRESS_DOCUMENT]);
	});

	it("extracts header modelReferences by purpose", () => {
		const index = buildModelIndex([ADDRESS_OVERVIEW]);

		expect(index.headerRefsOf(ADDRESS_OVERVIEW, "document-model-for-overview")).toEqual(["Address-document"]);
		expect(headerRefsOf(ADDRESS_OVERVIEW, "query-model-for-overview")).toEqual(["Address-query"]);
		expect(index.headerRefsOf(ADDRESS_OVERVIEW, "relationship-ui")).toEqual([]);
	});

	it("extracts string content references via dot-separated paths", () => {
		const index = buildModelIndex([ADDRESS_OVERVIEW]);

		expect(index.contentRefsOf(ADDRESS_OVERVIEW, "component.selectedItemsOverviewModel")).toEqual([
			"Address-selected-overview"
		]);
		expect(contentRefsOf(ADDRESS_OVERVIEW, "$.component.selectedItemsOverviewModel")).toEqual([
			"Address-selected-overview"
		]);
	});

	it("flattens array segments marked with [] while traversing content paths", () => {
		const index = buildModelIndex([ADDRESS_OVERVIEW]);

		expect(index.contentRefsOf(ADDRESS_OVERVIEW, "component.models[].name")).toEqual([
			"Address-candidate-overview",
			"Address-link-overview"
		]);
	});

	it("returns an empty array for missing paths, non-array [] segments and non-string leaves", () => {
		const model = makeModel({
			id: "Invalid-path-source",
			modelType: "relationship-ui",
			content: { component: { count: 2, models: { name: "not-flattened" } } }
		});
		const index = buildModelIndex([model]);

		expect(index.contentRefsOf(model, "component.unknown")).toEqual([]);
		expect(index.contentRefsOf(model, "component.models[].name")).toEqual([]);
		expect(index.contentRefsOf(model, "component.count")).toEqual([]);
	});
});

interface TestModelOptions {
	readonly id: string;
	readonly modelType: string;
	readonly modelReferences?: readonly unknown[];
	readonly content?: unknown;
}

function makeModel(options: TestModelOptions): {
	readonly header: {
		readonly id: string;
		readonly modelType: string;
		readonly modelReferences?: readonly unknown[];
	};
	readonly content?: unknown;
	readonly path: string;
} {
	return {
		header: {
			id: options.id,
			modelType: options.modelType,
			modelReferences: options.modelReferences
		},
		content: options.content,
		path: `fixtures/${options.id}.json`
	};
}

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

import {
	type LinkReferenceOverview,
	assertChildHasLinkReferences,
	assertLinkExcludeLinkReferences,
	assertNoMixedLinkReferenceTypes,
	assertNoI4ElementRefsInQueryBackedEditColumns
} from "./linkref-validator.js";

function makeOverview(id: string, columns: readonly object[]): LinkReferenceOverview {
	return {
		header: {
			id,
			modelReferences: [{ purpose: "query-model-for-overview", modelType: "query", reference: `${id}-query` }]
		},
		content: { columns }
	};
}

function makeColumn(id: string, elementRef: string, linkTypes: readonly string[] = []): object {
	return {
		id,
		elementRef,
		linkReferences: linkTypes.map((type) => ({ type, reference: `${type}-${elementRef}` }))
	};
}

describe("linkReference validator", () => {
	it("no mixed LINK and CHILD refs passes for homogeneous columns and fails for mixed columns", () => {
		const validOverview = makeOverview("SelectedOverview", [
			makeColumn("target-name", "target-name", ["CHILD"]),
			makeColumn("link-status", "link-status", ["LINK"])
		]);
		const mixedOverview = makeOverview("SelectedOverview", [
			makeColumn("mixed-column", "mixed-column", ["CHILD", "LINK"])
		]);

		expect(() => assertNoMixedLinkReferenceTypes(validOverview)).not.toThrow();
		expect(() => assertNoMixedLinkReferenceTypes(mixedOverview)).toThrow(/mixed-column mixes LINK and CHILD/);
	});

	it("absent or empty columns fail before linkReference assertions can false-pass", () => {
		const overviewWithoutColumns = {
			header: { id: "SelectedOverview" },
			content: {}
		};
		const overviewWithEmptyColumns = makeOverview("SelectedOverview", []);

		expect(() => assertNoMixedLinkReferenceTypes(overviewWithoutColumns)).toThrow(/content\.columns must be present/);
		expect(() => assertNoMixedLinkReferenceTypes(overviewWithEmptyColumns)).toThrow(
			/content\.columns must not be empty/
		);
	});

	it("empty classification sets fail", () => {
		const overview = makeOverview("SelectedOverview", [makeColumn("target-name", "I4_name", ["CHILD"])]);
		const columnSets = { targetDocumentElementRefs: [], linkDocumentElementRefs: ["I4_name"] };

		expect(() => assertLinkExcludeLinkReferences(overview, columnSets)).toThrow(
			/target-document classification set must not be empty/
		);
	});

	it("classification refs that match no parsed columns fail", () => {
		const overview = makeOverview("SelectedOverview", [
			makeColumn("target-name", "I4_name", ["CHILD"]),
			makeColumn("link-status", "I5_status", ["LINK"])
		]);
		const columnSets = { targetDocumentElementRefs: ["I4_missing"], linkDocumentElementRefs: ["I5_status"] };

		expect(() => assertLinkExcludeLinkReferences(overview, columnSets)).toThrow(
			/classification refs do not match parsed columns: I4_missing/
		);
	});

	it("malformed or unsupported linkReferences entries on asserted columns fail", () => {
		const malformedOverview = makeOverview("SelectedOverview", [
			{ id: "target-name", elementRef: "I4_name", linkReferences: [{ reference: "missing-type" }] },
			makeColumn("link-status", "I5_status", ["LINK"])
		]);
		const unknownTypeOverview = makeOverview("SelectedOverview", [
			makeColumn("target-name", "I4_name", ["UNKNOWN"]),
			makeColumn("link-status", "I5_status", ["LINK"])
		]);
		const columnSets = { targetDocumentElementRefs: ["I4_name"], linkDocumentElementRefs: ["I5_status"] };

		expect(() => assertLinkExcludeLinkReferences(malformedOverview, columnSets)).toThrow(
			/linkReferences\[0\] has unsupported type undefined/
		);
		expect(() => assertLinkExcludeLinkReferences(unknownTypeOverview, columnSets)).toThrow(
			/linkReferences\[0\] has unsupported type UNKNOWN/
		);
	});

	it("LINK mode split semantics require target-doc CHILD refs and link-doc LINK refs", () => {
		const validOverview = makeOverview("SelectedOverview", [
			makeColumn("target-name", "I4_name", ["CHILD"]),
			makeColumn("link-status", "I5_status", ["LINK"])
		]);
		const invalidOverview = makeOverview("SelectedOverview", [
			makeColumn("target-name", "I4_name", ["LINK"]),
			makeColumn("link-status", "I5_status", ["LINK"])
		]);
		const columnSets = { targetDocumentElementRefs: ["I4_name"], linkDocumentElementRefs: ["I5_status"] };

		expect(() => assertLinkExcludeLinkReferences(validOverview, columnSets)).not.toThrow();
		expect(() => assertLinkExcludeLinkReferences(invalidOverview, columnSets)).toThrow(
			/target-name \(I4_name\) has offending ref\(s\): LINK:LINK-I4_name/
		);
	});

	it("CHILD mode target-doc columns have no linkReferences", () => {
		const validOverview = makeOverview("SelectedOverview", [makeColumn("target-name", "target-name")]);
		const invalidOverview = makeOverview("SelectedOverview", [makeColumn("target-name", "target-name", ["CHILD"])]);

		expect(() =>
			assertChildHasLinkReferences(validOverview, { targetDocumentElementRefs: ["target-name"] })
		).not.toThrow();
		expect(() => assertChildHasLinkReferences(invalidOverview, { targetDocumentElementRefs: ["target-name"] })).toThrow(
			/target-document column target-name \(target-name\) must not have linkReferences/
		);
	});

	it("I4_ refs in query-backed -edit columns fail", () => {
		const validOverview = makeOverview("SelectedOverview-edit", [makeColumn("target-name", "field_name", ["CHILD"])]);
		const invalidOverview = makeOverview("SelectedOverview-edit", [
			makeColumn("target-name", "I4_field_name", ["CHILD"])
		]);

		expect(() => assertNoI4ElementRefsInQueryBackedEditColumns(validOverview)).not.toThrow();
		expect(() => assertNoI4ElementRefsInQueryBackedEditColumns(invalidOverview)).toThrow(
			/target-name \(I4_field_name\)/
		);
	});
});

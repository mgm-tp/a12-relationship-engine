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

import { assertLinkExcludeQueryShape } from "../internal/test-support/query-shape-validator.js";
import {
	assertLinkExcludeLinkReferences,
	assertNoMixedLinkReferenceTypes,
	assertNoI4ElementRefsInQueryBackedEditColumns
} from "../internal/test-support/linkref-validator.js";

import { getRowActivation } from "./fixture-utils.js";
import {
	record,
	columns,
	operator,
	firstRecord,
	toQueryShape,
	hasNoMixedRefs,
	rowActionEvents,
	linkReferenceTypes,
	toLinkReferenceOverview,
	extractCoInsurerDualPane
} from "./co-insurer-dualpane-fixture.js";

const TARGET_REFS = ["field_4e3fe", "field_6268b", "group_d1772"] as const;
const LINK_REFS = ["field_de37b"] as const;

describe("DualPane LINK keepModels extraction", () => {
	it("keepModels DualPane LINK selected query uses content.exclude with nested has in links", () => {
		const output = extractCoInsurerDualPane();

		assertLinkExcludeQueryShape(toQueryShape(output.selectedQuery));
		expect(record(output.selectedQuery.content).exclude).toBe(true);
		expect(operator(record(output.selectedQuery.content).constraint)).toBe("exact_match");
		expect(output.selectedQueryLinkConstraintOperator).toBe("has");
	});

	it("keepModels DualPane LINK query has correct target and source roles", () => {
		const output = extractCoInsurerDualPane();
		const content = record(output.selectedQuery.content);
		const link = firstRecord(content.links, "query links");
		const nestedConstraint = record(link.constraint);

		expect(content.targetDocumentModel).toBe("Contract-document");
		expect(link.targetRole).toBe("businessPartner");
		// Relationship model discriminates which relationship's query this is
		expect(link.relationshipModel).toBe("CoInsurer");
		expect(nestedConstraint.targetRole).toBe("contract");
		// Source placeholder must be resolved to a real document ref, not a generic SourceDM token
		const innerConstraint = record(nestedConstraint.constraint);
		expect(innerConstraint.value).toBe("${Contract-document, [/__meta/docRef]}");
		expect(JSON.stringify(output.selectedQuery.content)).not.toContain("${SourceDM,");
	});

	it("keepModels DualPane LINK target-doc columns get CHILD refs, link-doc columns get LINK refs", () => {
		const output = extractCoInsurerDualPane();

		assertLinkExcludeLinkReferences(toLinkReferenceOverview(output.selectedOverview), {
			targetDocumentElementRefs: TARGET_REFS,
			linkDocumentElementRefs: LINK_REFS
		});
		expect(linkReferenceTypes(output.selectedOverview, TARGET_REFS)).toEqual([["CHILD"], ["CHILD"], ["CHILD"]]);
		expect(linkReferenceTypes(output.selectedOverview, LINK_REFS)).toEqual([["LINK"]]);
		// Each linkReference must be scoped to the CoInsurer relationship — not just correctly typed
		const rawCols = record(output.selectedOverview.content).columns as Record<string, unknown>[];

		for (const elementRef of [...TARGET_REFS, ...LINK_REFS]) {
			const col = record(rawCols.find((c) => c.elementRef === elementRef));
			const refs = (Array.isArray(col.linkReferences) ? col.linkReferences : []) as Record<string, unknown>[];
			expect(refs.length, `${elementRef} must have linkReferences`).toBeGreaterThan(0);

			for (const ref of refs) {
				expect(record(ref).relationship, `${elementRef} ref must be scoped to CoInsurer`).toBe("CoInsurer");
			}
		}
	});

	it("keepModels DualPane LINK no column mixes LINK and CHILD linkReferences", () => {
		const output = extractCoInsurerDualPane();

		assertNoMixedLinkReferenceTypes(toLinkReferenceOverview(output.selectedOverview));
		expect(columns(output.selectedOverview).every(hasNoMixedRefs)).toBe(true);
	});

	it("keepModels DualPane LINK edit-link row action present when linkDocumentModel exists", () => {
		expect(rowActionEvents(extractCoInsurerDualPane().selectedOverview)).toContain("event_edit_link_document");
	});

	it("keepModels DualPane LINK edit clone columns have no I4_ element refs", () => {
		const overview = extractCoInsurerDualPane().selectedOverview;

		assertNoI4ElementRefsInQueryBackedEditColumns(toLinkReferenceOverview(overview));
		expect(columns(overview).map((column) => column.elementRef)).not.toEqual(
			expect.arrayContaining([expect.stringMatching(/^I4_/u)])
		);
	});

	it("keepModels DualPane LINK selected overview has delete, restore, and edit-link row actions", () => {
		const selectedOverview = extractCoInsurerDualPane().selectedOverview;

		expect(rowActionEvents(selectedOverview)).toEqual([
			"event_delete_link",
			"event_restore_link",
			"event_edit_link_document"
		]);
		expect(getRowActivation(selectedOverview)).toEqual({ type: "event", event: "event_delete_link" });
	});
});

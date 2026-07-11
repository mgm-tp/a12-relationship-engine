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
	getComponent,
	CLONE_ALIAS_ID,
	getHeaderLabels,
	CANDIDATE_OVERVIEW_ID,
	runMultiRelCandidateExtraction,
	runSingleRelCandidateExtraction
} from "./category-candidate-fixture.js";

describe("Available candidate clone routing", () => {
	it("multi-relationship candidate emits --RelationshipName clone", () => {
		const result = runMultiRelCandidateExtraction(true);

		// The DualPane CategoryCategoryAlias binding drives the candidate clone.
		// DropDown bindings contribute to the global candidate map (triggering shouldCloneCandidate)
		// but do not appear in the overview context map after P2 enrichment to query refs.
		const aliasClone = result.findAddedById(CLONE_ALIAS_ID);

		expect(aliasClone).toBeDefined();
		expect((aliasClone as { header?: { modelType?: string } } | undefined)?.header?.modelType).toBe("overview");
	});

	it("single-relationship candidate stays on base overview without clone", () => {
		// Single-relationship variant: only the CategoryCategory DropDown binding present.
		// The DropDown uses query refs and does not build an overview context,
		// so shouldCloneCandidate=false and no --RelationshipName clone is emitted.
		const result = runSingleRelCandidateExtraction(true);

		const cloneIds = result.addedModels
			.map((model) => (model as { header?: { id?: string } }).header?.id ?? "")
			.filter((id) => id.includes("--"));

		expect(cloneIds).toHaveLength(0);
	});

	it("candidate clone has inbound reference from RuM", () => {
		const result = runMultiRelCandidateExtraction(true);

		// Under keepModels, reference remapping updates the DualPane RuM availableItemsOverviewModel to the clone
		const dualPaneRuM = result.dualPaneRuM;
		expect(dualPaneRuM).toBeDefined();

		if (dualPaneRuM !== undefined) {
			const component = getComponent(dualPaneRuM);
			expect(component.availableItemsOverviewModel).toBe(CLONE_ALIAS_ID);
		}

		// The clone must exist and be reachable
		expect(result.findAddedById(CLONE_ALIAS_ID)).toBeDefined();
	});

	it("candidate clones have fallback labels Available Items / Selected Items or source labels", () => {
		const result = runMultiRelCandidateExtraction(true);

		const aliasClone = result.findAddedById(CLONE_ALIAS_ID);
		expect(aliasClone).toBeDefined();

		if (aliasClone !== undefined) {
			const labels = getHeaderLabels(aliasClone);
			const enLabel = labels.find((label) => label.locale === "en");
			// Clone inherits source labels ("Available categories") or receives fallback ("Available Items")
			expect(enLabel?.text).toBeTruthy();
		}
	});

	it("keepModels candidate base overview preserved", () => {
		const result = runMultiRelCandidateExtraction(true);

		// Under keepModels, the base candidate overview is not re-written (isPreservedBaseOverview skips it)
		expect(result.findAddedById(CANDIDATE_OVERVIEW_ID)).toBeUndefined();
		// And the base must never be deleted
		expect(result.deletedIds).not.toContain(CANDIDATE_OVERVIEW_ID);
	});

	it("non-keepModels candidate base may be query-backed in place", () => {
		const result = runMultiRelCandidateExtraction(false);

		// GAP-1 clone behavior applies regardless of keepModels:
		// the DualPane candidate clone is emitted even without keepModels
		expect(result.findAddedById(CLONE_ALIAS_ID)).toBeDefined();

		// The base candidate overview must NOT be deleted
		expect(result.deletedIds).not.toContain(CANDIDATE_OVERVIEW_ID);
	});
});

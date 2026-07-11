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

import { assertOverviewTopology } from "../internal/test-support/overview-topology-validator.js";

import { getRowActivation } from "./fixture-utils.js";
import {
	getComponent,
	requireModel,
	getRowActionEvents,
	getSingleHeaderRef,
	PRODUCT_BRAND_EDIT_CLONE_ID,
	PRODUCT_BRAND_DIRECT_QUERY_ID,
	transformProductBrandTableList,
	PRODUCT_BRAND_DIRECT_OVERVIEW_ID,
	PRODUCT_BRAND_DIRECT_TABLELIST_ID
} from "./product-brand-tablelist-fixture.js";

describe("TableList extraction without keepModels using ProductBrand", () => {
	it("non-keepModels TableList direct selected stays base query-backed in place", () => {
		const result = transformProductBrandTableList(false);
		const directOverview = requireModel(
			result.findModel(PRODUCT_BRAND_DIRECT_OVERVIEW_ID),
			PRODUCT_BRAND_DIRECT_OVERVIEW_ID
		);

		expect(result.tableListComponent.selectedItemsOverviewModel).toBe(PRODUCT_BRAND_DIRECT_OVERVIEW_ID);
		expect(getSingleHeaderRef(directOverview, "query-model-for-overview")).toBe(PRODUCT_BRAND_DIRECT_QUERY_ID);
		expect(result.findModel(PRODUCT_BRAND_DIRECT_QUERY_ID)?.header.modelType).toBe("query");
		expect(getRowActivation(directOverview)).toEqual({ type: "non_interactive" });
		assertOverviewTopology(result.tableListRuM.content, result.index, { keepModels: false });
	});

	it("non-keepModels TableList direct selected overview has empty labels (runtime resolves)", () => {
		const result = transformProductBrandTableList(false);
		const directOverview = requireModel(
			result.findModel(PRODUCT_BRAND_DIRECT_OVERVIEW_ID),
			PRODUCT_BRAND_DIRECT_OVERVIEW_ID
		);

		expect(directOverview.header.labels).toEqual([]);
	});

	it("non-keepModels TableList no -tableList clone generated", () => {
		const result = transformProductBrandTableList(false);

		expect(result.addedModelIds).not.toContain(PRODUCT_BRAND_DIRECT_TABLELIST_ID);
		expect(result.findModel(PRODUCT_BRAND_DIRECT_TABLELIST_ID)).toBeUndefined();
	});

	it("non-keepModels TableList edit selected uses editOverviewId-edit", () => {
		const result = transformProductBrandTableList(false);
		const editClone = requireModel(result.findModel(PRODUCT_BRAND_EDIT_CLONE_ID), PRODUCT_BRAND_EDIT_CLONE_ID);

		expect(result.tableListComponent.editConfiguration?.selectedItemsOverviewModel).toBe(PRODUCT_BRAND_EDIT_CLONE_ID);
		expect(getSingleHeaderRef(editClone, "query-model-for-overview")).toBe(`${PRODUCT_BRAND_DIRECT_OVERVIEW_ID}-query`);
		expect(getRowActionEvents(editClone)).toEqual(expect.arrayContaining(["event_delete_link", "event_restore_link"]));
		expect(getRowActivation(editClone)).toEqual({ type: "event", event: "event_delete_link" });
	});

	it("non-keepModels TableList DropDown excluded from TableList output", () => {
		const result = transformProductBrandTableList(false);
		const dropDownRuM = requireModel(result.dropDownRuM, "ProductBrand DropDown relationship-ui");
		const dropDownComponent = getComponent(dropDownRuM);

		expect(dropDownComponent.componentType).toBe("DropDownSelection");
		expect(dropDownComponent.selectedItemsOverviewModel).toBeUndefined();
		expect(dropDownComponent.availableItemsOverviewModel).toBeUndefined();
		expect(result.addedOverviewIds).toEqual(
			expect.not.arrayContaining([
				expect.stringContaining("DropDown"),
				`${PRODUCT_BRAND_DIRECT_OVERVIEW_ID}--ProductBrand`
			])
		);
		assertOverviewTopology(dropDownRuM.content, result.index, { keepModels: false });
	});

	it("non-keepModels TableList legacy bindingReference entries pruned", () => {
		const result = transformProductBrandTableList(false);
		const bindingReferences = (result.updatedForm.header.modelReferences ?? []).filter((reference) =>
			isReferencePurpose(reference, "bindingReference")
		);

		expect(bindingReferences).toHaveLength(0);
		expect(result.updatedForm.header.modelReferences).toEqual(
			expect.arrayContaining([expect.objectContaining({ purpose: "relationship-ui", modelType: "relationship-ui" })])
		);
	});
});

function isReferencePurpose(value: unknown, purpose: string): boolean {
	return typeof value === "object" && value !== null && "purpose" in value && value.purpose === purpose;
}

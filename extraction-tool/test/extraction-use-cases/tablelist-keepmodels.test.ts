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
	labelText,
	requireModel,
	getRowActionEvents,
	getSingleHeaderRef,
	PRODUCT_BRAND_EDIT_CLONE_ID,
	transformProductBrandTableList,
	PRODUCT_BRAND_DIRECT_TABLELIST_ID
} from "./product-brand-tablelist-fixture.js";

describe("TableList keepModels extraction with ProductBrand", () => {
	it("keepModels TableList direct selected routes to -tableList clone", () => {
		const result = transformProductBrandTableList(true);

		expect(result.tableListComponent.selectedItemsOverviewModel).toBe(PRODUCT_BRAND_DIRECT_TABLELIST_ID);
		expect(result.findModel(PRODUCT_BRAND_DIRECT_TABLELIST_ID)).toBeDefined();
		assertOverviewTopology(result.tableListRuM.content, result.index, { keepModels: true });
	});

	it("keepModels TableList direct clone has empty labels (runtime resolves)", () => {
		const result = transformProductBrandTableList(true);
		const directClone = requireModel(
			result.findModel(PRODUCT_BRAND_DIRECT_TABLELIST_ID),
			PRODUCT_BRAND_DIRECT_TABLELIST_ID
		);

		expect(directClone.header.labels).toEqual([]);
	});

	it("keepModels TableList edit selected routes to -edit clone", () => {
		const result = transformProductBrandTableList(true);

		expect(result.tableListComponent.editConfiguration?.selectedItemsOverviewModel).toBe(PRODUCT_BRAND_EDIT_CLONE_ID);
		expect(result.findModel(PRODUCT_BRAND_EDIT_CLONE_ID)).toBeDefined();
	});

	it("keepModels TableList direct clone does not inherit edit row actions", () => {
		const result = transformProductBrandTableList(true);
		const directClone = requireModel(
			result.findModel(PRODUCT_BRAND_DIRECT_TABLELIST_ID),
			PRODUCT_BRAND_DIRECT_TABLELIST_ID
		);
		const directActions = getRowActionEvents(directClone);

		// Each forbidden event must be absent individually — a regression that adds
		// only one of them would previously pass the arrayContaining check.
		expect(directActions).not.toContain("event_delete_link");
		expect(directActions).not.toContain("event_restore_link");
		expect(directActions).not.toContain("event_edit_link_document");
		expect(getRowActivation(directClone)).toEqual({ type: "non_interactive" });
	});

	it("keepModels TableList edit clone has selected row actions (delete/restore)", () => {
		const result = transformProductBrandTableList(true);
		const editClone = requireModel(result.findModel(PRODUCT_BRAND_EDIT_CLONE_ID), PRODUCT_BRAND_EDIT_CLONE_ID);

		expect(getRowActionEvents(editClone)).toEqual(expect.arrayContaining(["event_delete_link", "event_restore_link"]));
		expect(getRowActivation(editClone)).toEqual({ type: "event", event: "event_delete_link" });
	});

	it("keepModels TableList both clones share the same query model", () => {
		const result = transformProductBrandTableList(true);
		const directClone = requireModel(
			result.findModel(PRODUCT_BRAND_DIRECT_TABLELIST_ID),
			PRODUCT_BRAND_DIRECT_TABLELIST_ID
		);
		const editClone = requireModel(result.findModel(PRODUCT_BRAND_EDIT_CLONE_ID), PRODUCT_BRAND_EDIT_CLONE_ID);
		const directQueryRef = getSingleHeaderRef(directClone, "query-model-for-overview");
		const editQueryRef = getSingleHeaderRef(editClone, "query-model-for-overview");

		expect(directQueryRef).toBe(editQueryRef);
		expect(result.findModel(directQueryRef)?.header.modelType).toBe("query");
	});

	it("keepModels TableList edit selected overview has non-empty EN and DE labels", () => {
		const result = transformProductBrandTableList(true);
		const editClone = requireModel(result.findModel(PRODUCT_BRAND_EDIT_CLONE_ID), PRODUCT_BRAND_EDIT_CLONE_ID);
		const enLabel = labelText(editClone, "en");
		const deLabel = labelText(editClone, "de");

		// Missing locale labels must fail, not just empty strings
		expect(enLabel).toBeTypeOf("string");
		expect((enLabel as string).trim().length).toBeGreaterThan(0);
		expect(deLabel).toBeTypeOf("string");
		expect((deLabel as string).trim().length).toBeGreaterThan(0);
	});

	it("keepModels TableList preserves nested DualPane edit height separately from table height", () => {
		const result = transformProductBrandTableList(true, (binding) => ({
			...binding,
			details: {
				...binding.details,
				components: (binding.details?.components ?? []).map((component) =>
					component.id === "edit-products"
						? {
								...component,
								props: { ...component.props, height: "60vh" }
							}
						: component
				)
			}
		}));

		expect(result.tableListComponent.editConfiguration?.height).toBe("60vh");
		expect(result.tableListComponent.height).toBeUndefined();
	});
});

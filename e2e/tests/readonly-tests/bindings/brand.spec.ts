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

import { test, expect } from "@playwright/test";

import { Selector, Showcase } from "../../../support/utils.js";

test.describe.configure({ mode: "parallel" });

test.describe("Brand bindings", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(Showcase.BRAND_BINDINGS);
		await expect(page.getByText("List of brands")).toBeVisible();
		await page.getByText("AMR Corporation").click();
		await expect(page.getByRole("heading", { name: "Brand", exact: true })).toBeVisible();
	});

	// DualPaneSelection component.height = "50vh" -> 50% * 720 = 360
	test("DualPaneSelection inline applies a relative height", async ({ page }) => {
		await page.getByText("Product (Dual)").click();

		const candidateColumn = page
			.locator(`[data-role="layout-grid-column"]`)
			.filter({ has: page.getByRole("heading", { name: "Available products" }) })
			.first();
		const linkColumn = page
			.locator(`[data-role="layout-grid-column"]`)
			.filter({ has: page.getByRole("heading", { name: "Selected products" }) })
			.first();

		expect((await candidateColumn.boundingBox())?.height).toEqual(360);
		expect((await linkColumn.boundingBox())?.height).toEqual(360);
	});

	// TableList component.height = "40vh" -> 40% * 720 = 288
	test("TableList inline applies a relative height", async ({ page }) => {
		await page.getByLabel("Product (List)").click();

		const tableList = page.locator(`[data-role="relationship-engine-table-list"]`).first();

		expect((await tableList.boundingBox())?.height).toEqual(288);
	});

	test("TableList", async ({ page }) => {
		await page.getByLabel("Product (List)").click();

		await page.getByRole("button", { name: "Edit" }).click();
		const overlayContentBoxSelector = `${Selector.MODAL_OVERLAY} ${Selector.CONTENT_BOX}`;
		await expect(page.locator(overlayContentBoxSelector).getByText("Edit relationship")).toBeVisible();

		const candidates = page.locator(overlayContentBoxSelector).filter({ hasText: "Available products" }).last();
		await candidates.locator(Selector.TABLE_HEADER_CELL).filter({ hasText: "Name" }).first().click();
		await expect(candidates).toContainText("Ac Kit");
		await candidates.locator(Selector.TABLE_BODY_ROW).filter({ hasText: "Ac Kit" }).locator(Selector.BUTTON).click();

		await expect(page.getByText("Additional properties")).toBeVisible();
		await page.getByLabel("Manufacturing Site").fill("local");
		await page.getByRole("button", { name: "OK" }).click();

		const links = page.locator(overlayContentBoxSelector).filter({ hasText: "Selected Items" }).last();
		await expect(links.locator(Selector.TABLE_BODY_ROW).filter({ hasText: "Ac Kit" })).toBeVisible();

		await candidates.getByPlaceholder("Search").fill("Ofupuva Shoes");
		await candidates.getByRole("button", { name: "Search", exact: true }).click();

		await expect(candidates).toContainText("Ofupuva Shoes");
		await candidates
			.locator(Selector.TABLE_BODY_ROW)
			.filter({ hasText: "Ofupuva Shoes" })
			.locator(Selector.BUTTON)
			.click();
		await expect(page.getByText("Additional properties")).toBeVisible();
		await page.getByLabel("Manufacturing Site").fill("www.running-shoes.com");
		await page.getByRole("button", { name: "OK" }).click();
		await expect(links.locator(Selector.TABLE_BODY_ROW).filter({ hasText: "Ofupuva Shoes" })).toBeVisible();

		// Close DualPane and check data in the TableList
		await page.getByRole("button", { name: "OK" }).click();
		await expect(page.getByText("Edit relationship")).not.toBeVisible();

		// Verify linked items are visible in the TableList
		await expect(page.locator(Selector.TABLE_BODY_ROW).filter({ hasText: "Ofupuva Shoes" })).toBeVisible();
		await expect(page.locator(Selector.TABLE_BODY_ROW).filter({ hasText: "Ac Kit" })).toBeVisible();
		await expect(page.locator(Selector.TABLE_BODY_ROW).filter({ hasText: "Busahziz Jacket" })).toBeVisible();
	});
});

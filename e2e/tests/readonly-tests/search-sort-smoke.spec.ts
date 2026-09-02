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

import { Selector, Showcase } from "../../support/utils.js";

test.describe.configure({ mode: "parallel" });

test.describe("DualPane search smoke tests — Brand showcase", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(Showcase.BRAND_BINDINGS);
		await expect(page.getByText("List of brands")).toBeVisible();
		await page.getByText("AMR Corporation").click();
		await expect(page.getByRole("heading", { name: "Brand", exact: true })).toBeVisible();
	});

	test("DualPane candidate search filters results (Brand showcase)", async ({ page }) => {
		await page.getByText("Product (Dual)").click();

		const availableProducts = page.locator(Selector.CONTENT_BOX).filter({ hasText: "Available products" }).last();
		await expect(availableProducts).toBeVisible();

		// Wait for the initial candidate rows to load, then count them
		const firstRow = availableProducts.locator(Selector.TABLE_BODY_ROW).first();
		await expect(firstRow).toBeVisible();
		const totalRows = await availableProducts.locator(Selector.TABLE_BODY_ROW).count();

		// Filter by "Bel" — expects "Bel Shoes" in results with fewer rows than full list
		await availableProducts.getByPlaceholder("Search").fill("Bel");
		await availableProducts.getByRole("button", { name: "Search", exact: true }).click();

		await expect(availableProducts.locator(Selector.TABLE_BODY_ROW).filter({ hasText: "Bel Shoes" })).toBeVisible();
		const filteredRows = await availableProducts.locator(Selector.TABLE_BODY_ROW).count();
		expect(filteredRows).toBeLessThan(totalRows);

		// Clear search — full list should return
		await availableProducts.getByPlaceholder("Search").clear();
		await availableProducts.getByRole("button", { name: "Search", exact: true }).click();

		await expect(availableProducts.locator(Selector.TABLE_BODY_ROW)).toHaveCount(totalRows);
	});

	test("DualPane candidate search in TableList edit modal (Brand showcase)", async ({ page }) => {
		await page.getByLabel("Product (List)").click();
		await page.getByRole("button", { name: "Edit" }).click();

		const overlayContentBox = `${Selector.MODAL_OVERLAY} ${Selector.CONTENT_BOX}`;
		await expect(page.locator(overlayContentBox).getByText("Edit relationship")).toBeVisible();

		const candidates = page.locator(overlayContentBox).filter({ hasText: "Available products" }).last();

		await candidates.getByPlaceholder("Search").fill("Ofupuva");
		await candidates.getByRole("button", { name: "Search", exact: true }).click();

		await expect(candidates.locator(Selector.TABLE_BODY_ROW).filter({ hasText: "Ofupuva Shoes" })).toBeVisible();
		await expect(candidates.locator(Selector.TABLE_BODY_ROW)).toHaveCount(1);
	});
});

test.describe("Sort smoke tests — Product overview", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(Showcase.PRODUCT_BINDINGS);
		await expect(page.getByText("List of products")).toBeVisible();
	});

	test("overview table sort toggles on Name column header click (Product showcase)", async ({ page }) => {
		const overviewTable = page.locator(Selector.CONTENT_BOX).filter({ hasText: "List of products" }).last();
		const rows = overviewTable.locator(Selector.TABLE_BODY_ROW);

		await expect(rows.first()).toBeVisible();
		const initialFirstText = (await rows.first().textContent())?.trim() ?? "";
		expect(initialFirstText).not.toBe("");

		await overviewTable.locator(Selector.TABLE_HEADER_CELL).filter({ hasText: "Name" }).first().click();

		// Assert the first row changed, indicating the sort order toggled
		await expect(async () => {
			const currentText = (await rows.first().textContent())?.trim() ?? "";
			expect(currentText).not.toBe(initialFirstText);
		}).toPass();
	});
});

test.describe("Sort smoke tests — Brand DualPane", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(Showcase.BRAND_BINDINGS);
		await expect(page.getByText("List of brands")).toBeVisible();
		await page.getByText("AMR Corporation").click();
		await expect(page.getByRole("heading", { name: "Brand", exact: true })).toBeVisible();
	});

	test("DualPane candidate sort changes order on header click", async ({ page }) => {
		await page.getByText("Product (Dual)").click();

		const availableProducts = page.locator(Selector.CONTENT_BOX).filter({ hasText: "Available products" }).last();
		await expect(availableProducts).toBeVisible();

		const rows = availableProducts.locator(Selector.TABLE_BODY_ROW);
		await expect(rows.first()).toBeVisible();
		const initialFirstText = (await rows.first().textContent())?.trim() ?? "";
		expect(initialFirstText).not.toBe("");

		await availableProducts.locator(Selector.TABLE_HEADER_CELL).filter({ hasText: "Name" }).first().click();

		// Assert the first row changed, indicating the sort order toggled
		await expect(async () => {
			const currentText = (await rows.first().textContent())?.trim() ?? "";
			expect(currentText).not.toBe(initialFirstText);
		}).toPass();
	});
});

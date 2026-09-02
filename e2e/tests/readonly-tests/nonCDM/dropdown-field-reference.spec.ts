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

import { Showcase, Selector } from "../../../support/utils.js";

test.describe.configure({ mode: "parallel" });

const DROPDOWN_HINT = `[data-role="dropdown-hint"]`;

test.describe("Dropdown field-reference search restriction (A12RE-278)", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(Showcase.PRODUCT_BINDINGS);
		await expect(page.getByText("List of products")).toBeVisible();
		await page.getByText("Bakezdi Shirt").click();
		await expect(page.getByText("Product", { exact: true })).toBeVisible();
	});

	test("dropdown search by brand name returns matching results", async ({ page }) => {
		await page.locator(Selector.AUTOCOMPLETE_INPUT).click();
		await page.locator(Selector.AUTOCOMPLETE_INPUT).fill("AMR");

		await expect(page.locator(Selector.DROPDOWN_ITEM).first()).toBeVisible();
		await expect(page.locator(Selector.DROPDOWN_ITEM)).toHaveCount(1);
		await expect(page.locator(Selector.DROPDOWN_TEXT).first()).toContainText("AMR Corporation");
		await expect(page.locator(DROPDOWN_HINT)).toContainText("1 of 1");
	});

	test("dropdown search by taxId returns no results (field reference restriction)", async ({ page }) => {
		await page.locator(Selector.AUTOCOMPLETE_INPUT).click();
		await page.locator(Selector.AUTOCOMPLETE_INPUT).fill("309");

		await expect(page.locator(DROPDOWN_HINT)).toContainText("0 of 0");
		await expect(page.locator(Selector.DROPDOWN_ITEM)).toHaveCount(0);
	});

	test("dropdown shows min-chars hint when below threshold", async ({ page }) => {
		await page.locator(Selector.AUTOCOMPLETE_INPUT).click();
		await page.locator(Selector.AUTOCOMPLETE_INPUT).fill("AM");

		await expect(page.locator(DROPDOWN_HINT)).toContainText("Enter at least 3 characters");
		await expect(page.locator(Selector.DROPDOWN_ITEM)).toHaveCount(0);
	});
});

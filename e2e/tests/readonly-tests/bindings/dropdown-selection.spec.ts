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

import { test, expect, type Page } from "@playwright/test";

import { Showcase, Selector } from "../../../support/utils.js";

test.describe.configure({ mode: "parallel" });

test.describe("Dropdown selection — non-CDM (Product)", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(Showcase.PRODUCT_BINDINGS);
		await expect(page.getByText("List of products")).toBeVisible();
		await page.getByText("Bel Shoes").click();
		await expect(page.getByText("Product", { exact: true })).toBeVisible();
	});

	async function selectAndConfirm(page: Page, itemName: string): Promise<void> {
		await page.locator(Selector.AUTOCOMPLETE_INPUT).click();
		await page
			.locator(Selector.DROPDOWN_ITEM)
			.filter({ has: page.getByText(itemName) })
			.click();
		// The product dropdown has a link form — fill and submit it
		await expect(page.getByText("Edit relationship")).toBeVisible();
		await page.getByLabel("Manufacturing Site").clear();
		await page.getByLabel("Manufacturing Site").fill("Local");
		await page.getByRole("button", { name: "OK" }).click();
	}

	test("clicking dropdown does not clear selection", async ({ page }) => {
		await selectAndConfirm(page, "Crompton Corp.");
		await expect(page.locator(Selector.AUTOCOMPLETE_INPUT)).toHaveValue("Crompton Corp.");

		// Click dropdown to open it — selection must be preserved
		await page.locator(Selector.AUTOCOMPLETE_INPUT).click();
		await expect(page.locator(Selector.AUTOCOMPLETE_INPUT)).toHaveValue("Crompton Corp.");
		await expect(
			page.locator(Selector.DROPDOWN_ITEM).filter({ has: page.getByText("Crompton Corp.") })
		).toHaveAttribute("aria-selected", "true");
	});

	test("link form cancel preserves selection", async ({ page }) => {
		await selectAndConfirm(page, "Crompton Corp.");
		await expect(page.locator(Selector.AUTOCOMPLETE_INPUT)).toHaveValue("Crompton Corp.");

		// Select another item which opens the link form
		await page.locator(Selector.AUTOCOMPLETE_INPUT).click();
		await page
			.locator(Selector.DROPDOWN_ITEM)
			.filter({ has: page.getByText("VF Corporation") })
			.click();
		await expect(page.getByText("Edit relationship")).toBeVisible();

		// Cancel the form — previous selection (Crompton Corp.) should be preserved
		await page.getByRole("button", { name: "Cancel" }).click();
		await expect(page.locator(Selector.AUTOCOMPLETE_INPUT)).toHaveValue("Crompton Corp.");
	});

	test("link form submit updates selection", async ({ page }) => {
		await selectAndConfirm(page, "Crompton Corp.");
		await expect(page.locator(Selector.AUTOCOMPLETE_INPUT)).toHaveValue("Crompton Corp.");

		// Select a different item and submit the link form
		await page.locator(Selector.AUTOCOMPLETE_INPUT).click();
		await page
			.locator(Selector.DROPDOWN_ITEM)
			.filter({ has: page.getByText("VF Corporation") })
			.click();
		await expect(page.getByText("Edit relationship")).toBeVisible();
		await page.getByLabel("Manufacturing Site").clear();
		await page.getByLabel("Manufacturing Site").fill("Overseas");
		await page.getByRole("button", { name: "OK" }).click();

		await expect(page.locator(Selector.AUTOCOMPLETE_INPUT)).toHaveValue("VF Corporation");
	});

	test("rapid re-selection ends on the last chosen item", async ({ page }) => {
		await selectAndConfirm(page, "Crompton Corp.");
		await expect(page.locator(Selector.AUTOCOMPLETE_INPUT)).toHaveValue("Crompton Corp.");

		// Immediately select Enron Corp. — only Enron Corp. should remain selected
		await page.locator(Selector.AUTOCOMPLETE_INPUT).click();
		await page
			.locator(Selector.DROPDOWN_ITEM)
			.filter({ has: page.getByText("VF Corporation") })
			.click();
		await expect(page.getByText("Edit relationship")).toBeVisible();
		await page.getByLabel("Manufacturing Site").clear();
		await page.getByLabel("Manufacturing Site").fill("Overseas");
		await page.getByRole("button", { name: "OK" }).click();

		await expect(page.locator(Selector.AUTOCOMPLETE_INPUT)).toHaveValue("VF Corporation");
		// Open dropdown — Enron Corp. should be the selected item, confirming Crompton Corp.'s selection was replaced
		await page.locator(Selector.AUTOCOMPLETE_INPUT).click();
		await expect(
			page.locator(Selector.DROPDOWN_ITEM).filter({ has: page.getByText("VF Corporation") })
		).toHaveAttribute("aria-selected", "true");
	});

	test("clear button removes selection", async ({ page }) => {
		await selectAndConfirm(page, "Crompton Corp.");
		await expect(page.locator(Selector.AUTOCOMPLETE_INPUT)).toHaveValue("Crompton Corp.");

		await page.locator(Selector.CLEAR_BUTTON).click();
		await expect(page.locator(Selector.AUTOCOMPLETE_INPUT)).toHaveValue("");
	});
});

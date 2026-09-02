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

import { PWUtils, Selector, Showcase } from "../../support/utils.js";

test.describe.configure({ mode: "parallel" });

const DROPDOWN_HINT = "[data-role='dropdown-hint']";

test.describe("Stale autocomplete clearance", () => {
	test.describe("Product Bindings - 'is manufactured by' dropdown", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto(Showcase.PRODUCT_BINDINGS);
			await expect(page.getByText("List of products")).toBeVisible();
			await page.getByText("Bakezdi Shirt").click();
			await expect(page.getByText("Product", { exact: true })).toBeVisible();
		});

		test("clears stale dropdown items when text drops below min-search threshold (non-CDM)", async ({ page }) => {
			const searchInput = page.locator(Selector.AUTOCOMPLETE_INPUT);
			await searchInput.click();
			await searchInput.fill("Cin");

			await expect(page.locator(Selector.DROPDOWN_ITEM).first()).toBeVisible();

			await searchInput.fill("Ci");

			await expect(page.locator(Selector.DROPDOWN_ITEM)).toHaveCount(0);
			await expect(page.locator(DROPDOWN_HINT)).toBeVisible();
			await expect(page.locator(DROPDOWN_HINT)).toHaveText("Enter at least 3 characters");
		});

		test("hides Load More footer when text drops below min-search threshold", async ({ page }) => {
			const searchInput = page.locator(Selector.AUTOCOMPLETE_INPUT);
			await searchInput.click();
			await searchInput.fill("Cin");

			await expect(page.locator(Selector.DROPDOWN_ITEM).first()).toBeVisible();

			await searchInput.fill("Ci");

			await expect(page.getByText("Load More")).not.toBeVisible();
			await expect(page.locator(DROPDOWN_HINT)).toBeVisible();
		});
	});

	test.describe("Contract CDM - Policy Holder dropdown", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto(Showcase.CONTRACT_CDM);
			await expect(page.getByText("ContractCDM Overview")).toBeVisible();
			await page.getByText("mgm technology partners GmbH").first().click();
			await expect(page.getByText("Simple CDM Prototype")).toBeVisible();
			await page.locator(Selector.CONTENT_BOX_HEADER).getByRole("link", { name: "Policy Holder" }).click();
		});

		test("clears stale dropdown items when text drops below min-search threshold (CDM)", async ({ page }) => {
			const textLinePolicyHolder = PWUtils.selectTextFieldByLabel(page, "Policy Holder");
			await expect(textLinePolicyHolder).toBeVisible();

			const searchInput = textLinePolicyHolder.locator("input");
			await searchInput.click();
			await searchInput.fill("Ama");

			await expect(page.locator(Selector.DROPDOWN_ITEM).first()).toBeVisible();

			await searchInput.fill("Am");

			await expect(page.locator(Selector.DROPDOWN_ITEM)).toHaveCount(0);
			await expect(page.locator(DROPDOWN_HINT)).toBeVisible();
		});
	});
});

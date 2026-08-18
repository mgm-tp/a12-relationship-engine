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

import { PWUtils, Selector, Showcase } from "../support/utils";

test.describe.configure({ mode: "parallel" });

const DROPDOWN_HINT = "[data-role='dropdown-hint']";

test.describe("Min search length", () => {
	test.describe("Product bindings - 'is manufactured by' dropdown", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto(Showcase.PRODUCT_BINDINGS);
			await expect(page.getByText("List of products")).toBeVisible();
			await page.getByText("Adilette Cloudfoam Slides").first().click();
			await expect(page.getByText("Product", { exact: true })).toBeVisible();
		});

		test("should show min search length hint when typing below the limit", async ({ page }) => {
			const searchInput = page.locator("[data-role='autocomplete'] input");
			await searchInput.click();

			// Type less than 3 characters (minSearchableTokenSize = 3)
			await searchInput.fill("ab");

			const hint = page.locator(DROPDOWN_HINT);
			await expect(hint).toBeVisible();
			await expect(hint).toHaveText("Enter at least 3 characters");
		});

		test("should not show candidates when typing below the limit", async ({ page }) => {
			const searchInput = page.locator("[data-role='autocomplete'] input");
			await searchInput.click();

			await searchInput.fill("ab");

			await expect(page.locator(DROPDOWN_HINT)).toBeVisible();
			await expect(page.locator("[data-role='dropdown-item']")).toHaveCount(0);
		});

		test("should not show Load More footer when typing below the limit", async ({ page }) => {
			const searchInput = page.locator("[data-role='autocomplete'] input");
			await searchInput.click();

			await searchInput.fill("ab");

			await expect(page.locator(DROPDOWN_HINT)).toBeVisible();
			await expect(page.getByText("Load More")).not.toBeVisible();
		});

		test("should show normal result count hint when typing enough characters", async ({ page }) => {
			const searchInput = page.locator("[data-role='autocomplete'] input");
			await searchInput.click();

			// Type exactly 3 characters (meets the minSearchableTokenSize)
			await searchInput.fill("Pum");

			const hint = page.locator(DROPDOWN_HINT);
			await expect(hint).toBeVisible();
			await expect(hint).not.toHaveText("Enter at least 3 characters");
		});

		test("should block search request when below the limit", async ({ page }) => {
			const searchRequests: unknown[] = [];

			await page.route("**/api/v2/rpc", async (route) => {
				const postData = route.request().postDataJSON();
				const items = Array.isArray(postData) ? postData : [postData];
				for (const item of items) {
					if (item.id?.startsWith("search_candidates_")) {
						searchRequests.push(item);
					}
				}
				await route.continue();
			});

			const searchInput = page.locator("[data-role='autocomplete'] input");
			await searchInput.click();
			await searchInput.fill("ab");

			// Wait a bit for any potential request to be made
			await page.waitForTimeout(1000);

			expect(searchRequests).toHaveLength(0);
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

		test("should show min search length hint when typing below the limit", async ({ page }) => {
			const textLinePolicyHolder = PWUtils.selectTextlineByLabel(page, "Policy Holder");
			await expect(textLinePolicyHolder).toBeVisible();

			const searchInput = textLinePolicyHolder.locator("input");
			await searchInput.click();
			await searchInput.fill("ab");

			const hint = page.locator(DROPDOWN_HINT);
			await expect(hint).toBeVisible();
			await expect(hint).toHaveText("Enter at least 3 characters");
		});

		test("should show normal result count hint when typing enough characters", async ({ page }) => {
			const textLinePolicyHolder = PWUtils.selectTextlineByLabel(page, "Policy Holder");
			await expect(textLinePolicyHolder).toBeVisible();

			const searchInput = textLinePolicyHolder.locator("input");
			await searchInput.click();
			await searchInput.fill("Ama");

			const hint = page.locator(DROPDOWN_HINT);
			await expect(hint).toBeVisible();
			await expect(hint).not.toHaveText("Enter at least 3 characters");
		});
	});
});

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

import { seed } from "../../support/command.js";
import { Selector, Showcase } from "../../support/utils.js";

test.describe.configure({ mode: "parallel" });

test.describe("Product bindings", () => {
	test.beforeAll(seed);
	test.beforeEach(async ({ page }) => {
		await page.goto(Showcase.PRODUCT_BINDINGS);
		await expect(page.getByText("List of products")).toBeVisible();
		await page.getByText("Bel Shoes").click();
		await expect(page.getByText("Product", { exact: true })).toBeVisible();
	});

	test.describe("Create a new product and link to a brand by using the Save button", () => {
		test("The candidate and link list should be loaded properly (A12RE-178)", async ({ page }) => {
			await page.getByRole("button", { name: "Add", exact: true }).click();
			await expect(page.getByText("Please select variant")).toBeVisible();
			await page.locator(`${Selector.MODAL_OVERLAY}`).getByText("Product").click();

			await expect(page.getByRole("form")).toBeVisible();
			await page.getByLabel("Brand (Dual)").click();
			await page.locator(`input[id^='a12-name']`).fill("New Product");

			const brandName = "VF Corporation";
			const candidates = page.locator(Selector.CONTENT_BOX).filter({ hasText: "List all brands" }).last();
			const candidate = candidates.locator(Selector.TABLE_BODY_ROW).filter({ hasText: brandName }).first();
			await expect(candidate.getByRole("button")).not.toBeDisabled();
			await candidate.locator(Selector.BUTTON).click();

			await expect(page.getByText("Edit relationship")).toBeVisible();
			await page.getByLabel("Manufacturing Site").fill("local");
			await page.getByRole("button", { name: "OK" }).click();

			const links = page.locator(Selector.CONTENT_BOX).filter({ hasText: "Selected Items" }).last();
			const link = links.locator(Selector.TABLE_BODY_ROW).filter({ hasText: brandName }).first();
			await expect(link).toBeVisible();

			await page.getByRole("button", { name: "Save" }).click();

			// after saving, "VF Corporation" should be disabled in the list candidate, and visible in list link
			await expect(candidate.getByRole("button")).toBeDisabled();
			await expect(link).toBeVisible();
			await expect(link).toContainText("local");

			await page.getByRole("button", { name: "Commit" }).click();
			await expect(page.getByRole("form")).not.toBeVisible();

			await page.getByPlaceholder("Search").fill("New Product");
			await page.getByRole("button", { name: "Search", exact: true }).click();
			await expect(page.getByText("New Product", { exact: true }).first()).toBeVisible();
		});
	});
});

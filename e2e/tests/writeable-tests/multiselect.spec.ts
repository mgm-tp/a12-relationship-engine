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
import { Showcase } from "../../support/utils.js";

test.describe("Product Tags multiselect", () => {
	test.beforeAll(seed);
	test.beforeEach(async ({ page }) => {
		await page.goto(Showcase.PRODUCT_BINDINGS);
		await expect(page.getByText("List of products")).toBeVisible();
		await page.getByText("Bel Shoes").click();
		await expect(page.getByText("Product", { exact: true })).toBeVisible();
	});

	test("Selecting a multiselect value persists after Save/Commit/reload (A12RE-304)", async ({ page }) => {
		const saveButton = page.getByRole("button", { name: "Save" });
		await expect(saveButton).toBeDisabled();

		await page.getByRole("checkbox", { name: "Electronics" }).check();

		await expect(saveButton).not.toBeDisabled();
		await saveButton.click();
		await page.getByRole("button", { name: "Commit" }).click();
		await expect(page.getByRole("form")).not.toBeVisible();

		await page.getByText("Bel Shoes").click();
		await expect(page.getByText("Product", { exact: true })).toBeVisible();
		await expect(page.getByRole("checkbox", { name: "Electronics" })).toBeChecked();
	});

	test("Deselecting all multiselect values persists as empty after Save/Commit/reload (A12RE-304)", async ({
		page
	}) => {
		await page.getByRole("checkbox", { name: "Electronics" }).check();
		await page.getByRole("checkbox", { name: "Furniture" }).check();
		await page.getByRole("button", { name: "Save" }).click();
		await page.getByRole("button", { name: "Commit" }).click();
		await expect(page.getByRole("form")).not.toBeVisible();

		await page.getByText("Bel Shoes").click();
		await expect(page.getByText("Product", { exact: true })).toBeVisible();
		await expect(page.getByRole("checkbox", { name: "Electronics" })).toBeChecked();
		await expect(page.getByRole("checkbox", { name: "Furniture" })).toBeChecked();

		await page.getByRole("checkbox", { name: "Electronics" }).uncheck();
		await page.getByRole("checkbox", { name: "Furniture" }).uncheck();
		await page.getByRole("button", { name: "Save" }).click();
		await page.getByRole("button", { name: "Commit" }).click();
		await expect(page.getByRole("form")).not.toBeVisible();

		await page.getByText("Bel Shoes").click();
		await expect(page.getByText("Product", { exact: true })).toBeVisible();
		await expect(page.getByRole("checkbox", { name: "Electronics" })).not.toBeChecked();
		await expect(page.getByRole("checkbox", { name: "Furniture" })).not.toBeChecked();
	});
});

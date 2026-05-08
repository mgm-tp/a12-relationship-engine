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

import { expect, test, type Page } from "@playwright/test";

import { Selector, Showcase } from "../../../support/utils";

test.describe("Category bindings - no link document", () => {
	let counter = 1; // used for recording har per test
	test.beforeEach(async ({ page }) => {
		await page.routeFromHAR(`hars/categories/no-link-document-${counter++}.har`, {
			update: false,
			url: "http://localhost:17000/api/v2/rpc"
		});
		await page.goto(Showcase.CATEGORY_BINDINGS);
		await expect(page.getByText("List of categories")).toBeVisible();
	});

	test("Add link by Dual Pane should work", async ({ page }) => {
		await page.getByText("Cat 1").click();
		await expect(page.getByText("Category", { exact: true })).toBeVisible();

		await linkToSubCategory(page, "Cat 2");
		await page.getByRole("button", { name: "Commit" }).click();
		await expect(page.getByRole("form")).not.toBeVisible();
	});

	test.describe("Add new category with link, then commit (A12RE-161)", () => {
		test("should work", async ({ page }) => {
			await addNewCategoryWithoutLink(page, "Cat3SubCategory");

			await page.getByRole("button", { name: "Add" }).click();
			await expect(page.getByRole("form")).toBeVisible();
			await page.locator("#a12-name-F1").fill("Cat 3");

			await linkToSubCategory(page, "Cat3SubCategory");

			await page.getByRole("button", { name: "Commit" }).click();
			await expect(page.getByRole("form")).not.toBeVisible();
			await expect(page.getByText("Cat 3", { exact: true }).first()).toBeVisible();
		});
	});

	test.describe("Add new category and save, then add link and commit", () => {
		test("should work", async ({ page }) => {
			await addNewCategoryWithoutLink(page, "Cat4SubCategory");

			await page.getByRole("button", { name: "Add" }).click();
			await expect(page.getByRole("form")).toBeVisible();
			await page.locator("#a12-name-F1").fill("Cat 4");
			await page.locator("#a12-name-F1").blur();
			await page.getByRole("button", { name: "Save" }).click();
			await expect(page.locator(Selector.PROGRESS_INDICATOR)).toBeVisible();

			await expect(page.locator(Selector.PROGRESS_INDICATOR)).not.toBeVisible();
			await linkToSubCategory(page, "Cat4SubCategory");

			await page.getByRole("button", { name: "Commit" }).click();
			await expect(page.getByRole("form")).not.toBeVisible();
			await expect(page.getByText("Cat 4", { exact: true }).first()).toBeVisible();
		});
	});
});

async function addNewCategoryWithoutLink(page: Page, categoryName: string) {
	await page.getByRole("button", { name: "Add" }).click();
	await expect(page.getByRole("form")).toBeVisible();
	await page.locator("#a12-name-F1").fill(categoryName);
	await page.getByRole("button", { name: "Commit" }).click();
	await expect(page.getByRole("form")).not.toBeVisible();
	await expect(page.getByText(categoryName, { exact: true }).first()).toBeVisible();
}

async function linkToSubCategory(page: Page, subCategoryName: string) {
	const candidates = page.locator(Selector.CONTENT_BOX).filter({ hasText: "Available Elements" }).last();
	const candidate = candidates.locator(Selector.TABLE_BODY_ROW).filter({ hasText: subCategoryName }).first();
	await candidate.locator(Selector.BUTTON).click();

	const links = page.locator(Selector.CONTENT_BOX).filter({ hasText: "Selected Elements" }).last();
	const link = links.locator(Selector.TABLE_BODY_ROW).filter({ hasText: subCategoryName }).first();
	await expect(link).toBeVisible();
}

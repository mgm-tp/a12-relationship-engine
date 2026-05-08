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

import { expect, test } from "@playwright/test";

import { Selector, Showcase } from "../../../support/utils";

test.describe.configure({ mode: "parallel" });

test.describe("Brand bindings", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(Showcase.BRAND_BINDINGS);
		await expect(page.getByText("List of brands")).toBeVisible();
		await page.getByText("New Balance").click();
		await expect(page.getByRole("heading", { name: "Brand", exact: true })).toBeVisible();
	});

	test("TableList", async ({ page }) => {
		await page.getByLabel("Product (List)").click();

		await page.getByRole("button", { name: "Edit" }).click();
		const overlayContentBoxSelector = `${Selector.MODAL_OVERLAY} ${Selector.CONTENT_BOX}`;
		await expect(page.locator(overlayContentBoxSelector).getByText("Edit relationship")).toBeVisible();

		const candidates = page.locator(overlayContentBoxSelector).filter({ hasText: "Available Elements" }).last();
		await candidates.locator(Selector.TABLE_HEADER_CELL).filter({ hasText: "Name" }).first().click();
		await expect(candidates).toContainText("A4 5000 pieces");
		await candidates
			.locator(Selector.TABLE_BODY_ROW)
			.filter({ hasText: "A4 5000 pieces" })
			.locator(Selector.BUTTON)
			.click();

		await expect(page.getByText("Additional properties")).toBeVisible();
		await page.getByLabel("Manufacturing Site").fill("local");
		await page.getByRole("button", { name: "OK" }).click();

		const links = page.locator(overlayContentBoxSelector).filter({ hasText: "Selected Elements" }).last();
		await expect(links.locator(Selector.TABLE_HEADER_ROW).last().locator(Selector.TABLE_HEADER_CELL).nth(5)).toHaveText(
			"Document Model Reference"
		);
		await expect(links.locator(Selector.TABLE_BODY_ROW).filter({ hasText: "A4 5000 pieces" })).toBeVisible();
		// Column Document Model Reference should has data "Product-document"
		await expect(
			links
				.locator(Selector.TABLE_BODY_ROW)
				.filter({ hasText: "A4 5000 pieces" })
				.locator(Selector.TABLE_BODY_CELL)
				.nth(5)
		).toHaveText("Product-document");

		await candidates.locator(Selector.PAGINATION).getByRole("combobox").selectOption("5 / 8");
		await expect(candidates).toContainText("Running shoes");
		await candidates
			.locator(Selector.TABLE_BODY_ROW)
			.filter({ hasText: "Running shoes" })
			.locator(Selector.BUTTON)
			.click();
		await expect(page.getByText("Additional properties")).toBeVisible();
		await page.getByLabel("Manufacturing Site").fill("www.running-shoes.com");
		await page.getByRole("button", { name: "OK" }).click();
		await expect(links.locator(Selector.TABLE_BODY_ROW).filter({ hasText: "Running shoes" })).toBeVisible();
		// Column Document Model Reference should has data "Bundle-document"
		await expect(
			links
				.locator(Selector.TABLE_BODY_ROW)
				.filter({ hasText: "Running shoes" })
				.locator(Selector.TABLE_BODY_CELL)
				.nth(5)
		).toHaveText("Bundle-document");

		// Close DualPane and check data in the TableList
		await page.getByRole("button", { name: "OK" }).click();
		await expect(page.getByText("Edit relationship")).not.toBeVisible();

		// Column Creator should has data "anonymous"
		await expect(page.locator(Selector.TABLE_HEADER_ROW).last().locator(Selector.TABLE_HEADER_CELL).nth(4)).toHaveText(
			"Creator"
		);
		await expect(
			page
				.locator(Selector.TABLE_BODY_ROW)
				.filter({ hasText: "Running shoes" })
				.locator(Selector.TABLE_BODY_CELL)
				.nth(4)
		).toContainText("anonymous");
		await expect(
			page
				.locator(Selector.TABLE_BODY_ROW)
				.filter({ hasText: "A4 5000 pieces" })
				.locator(Selector.TABLE_BODY_CELL)
				.nth(4)
		).toContainText("anonymous");

		// Column Created At should has data
		await expect(page.locator(Selector.TABLE_HEADER_ROW).last().locator(Selector.TABLE_HEADER_CELL).nth(5)).toHaveText(
			"Created At"
		);
		await expect(
			page
				.locator(Selector.TABLE_BODY_ROW)
				.filter({ hasText: "Running shoes" })
				.locator(Selector.TABLE_BODY_CELL)
				.nth(5)
		).not.toBeEmpty();
		await expect(
			page
				.locator(Selector.TABLE_BODY_ROW)
				.filter({ hasText: "A4 5000 pieces" })
				.locator(Selector.TABLE_BODY_CELL)
				.nth(5)
		).not.toBeEmpty();
	});
});

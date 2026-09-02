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

import { seed } from "../../../support/command";
import { Selector, Showcase } from "../support/utils";

test.describe.configure({ mode: "parallel" });

test.describe("Standalone Relationship Engine", () => {
	test.beforeAll(seed);
	test.beforeEach(async ({ page }) => {
		await page.goto(Showcase.STANDALONE_RELATIONSHIP);
		await expect(page.getByText("List of products")).toBeVisible();
	});

	test("When press the Add button", async ({ page }) => {
		await page.getByRole("button", { name: "Add" }).click();
		await expect(page.getByText("Please select variant")).toBeVisible();
		await page.locator(`${Selector.MODAL_OVERLAY}`).getByText("Product").click();
		await expect(page.getByText("Standalone Relationship Engine")).toBeVisible();
		// Note: cannot create by this way because the required fields of the product are not filled
	});

	test("Add link to existing document should work as the relationship in form", async ({ page }) => {
		await page.getByText("Bim Kit").click();
		await expect(page.getByText("Standalone Relationship Engine")).toBeVisible();

		const candidates = page.locator(Selector.CONTENT_BOX).filter({ hasText: "Available Elements" }).last();
		const candidate = candidates.locator(Selector.TABLE_BODY_ROW).filter({ hasText: "VF Corporation" });
		await expect(candidate.getByRole("button")).not.toBeDisabled();
		await candidate.locator(Selector.BUTTON).click();

		await expect(page.getByText("Edit relationship")).toBeVisible();
		await page.getByLabel("Manufacturing Site").fill("local");
		await page.getByRole("button", { name: "OK" }).click();

		const links = page.locator(Selector.CONTENT_BOX).filter({ hasText: "Selected Elements" }).last();
		const link = links.locator(Selector.TABLE_BODY_ROW).filter({ hasText: "VF Corporation" });
		await expect(link).toBeVisible();
		await expect(candidate.getByRole("button")).toBeDisabled();

		await page.getByRole("button", { name: "Save" }).click();
		await expect(page.getByText("Standalone Relationship Engine")).not.toBeVisible();

		// reload to see the link is added
		await page.getByText("Bim Kit").click();
		await expect(page.getByText("Standalone Relationship Engine")).toBeVisible();
		await expect(candidate.getByRole("button")).toBeDisabled();
		await expect(link).toBeVisible();
		await page.getByRole("button", { name: "Cancel" }).click();

		// check with the brand showcase
		await page.locator(Selector.MENU_ITEM, { hasText: "Relationships" }).click();
		await page.locator(Selector.MENU_ITEM, { hasText: "Form" }).click();
		await page.locator(Selector.MENU_ITEM, { hasText: "Brand" }).click();
		await expect(page.getByText("List of brands")).toBeVisible();
		await page.getByPlaceholder("Search").fill("VF Corporation");
		await page.getByRole("button", { name: "Search", exact: true }).click();
		await expect(page.locator(Selector.PROGRESS_INDICATOR)).toBeHidden();
		await page.getByText("VF Corporation", { exact: true }).click();
		await expect(page.getByText("Brand", { exact: true })).toBeVisible();
		await expect(
			page
				.locator(Selector.CONTENT_BOX)
				.filter({ hasText: "Selected products" })
				.locator(Selector.TABLE_BODY_ROW)
				.filter({ hasText: /Bim Kit.*74.*local/ })
		).toBeVisible();
	});
});

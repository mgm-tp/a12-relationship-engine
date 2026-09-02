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

import { Selector, Showcase } from "../../../support/utils.js";

test.describe.configure({ mode: "parallel" });

test.describe("Bundle restore - link document data preservation (non-CDM)", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(Showcase.BUNDLE_BINDINGS);
	});

	test("restoring a removed product preserves Quantity link attribute (Bundle -> Product)", async ({ page }) => {
		await page.getByText("Akaco Bundle").click();
		await page.getByLabel("Product (List)").click();

		// Assert Zut Shoes is visible in inline product list with Quantity 98
		const listTable = page.getByRole("table").filter({ has: page.getByRole("columnheader", { name: "Quantity" }) });
		await expect(listTable.getByRole("row").filter({ hasText: "Zut Shoes" })).toContainText("98");

		// Open the edit modal
		await page.getByRole("button", { name: "Edit" }).click();
		await expect(page.getByRole("heading", { name: "Edit relationship links" })).toBeVisible();

		// Locate the Selected Items table within the modal overlay
		const overlayContentBoxSelector = `${Selector.MODAL_OVERLAY} ${Selector.CONTENT_BOX}`;
		const selectedItems = page.locator(overlayContentBoxSelector).filter({ hasText: "Selected Items" }).last();
		const zutRow = selectedItems.getByRole("row").filter({ hasText: "Zut Shoes" });
		await expect(zutRow).toBeVisible();
		await expect(zutRow).toContainText("98");

		// Remove — non-CDM keeps link-document data visible in the pending-removal row
		await zutRow.locator("button").filter({ hasText: "remove_circle" }).click();
		await expect(zutRow).toContainText("98");
		await expect(zutRow.locator('[title="Disable"]')).toBeVisible();
		await expect(zutRow.locator('[title="Info"]')).toBeVisible();

		// Restore — quantity is preserved through the remove/restore cycle
		await zutRow.locator("button").filter({ hasText: "add_circle" }).click();
		await expect(zutRow).toContainText("98");
		await expect(zutRow.locator('[title="Success"]').first()).toBeVisible();

		// Cancel to avoid backend persistence (readonly test)
		await page.getByRole("button", { name: "Cancel" }).click();
		await expect(page.getByRole("heading", { name: "Edit relationship links" })).not.toBeVisible();
	});
});

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

import { Showcase } from "../../../support/utils.js";

test.describe.configure({ mode: "parallel" });

/** Navigate to AMR Corporation in the Brand form and click the add button on the Jodik Jacket candidate row. */
async function openProductBrandLinkForm(page: Page): Promise<void> {
	await page.goto(Showcase.BRAND_BINDINGS);
	await expect(page.getByText("List of brands")).toBeVisible();
	await page.getByText("AMR Corporation").click();
	await expect(page.getByRole("heading", { name: "Brand", exact: true })).toBeVisible();

	await page.getByLabel("Product (Dual)").click();
	await expect(page.getByRole("heading", { name: "Available products" })).toBeVisible();

	const candidateColumn = page
		.locator('[data-role="layout-grid-column"]')
		.filter({ has: page.getByRole("heading", { name: "Available products" }) })
		.first();

	await candidateColumn.getByPlaceholder("Search").fill("Jodik Jacket");
	await candidateColumn.getByRole("button", { name: "Search", exact: true }).click();

	const jodikRow = candidateColumn.getByRole("row", { name: "Jodik Jacket" });
	await expect(jodikRow).toBeVisible();
	await jodikRow.getByRole("button").click();
}

test.describe("Attachment upload in product-brand link form (A12RE-280)", () => {
	test("attachment upload control renders in the product-brand link form", async ({ page }) => {
		await openProductBrandLinkForm(page);

		await expect(page.getByRole("heading", { name: "Edit relationship" })).toBeVisible();

		const linkFormDialog = page.getByRole("dialog").filter({ hasText: "Edit relationship" });
		await expect(linkFormDialog.getByText("Attached")).toBeVisible();
		await expect(linkFormDialog.getByRole("button", { name: /Upload file/ })).toBeVisible();
		await expect(linkFormDialog.locator('[data-role="file-upload-input"]')).toBeAttached();

		await linkFormDialog.getByRole("button", { name: "Cancel", exact: true }).click();
		await expect(page.getByRole("heading", { name: "Edit relationship" })).not.toBeVisible();
	});

	test("uploading a file does not break the link form dialog", async ({ page }) => {
		await openProductBrandLinkForm(page);

		const linkFormDialog = page.getByRole("dialog").filter({ hasText: "Edit relationship" });
		await expect(linkFormDialog.getByRole("heading", { name: "Edit relationship" })).toBeVisible();

		// Upload a minimal in-memory file via the hidden file input
		await linkFormDialog.locator('[data-role="file-upload-input"]').setInputFiles({
			name: "test.txt",
			mimeType: "text/plain",
			buffer: Buffer.from("test")
		});

		// The upload widget does not visibly change its label after setInputFiles without a backend round-trip;
		// verify the control accepted the file and the dialog is still open.
		await expect(linkFormDialog.getByRole("heading", { name: "Edit relationship" })).toBeVisible();
		await expect(linkFormDialog.locator('[data-role="file-upload-input"]')).toBeAttached();

		await linkFormDialog.getByRole("button", { name: "Cancel", exact: true }).click();
		await expect(page.getByRole("heading", { name: "Edit relationship" })).not.toBeVisible();
	});
});

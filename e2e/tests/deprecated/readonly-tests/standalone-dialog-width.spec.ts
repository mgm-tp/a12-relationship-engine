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

import { Selector, Showcase } from "../support/utils";

test.describe.configure({ mode: "parallel" });

test.describe("Brand Product (List) — edit dialog width", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(Showcase.BRAND_BINDINGS);
		await expect(page.getByText("List of brands")).toBeVisible();
		await page.getByText("AMR Corporation").click();
		await expect(page.getByRole("heading", { name: "Brand", exact: true })).toBeVisible();
	});

	// editDialogWidth "900px" in TableList props, no editDialogMaxWidth
	// maxWidth should fall back to editDialogWidth when editDialogMaxWidth is absent.
	// viewport 1600px > 900px → dialog must be capped at 900px
	test("TableList editDialog uses editDialogWidth as maxWidth fallback when editDialogMaxWidth is absent", async ({
		page
	}) => {
		await page.setViewportSize({ width: 1600, height: 900 });

		await page.getByLabel("Product (List)").click();
		await page.getByRole("button", { name: "Edit" }).click();

		const overlayContentBox = `${Selector.MODAL_OVERLAY} ${Selector.CONTENT_BOX}`;
		await expect(page.locator(overlayContentBox).getByText("Edit relationship")).toBeVisible();

		const dialog = page.locator(Selector.MODAL_OVERLAY).filter({ hasText: "Edit relationship" }).locator("> *").first();

		expect((await dialog.boundingBox())?.width).toEqual(900);
	});
});

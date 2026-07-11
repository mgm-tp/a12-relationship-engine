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

test.describe.skip("Customize sorting by componentProvider", () => {
	test.beforeEach(async ({ page }) => {
		await page.routeFromHAR("hars/contract-custom-sorting/list-document.har", {
			update: false,
			url: "http://localhost:17000/api/v2/rpc"
		});
		await page.goto(Showcase.CONTRACT_CUSTOM_SORTING);
		await expect(page.getByText("Contract Overview")).toBeVisible();
		await page.getByRole("row").getByText("german").click();
	});

	test("should work with DualPane", async ({ page }) => {
		await page.getByText("Co-Insured (Dual)").click();
		await expect(page.getByText("Customized DualPane - Selected items are sorted DESC")).toBeVisible();

		const dualPaneLinks = page.getByRole("form").getByRole("table").nth(1);
		await expect(dualPaneLinks.getByRole("row").nth(1).getByRole("cell").nth(1)).toHaveText("Sundar Pichai");
		await expect(dualPaneLinks.getByRole("row").nth(2).getByRole("cell").nth(1)).toHaveText("Amazon.com");
	});

	test("should work with TableList its edit component", async ({ page }) => {
		await page.getByText("Co-Insured (TableList)").click();
		await expect(page.getByText("Customized TableList - Selected items are sorted DESC")).toBeVisible();

		const tableList = page.getByRole("form").getByRole("table").last();
		await expect(tableList.getByRole("row").nth(1).getByRole("cell").nth(0)).toHaveText("Sundar Pichai");
		await expect(tableList.getByRole("row").nth(2).getByRole("cell").nth(0)).toHaveText("Amazon.com");

		await page.getByRole("button", { name: "Edit" }).click();
		await expect(page.getByText("Edit relationship")).toBeVisible();
		await expect(page.getByText("Customized DualPane - Selected items are sorted DESC")).toBeVisible();

		const modalOverlay = page.locator(`${Selector.MODAL_OVERLAY} ${Selector.CONTENT_BOX}`);

		const candidates = modalOverlay.filter({ has: page.getByText("Available Items") }).last();
		await expect(candidates).toBeVisible();

		const links = modalOverlay.filter({ has: page.getByText("Selected items") }).last();
		await expect(links).toBeVisible();
		await expect(links.getByRole("row").nth(1).getByRole("cell").nth(1)).toHaveText("Sundar Pichai");
		await expect(links.getByRole("row").nth(2).getByRole("cell").nth(1)).toHaveText("Amazon.com");
	});
});

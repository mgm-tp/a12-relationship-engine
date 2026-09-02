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

import { Selector, Showcase } from "../../support/utils.js";

test.describe.configure({ mode: "parallel" });

test.describe("Dialog close-on-outside-click", () => {
	test("EditDualPaneDialog closes when clicking outside (CDM)", async ({ page }) => {
		await page.goto(Showcase.CONTRACT_CDM);
		await page.getByText("mgm technology partners GmbH").click();
		await expect(page.getByText("Simple CDM Prototype")).toBeVisible();

		const coInsuredTable = page
			.getByRole("table")
			.filter({ has: page.getByRole("columnheader", { name: "Co-insured since" }) });
		await expect(coInsuredTable.getByText("Sundar Pichai")).toBeVisible();
		await expect(coInsuredTable.getByText("Amazon.com")).toBeVisible();

		await page.getByRole("button", { name: "Edit CoInsurer" }).click();
		await expect(page.getByRole("heading", { name: "Edit relationship" })).toBeVisible();

		await page.locator(Selector.MODAL_OVERLAY).click({ position: { x: 5, y: 5 } });
		await expect(page.getByRole("heading", { name: "Edit relationship" })).not.toBeVisible();

		await expect(coInsuredTable.getByText("Sundar Pichai")).toBeVisible();
		await expect(coInsuredTable.getByText("Amazon.com")).toBeVisible();
	});

	test("VariantSelectionDialog closes when clicking outside", async ({ page }) => {
		await page.goto(Showcase.CONTRACT_CDM);
		await page.getByText("mgm technology partners GmbH").click();
		await expect(page.getByText("Simple CDM Prototype")).toBeVisible();

		await page.getByRole("button", { name: "Add CoInsurer" }).click();
		await expect(page.getByText("Please select variant")).toBeVisible();

		await page.locator(Selector.MODAL_OVERLAY).click({ position: { x: 5, y: 5 } });
		await expect(page.getByText("Please select variant")).not.toBeVisible();
	});

	test("EditDualPaneDialog closes when clicking outside (non-CDM)", async ({ page }) => {
		await page.goto(Showcase.BRAND_BINDINGS);
		await expect(page.getByText("List of brands")).toBeVisible();
		await page.getByText("AMR Corporation").click();
		await expect(page.getByRole("heading", { name: "Brand", exact: true })).toBeVisible();

		await page.getByLabel("Product (List)").click();
		await page.getByRole("button", { name: "Edit" }).click();
		await expect(page.getByRole("heading", { name: "Edit relationship" })).toBeVisible();

		await page.locator(Selector.MODAL_OVERLAY).click({ position: { x: 5, y: 5 } });
		await expect(page.getByRole("heading", { name: "Edit relationship" })).not.toBeVisible();
	});
});

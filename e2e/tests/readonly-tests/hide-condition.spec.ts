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

import { Showcase } from "../../support/utils.js";

test.describe.configure({ mode: "parallel" });

test.describe("hideCondition", () => {
	test.describe("Dropdown Selection", () => {
		test("should hide the Dropdown Selection when the hide condition is met", async ({ page }) => {
			await page.goto(Showcase.BUSINESS_PARTNER);
			await expect(page.getByText("Business Partner Overview")).toBeVisible();

			await page.getByText("Sundar Pichai").click();
			await expect(page.getByText("Natural Person")).toBeVisible();

			await expect(page.getByText("Postal Address", { exact: true })).toBeVisible();

			await page.getByRole("checkbox", { name: "no address required" }).check();

			await expect(page.getByText("Postal Address", { exact: true })).toBeHidden();
		});
	});
	test.describe("Dual Pane Selection", () => {
		test("should hide the Dual Pane Selection when the hide condition is met", async ({ page }) => {
			await page.goto(Showcase.BUSINESS_PARTNER);
			await expect(page.getByText("Business Partner Overview")).toBeVisible();

			await page.getByText("Sundar Pichai").click();
			await expect(page.getByText("Natural Person")).toBeVisible();

			await page.getByText("Locations (Dual)").click();

			await expect(page.getByText("Address overview")).toBeVisible();

			await page.getByText("Postal address (Single)").click();

			await page.getByRole("checkbox", { name: "no address required" }).check();

			await page.getByText("Locations (Dual)").click();
			await expect(page.getByText("Address overview")).toBeHidden();
		});
	});
	test.describe("Table List", () => {
		test("should hide the Table List when the hide condition is met", async ({ page }) => {
			await page.goto(Showcase.CONTRACT_CDM);
			await expect(page.getByText("ContractCDM Overview")).toBeVisible();

			await page.getByText("mgm technology partners GmbH").click();
			await expect(page.getByText("Simple CDM Prototype")).toBeVisible();

			await expect(page.getByText("Sundar Pichai")).toBeVisible();

			await page.getByRole("checkbox", { name: "hide co-insurers" }).check();

			await expect(page.getByText("Sundar Pichai")).toBeHidden();
		});
	});
});

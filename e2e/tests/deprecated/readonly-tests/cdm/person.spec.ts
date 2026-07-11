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

import { Showcase } from "../../support/utils";

test.describe("Natural Person CDM", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(Showcase.BUSINESS_PARTNER_CDM);
	});

	test("should open existing person and have dependency computation run correctly", async ({ page }) => {
		await expect(page.getByText("Business Partner CDM Overview")).toBeVisible();
		await page.getByText("Sundar Pichai").click();
		await expect(page.getByText("Natural Person CDM")).toBeVisible();

		await expect(page.locator("select[id^='a12-GenderPreProcessing']")).toHaveValue("1");
		await expect(page.locator("select[id^='a12-Gender-include']")).toHaveValue("1");

		await page.getByText("Mark Zuckerberg").click();
		await expect(page.getByText("Natural Person CDM")).toBeVisible();

		await expect(page.locator("select[id^='a12-GenderPreProcessing']")).toHaveValue("");
		await expect(page.locator("select[id^='a12-Gender-include']")).toHaveValue("");
	});
});

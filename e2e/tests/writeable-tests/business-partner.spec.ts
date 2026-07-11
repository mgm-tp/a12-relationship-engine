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

import { seed } from "../../support/command.js";
import { Selector, Showcase } from "../../support/utils.js";

test.describe.configure({ mode: "serial" });

test.describe("Business Partner CDM", () => {
	test.beforeAll(seed);
	test.beforeEach(async ({ page }) => {
		await page.goto(Showcase.BUSINESS_PARTNER_CDM);
	});

	test("Add new Legal Entity CDM", async ({ page }) => {
		await page.getByRole("button", { name: "Add" }).click();
		await expect(page.getByText("Please select variant")).toBeVisible();
		await page.getByText("Legal Entity").click();

		await expect(page.getByText("Legal Entity CDM")).toBeVisible();
		await page.locator(`input[id^='a12-id']`).fill("BDY3476");
		await page.locator(`input[id^='a12-name']`).fill("John Doe");
		await page.locator(`input[id^='a12-register']`).fill("123456");

		await page.getByLabel("Legal Entity CDM").getByRole("button", { name: "Save" }).click();

		// Verify the new entry appears in the overview table
		const overview = page.getByRole("table", { name: /Business Partner CDM Overview/ });
		await expect(overview.getByRole("row").filter({ hasText: "John Doe" }).first()).toBeVisible();
	});

	test("Add a new company location to mgm technology partners", async ({ page }) => {
		await expect(page.getByText("Business Partner CDM Overview")).toBeVisible();
		await page.getByRole("cell", { name: "mgm technology partners GmbH" }).click();

		const form = page.getByRole("form", { name: "Legal Entity CDM" });
		await expect(form).toBeVisible();

		// Click "Add" in the Company Locations section (first Add in the form, before the Notes Add)
		await form.getByRole("button", { name: "Add" }).first().click();

		await form.getByRole("textbox", { name: "Country" }).fill("Vietnam");
		await form.getByRole("textbox", { name: "City" }).fill("Da Nang");
		await form.getByRole("textbox", { name: "Street" }).fill("71 Quang Trung");
		await form.getByRole("textbox", { name: "Number" }).fill("1");

		// Commit the child Address form
		await form.getByRole("button", { name: "Commit" }).click();

		// Submit the Legal Entity CDM form
		await form.getByRole("button", { name: "Save" }).click();

		// Reopen mgm technology partners form and verify the new location
		await page.getByRole("cell", { name: "mgm technology partners GmbH" }).click();
		await expect(form).toBeVisible();

		await expect(page.getByRole("row").filter({ hasText: "Vietnam" })).toBeVisible();
		await expect(page.getByRole("row").filter({ hasText: "Da Nang" })).toBeVisible();
	});

	test("CRUD CDM links without duplicated allowed", async ({ page }) => {
		await expect(page.getByText("Business Partner CDM Overview")).toBeVisible();
		await page.getByText("Mark Zuckerberg").click();
		await expect(page.getByText("Natural Person CDM")).toBeVisible();

		await page.getByRole("button", { name: "Edit", exact: true }).click(); //Edit/Add link to company location
		await expect(page.locator(`${Selector.MODAL_OVERLAY}`)).toBeVisible();

		// Left panel is labeled "Address Overview" (the candidate overview title), right is "Selected Elements"
		const candidates = page.locator(Selector.CONTENT_BOX).filter({ hasText: "Address Overview" }).last();
		await expect(candidates).toBeVisible();
		const links = page.locator(Selector.CONTENT_BOX).filter({ hasText: "Selected Items" }).last();
		await expect(links).toBeVisible();

		// "Hacker Way" is already linked, so it should NOT appear in visible candidates (no-duplicate mode)
		const candidateRow1 = candidates.getByRole("row").filter({ hasText: "Machtlfinger" });
		await expect(candidateRow1).toBeVisible();
		await expect(candidateRow1.locator("button")).toBeEnabled();

		// Verify "Hacker Way" is in the selected links
		const linkRow1 = links.getByRole("row").filter({ hasText: "Hacker Way" });
		await expect(linkRow1).toBeVisible();

		// Remove "Hacker Way" from links — it becomes disabled/struck-through, not hidden
		await linkRow1.locator("button").filter({ hasText: "remove_circle" }).click();

		// Add "Machtlfinger" to links
		await candidateRow1.locator("button").click();
		await expect(links.getByRole("row").filter({ hasText: "Machtlfinger" })).toBeVisible();

		await page.getByRole("button", { name: "OK" }).click();

		await expect(page.getByText("Machtlfinger")).toHaveCount(1);
	});

	test("Document graph merges documents correctly", async ({ page }) => {
		await expect(page.getByText("Business Partner CDM Overview")).toBeVisible();
		await page.getByText("Mark Zuckerberg").click();
		await expect(page.getByText("Natural Person CDM")).toBeVisible();

		// Wait for the autocomplete input to be visible and clear it
		const screen = page.locator("div[data-role='screen']");
		const autocompleteInput = page.locator("div[data-role='autocomplete'] input");
		const attachedPortal = page.locator("div[data-role='attached-portal']");

		await expect(autocompleteInput).toBeVisible();
		await expect(autocompleteInput).toHaveValue("Hacker Way");

		await autocompleteInput.click();

		await expect(attachedPortal).toBeVisible();
		await expect(attachedPortal.getByText("Markt")).toBeVisible();
		await attachedPortal.getByRole("option", { name: "Markt" }).click();

		await expect(autocompleteInput).toHaveValue("Markt");

		await autocompleteInput.click();

		await expect(attachedPortal.getByText("Hacker Way")).toBeVisible();
		await attachedPortal.getByRole("option", { name: "Hacker Way" }).click();

		await expect(screen.locator("div[data-role='messagebox']")).not.toBeVisible();
	});
});

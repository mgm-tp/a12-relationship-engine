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

test.describe("Contract CDM - Edit CoInsurer Links", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(Showcase.CONTRACT_CDM);
	});

	async function openMgmContract(page: Page) {
		await page.getByText("mgm technology partners GmbH").click();
		await expect(page.getByText("Simple CDM Prototype")).toBeVisible();
	}

	async function openEditCoInsurerModal(page: Page) {
		await page.getByRole("button", { name: "Edit CoInsurer" }).click();
		await expect(page.getByRole("heading", { name: "Edit relationship" })).toBeVisible();
	}

	function candidatesTable(page: Page) {
		return page.getByRole("table", { name: /Available Items/ });
	}

	function selectedTableInModal(page: Page) {
		return page.getByRole("dialog").getByRole("table", { name: /Selected items/ });
	}

	test("adds a co-insurer link via Edit CoInsurer modal", async ({ page }) => {
		await openMgmContract(page);

		const coInsuredTable = page
			.getByRole("table")
			.filter({ has: page.getByRole("columnheader", { name: "Co-insured since" }) });
		await expect(coInsuredTable.getByText("Sundar Pichai")).toBeVisible();
		await expect(coInsuredTable.getByText("Amazon.com")).toBeVisible();

		await openEditCoInsurerModal(page);

		// Pick the first non-disabled candidate
		const candidateRow = candidatesTable(page).getByRole("row").filter({ hasText: "Mark Zuckerberg" });
		await expect(candidateRow).toBeVisible();
		await candidateRow.getByRole("button").click();

		await page.getByRole("textbox", { name: "Co-insured since" }).fill("05/08/2024");
		await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();

		// Verify candidate now appears in Selected Elements within the modal
		await expect(selectedTableInModal(page).getByText("Mark Zuckerberg")).toBeVisible();

		await page.getByRole("button", { name: "OK" }).click();
		await expect(page.getByRole("heading", { name: "Edit relationship" })).not.toBeVisible();

		// Form's co-insured table should now include the new link alongside the originals
		await expect(coInsuredTable.getByText("Mark Zuckerberg")).toBeVisible();
		await expect(coInsuredTable.getByText("Sundar Pichai")).toBeVisible();
		await expect(coInsuredTable.getByText("Amazon.com")).toBeVisible();
	});

	test("removes a co-insurer link via Edit CoInsurer modal", async ({ page }) => {
		await openMgmContract(page);

		const coInsuredTable = page
			.getByRole("table")
			.filter({ has: page.getByRole("columnheader", { name: "Co-insured since" }) });
		await expect(coInsuredTable.getByText("Sundar Pichai")).toBeVisible();
		await expect(coInsuredTable.getByText("Amazon.com")).toBeVisible();

		await openEditCoInsurerModal(page);

		// Remove "Sundar Pichai" from Selected Elements
		const sundarRow = selectedTableInModal(page).getByRole("row").filter({ hasText: "Sundar Pichai" });
		await expect(sundarRow).toBeVisible();
		await sundarRow.locator("button").filter({ hasText: "remove_circle" }).click();

		await page.getByRole("button", { name: "OK" }).click();
		await expect(page.getByRole("heading", { name: "Edit relationship" })).not.toBeVisible();

		// Form's co-insured table should no longer include Sundar Pichai
		await expect(coInsuredTable.getByText("Sundar Pichai")).not.toBeVisible();
		await expect(coInsuredTable.getByText("Amazon.com")).toBeVisible();
	});

	test("restores a removed co-insurer link via Edit CoInsurer modal", async ({ page }) => {
		await openMgmContract(page);

		const coInsuredTable = page
			.getByRole("table")
			.filter({ has: page.getByRole("columnheader", { name: "Co-insured since" }) });
		await expect(coInsuredTable.getByText("Sundar Pichai")).toBeVisible();

		await openEditCoInsurerModal(page);

		const sundarRow = selectedTableInModal(page).getByRole("row").filter({ hasText: "Sundar Pichai" });
		await expect(sundarRow).toBeVisible();

		// Remove the link — delete_link button should disappear, restore_link should appear
		await sundarRow.locator("button").filter({ hasText: "remove_circle" }).click();
		await expect(sundarRow.locator("button").filter({ hasText: "add_circle" })).toBeVisible();
		await expect(sundarRow.locator("button").filter({ hasText: "remove_circle" })).not.toBeVisible();

		// Restore the link — restore_link button should disappear, delete_link should reappear
		await sundarRow.locator("button").filter({ hasText: "add_circle" }).click();
		await expect(sundarRow.locator("button").filter({ hasText: "remove_circle" })).toBeVisible();
		await expect(sundarRow.locator("button").filter({ hasText: "add_circle" })).not.toBeVisible();

		// Confirm — Sundar Pichai should still be in the co-insured table
		await page.getByRole("button", { name: "OK" }).click();
		await expect(page.getByRole("heading", { name: "Edit relationship" })).not.toBeVisible();
		await expect(coInsuredTable.getByText("Sundar Pichai")).toBeVisible();
	});

	test("adds and removes links in a single edit session", async ({ page }) => {
		await openMgmContract(page);

		const coInsuredTable = page
			.getByRole("table")
			.filter({ has: page.getByRole("columnheader", { name: "Co-insured since" }) });
		await expect(coInsuredTable.getByText("Sundar Pichai")).toBeVisible();
		await expect(coInsuredTable.getByText("Amazon.com")).toBeVisible();

		await openEditCoInsurerModal(page);

		// Remove "Amazon.com" from Selected Elements
		const amazonRow = selectedTableInModal(page).getByRole("row").filter({ hasText: "Amazon.com" });
		await amazonRow.locator("button").filter({ hasText: "remove_circle" }).click();

		// Add the first available candidate
		const candidateRow = candidatesTable(page).getByRole("row").filter({ hasText: "Mark Zuckerberg" });
		await candidateRow.getByRole("button").click();

		await page.getByRole("textbox", { name: "Co-insured since" }).fill("05/08/2024");
		await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();

		await page.getByRole("button", { name: "OK" }).click();
		await expect(page.getByRole("heading", { name: "Edit relationship" })).not.toBeVisible();

		// Form should reflect both changes
		await expect(coInsuredTable.getByText("Mark Zuckerberg")).toBeVisible();
		await expect(coInsuredTable.getByText("Sundar Pichai")).toBeVisible();
		await expect(coInsuredTable.getByText("Amazon.com")).not.toBeVisible();
	});

	test("persists added co-insurer after saving new contract", async ({ page }) => {
		// Create a fresh contract to avoid polluting existing data
		await page.getByRole("button", { name: "Add" }).click();
		await expect(page.getByText("Simple CDM Prototype")).toBeVisible();

		// Add a child CDM co-insurer (Natural Person)
		await page.getByRole("button", { name: "Add CoInsurer" }).click();
		await page.getByText("Natural Person").click();
		await expect(page.getByText("Natural Person CDM")).toBeVisible();

		await page.getByRole("textbox", { name: "First name" }).fill("Alice");
		await page.getByRole("textbox", { name: "Last name" }).fill("Smith");
		await page.getByRole("form", { name: "Natural Person CDM" }).getByRole("button", { name: "Save" }).click();
		await expect(page.getByRole("form", { name: "Natural Person CDM" })).not.toBeVisible({ timeout: 10000 });

		const coInsuredTable = page
			.getByRole("table")
			.filter({ has: page.getByRole("columnheader", { name: "Co-insured since" }) });
		await expect(coInsuredTable.getByRole("row").nth(1)).toBeVisible();

		// Now use Edit CoInsurer to add another link from existing candidates
		await openEditCoInsurerModal(page);

		const candidateRow = candidatesTable(page).getByRole("row").filter({ hasText: "Mark Zuckerberg" });
		await expect(candidateRow).toBeVisible();
		await candidateRow.getByRole("button").click();
		await page.getByRole("textbox", { name: "Co-insured since" }).fill("05/08/2024");
		await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();

		await page.getByRole("button", { name: "OK" }).click();
		await expect(page.getByRole("heading", { name: "Edit relationship" })).not.toBeVisible();

		// Both the child CDM co-insurer and the linked candidate should be visible
		await expect(coInsuredTable.getByText("Alice")).toBeVisible();
		await expect(coInsuredTable.getByText("Mark Zuckerberg")).toBeVisible();
	});

	test("cancel button on the edit dialog", async ({ page }) => {
		await openMgmContract(page);

		const coInsuredTable = page
			.getByRole("table")
			.filter({ has: page.getByRole("columnheader", { name: "Co-insured since" }) });
		await expect(coInsuredTable.getByText("Sundar Pichai")).toBeVisible();
		await expect(coInsuredTable.getByText("Amazon.com")).toBeVisible();

		await openEditCoInsurerModal(page);

		const candidateRow = candidatesTable(page).getByRole("row").filter({ hasText: "Mark Zuckerberg" });
		await candidateRow.getByRole("button").click();
		await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();

		await expect(selectedTableInModal(page).getByRole("row").filter({ hasText: "Mark Zuckerberg" })).toBeVisible();

		await page.getByRole("button", { name: "Cancel" }).click();

		await expect(selectedTableInModal(page)).not.toBeVisible();

		await expect(coInsuredTable.getByText("Sundar Pichai")).toBeVisible();
		await expect(coInsuredTable.getByText("Amazon.com")).toBeVisible();
		await expect(coInsuredTable.getByText("Mark Zuckerberg")).not.toBeVisible();

		// No dirty dialog should be shown since changes were cancelled
		await page.getByRole("button", { name: "Cancel" }).click();
		await expect(page.getByText("Simple CDM Prototype")).not.toBeVisible();
	});
});

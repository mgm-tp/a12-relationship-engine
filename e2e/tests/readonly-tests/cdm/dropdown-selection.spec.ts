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

import { Showcase, Selector } from "../../../support/utils.js";

test.describe.configure({ mode: "parallel" });

test.describe("Dropdown selection — CDM (ContractCDM Policy Holder)", () => {
	const ADD_DOCUMENT_BUTTON = `button[title='Add Policy Holder']`;
	test.beforeEach(async ({ page }) => {
		await page.goto(Showcase.CONTRACT_CDM);
		await expect(page.getByText("ContractCDM Overview")).toBeVisible();
		// Click the first contract row to open the CDM form
		await page
			.getByRole("row")
			.filter({ hasNot: page.getByRole("columnheader") })
			.first()
			.click();
		await page.locator(`[aria-label='Edit Policy Holder']`).click();
		await expect(page.locator(ADD_DOCUMENT_BUTTON)).toBeVisible();
	});

	// Scope to the Policy Holder autocomplete by its label text, then target the combobox inside
	function policyHolderInput(page: Page) {
		return page.locator("[data-role='autocomplete']").filter({ hasText: "Policy Holder" }).getByRole("combobox");
	}

	async function selectPolicyHolder(page: Page): Promise<string> {
		// Open the Policy Holder dropdown and pick the first available item.
		// Read the selected value from the input (not textContent) to avoid icon text ("check") prefix.
		const input = policyHolderInput(page);
		await input.click();
		const firstItem = page.locator(Selector.DROPDOWN_ITEM).first();
		await expect(firstItem).toBeVisible();
		await firstItem.click();
		// Wait for the input to reflect the selection
		await expect(input).not.toHaveValue("");

		return input.inputValue();
	}

	test("add document button preserves existing selection", async ({ page }) => {
		const selected = await selectPolicyHolder(page);
		expect(selected).not.toBe("");

		const autocomplete = policyHolderInput(page);
		await expect(autocomplete).toHaveValue(selected);

		// Click "Add document" button — a variant selection dialog opens
		await page.locator(ADD_DOCUMENT_BUTTON).click();
		const variantDialog = page.getByRole("dialog");
		await expect(variantDialog).toBeVisible();

		// Close the dialog without selecting a variant
		await variantDialog.getByRole("button").click();
		await expect(variantDialog).not.toBeVisible();

		// Selection must still be the original item after closing the dialog
		await expect(autocomplete).toHaveValue(selected);
	});

	test("add document creates new business partner visible in dropdown", async ({ page }) => {
		const firstName = "Test";
		const lastName = "Partner E2E";
		const partnerName = `${firstName} ${lastName}`;

		// Click "Add document" — a variant selection dialog opens
		await page.locator(ADD_DOCUMENT_BUTTON).click();
		const variantDialog = page.getByRole("dialog");
		await expect(variantDialog).toBeVisible();

		// Select "Natural Person" variant
		await variantDialog.getByText("Natural Person").click();
		const naturalPersonForm = page.getByRole("form", { name: "Natural Person CDM" });
		await expect(naturalPersonForm).toBeVisible();

		// Fill in the first and last name of the new business partner
		await naturalPersonForm.getByLabel("First name").fill(firstName);
		await naturalPersonForm.getByLabel("Last name").fill(lastName);

		// Save the child form
		await naturalPersonForm.getByRole("button", { name: "Save" }).click();

		// The parent form returns and the new partner is auto-selected
		await expect(page.locator(ADD_DOCUMENT_BUTTON)).toBeVisible();
		await expect(policyHolderInput(page)).toHaveValue(partnerName);

		// Open the dropdown and verify the new item appears as selected
		await policyHolderInput(page).click();
		await expect(page.locator(Selector.DROPDOWN_ITEM).filter({ has: page.getByText(partnerName) })).toHaveAttribute(
			"aria-selected",
			"true"
		);
	});

	test("cancel new document preserves already selected item", async ({ page }) => {
		// First establish a selection
		const selected = await selectPolicyHolder(page);
		expect(selected).not.toBe("");

		// Click "Add document" — a variant selection dialog opens
		await page.locator(ADD_DOCUMENT_BUTTON).click();
		const variantDialog = page.getByRole("dialog");
		await expect(variantDialog).toBeVisible();

		// Select "Natural Person" variant — a child form opens
		await variantDialog.getByText("Natural Person").click();
		const naturalPersonForm = page.getByRole("form", { name: "Natural Person CDM" });
		await expect(naturalPersonForm).toBeVisible();

		// Fill in a name but cancel — simulates a user who started adding but changed their mind
		await naturalPersonForm.getByLabel("First name").fill("Abandoned");

		// Cancel the child form — an "Unsaved changes" confirmation appears
		await naturalPersonForm.getByRole("button", { name: "Cancel" }).click();
		await page.getByRole("button", { name: "Discard changes" }).click();

		// The parent form returns with the original selection intact
		await expect(page.locator(ADD_DOCUMENT_BUTTON)).toBeVisible();
		await expect(policyHolderInput(page)).toHaveValue(selected);
	});
});

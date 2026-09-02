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

import { test, expect, type Page, type Locator } from "@playwright/test";

import { PWUtils, Selector, Showcase } from "../../support/utils";

test.describe.configure({ mode: "parallel" });

// CDM's Policy Holder field has no separate "edit relationship" link-metadata form (unlike the
// non-CDM Product bindings). Its equivalent form interaction is the "Edit Policy Holder" child
// screen, which edits the linked Legal Entity CDM document whose Name is also the value shown
// in the Policy Holder dropdown.
test.describe("Contract CDM - Policy Holder dropdown editability (A12-19100 / A12RE-303)", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(Showcase.CONTRACT_CDM);
		await expect(page.getByText("ContractCDM Overview")).toBeVisible();
		await page.getByText("mgm technology partners GmbH").click();
		await expect(page.getByText("Simple CDM Prototype")).toBeVisible();
		await page.locator(Selector.CONTENT_BOX_HEADER).getByRole("link", { name: "Policy Holder" }).click();
	});

	const policyHolderInput = (page: Page): Locator =>
		PWUtils.selectTextlineByLabel(page, "Policy Holder").locator("input");

	const openDropdown = (page: Page) => policyHolderInput(page).click();

	const selectPolicyHolder = async (page: Page, name: string) => {
		await openDropdown(page);
		await PWUtils.selectDropDown(page, name).click();
	};

	const openEditPolicyHolderForm = async (page: Page): Promise<Locator> => {
		await page.getByText("Edit Policy Holder").click();

		return page.locator(Selector.CONTENT_BOX).filter({ hasText: "Legal Entity CDM" }).last();
	};

	test("clicking the dropdown does not clear the current selection", async ({ page }) => {
		const input = policyHolderInput(page);
		await selectPolicyHolder(page, "Amazon.com");
		await expect(input).toHaveValue("Amazon.com");

		await openDropdown(page);
		await expect(page.locator(Selector.DROPDOWN_TEXT).first()).toBeVisible();

		await expect(input).toHaveValue("Amazon.com");
	});

	test("cancelling the Edit Policy Holder form preserves the existing selection", async ({ page }) => {
		const input = policyHolderInput(page);
		await expect(input).toHaveValue("mgm technology partners GmbH");

		const legalEntityScreen = await openEditPolicyHolderForm(page);
		await expect(legalEntityScreen).toBeVisible();
		await legalEntityScreen.getByRole("textbox", { name: "Name" }).fill("Renamed Corp");
		await legalEntityScreen.getByRole("button", { name: "Cancel" }).click();
		await page.getByRole("button", { name: "Discard Changes" }).click();

		await expect(legalEntityScreen).toHaveCount(0);
		await expect(input).toHaveValue("mgm technology partners GmbH");
	});

	test("submitting the Edit Policy Holder form updates the selection", async ({ page }) => {
		const input = policyHolderInput(page);
		await expect(input).toHaveValue("mgm technology partners GmbH");

		const legalEntityScreen = await openEditPolicyHolderForm(page);
		await expect(legalEntityScreen).toBeVisible();
		await legalEntityScreen.getByRole("textbox", { name: "Name" }).fill("Renamed Corp");
		await legalEntityScreen.getByRole("button", { name: "Save" }).click();

		await expect(input).toHaveValue("Renamed Corp");
	});

	test("re-selecting a different candidate ends on the last chosen item", async ({ page }) => {
		const input = policyHolderInput(page);

		await selectPolicyHolder(page, "Amazon.com");
		await expect(input).toHaveValue("Amazon.com");

		await selectPolicyHolder(page, "Mark Zuckerberg");

		await expect(input).toHaveValue("Mark Zuckerberg");
	});

	test("the clear button removes the selection", async ({ page }) => {
		const input = policyHolderInput(page);
		await selectPolicyHolder(page, "Amazon.com");
		await expect(input).toHaveValue("Amazon.com");

		await PWUtils.selectTextlineByLabel(page, "Policy Holder").locator("button[aria-label='Clear text']").click();

		await expect(input).toHaveValue("");
	});

	test("typing after selecting an item keeps the typed text (A12-19100)", async ({ page }) => {
		const input = policyHolderInput(page);
		await selectPolicyHolder(page, "Amazon.com");
		await expect(input).toHaveValue("Amazon.com");

		await input.click();
		await input.press("End");
		await input.pressSequentially("test123", { delay: 150 });

		await expect(input).toHaveValue("Amazon.comtest123");
		await page.waitForTimeout(2500);
		await expect(input).toHaveValue("Amazon.comtest123");
	});
});

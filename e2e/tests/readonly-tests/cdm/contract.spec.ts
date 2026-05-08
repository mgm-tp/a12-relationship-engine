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

import { expect, test } from "@playwright/test";

import { PWUtils, Selector, Showcase } from "../../../support/utils";

test.describe.configure({ mode: "parallel" });

test.describe("Contract SCDM", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(Showcase.CONTRACT_CDM);
	});

	test.skip("Add a child CDM", async ({ page }) => {
		await page.getByRole("button", { name: "Add" }).click();
		await expect(page.getByText("Simple CDM Prototype")).toBeVisible();

		await page.getByRole("button", { name: "Add CoInsurer" }).click();
		await page.getByText("Natural Person").click();

		await expect(page.getByText("Natural Person CDM")).toBeVisible();
		await page.locator(`input[id^='a12-firstName']`).fill("John");
		await page.locator(`input[id^='a12-lastName']`).fill("Doe");
		await page.locator(`input[id='a12-fieldbasedrepeatoverviewcolumn-962cf-cell-0']`).fill("09/18/2025");

		await page.locator(`[data-role='autocomplete'] input`).click();
		await page
			.locator(`[data-role='dropdown-item']`)
			.filter({ has: page.getByText("Markt") })
			.click();

		await expect(page.locator(`input[id^='a12-country']`)).toHaveValue("Germany");

		await page.getByLabel("Natural Person CDM").getByRole("button", { name: "Save" }).click();

		await expect(page.getByText("John Doe")).toBeVisible();
	});

	test("CRUD CDM links with duplicated allowed", async ({ page }) => {
		await expect(page.getByText("ContractCDM Overview")).toBeVisible();
		await page.getByText("mgm technology partners GmbH").click();
		await expect(page.getByText("Simple CDM Prototype")).toBeVisible();
		await page.getByRole("button", { name: "Edit CoInsurer" }).click();

		const modalOverlay = page.locator(`${Selector.MODAL_OVERLAY} ${Selector.CONTENT_BOX}`);
		await expect(modalOverlay).toHaveCount(3); // the modal itself is also a contentbox
		const candidates = modalOverlay.filter({ has: page.getByText("Available Elements") }).last();
		await expect(candidates).toBeVisible();
		const links = modalOverlay.filter(byText("Selected Elements")).last();
		await expect(links).toBeVisible();

		const candidateRow1 = candidates.getByRole("row").filter(byText("facebook"));
		await expect(candidateRow1).toBeVisible();
		await expect(candidateRow1.locator("button")).toBeEnabled();
		const candidateRow2 = candidates.getByRole("row").filter(byText("amazon"));
		await expect(candidateRow2).toBeVisible();
		await expect(candidateRow2.locator("button")).not.toBeDisabled(); // duplicated is allowed => button is not disabled

		const linkRow1 = links.getByRole("row").filter(byText("amazon"));
		await expect(linkRow1).toBeVisible();
		await linkRow1.locator("button").click();
		await expect(candidateRow2.locator("button")).toBeEnabled();

		await candidateRow1.locator("button").click();
		await expect(links.getByRole("row").filter(byText("facebook"))).toBeVisible();
		await candidateRow1.locator("button").click(); // Add Mark Zuckerberg (facebook) 2 times

		await page.getByRole("button", { name: "OK" }).click();

		await expect(page.getByText("Mark Zuckerberg")).toHaveCount(2);

		// Fill data for link document field of each link
		await page.getByRole("row", { name: "Mark Zuckerberg" }).first().click();
		await expect(page.getByText("Natural Person CDM")).toBeVisible();
		const personCDMScreen = page.locator(Selector.CONTENT_BOX).filter({ hasText: "Natural Person CDM" }).last();
		await personCDMScreen.getByRole("textbox", { name: "Co-insured since" }).fill("07/01/2025");
		await personCDMScreen.getByRole("button", { name: "Save" }).click();

		await page.getByRole("row", { name: "Mark Zuckerberg" }).last().click();
		await expect(page.getByText("Natural Person CDM")).toBeVisible();
		await personCDMScreen.getByRole("textbox", { name: "Co-insured since" }).fill("07/15/2025");
		await personCDMScreen.getByRole("button", { name: "Save" }).click();

		await expect(page.getByText("Natural Person CDM")).not.toBeVisible();
		await expect(page.getByRole("row", { name: "Mark Zuckerberg" }).first()).toContainText("07/01/2025");
		await expect(page.getByRole("row", { name: "Mark Zuckerberg" }).last()).toContainText("07/15/2025");

		await page.getByRole("button", { name: "Cancel" }).click();
		await page.getByRole("button", { name: "Discard Changes" }).click();

		await expect(page.getByText("Simple CDM Prototype")).toHaveCount(0);

		function byText(text: string) {
			return { has: page.getByText(text) };
		}
	});

	test.describe("With Computation, when updating links", () => {
		test("should remove redundant computation field correctly", async ({ page }) => {
			await expect(page.getByText("ContractCDM Overview")).toBeVisible();
			await page.getByText("mgm technology partners GmbH").click();
			await expect(page.getByText("Simple CDM Prototype")).toBeVisible();
			await page.locator(Selector.CONTENT_BOX_HEADER).getByRole("link", { name: "Policy Holder" }).click();

			const textLinePolicyHolder = PWUtils.selectTextlineByLabel(page, "Policy Holder");
			await expect(textLinePolicyHolder).toBeVisible();
			await expect(textLinePolicyHolder.locator("input")).toHaveValue("mgm technology partners GmbH");
			await expect(page.locator("[id*=expressioncell_69784] ul li")).toHaveCount(6);

			await textLinePolicyHolder.locator("input").click();
			await PWUtils.selectDropDown(page, "Amazon.com").click();
			await expect(textLinePolicyHolder.locator("input")).toHaveValue("Amazon.com");
			await expect(page.locator("[id*=expressioncell_69784] ul li")).toHaveCount(1);
		});
	});
});

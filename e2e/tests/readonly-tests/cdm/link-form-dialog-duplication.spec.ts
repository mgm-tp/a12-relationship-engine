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

import { Selector, Showcase } from "../../../support/utils.js";

// Regression spec for A12RE-299, guarding against Screen.tsx portalling the same link form's
// RelationshipEngineLinkFormRegion once per concurrently mounted Screen. Mounts a second Screen
// (via the saved co-insurer's Natural Person CDM) before opening a link form, then asserts exactly
// one "Edit relationship" dialog exists. Uses "Sundar Pichai" / "Amazon.com" rather than
// "Mark Zuckerberg" so this spec stays independent of contract-edit-links.spec.ts:73, which already
// exercises "Mark Zuckerberg" on the same "mgm technology partners GmbH" contract under the
// `readonly` project's parallel workers (playwright.config.ts).

test.describe("LinkForm dialog duplication (A12RE-299)", () => {
	test("renders exactly one Edit relationship dialog with two RE Screens concurrently mounted", async ({ page }) => {
		const firstCoInsuredSince = uniqueDate(Date.now());

		await page.goto(Showcase.CONTRACT_CDM);
		await expect(page.getByText("ContractCDM Overview")).toBeVisible();
		await page.getByText("mgm technology partners GmbH").click();

		const parentForm = page.getByRole("form", { name: "Simple CDM Prototype" });
		await expect(parentForm).toBeVisible();

		await addAndSaveCoInsurer(page, "Sundar Pichai", firstCoInsuredSince);

		const coInsuredTable = page
			.getByRole("table")
			.filter({ has: page.getByRole("columnheader", { name: "Co-insured since" }) });
		const savedRow = coInsuredTable
			.getByRole("row")
			.filter({ hasText: "Sundar Pichai" })
			.filter({ hasText: firstCoInsuredSince });
		await expect(savedRow).toBeVisible({ timeout: 10000 });

		// Opens the freshly-saved candidate's Natural Person CDM as a sibling Screen; the parent
		// Screen stays mounted because MasterDetailRegionLayoutNG never clears it (see PLAN.md).
		await savedRow.click();

		const childForm = page.getByRole("form", { name: "Natural Person CDM" });
		await expect(childForm).toBeVisible({ timeout: 10000 });

		// Precondition: two RE Screens are concurrently mounted before we open the second link form.
		await expect(parentForm).toBeVisible();
		await expect(page.locator(Selector.SCREEN)).toHaveCount(2);

		await openCoInsurerLinkForm(page, parentForm, "Amazon.com");

		const linkFormDialogs = page
			.getByRole("dialog")
			.filter({ has: page.getByRole("textbox", { name: "Co-insured since" }) });
		await expect(linkFormDialogs).toHaveCount(1, { timeout: 10000 });

		// Structural cross-check independent of accessible-name resolution: matches on raw text
		// content rather than ARIA role/name, so it still catches duplicate mounts even if a
		// duplicate-id collision (as in the original A12RE-299 regression) breaks accessible names.
		// "Additional Properties" (the link form's dynamic-fields section title, see
		// showcase/resources/models/scdm/CoInsurer-LinkForm.json) is required alongside
		// "Co-insured since" because contentbox nests recursively and the still-open "Edit
		// relationship links" picker dialog also mentions "Co-insured since" as a column header;
		// without this discriminator the picker's outer and nested contentboxes would be
		// double-counted as if they were extra link-form mounts.
		const linkFormContentBoxes = page
			.locator(`${Selector.MODAL_OVERLAY} ${Selector.CONTENT_BOX}`)
			.filter({ hasText: "Co-insured since" })
			.filter({ hasText: "Additional Properties" });
		await expect(linkFormContentBoxes).toHaveCount(1, { timeout: 10000 });
	});
});

function uniqueDate(seed: number): string {
	const month = String((seed % 12) + 1).padStart(2, "0");
	const day = String((seed % 28) + 1).padStart(2, "0");
	const year = String(1990 + (seed % 30));

	return `${month}/${day}/${year}`;
}

async function addAndSaveCoInsurer(page: Page, candidateName: string, coInsuredSince: string): Promise<void> {
	await openCoInsurerLinkForm(page, page.getByRole("form", { name: "Simple CDM Prototype" }), candidateName);

	await page.getByRole("textbox", { name: "Co-insured since" }).fill(coInsuredSince);
	await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();

	const links = page
		.locator(`${Selector.MODAL_OVERLAY} ${Selector.CONTENT_BOX}`)
		.filter({ has: page.getByText("Selected items") })
		.last();
	await expect(
		links.getByRole("row").filter({ hasText: candidateName }).filter({ hasText: coInsuredSince })
	).toBeVisible({
		timeout: 10000
	});

	await page.getByRole("button", { name: "OK" }).click();
}

async function openCoInsurerLinkForm(page: Page, form: Locator, candidateName: string): Promise<void> {
	await form.getByRole("button", { name: "Edit CoInsurer" }).click();

	const modalOverlay = page.locator(`${Selector.MODAL_OVERLAY} ${Selector.CONTENT_BOX}`);
	const candidates = modalOverlay.filter({ has: page.getByText("Available Items") }).last();
	await expect(candidates).toBeVisible();

	const candidateRow = candidates.getByRole("row").filter({ hasText: candidateName });
	await expect(candidateRow).toBeVisible();
	await candidateRow.locator("button").click();
}

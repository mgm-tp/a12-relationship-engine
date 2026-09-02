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

test.describe("Candidate exclusion/inclusion behavior", () => {
	test("shows already-linked products as disabled candidates (Brand -> Product)", async ({ page }) => {
		await page.goto(Showcase.BRAND_BINDINGS);
		await page.getByRole("row", { name: "AMR Corporation" }).click();

		await page.getByLabel("Product (Dual)").click();

		const availableProducts = page
			.locator('[data-role="layout-grid-column"]')
			.filter({ has: page.getByRole("heading", { name: "Available products" }) });

		// Search for the already-linked product to guarantee it surfaces regardless of page ordering
		await availableProducts.getByPlaceholder("Search").fill("Busahziz Jacket");
		await availableProducts.getByRole("button", { name: "Search", exact: true }).click();

		// Already-linked product must appear as a disabled candidate (exclude mode shows it but blocks adding)
		const linkedRow = availableProducts.getByRole("row", { name: "Busahziz Jacket" });
		await expect(linkedRow).toBeVisible();
		await expect(linkedRow.getByRole("button")).toBeDisabled();
		await expect(linkedRow.locator('[title="Disable"]')).toBeVisible();

		// Search for an unlinked product and verify its add button is enabled
		await availableProducts.getByPlaceholder("Search").fill("Jodik Jacket");
		await availableProducts.getByRole("button", { name: "Search", exact: true }).click();
		const unlinkedRow = availableProducts.getByRole("row", { name: "Jodik Jacket" });
		await expect(unlinkedRow).toBeVisible();
		await expect(unlinkedRow.getByRole("button")).toBeEnabled();
	});

	test("shows already-linked products with enabled add buttons (Bundle -> Product)", async ({ page }) => {
		await page.goto(Showcase.BUNDLE_BINDINGS);
		await page.getByRole("row", { name: "Akaco Bundle" }).click();

		await page.getByLabel("Product (Dual)").click();

		const availableItems = page
			.locator('[data-role="layout-grid-column"]')
			.filter({ has: page.getByRole("heading", { name: "Available Items" }) });

		// Search for the already-linked product (may not be on page 1)
		await availableItems.getByPlaceholder("Search").fill("Zut Shoes");
		await availableItems.getByRole("button", { name: "Search", exact: true }).click();

		// Already-linked product must still appear in candidates
		const alreadyLinkedRow = availableItems.getByRole("row", { name: "Zut Shoes" });
		await expect(alreadyLinkedRow).toBeVisible();

		// Its add button must be enabled (duplicates are allowed)
		await expect(alreadyLinkedRow.getByRole("button")).toBeEnabled();
	});

	test("shows already-linked co-insurers with enabled add buttons (ContractCDM)", async ({ page }) => {
		await page.goto(Showcase.CONTRACT_CDM);
		await page.getByRole("row", { name: "mgm technology partners GmbH" }).click();
		await expect(page.getByText("Simple CDM Prototype")).toBeVisible();

		await page.getByRole("button", { name: "Edit CoInsurer" }).click();
		await expect(page.getByRole("heading", { name: "Edit relationship" })).toBeVisible();

		const candidatesTable = page.getByRole("table", { name: /Available Items/ });

		// Already-linked co-insurer must appear in the candidates list with an enabled button
		const amazonRow = candidatesTable.getByRole("row", { name: "Amazon.com" });
		await expect(amazonRow).toBeVisible();
		await expect(amazonRow.getByRole("button")).toBeEnabled();

		// An unlinked candidate must also have an enabled button
		const unlinkedRow = candidatesTable.getByRole("row", { name: "Mark Zuckerberg" });
		await expect(unlinkedRow).toBeVisible();
		await expect(unlinkedRow.getByRole("button")).toBeEnabled();

		await page.getByRole("button", { name: "Cancel" }).click();
		await expect(page.getByRole("heading", { name: "Edit relationship" })).not.toBeVisible();
	});

	test("shows already-linked locations with disabled add buttons and block icon (BusinessPartnerCDM)", async ({
		page
	}) => {
		await page.goto(Showcase.BUSINESS_PARTNER_CDM);
		await page.getByRole("row", { name: "mgm technology partners GmbH" }).click();

		// Open the Locations edit modal
		await page.getByRole("button", { name: "Edit" }).first().click();
		await expect(page.getByRole("heading", { name: "Edit relationship" })).toBeVisible();

		// Scope to the modal's candidates section (search input is outside the table element)
		const candidatesSection = page
			.locator(`${Selector.MODAL_OVERLAY} ${Selector.CONTENT_BOX}`)
			.filter({ hasText: "Address Overview" })
			.last();

		// Search for Taunusstrasse to guarantee visibility regardless of ordering
		await candidatesSection.getByPlaceholder("Search").fill("Taunusstrasse");
		await candidatesSection.getByRole("button", { name: "Search", exact: true }).click();
		const locationRow = candidatesSection.getByRole("row", { name: /Taunusstrasse/ });
		await expect(locationRow).toBeVisible();
		await expect(locationRow.getByRole("button")).toBeDisabled();

		// The "Disable" block icon must be visible on the linked location row
		await expect(locationRow.locator("text=block")).toBeVisible();

		await page.getByRole("button", { name: "Cancel" }).click();
		await expect(page.getByRole("heading", { name: "Edit relationship" })).not.toBeVisible();
	});
});

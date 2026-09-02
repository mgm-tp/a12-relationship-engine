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

test.describe("Standalone Relationship Engine", () => {
	test.beforeAll(seed);
	test.beforeEach(async ({ page }) => {
		await page.goto(Showcase.STANDALONE_RELATIONSHIP);
		await expect(page.getByText("List of products")).toBeVisible();
	});

	test("When press the Add button and select Product variant", async ({ page }) => {
		await page.getByRole("button", { name: "Add" }).click();
		await expect(page.getByText("Please select variant")).toBeVisible();
		await page.locator(`${Selector.MODAL_OVERLAY}`).getByText("Product").click();
		await expect(page.getByText("Standalone Relationship Engine")).toBeVisible();
		// Note: cannot create by this way because the required fields of the product are not filled
	});

	test("When press the Add button and select Bundle variant", async ({ page }) => {
		await page.getByRole("button", { name: "Add" }).click();
		await expect(page.getByText("Please select variant")).toBeVisible();
		await page
			.locator(Selector.MODAL_OVERLAY)
			.locator('[data-role="tree-node"][data-tree-level="1"]')
			.getByText("Bundle")
			.click();
		await expect(page.getByText("Standalone Relationship Engine")).toBeVisible();
	});

	test("Opening an existing document should display the relationship section", async ({ page }) => {
		await page.getByText("Bel Shoes").click();
		await expect(page.getByText("Standalone Relationship Engine")).toBeVisible();
		await expect(page.getByText("is manufactured by")).toBeVisible();

		const candidates = page.locator(Selector.CONTENT_BOX).filter({ hasText: "List all brands" }).last();
		await expect(candidates).toBeVisible();
		const firstCandidateRow = candidates.locator(Selector.TABLE_BODY_ROW).first();
		await expect(firstCandidateRow).toBeVisible();
		await expect(candidates.getByRole("columnheader", { name: "Action" })).toBeVisible();
		await expect(firstCandidateRow.getByRole("button")).toBeVisible();

		const selectedItems = page.locator(Selector.CONTENT_BOX).filter({ hasText: "Selected Items" }).last();
		await expect(selectedItems).toBeVisible();
		await expect(selectedItems.getByText("SouthTrust Corp.")).toBeVisible();
	});

	test("Adding a second Brand link to a Product document is rejected (cardinality limit)", async ({ page }) => {
		await page.getByText("Bel Shoes").click();
		await expect(page.getByText("Standalone Relationship Engine")).toBeVisible();

		const selectedItems = page.locator(Selector.CONTENT_BOX).filter({ hasText: "Selected Items" }).last();
		await expect(selectedItems.getByText("SouthTrust Corp.")).toBeVisible();

		const candidates = page.locator(Selector.CONTENT_BOX).filter({ hasText: "List all brands" }).last();
		const candidate = candidates.locator(Selector.TABLE_BODY_ROW).filter({ hasText: "VF Corporation" });
		await expect(candidate.getByRole("button")).not.toBeDisabled();
		await candidate.locator(Selector.BUTTON).click();

		await expect(page.getByText("Edit relationship")).toBeVisible();
		await page.getByLabel("Manufacturing Site").fill("test-site");
		await page.getByRole("button", { name: "OK" }).click();

		const link = selectedItems.locator(Selector.TABLE_BODY_ROW).filter({ hasText: "VF Corporation" });
		await expect(link).toBeVisible();

		await page.getByRole("button", { name: "Save" }).click();

		await expect(page.getByText("Upper Limit Reached", { exact: true })).toBeVisible();
		await expect(
			page.getByText("Upper limit reached for role [Brand] in relationship model [ProductBrand]")
		).toBeVisible();

		// save was rejected: the form stays open on the document
		await expect(page.getByText("Standalone Relationship Engine")).toBeVisible();

		await page.getByRole("button", { name: "Cancel" }).click();
	});

	test("Add link to Bundle document and verify persistence", async ({ page }) => {
		await page.getByText("Bim Kit").click();
		await expect(page.getByText("Standalone Relationship Engine")).toBeVisible();

		const candidates = page.locator(Selector.CONTENT_BOX).filter({ hasText: "List all brands" }).last();
		const candidate = candidates.locator(Selector.TABLE_BODY_ROW).filter({ hasText: "VF Corporation" });
		await expect(candidate.getByRole("button")).not.toBeDisabled();
		await candidate.locator(Selector.BUTTON).click();

		await expect(page.getByText("Edit relationship")).toBeVisible();
		await page.getByLabel("Manufacturing Site").fill("test-site");
		await page.getByRole("button", { name: "OK" }).click();

		const selectedItems = page.locator(Selector.CONTENT_BOX).filter({ hasText: "Selected Items" }).last();
		const link = selectedItems.locator(Selector.TABLE_BODY_ROW).filter({ hasText: "VF Corporation" });
		await expect(link).toBeVisible();
		await expect(candidate.getByRole("button")).toBeDisabled();

		await page.getByRole("button", { name: "Save" }).click();
		await expect(page.getByText("Standalone Relationship Engine")).not.toBeVisible();

		// reload to verify the link persisted
		await page.getByText("Bim Kit").click();
		await expect(page.getByText("Standalone Relationship Engine")).toBeVisible();
		await expect(link).toBeVisible();
		await expect(candidate.getByRole("button")).toBeDisabled();
		await page.getByRole("button", { name: "Cancel" }).click();
	});
});

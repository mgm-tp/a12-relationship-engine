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

test.describe("Filter bar smoke tests (ContractCDM)", () => {
	test("filter panel opens and shows filter fields (ContractCDM)", async ({ page }) => {
		await page.goto(Showcase.CONTRACT_CDM);
		await expect(page.getByText("ContractCDM Overview")).toBeVisible();

		await page.getByRole("button", { name: "Open filter" }).click();

		const filterDialog = page.getByRole("dialog", { name: "Filter container" });
		await expect(filterDialog).toBeVisible();

		// Verify expected filter field labels are present
		await expect(filterDialog.getByText("Type").first()).toBeVisible();
		await expect(filterDialog.getByText("Fee").first()).toBeVisible();

		// Verify the "De/Select all" toggle is present
		await expect(filterDialog.getByText("De/Select all")).toBeVisible();

		await page.getByRole("button", { name: "Close filter" }).click();
		await expect(filterDialog).not.toBeVisible();
	});

	test("activating a Type filter reduces visible overview rows (ContractCDM)", async ({ page }) => {
		await page.goto(Showcase.CONTRACT_CDM);
		await expect(page.getByText("ContractCDM Overview")).toBeVisible();

		const overviewTable = page.getByRole("table", { name: /ContractCDM Overview/ });
		await expect(overviewTable).toBeVisible();

		// Verify both rows visible before filtering
		await expect(overviewTable.getByRole("row", { name: /german/ })).toBeVisible();
		await expect(overviewTable.getByRole("row", { name: /shallow/ })).toBeVisible();

		await page.getByRole("button", { name: "Open filter" }).click();
		const filterDialog = page.getByRole("dialog", { name: "Filter container" });
		await expect(filterDialog).toBeVisible();

		// Left panel: activate the Type filter field by clicking its [role="button"] text element
		const typeFilterRow = filterDialog.locator(Selector.FILTER_SELECTOR_LIST_ITEM).filter({ hasText: "Type" });
		await typeFilterRow.getByRole("button").click();

		// Right panel: select "german" from the Filter option container value list
		const valuePanel = filterDialog.getByRole("region", { name: "Filter option container" });
		await valuePanel.getByText("german", { exact: true }).click();

		// Apply the filter selection — this closes the dialog
		await filterDialog.getByRole("button", { name: "Apply" }).click();
		await expect(filterDialog).not.toBeVisible();

		// Only the "german" row should remain after filtering
		await expect(overviewTable.getByRole("row", { name: /german/ })).toBeVisible();
		await expect(overviewTable.getByRole("row", { name: /shallow/ })).not.toBeVisible();
	});
});

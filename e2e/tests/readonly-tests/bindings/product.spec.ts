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

import { Selector, Showcase } from "../../../support/utils";

test.describe.configure({ mode: "parallel" });

test.describe("Product bindings", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(Showcase.PRODUCT_BINDINGS);
		await expect(page.getByText("List of products")).toBeVisible();
		await page.getByText("Adilette Cloudfoam Slides").click();
		await expect(page.getByText("Product", { exact: true })).toBeVisible();
	});

	test.describe("Dropdown", () => {
		const selectItem = async (page: Page, itemName: string) => {
			await page.locator(`[data-role='autocomplete'] input`).click();
			await page
				.locator(`[data-role='dropdown-item']`)
				.filter({ has: page.getByText(itemName) })
				.click();

			await expect(page.getByText("Edit relationship")).toBeVisible();

			await page.getByLabel("Manufacturing Site").clear();
			await page.getByLabel("Manufacturing Site").fill("Local");
			await page.getByRole("button", { name: "OK" }).click();
		};

		const deselectItem = async (page: Page) => {
			await page.locator(`[data-role='autocomplete'] button[aria-label='Clear text']`).click();
		};

		test("Add link", async ({ page }) => {
			await selectItem(page, "Puma");

			await expect(page.locator(`[data-role='autocomplete'] input`)).toHaveValue("Puma");

			await page.locator(`[data-role='autocomplete'] input`).click();
			await expect(page.locator(`[data-role='dropdown-item']`).filter({ has: page.getByText("Puma") })).toHaveAttribute(
				"aria-selected",
				"true"
			);
		});

		test("Remove link one time", async ({ page }) => {
			await selectItem(page, "Puma");
			await deselectItem(page);

			await expect(page.locator(`[data-role='autocomplete'] input`)).toHaveValue("");
			await expect(page.locator(`[data-role='dropdown-item']`).filter({ has: page.getByText("Puma") })).toHaveAttribute(
				"aria-selected",
				"false"
			);
		});

		test("Remove link two times", async ({ page }) => {
			await selectItem(page, "Puma");
			await deselectItem(page);
			await selectItem(page, "Puma");
			await deselectItem(page);

			await expect(page.locator(`[data-role='autocomplete'] input`)).toHaveValue("");
			await expect(page.locator(`[data-role='dropdown-item']`).filter({ has: page.getByText("Puma") })).toHaveAttribute(
				"aria-selected",
				"false"
			);
		});
	});

	test("Dual Pane", async ({ page }) => {
		await page.getByLabel("Brand (Dual)").click();

		const candidates = page.locator(Selector.CONTENT_BOX).filter(byText("Available Elements")).last();
		await expect(candidates).toBeVisible();
		const links = page.locator(Selector.CONTENT_BOX).filter(byText("Selected Elements")).last();
		await expect(links).toBeVisible();

		const candidateVans = candidates.getByRole("row").filter(byText("Vans"));
		await expect(candidateVans.locator("button")).toBeEnabled();
		await candidateVans.locator("button").click();

		await expect(page.getByText("Edit relationship")).toBeVisible();
		await page.getByLabel("Manufacturing Site").fill("Local");
		await page.getByRole("button", { name: "OK" }).click();

		const linkVans = links.getByRole("row").filter(byText("Vans"));
		await expect(linkVans).toBeVisible();
		await expect(candidateVans.locator("button")).toBeDisabled();
		await expect(links.getByRole("heading", { name: "Selected Elements 1/1 Entries" })).toBeVisible();

		await linkVans.locator("button").first().click();
		await expect(page.getByText("Edit relationship")).toBeVisible();
		await expect(page.getByLabel("Manufacturing Site")).toHaveValue("Local");
		await page.getByLabel("Manufacturing Site").fill("Oversea");
		await page.getByRole("button", { name: "OK" }).click();

		await linkVans.locator("button").last().click();
		await expect(candidateVans.locator("button")).toBeEnabled();
		await expect(links.getByRole("heading", { name: "Selected Elements 0/1 Entries" })).toBeVisible();

		function byText(text: string) {
			return { has: page.getByText(text) };
		}
	});

	test("Table List", async ({ page }) => {
		await page.getByLabel("Bundle (List)").click();

		await page.getByRole("button", { name: "Edit" }).click();
		await expect(page.getByText("Edit relationship links")).toBeVisible();

		await page
			.getByRole("row")
			.filter({ has: page.getByText("Food for printer") })
			.locator("button")
			.click();

		await expect(page.getByText("Edit relationship", { exact: true })).toBeVisible();
		await page.getByRole("textbox", { name: "Available from*" }).fill("12/01/2022");
		await page.getByRole("button", { name: "OK" }).click();
		await expect(page.getByRole("heading", { name: "Selected Elements 1 Entries" })).toBeVisible();

		await page.getByRole("button", { name: "Close Dialog" }).click();
		await expect(page.getByText("Edit relationship", { exact: true })).toHaveCount(0);
		await expect(
			page
				.locator(Selector.CONTENT_BOX)
				.filter({ has: page.getByText("Product", { exact: true }) })
				.getByText("Food for printer")
		).toHaveCount(1);
	});

	test("Link queries should not contain AND/OR constraints with single operand", async ({ page }) => {
		interface QueryRequest {
			id: string;
			params: { query: { links?: Array<{ constraint?: { operator: string; operands?: unknown[] } }> } };
		}
		const capturedLinkQueries: QueryRequest[] = [];

		await page.route("**/api/v2/rpc", async (route) => {
			const postData = route.request().postDataJSON();
			const items: QueryRequest[] = Array.isArray(postData) ? postData : [postData];
			for (const item of items) {
				if (item.id?.startsWith("load_link_")) {
					capturedLinkQueries.push(item);
				}
			}
			await route.continue();
		});

		await page.goto(Showcase.PRODUCT_BINDINGS);
		await expect(page.getByText("List of products")).toBeVisible();
		await page.getByText("Adilette Cloudfoam Slides").click();
		await expect(page.getByText("Product", { exact: true })).toBeVisible();

		expect(capturedLinkQueries.length).toBeGreaterThan(0);
		for (const query of capturedLinkQueries) {
			for (const link of query.params.query.links ?? []) {
				if (link.constraint?.operator === "and" || link.constraint?.operator === "or") {
					expect(
						link.constraint.operands?.length,
						`Query "${query.id}": AND/OR operator should have more than 1 operand`
					).toBeGreaterThan(1);
				}
			}
		}
	});

	test.describe("Create a new product and link to a brand by using the Save button", () => {
		test("The candidate and link list should be loaded properly (A12RE-178)", async ({ page }) => {
			await page.getByRole("button", { name: "Add" }).click();
			await expect(page.getByText("Please select variant")).toBeVisible();
			await page.locator(`${Selector.MODAL_OVERLAY}`).getByText("Product").click();

			await expect(page.getByRole("form")).toBeVisible();
			await page.getByLabel("Brand (Dual)").click();
			await page.locator(`input[id^='a12-name']`).fill("New Product");

			const brandName = "Puma";
			const candidates = page.locator(Selector.CONTENT_BOX).filter({ hasText: "Available Elements" }).last();
			const candidate = candidates.locator(Selector.TABLE_BODY_ROW).filter({ hasText: brandName }).first();
			await expect(candidate.getByRole("button")).not.toBeDisabled();
			await candidate.locator(Selector.BUTTON).click();

			await expect(page.getByText("Edit relationship")).toBeVisible();
			await page.getByLabel("Manufacturing Site").fill("local");
			await page.getByRole("button", { name: "OK" }).click();

			const links = page.locator(Selector.CONTENT_BOX).filter({ hasText: "Selected Elements" }).last();
			const link = links.locator(Selector.TABLE_BODY_ROW).filter({ hasText: brandName }).first();
			await expect(link).toBeVisible();

			await page.getByRole("button", { name: "Save" }).click();
			await expect(page.locator(Selector.PROGRESS_INDICATOR)).toBeVisible();
			await expect(page.locator(Selector.PROGRESS_INDICATOR)).not.toBeVisible();

			// after saving, "Puma" should be disabled in the list candidate, and visible in list link
			await expect(candidate.getByRole("button")).toBeDisabled();
			await expect(link).toBeVisible();

			await page.getByRole("button", { name: "Commit" }).click();
			await expect(page.getByRole("form")).not.toBeVisible();
			await expect(page.getByText("New Product", { exact: true }).first()).toBeVisible();
		});
	});
});

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

import { Selector, Showcase } from "../../support/utils";

test.describe.configure({ mode: "parallel" });

test.describe("Product bindings", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(Showcase.PRODUCT_BINDINGS);
		await expect(page.getByText("List of products")).toBeVisible();
		await page.getByText("Bel Shoes").click();
		await expect(page.getByText("Product", { exact: true })).toBeVisible();
	});

	test.describe("Dropdown", () => {
		// Third dropdown item — captured from the rendered list so the assertion stays
		// stable across changes to the chance-generated brand names.
		const THIRD_ITEM_INDEX = 2;

		const openDropdown = (page: Page) => page.locator(`[data-role='autocomplete'] input`).click();

		const readItemName = async (page: Page, index: number): Promise<string> => {
			const item = page.locator(`[data-role='dropdown-item']`).nth(index);

			return (await item.textContent())?.trim() ?? "";
		};

		const selectItem = async (page: Page, itemName: string) => {
			await openDropdown(page);
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
			await openDropdown(page);
			const itemName = await readItemName(page, THIRD_ITEM_INDEX);
			await selectItem(page, itemName);

			await expect(page.locator(`[data-role='autocomplete'] input`)).toHaveValue(itemName);

			await openDropdown(page);
			await expect(
				page.locator(`[data-role='dropdown-item']`).filter({ has: page.getByText(itemName) })
			).toHaveAttribute("aria-selected", "true");
		});

		test("Remove link one time", async ({ page }) => {
			await openDropdown(page);
			const itemName = await readItemName(page, THIRD_ITEM_INDEX);
			await selectItem(page, itemName);
			await deselectItem(page);

			await expect(page.locator(`[data-role='autocomplete'] input`)).toHaveValue("");
			await expect(
				page.locator(`[data-role='dropdown-item']`).filter({ has: page.getByText(itemName) })
			).toHaveAttribute("aria-selected", "false");
		});

		test("Remove link two times", async ({ page }) => {
			await openDropdown(page);
			const itemName = await readItemName(page, THIRD_ITEM_INDEX);
			await selectItem(page, itemName);
			await deselectItem(page);
			await selectItem(page, itemName);
			await deselectItem(page);

			await expect(page.locator(`[data-role='autocomplete'] input`)).toHaveValue("");
			await expect(
				page.locator(`[data-role='dropdown-item']`).filter({ has: page.getByText(itemName) })
			).toHaveAttribute("aria-selected", "false");
		});
	});

	test("Dual Pane", async ({ page }) => {
		await page.getByLabel("Brand (Dual)").click();

		const candidates = page.locator(Selector.CONTENT_BOX).filter(byText("Available Elements")).last();
		await expect(candidates).toBeVisible();
		const links = page.locator(Selector.CONTENT_BOX).filter(byText("Selected Elements")).last();
		await expect(links).toBeVisible();

		const candidate = candidates.getByRole("row").filter(byText("Tellabs Inc."));
		await expect(candidate.locator("button")).toBeEnabled();
		await candidate.locator("button").click();

		await expect(page.getByText("Edit relationship")).toBeVisible();
		await page.getByLabel("Manufacturing Site").fill("Local");
		await page.getByRole("button", { name: "OK" }).click();

		const link = links.getByRole("row").filter(byText("Tellabs Inc."));
		await expect(link).toBeVisible();
		await expect(candidate.locator("button")).toBeDisabled();
		await expect(links.getByRole("heading", { name: "Selected Elements 2/1 Entries" })).toBeVisible();

		await link.locator("button").first().click();
		await expect(page.getByText("Edit relationship")).toBeVisible();
		await expect(page.getByLabel("Manufacturing Site")).toHaveValue("Local");
		await page.getByLabel("Manufacturing Site").fill("Oversea");
		await page.getByRole("button", { name: "OK" }).click();

		await link.locator("button").last().click();
		await expect(candidate.locator("button")).toBeEnabled();
		await expect(links.getByRole("heading", { name: "Selected Elements 1/1 Entries 1 Entries" })).toBeVisible();

		function byText(text: string) {
			return { has: page.getByText(text) };
		}
	});

	// editDialogWidth "80%", editDialogMaxWidth "1400px", editDialogMaxHeight "90vh"
	// 80% * 1600 = 1280 (under 1400 cap)
	test("TableList edit dialog uses width below cap", async ({ page }) => {
		await page.setViewportSize({ width: 1600, height: 900 });

		await page.getByLabel("Bundle (List)").click();
		await page.getByRole("button", { name: "Edit" }).click();
		await expect(page.getByRole("heading", { name: "Edit relationship links" })).toBeVisible();

		const dialog = page
			.locator(Selector.MODAL_OVERLAY)
			.filter({ hasText: "Edit relationship links" })
			.locator("> *")
			.first();
		const box = await dialog.boundingBox();

		expect(box?.width).toEqual(1280);
		// maxHeight = 90vh = 810, content may render smaller
		expect(box?.height).toBeLessThanOrEqual(810);
	});

	// 80% * 2000 = 1600 -> clamped by editDialogMaxWidth = 1400
	test("TableList edit dialog clamps width to cap", async ({ page }) => {
		await page.setViewportSize({ width: 2000, height: 900 });

		await page.getByLabel("Bundle (List)").click();
		await page.getByRole("button", { name: "Edit" }).click();
		await expect(page.getByRole("heading", { name: "Edit relationship links" })).toBeVisible();

		const dialog = page
			.locator(Selector.MODAL_OVERLAY)
			.filter({ hasText: "Edit relationship links" })
			.locator("> *")
			.first();

		expect((await dialog.boundingBox())?.width).toEqual(1400);
	});

	test("Table List", async ({ page }) => {
		await page.getByLabel("Bundle (List)").click();

		await page.getByRole("button", { name: "Edit" }).click();
		await expect(page.getByText("Edit relationship links")).toBeVisible();

		await page
			.getByRole("row")
			.filter({ has: page.getByText("Fikde Bundle") })
			.locator("button")
			.filter({ hasText: "description" })
			.click();

		await expect(page.getByText("Edit relationship", { exact: true })).toBeVisible();
		await page.getByRole("textbox", { name: "Available from*" }).fill("12/01/2022");
		await page.getByRole("button", { name: "OK" }).click();
		await expect(page.getByRole("heading", { name: "Selected Elements 8 Entries" })).toBeVisible();

		await page.getByRole("button", { name: "Close Dialog" }).click();
		await expect(page.getByText("Edit relationship", { exact: true })).toHaveCount(0);
		await expect(
			page
				.locator(Selector.CONTENT_BOX)
				.filter({ has: page.getByText("Product", { exact: true }) })
				.getByText("Fikde Bundle")
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
		await page.getByText("Bel Shoes").click();
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
});

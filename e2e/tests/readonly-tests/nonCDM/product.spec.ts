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

import { Selector, Showcase } from "../../../support/utils.js";

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

		test("Edit link document several times after adding a link", async ({ page }) => {
			await openDropdown(page);
			const itemName = await readItemName(page, THIRD_ITEM_INDEX);
			await selectItem(page, itemName);

			const editButton = page.getByRole("button", { name: "Edit additional properties" });

			await editButton.click();
			await expect(page.getByText("Edit relationship")).toBeVisible();
			await expect(page.getByLabel("Manufacturing Site")).toHaveValue("Local");
			await page.getByLabel("Manufacturing Site").clear();
			await page.getByLabel("Manufacturing Site").fill("Oversea");
			await page.getByRole("button", { name: "OK" }).click();

			await editButton.click();
			await expect(page.getByText("Edit relationship")).toBeVisible();
			await expect(page.getByLabel("Manufacturing Site")).toHaveValue("Oversea");
			await page.getByLabel("Manufacturing Site").clear();
			await page.getByLabel("Manufacturing Site").fill("Remote");
			await page.getByRole("button", { name: "OK" }).click();

			await editButton.click();
			await expect(page.getByText("Edit relationship")).toBeVisible();
			await expect(page.getByLabel("Manufacturing Site")).toHaveValue("Remote");
			await page.getByRole("button", { name: "Cancel" }).click();
		});
	});

	test("Dual Pane", async ({ page }) => {
		await page.getByLabel("Brand (Dual)").click();

		const candidates = page.locator(Selector.CONTENT_BOX).filter(byText("List all brands")).last();
		await expect(candidates).toBeVisible();
		const links = page.locator(Selector.CONTENT_BOX).filter(byText("Selected Items")).last();
		await expect(links).toBeVisible();

		const candidateVF = candidates.getByRole("row").filter(byText("VF Corporation"));
		await expect(candidateVF.locator("button")).toBeEnabled();
		await candidateVF.locator("button").click();

		await expect(page.getByText("Edit relationship")).toBeVisible();
		await page.getByLabel("Manufacturing Site").fill("Local");
		await page.getByRole("button", { name: "OK" }).click();

		const linkVF = links.getByRole("row").filter(byText("VF Corporation"));
		await expect(linkVF).toBeVisible();
		await expect(candidateVF.locator("button")).toBeDisabled();
		// await expect(links.getByRole("heading", { name: "Selected Elements 1/1 Entries" })).toBeVisible();

		await linkVF.locator("button").filter({ hasText: "edit" }).click();
		await expect(page.getByText("Edit relationship")).toBeVisible();
		await expect(page.getByLabel("Manufacturing Site")).toHaveValue("Local");
		await page.getByLabel("Manufacturing Site").fill("Oversea");
		await page.getByRole("button", { name: "OK" }).click();

		await linkVF.locator("button").filter({ hasText: "remove_circle" }).click();
		await expect(candidateVF.locator("button")).toBeEnabled();
		// await expect(links.getByRole("heading", { name: "Selected Elements 0/1 Entries" })).toBeVisible();

		function byText(text: string) {
			return { has: page.getByText(text) };
		}
	});

	// dialogWidth "80%", dialogMaxWidth "1400px", dialogMaxHeight "90vh"
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

	// 80% * 2000 = 1600 -> clamped by dialogMaxWidth = 1400
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
		await expect(page.getByRole("heading", { name: "Edit relationship links" })).toBeVisible();

		await page
			.getByRole("row")
			.filter({ has: page.getByText("Wegin Set") })
			.locator("button")
			.click();

		await expect(page.getByText("Edit relationship", { exact: true })).toBeVisible();
		await page.getByRole("textbox", { name: "Available from*" }).fill("12/01/2022");
		await page.getByRole("button", { name: "OK" }).click();
		// TODO: Indicator element
		// await expect(page.getByRole("heading", { name: "Selected Elements 1 Entries" })).toBeVisible();

		await page.getByRole("button", { name: "Close Dialog" }).click();
		await expect(page.getByText("Edit relationship", { exact: true })).toHaveCount(0);
		await expect(
			page
				.locator(Selector.CONTENT_BOX)
				.filter({ has: page.getByText("Product", { exact: true }) })
				.getByText("Wegin Set")
		).toHaveCount(1);
	});

	// TODO: This test is to specific and intercept the endpoint directly, we should find a more robust way to verify that the correct queries are sent when selecting items in the dropdown
	test.skip("Link queries should not contain AND/OR constraints with single operand", async ({ page }) => {
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

	test.describe("Duplicates allowed bundle", () => {
		test("Bundle (Dual)", async ({ page }) => {
			await page.getByLabel("Bundle (Dual)").click();

			// Add a link to "Wegin Set"
			const availableItems = page.locator(Selector.CONTENT_BOX).filter({ hasText: "Available Items" }).last();
			const availableItem = availableItems.getByRole("row").filter({ hasText: "Wegin Set" });
			await expect(availableItem.locator("button")).toBeEnabled();
			await availableItem.locator("button").click();

			const modal = page.locator(Selector.MODAL_OVERLAY).filter({ hasText: "Edit relationship" });
			await modal.getByRole("textbox", { name: "Available from" }).fill("12/01/2022");
			await modal.getByRole("button", { name: "OK" }).click();

			const selectedItems = page.locator(Selector.CONTENT_BOX).filter({ hasText: "Selected Items" }).last();
			const selectedItem = selectedItems.getByRole("row").filter({ hasText: "Wegin Set" });
			await expect(selectedItem).toBeVisible();

			// Candidate should remain enabled once linked
			await expect(availableItem.locator("button")).not.toBeDisabled();

			// Remove the link
			await selectedItem.locator("button").filter({ hasText: "remove_circle" }).click();
			await expect(selectedItem).not.toBeVisible();

			// Candidate re-enabled after removal
			await expect(availableItem.locator("button")).toBeEnabled();
		});

		test("Bundle (List)", async ({ page }) => {
			await page.getByLabel("Bundle (List)").click();
			await page.getByRole("button", { name: "Edit" }).click();
			await expect(page.getByRole("heading", { name: "Edit relationship links" })).toBeVisible();

			const dialog = page.locator(Selector.MODAL_OVERLAY).filter({ hasText: "Edit relationship links" });
			const dialogAvailable = dialog.locator(Selector.CONTENT_BOX).filter({ hasText: "Available Items" }).last();
			const dialogLinks = dialog.locator(Selector.CONTENT_BOX).filter({ hasText: "Selected Items" }).last();

			const addFoodForPrinter = async () => {
				await dialogAvailable.getByRole("row").filter({ hasText: "Wegin Set" }).locator("button").click();
				await page.getByRole("textbox", { name: "Available from*" }).fill("12/01/2022");
				await page.getByRole("button", { name: "OK" }).click();
			};

			const linkFood = dialogLinks.getByRole("row").filter({ hasText: "Wegin Set" });

			// Add
			await addFoodForPrinter();
			await expect(linkFood).toBeVisible();

			// Remove
			await linkFood.locator("button").filter({ hasText: "remove_circle" }).click();
			await expect(linkFood).not.toBeVisible();

			// Add again
			await addFoodForPrinter();
			await expect(linkFood).toBeVisible();

			// Cancel — all pending changes should be rolled back
			await page.getByRole("button", { name: "Cancel Changes" }).click();
			await expect(page.getByRole("heading", { name: "Edit relationship links" })).not.toBeVisible();

			await expect(
				page
					.locator(Selector.CONTENT_BOX)
					.filter({ has: page.getByText("Product", { exact: true }) })
					.getByText("Wegin Set")
			).toHaveCount(0);
		});
	});
});

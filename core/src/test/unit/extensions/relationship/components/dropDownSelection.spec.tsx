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

import React from "react";
import { vi, test, expect, describe } from "vitest";
import { render, screen, within, configure } from "@testing-library/react";

import type * as WidgetsCore from "@com.mgmtp.a12.widgets/widgets-core";
import type { DropDownItem, Autocomplete as AutocompleteType } from "@com.mgmtp.a12.widgets/widgets-core";

import { TestWrapper } from "../../../../utils/rtl/testWrapper.js";
import { DropDownSelection, type Relationship } from "../../../../../internal/relationship/index.js";
import type {
	Items,
	SingleSelectionItem,
	SingleSelectionProps
} from "../../../../../internal/relationship/ui/components/api.js";

configure({ testIdAttribute: "data-role" });

const capturedAutocompleteValues: (DropDownItem | undefined)[] = [];

vi.mock("@com.mgmtp.a12.widgets/widgets-core", async (importOriginal: () => Promise<typeof WidgetsCore>) => {
	const actual = await importOriginal();

	function CapturingAutocomplete(props: React.ComponentProps<typeof AutocompleteType>) {
		capturedAutocompleteValues.push(props.value);

		return React.createElement(actual.Autocomplete, props);
	}

	return { ...actual, Autocomplete: CapturingAutocomplete };
});

const TEST_LABEL = "test component";
const TEST_ITEMS_FULL_COUNT = 10;
const TEST_LOCALIZABLE_KEY_PREFIX = "test-prefix-";
const ADDITIONAL_PROPERTIES_TITLE = "Additional properties";

describe("com.mgmtp.a12.relationshipengine-core.relationship-engine.DropDownSelection", () => {
	describe("readonly", () => {
		test("should render a readonly autocomplete input", () => {
			render(
				<TestWrapper>
					<DropDownSelection {...createTestProps({ readonly: true })} />
				</TestWrapper>
			);

			const autocomplete = screen.getByTestId("autocomplete");
			const autocompleteInput = within(autocomplete).getByTestId("text-field-input");

			expect(autocompleteInput).toHaveAttribute("readonly");
		});

		describe("when an item is selected and there are form models for the link document modal form present", () => {
			test("should render a readonly autocomplete with an additional properties suffix button", async () => {
				render(
					<TestWrapper>
						<DropDownSelection
							{...createTestProps({
								readonly: true,
								itemSelected: true,
								editItemFormModelsPresent: true
							})}
						/>
					</TestWrapper>
				);

				const autocomplete = screen.getByTestId("autocomplete");
				const buttonsInAutocomplete = await within(autocomplete).findAllByRole("button");
				const additionalPropertiesButton = buttonsInAutocomplete.find((button) =>
					[button["ariaLabel"], button["title"]].includes(ADDITIONAL_PROPERTIES_TITLE)
				);

				// eslint-disable-next-line @typescript-eslint/no-unused-expressions
				expect(additionalPropertiesButton).to.not.be.undefined;
			});
		});
	});

	describe("selected/edit item value identity", () => {
		test("passes the same converted value reference to Autocomplete across renders with an unchanged selectedItem.data reference", () => {
			capturedAutocompleteValues.length = 0;

			const selectedItem = createTestSelectedItem();
			const { rerender } = render(
				<TestWrapper>
					<DropDownSelection {...createTestProps({ readonly: false, selectedItemOverride: selectedItem })} />
				</TestWrapper>
			);

			rerender(
				<TestWrapper>
					<DropDownSelection
						{...createTestProps({ readonly: false, label: "rerendered", selectedItemOverride: selectedItem })}
					/>
				</TestWrapper>
			);

			expect(capturedAutocompleteValues).toHaveLength(2);
			expect(capturedAutocompleteValues[1]).toBe(capturedAutocompleteValues[0]);
		});

		test("produces a newly converted value with correct content when selectedItem.data reference changes", () => {
			capturedAutocompleteValues.length = 0;

			const firstSelectedItem = createTestSelectedItem();
			const secondSelectedItem: Items<SingleSelectionItem | undefined> = {
				loadingState: "loaded",
				data: { label: "test item 2", docRef: "item/2" }
			};

			const { rerender } = render(
				<TestWrapper>
					<DropDownSelection {...createTestProps({ readonly: false, selectedItemOverride: firstSelectedItem })} />
				</TestWrapper>
			);

			rerender(
				<TestWrapper>
					<DropDownSelection {...createTestProps({ readonly: false, selectedItemOverride: secondSelectedItem })} />
				</TestWrapper>
			);

			expect(capturedAutocompleteValues).toHaveLength(2);
			expect(capturedAutocompleteValues[1]).not.toBe(capturedAutocompleteValues[0]);
			expect(capturedAutocompleteValues[1]).toMatchObject({ label: "test item 2", value: "item/2" });
		});

		test("clears the cache across an unload-then-reload cycle instead of leaking a stale converted value", () => {
			capturedAutocompleteValues.length = 0;

			const firstSelectedItem = createTestSelectedItem();
			const reloadedSelectedItem: Items<SingleSelectionItem | undefined> = {
				loadingState: "loaded",
				data: { label: "test item 1", docRef: "item/1" }
			};

			const { rerender } = render(
				<TestWrapper>
					<DropDownSelection {...createTestProps({ readonly: false, selectedItemOverride: firstSelectedItem })} />
				</TestWrapper>
			);

			rerender(
				<TestWrapper>
					<DropDownSelection
						{...createTestProps({ readonly: false, selectedItemOverride: { loadingState: "missing" } })}
					/>
				</TestWrapper>
			);

			rerender(
				<TestWrapper>
					<DropDownSelection {...createTestProps({ readonly: false, selectedItemOverride: reloadedSelectedItem })} />
				</TestWrapper>
			);

			expect(capturedAutocompleteValues).toHaveLength(3);
			expect(capturedAutocompleteValues[1]).toBeUndefined();
			expect(capturedAutocompleteValues[2]).not.toBe(capturedAutocompleteValues[0]);
			expect(capturedAutocompleteValues[2]).toMatchObject({ label: "test item 1", value: "item/1" });
		});

		test("passes the same converted editItem reference to Autocomplete across renders with an unchanged editItem reference", () => {
			capturedAutocompleteValues.length = 0;

			const editItem: SingleSelectionItem = { label: "edited item", docRef: "item/3" };
			const { rerender } = render(
				<TestWrapper>
					<DropDownSelection {...createTestProps({ readonly: false, editItem })} />
				</TestWrapper>
			);

			rerender(
				<TestWrapper>
					<DropDownSelection {...createTestProps({ readonly: false, label: "rerendered", editItem })} />
				</TestWrapper>
			);

			expect(capturedAutocompleteValues).toHaveLength(2);
			expect(capturedAutocompleteValues[1]).toBe(capturedAutocompleteValues[0]);
		});

		test("clears the editItem cache once editItem becomes undefined", () => {
			capturedAutocompleteValues.length = 0;

			const editItem: SingleSelectionItem = { label: "edited item", docRef: "item/3" };
			const { rerender } = render(
				<TestWrapper>
					<DropDownSelection {...createTestProps({ readonly: false, editItem })} />
				</TestWrapper>
			);

			rerender(
				<TestWrapper>
					<DropDownSelection {...createTestProps({ readonly: false })} />
				</TestWrapper>
			);

			expect(capturedAutocompleteValues).toHaveLength(2);
			expect(capturedAutocompleteValues[1]).toBeUndefined();
		});
	});
});

function createTestProps(params: {
	readonly: boolean;
	itemSelected?: boolean;
	editItemFormModelsPresent?: boolean;
	selectedItemOverride?: Items<SingleSelectionItem | undefined>;
	editItem?: SingleSelectionItem;
	label?: string;
}): SingleSelectionProps {
	const { readonly, itemSelected, editItemFormModelsPresent, selectedItemOverride, editItem, label } = params ?? {};

	return {
		label: label ?? TEST_LABEL,
		items: createTestItems(),
		itemsFullCount: TEST_ITEMS_FULL_COUNT,
		localizableKeyPrefix: TEST_LOCALIZABLE_KEY_PREFIX,
		selectedItem: selectedItemOverride ?? (itemSelected ? createTestSelectedItem() : { loadingState: "missing" }),
		editItem,
		readonly,
		onSelectItem() {
			/* noop */
		},
		onSearchItem() {
			/* noop */
		},
		onSubmitEditItemDocument() {
			/* noop */
		},
		onCancelEditItemDocument() {
			/* noop */
		},
		onEditItem() {
			/* noop */
		},
		editItemFormModels: editItemFormModelsPresent ? ({} as Relationship.FormModels) : undefined
	};
}

function createTestItems(): Items<SingleSelectionItem[]> {
	return {
		loadingState: "loaded",
		data: [
			{ label: "test item 1", docRef: "item/1" },
			{ label: "test item 2", docRef: "item/2" }
		]
	};
}

function createTestSelectedItem(): Items<SingleSelectionItem | undefined> {
	return {
		loadingState: "loaded",
		data: { label: "test item 1", docRef: "item/1" }
	};
}

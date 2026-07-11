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

import { test, expect, describe } from "vitest";
import { render, screen, within, configure } from "@testing-library/react";

import { TestWrapper } from "../../../../utils/rtl/testWrapper.js";
import { DropDownSelection, type Relationship } from "../../../../../internal/relationship/index.js";
import type {
	Items,
	SingleSelectionItem,
	SingleSelectionProps
} from "../../../../../internal/relationship/ui/components/api.js";

configure({ testIdAttribute: "data-role" });

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
});

function createTestProps(params: {
	readonly: boolean;
	itemSelected?: boolean;
	editItemFormModelsPresent?: boolean;
}): SingleSelectionProps {
	const { readonly, itemSelected, editItemFormModelsPresent } = params ?? {};

	return {
		label: TEST_LABEL,
		items: createTestItems(),
		itemsFullCount: TEST_ITEMS_FULL_COUNT,
		localizableKeyPrefix: TEST_LOCALIZABLE_KEY_PREFIX,
		selectedItem: itemSelected ? createTestSelectedItem() : { loadingState: "missing" },
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

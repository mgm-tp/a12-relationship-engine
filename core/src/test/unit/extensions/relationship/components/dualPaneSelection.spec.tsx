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

import { userEvent } from "@testing-library/user-event";
import { vi, test, expect, describe, beforeAll, type Mock } from "vitest";
import { render, screen, within, configure } from "@testing-library/react";

import type { IGeneratedCodeAccessor } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import type { OverviewEngineApi } from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import { TestWrapper } from "../../../../utils/rtl/testWrapper.js";
import { DualPaneSelection, type Relationship } from "../../../../../internal/relationship/index.js";
import type { Items, MultiSelectionItem } from "../../../../../internal/relationship/ui/components/api.js";
import type { DualPaneSelectionProps } from "../../../../../internal/relationship/ui/components/DualPaneSelection.js";

import { createDocumentModelMock, createOverviewModelMock } from "./componentTestUtils.js";

configure({ testIdAttribute: "data-role" });

const TEST_LABEL = "test dual pane";
const TEST_LOCALIZABLE_KEY_PREFIX = "test-prefix-";
const REMOVE_LINK_ICON_FONT_CHAR = "remove_circle";
const ADDITIONAL_PROPERTIES_ICON_FONT_CHAR = "description";
const FILTER_ICON_FONT_CHAR = "filter_list";

let onAddAssignmentSpy: Mock;
let onRemoveExistingAssignmentSpy: Mock;

beforeAll(() => {
	onAddAssignmentSpy = vi.fn();
	onRemoveExistingAssignmentSpy = vi.fn();
});

describe("com.mgmtp.a12.relationshipengine-core.relationship-engine.DualPaneSelection", () => {
	describe("readonly", () => {
		test("should not trigger adding a link, when clicking on a row in the candidate table", async () => {
			render(
				<TestWrapper>
					<DualPaneSelection {...createTestProps({ readonly: true })} />
				</TestWrapper>
			);

			const overviews = await screen.findAllByTestId("contentbox");
			const candidateOverview = overviews[0];

			const candidateRows = await within(candidateOverview).findAllByTestId("table-body-row");
			const firstCandidateRow = candidateRows[0];

			await userEvent.click(firstCandidateRow);

			expect(onAddAssignmentSpy).not.toHaveBeenCalled();
		});

		test("should not render a row action button to trigger adding a link in the candidate table rows", async () => {
			render(
				<TestWrapper>
					<DualPaneSelection {...createTestProps({ readonly: true })} />
				</TestWrapper>
			);

			const overviews = await screen.findAllByTestId("contentbox");
			const candidateOverview = overviews[0];

			const candidateRows = await within(candidateOverview).findAllByTestId("table-body-row");
			const firstCandidateRow = candidateRows[0];

			const rowActionButtons = within(firstCandidateRow).queryAllByTestId("button");

			expect(rowActionButtons.length).to.be.equal(0);
		});

		test("should not trigger removing a link, when clicking on a row in the link table", async () => {
			render(
				<TestWrapper>
					<DualPaneSelection {...createTestProps({ readonly: true })} />
				</TestWrapper>
			);

			const overviews = await screen.findAllByTestId("contentbox");
			const linkOverview = overviews[1];

			const linkRows = await within(linkOverview).findAllByTestId("table-body-row");
			const firstLinkRow = linkRows[0];

			await userEvent.click(firstLinkRow);

			expect(onRemoveExistingAssignmentSpy).not.toHaveBeenCalled();
		});

		test("should not render a row action button to trigger removing a link in the link table rows", async () => {
			render(
				<TestWrapper>
					<DualPaneSelection {...createTestProps({ readonly: true })} />
				</TestWrapper>
			);

			const overviews = await screen.findAllByTestId("contentbox");
			const linkOverview = overviews[1];

			const linkRows = await within(linkOverview).findAllByTestId("table-body-row");
			const firstLinkRow = linkRows[0];

			const removeLinkButton = within(firstLinkRow).queryAllByText(REMOVE_LINK_ICON_FONT_CHAR);

			expect(removeLinkButton.length).to.be.equal(0);
		});

		test("should render the additional properties button for a link row, when link doc form models are present", async () => {
			render(
				<TestWrapper>
					<DualPaneSelection {...createTestProps({ readonly: true })} />
				</TestWrapper>
			);

			const overviews = await screen.findAllByTestId("contentbox");
			const linkOverview = overviews[1];

			const linkRows = await within(linkOverview).findAllByTestId("table-body-row");
			const firstLinkRow = linkRows[0];

			const additionalPropertiesButton = within(firstLinkRow).queryAllByText(ADDITIONAL_PROPERTIES_ICON_FONT_CHAR);

			expect(additionalPropertiesButton.length).to.be.equal(1);
		});

		test("should render the pagination in the candidates table", async () => {
			render(
				<TestWrapper>
					<DualPaneSelection {...createTestProps({ readonly: true })} />
				</TestWrapper>
			);

			const overviews = await screen.findAllByTestId("contentbox");
			const candidateOverview = overviews[0];

			within(candidateOverview).getByTestId("pagination");
		});

		test("should render the filter button in the candidates table", async () => {
			render(
				<TestWrapper>
					<DualPaneSelection {...createTestProps({ readonly: true })} />
				</TestWrapper>
			);

			const overviews = await screen.findAllByTestId("contentbox");
			const candidateOverview = overviews[0];

			const candidateOverviewSubheading = await within(candidateOverview).findByTestId("contentbox-subheading");

			const filterButton = within(candidateOverviewSubheading).queryAllByText(FILTER_ICON_FONT_CHAR);

			expect(filterButton.length).to.be.equal(1);
		});
	});
});

function createTestProps(params: { readonly: boolean }): DualPaneSelectionProps {
	const { readonly } = params;

	return {
		label: TEST_LABEL,
		readonly: readonly,
		localizableKeyPrefix: TEST_LOCALIZABLE_KEY_PREFIX,
		assignments: createAssignments(),
		assignmentModels: createAssignmentModels(),
		availableItems: createAvailableItems(),
		availableItemModels: createAvailableItemModels(),
		availableItemsFilters: createAvailableItemsFilters(),
		editItemFormModels: createEditItemFormModels(),
		availableItemsPagination: createAvailableItemsPagination(),
		onEditItem() {
			/* noop */
		},
		onCancelEditItemDocument() {
			/* noop */
		},
		onSubmitEditItemDocument() {
			/* noop */
		},
		onAddAssignment() {
			onAddAssignmentSpy();
		},
		onAddExistingAssignment() {
			/* noop */
		},
		onRemoveExistingAssignment() {
			onRemoveExistingAssignmentSpy();
		},
		onAvailableItemsFilterChanged() {
			/* noop */
		},
		onAvailableItemsPageChange() {
			/* noop */
		}
	};
}

function createAvailableItemModels(): Relationship.OverviewModels {
	return {
		loadingState: "loaded",
		overviewModel: createOverviewModelMock("availableItemsOverview"),
		documentModel: createDocumentModelMock(),
		validatorProvider: {} as IGeneratedCodeAccessor
	};
}

function createAssignmentModels(): Relationship.OverviewModels {
	return {
		loadingState: "loaded",
		overviewModel: createOverviewModelMock("assignedItemsOverview"),
		documentModel: createDocumentModelMock(),
		validatorProvider: {} as IGeneratedCodeAccessor
	};
}

function createEditItemFormModels(): Relationship.FormModels {
	return {} as Relationship.FormModels;
}

function createAssignments(): Items<MultiSelectionItem[]> {
	return {
		loadingState: "loaded",
		data: [createMultiSelectionItem("item1"), createMultiSelectionItem("item2")]
	};
}

function createAvailableItems(): Items<MultiSelectionItem[]> {
	return {
		loadingState: "loaded",
		data: [createMultiSelectionItem("item3"), createMultiSelectionItem("item4")]
	};
}

function createAvailableItemsFilters(): OverviewEngineApi.FilterMap {
	return {} as OverviewEngineApi.FilterMap;
}

function createMultiSelectionItem(id: string): MultiSelectionItem {
	return { documentJson: { id, modelId: "test-model-id" }, selectionAllowed: true, reassigned: false, visible: true };
}

function createAvailableItemsPagination(): OverviewEngineApi.Pagination {
	return { pageCount: 2, pageNumber: 0, pageSize: 1 };
}

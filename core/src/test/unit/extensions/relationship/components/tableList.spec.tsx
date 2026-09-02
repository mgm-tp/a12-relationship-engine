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

import { vi, test, expect, describe, beforeAll, type Mock } from "vitest";
import { render, screen, configure, fireEvent } from "@testing-library/react";

import type { IGeneratedCodeAccessor } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import type { OverviewEngineApi } from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import { TestWrapper } from "../../../../utils/rtl/testWrapper.js";
import type { Relationship } from "../../../../../internal/relationship/index.js";
import type { Items, ListItem, MultiSelectionItem } from "../../../../../internal/relationship/ui/components/api.js";
import {
	LinkTableTemplate,
	type TableListProps
} from "../../../../../internal/relationship/ui/components/TableList.js";

import { createDocumentModelMock, createOverviewModelMock } from "./componentTestUtils.js";

configure({ testIdAttribute: "data-role" });

let onItemClickSpy: Mock;

beforeAll(() => {
	onItemClickSpy = vi.fn();
});

const TEST_LABEL = "test dual pane";
const TEST_ADD_LABEL = "add";
const TEST_EDIT_LABEL = "edit";
const TEST_LOCALIZABLE_KEY_PREFIX = "test-prefix-";
const EDIT_COMPONENT_TEXT_CONTENT = "edit component";

describe("com.mgmtp.a12.relationshipengine-core.relationship-engine.TableList", () => {
	describe("readonly", () => {
		test("should not render an edit button in the footer", () => {
			render(
				<TestWrapper>
					<LinkTableTemplate {...createTestProps({ readonly: true })} />
				</TestWrapper>
			);
			const editButtons = screen.queryAllByText(TEST_EDIT_LABEL);

			expect(editButtons.length).to.equal(0);
		});

		test("should still render a pagination in the footer", async () => {
			render(
				<TestWrapper>
					<LinkTableTemplate {...createTestProps({ readonly: true })} />
				</TestWrapper>
			);
			const pagination = await screen.findAllByTestId("pagination");

			expect(pagination.length).to.equal(1);
		});

		describe("prop 'rowsReadonlyInteractive' is true", () => {
			test("should render the table list rows as interactive", async () => {
				render(
					<TestWrapper>
						<LinkTableTemplate {...createTestProps({ readonly: true, rowsReadonlyInteractive: true })} />
					</TestWrapper>
				);

				const tableRows = await screen.findAllByTestId("table-body-row");
				const firstRow = tableRows[0];

				expect(firstRow).toHaveAttribute("tabindex", "0");
			});
		});

		describe("prop 'rowsReadonlyInteractive' is false", () => {
			test("should render the table list rows as non-interactive", async () => {
				render(
					<TestWrapper>
						<LinkTableTemplate {...createTestProps({ readonly: true, rowsReadonlyInteractive: false })} />
					</TestWrapper>
				);

				const tableRows = await screen.findAllByTestId("table-body-row");
				const firstRow = tableRows[0];

				expect(firstRow).toHaveAttribute("tabindex", "-1");
			});
		});
	});

	describe("dialog width", () => {
		test("falls back to editDialogWidth as maxWidth when editDialogMaxWidth is absent", async () => {
			render(
				<TestWrapper>
					<LinkTableTemplate {...createTestProps({ readonly: false })} editDialogWidth="900px" />
				</TestWrapper>
			);

			fireEvent.click(screen.getByText(TEST_EDIT_LABEL));

			const container = await screen.findByTestId("modal-overlay-content");

			expect(container.style.maxWidth).to.equal("900px");
			expect(container.style.width).to.equal("900px");
		});

		test("uses editDialogMaxWidth when both are provided", async () => {
			render(
				<TestWrapper>
					<LinkTableTemplate
						{...createTestProps({ readonly: false })}
						editDialogWidth="900px"
						editDialogMaxWidth="1000px"
					/>
				</TestWrapper>
			);

			fireEvent.click(screen.getByText(TEST_EDIT_LABEL));

			const container = await screen.findByTestId("modal-overlay-content");

			expect(container.style.maxWidth).to.equal("1000px");
			expect(container.style.width).to.equal("900px");
		});

		test("leaves maxWidth undefined when neither prop is provided", async () => {
			render(
				<TestWrapper>
					<LinkTableTemplate {...createTestProps({ readonly: false })} />
				</TestWrapper>
			);

			fireEvent.click(screen.getByText(TEST_EDIT_LABEL));

			const container = await screen.findByTestId("modal-overlay-content");

			expect(container.style.maxWidth).to.equal("");
		});
	});
});

function createTestProps(params: { readonly: boolean; rowsReadonlyInteractive?: boolean }): TableListProps {
	const { readonly } = params;

	return {
		label: TEST_LABEL,
		readonly,
		localizableKeyPrefix: TEST_LOCALIZABLE_KEY_PREFIX,
		items: createItems(),
		itemModels: createItemModels(),
		addLabel: TEST_ADD_LABEL,
		editLabel: TEST_EDIT_LABEL,
		rowsReadonlyInteractive: params.rowsReadonlyInteractive ?? false,
		pagination: createPagination(),
		editComponent: TestEditComponent,
		editComponentProps: {},
		onItemClick() {
			onItemClickSpy();
		},
		onAddItem() {
			/* noop */
		},
		onPageChange() {
			/* noop */
		}
	};
}

function createItemModels(): Relationship.OverviewModels {
	return {
		loadingState: "loaded",
		overviewModel: createOverviewModelMock("assignedItemsOverview"),
		documentModel: createDocumentModelMock(),
		validatorProvider: {} as IGeneratedCodeAccessor
	};
}

function createItems(): Items<ListItem[]> {
	return {
		loadingState: "loaded",
		data: [createMultiSelectionItem("item1"), createMultiSelectionItem("item2")]
	};
}

function createMultiSelectionItem(id: string): MultiSelectionItem {
	return { documentJson: { id, modelId: "test-model-id" }, selectionAllowed: true, reassigned: false, visible: true };
}

function createPagination(): OverviewEngineApi.Pagination {
	return { pageCount: 2, pageNumber: 0, pageSize: 1 };
}

function TestEditComponent(): React.ReactNode {
	return <p>{EDIT_COMPONENT_TEXT_CONTENT}</p>;
}

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

import { Provider } from "react-redux";
import { describe, expect, beforeEach, test } from "vitest";

import { type OverviewModel } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import { AriaLevelContext } from "@com.mgmtp.a12.formengine/formengine-core";
import { type DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";
import { DataRoles } from "@com.mgmtp.a12.widgets/widgets-core";
import { ViewViews } from "@com.mgmtp.a12.client/client-core";

import { findAllByDataRole, findByDataRole, getByDataRole, render, screen } from "../../../../utils/rtl/test-utils.js";
import { TestWrapper } from "../../../../utils/rtl/testWrapper.js";
import { DualPaneOverviewTable } from "../../../../../internal/relationship/ui/components/DualPaneSelection.js";
import { readDocumentAndValidationModel, readModel } from "../../../../mocks/ModelsUtil.js";
import { createGeneralStore } from "../../../../mocks/store/store.js";
import { createActivity } from "../../../../utils/activity.js";
import { TableList } from "../../../../../internal/relationship/index.js";

describe("com.mgmtp.a12.relationshipengine-core.relationship-engine.aria-level", () => {
	describe("DualPanel Selection", () => {
		test("consumes the AriaLevelContext and sets the ariaLevel of the content-box title accordingly", () => {
			const { container } = render(
				<TestWrapper>
					<AriaLevelContext.Provider value={{ ariaLevel: 5 }}>
						<TestDualPane />
					</AriaLevelContext.Provider>
				</TestWrapper>
			);
			const title = getByDataRole(container, DataRoles.Contentbox.Title);
			expect(title.getAttribute("aria-level")).to.equal("5");
			expect(title.getAttribute("role")).to.equal("heading");
		});
	});
	describe("TableList", () => {
		beforeEach(() => {
			const documentModel = readDocumentAndValidationModel("Product-document");
			const overviewModel = readModel("Product-overview");
			const TEST_ACTIVITY_ID = "1";
			render(
				<Provider
					store={createGeneralStore({
						activities: [createActivity({ id: TEST_ACTIVITY_ID })]
					})}>
					<ViewViews.ActivityContext.Provider value={{ activityId: TEST_ACTIVITY_ID }}>
						<TestWrapper>
							<AriaLevelContext.Provider value={{ ariaLevel: 5 }}>
								<TableList
									itemModels={{
										documentModel: documentModel,
										loadingState: "loaded",
										overviewModel: overviewModel as OverviewModel,
										validatorProvider: documentModel.generatedCodeAccessor
									}}
									items={[] as any}
									localizableKeyPrefix=""
									editComponent={() => <TestDualPane />}
									editComponentProps={{}}
									onAddItem={() => {}}
								/>
							</AriaLevelContext.Provider>
						</TestWrapper>
					</ViewViews.ActivityContext.Provider>
				</Provider>
			);
		});

		describe("when opening the edit dialog", async () => {
			test("set the aria level of the title dialog to 1", async () => {
				const button = screen.getByRole("button", { name: /Edit/i });
				button.click();
				const modalOverlay = await findByDataRole(window.document.body, DataRoles.Modal.Overlay);

				const title = (await findAllByDataRole(modalOverlay, DataRoles.Contentbox.Title))[0];

				expect(title.getAttribute("aria-level")).to.equal("1");
				expect(title.getAttribute("role")).to.equal("heading");
			});

			test("set an AriaLevelContext provider with an aria level of 2 which gets consumed by the rendered DualPane", async () => {
				const button = screen.getByRole("button", { name: /Edit/i });
				button.click();
				const modalOverlay = await findByDataRole(window.document.body, DataRoles.Modal.Overlay);

				const dualPane = (await findAllByDataRole(modalOverlay, DataRoles.Contentbox))[1];
				expect(dualPane).to.be.exist;

				const title = getByDataRole(dualPane, DataRoles.Contentbox.Title);
				expect(title.getAttribute("aria-level")).to.equal("2");
				expect(title.getAttribute("role")).to.equal("heading");
			});
		});
	});

	function TestDualPane(): React.ReactNode {
		const documentModel = readDocumentAndValidationModel("Product-document");
		const overviewModel = readModel("Product-overview");

		return (
			<DualPaneOverviewTable
				documentModel={documentModel as DocumentModel}
				filter={{ activeFilters: {}, onFilterChanged: () => {} }}
				items={[]}
				loading={false}
				onToggleState={() => {}}
				overviewModel={overviewModel as OverviewModel}
				paging={{}}
				showMutationIcon={false}
				title="Test"
			/>
		);
	}
});

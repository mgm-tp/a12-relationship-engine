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
import { Mock, type IMock } from "typemoq";
import { expectSaga } from "redux-saga-test-plan";
import { test, assert, expect, describe } from "vitest";
import { render, waitFor } from "@testing-library/react";

import type { Header } from "@com.mgmtp.a12.base/base-model-api";
import type { DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import { type Activity, ActivityActions, NEW_INSTANCE_IDENTIFIER } from "@com.mgmtp.a12.client/client-core";

import { createView } from "../../../utils/activity.js";
import { TestWrapper } from "../../../utils/testWrapper.js";
import { CRUDActions } from "../../../../internal/actions.js";
import { CRUDFactories } from "../../../../internal/factories.js";
import { createGeneralStore } from "../../../mocks/store/store.js";
import { createStoreForOverviewEngine } from "../../../mocks/store/storeForEngine.js";
import { readOverviewModel, readDocumentAndValidationModel } from "../../../mocks/ModelsUtil.js";

describe("com.mgmtp.a12.crud.lib.extensions.crud.factories", () => {
	describe("createSagas", () => {
		describe("returns an array of three anonymous sagas,", () => {
			const sagas = CRUDFactories.createSagas();

			describe("of which the first one", () => {
				const createNewDocumentSaga = sagas[0];

				describe("listen to a CRUDActions.createNewDocument action", () => {
					test("and creates a new document directly when no other child activity is active", () => {
						const activityMockA = createNewActivity("A", { model: "CRUD" });
						const activities = [activityMockA.object];

						const action = CRUDActions.createNewDocument({
							activityId: "A",
							model: "CRUD"
						});

						return expectSaga(createNewDocumentSaga)
							.withState(createGeneralStore({ activities }).getState())
							.dispatch(action)
							.silentRun()
							.then((result) => {
								const { effects } = result;

								expect(effects.put.length).to.be.equal(1, "Expected one put action");

								const payload = effects.put[0].payload.action.payload;
								expect(payload)
									.to.have.property("activity")
									.that.containSubset({
										initiatingActivityId: "A",
										descriptor: {
											model: "CRUD",
											instance: NEW_INSTANCE_IDENTIFIER
										}
									});
							});
					});

					test("and creates a new document directly when no other child activity is active", () => {
						const activityMockA = createNewActivity("A", { model: "CRUD" });
						const activities = [activityMockA.object];

						const action = CRUDActions.createNewDocument({
							activityId: "A",
							model: "CRUD"
						});

						return expectSaga(createNewDocumentSaga)
							.withState(createGeneralStore({ activities }).getState())
							.dispatch(action)
							.silentRun()
							.then((result) => {
								const { effects } = result;

								expect(effects.put.length).to.be.equal(1, "Expected one put action");

								const payload = effects.put[0].payload.action.payload;
								expect(payload)
									.to.have.property("activity")
									.that.containSubset({
										initiatingActivityId: "A",
										descriptor: {
											instance: NEW_INSTANCE_IDENTIFIER,
											model: "CRUD"
										}
									});
							});
					});

					test("and cancels an already opened child activity and creates the new document", () => {
						const activityMockA = createNewActivity("A", { model: "CRUD" });
						const activityMockB = createNewActivity("B", { model: "CRUD", instance: "Document-B" }, "A");
						const activities = [activityMockA.object, activityMockB.object];

						const action = CRUDActions.createNewDocument({
							activityId: "A",
							model: "CRUD"
						});

						return expectSaga(createNewDocumentSaga)
							.withState(createGeneralStore({ activities }).getState())
							.dispatch(action)
							.dispatch(ActivityActions.responseCancelRequested({ cancelled: true }))
							.silentRun()
							.then((result) => {
								const { effects } = result;

								expect(effects.put.length).to.be.equal(1, "Expected one put actions");

								expect(effects.put[0].payload.action.payload).to.have.property("activityIds").that.deep.equals(["B"]);
								expect(effects.put[0].payload.action.payload)
									.to.have.property("replacementActivity")
									.containSubset({
										initiatingActivityId: "A",
										descriptor: {
											instance: NEW_INSTANCE_IDENTIFIER,
											model: "CRUD"
										}
									});
							});
					});

					test("and returns when an already opened the child activity did not get cancelled", () => {
						const activityMockA = createNewActivity("A", { model: "CRUD" });
						const activityMockB = createNewActivity("B", { model: "CRUD", instance: "Document-B" }, "A");
						const activities = [activityMockA.object, activityMockB.object];

						const action = CRUDActions.createNewDocument({
							activityId: "A",
							model: "CRUD"
						});

						return expectSaga(createNewDocumentSaga)
							.withState(createGeneralStore({ activities }).getState())
							.dispatch(action)
							.dispatch(ActivityActions.responseCancelRequested({ cancelled: false }))
							.silentRun()
							.then((result) => {
								const { effects } = result;

								expect(effects.put.length).to.be.equal(1, "Expected one put action");

								expect(effects.put[0].payload.action.payload).to.have.property("activityIds").that.deep.equals(["B"]);
								expect(effects.put[0].payload.action.payload)
									.to.have.property("replacementActivity")
									.containSubset({
										initiatingActivityId: "A",
										descriptor: {
											instance: NEW_INSTANCE_IDENTIFIER,
											model: "CRUD"
										}
									});
							});
					});
				});
			});

			describe("of which the second", () => {
				const selectRowSaga = sagas[1];

				describe("listen to a CRUDActions.selectRow action", () => {
					test("and creates the new document directly when no other child activity is active", () => {
						const activityMockA = createNewActivity("A", { model: "CRUD" });
						const activities = [activityMockA.object];

						const action = CRUDActions.selectRow({
							activityId: "A",
							instanceId: "Document-A"
						});

						return expectSaga(selectRowSaga)
							.withState(
								createGeneralStore({
									activities,
									models: [createMockDm()]
								}).getState()
							)
							.dispatch(action)
							.silentRun()
							.then((result) => {
								const { effects } = result;

								expect(effects.put.length).to.be.equal(1, "Expected one put action");

								const payload = effects.put[0].payload.action.payload;
								expect(payload)
									.to.have.property("activity")
									.that.containSubset({
										initiatingActivityId: "A",
										descriptor: {
											instance: "Document-A",
											model: "CRUD"
										}
									});
							});
					});

					test("and cancels an already opened child activity and creates the new document", () => {
						const activityMockA = createNewActivity("A", { model: "CRUD" });
						const activityMockB = createNewActivity("B", { model: "CRUD", instance: "Document-B" }, "A");
						const activities = [activityMockA.object, activityMockB.object];

						const action = CRUDActions.selectRow({
							activityId: "A",
							instanceId: "Document-C"
						});

						return expectSaga(selectRowSaga)
							.withState(
								createGeneralStore({
									activities,
									models: [createMockDm()]
								}).getState()
							)
							.dispatch(action)
							.dispatch(ActivityActions.responseCancelRequested({ cancelled: true }))
							.silentRun()
							.then((result) => {
								const { effects } = result;

								expect(effects.put.length).to.be.equal(1, "Expected one action");

								expect(effects.put[0].payload.action.payload).to.have.property("activityIds").that.deep.equals(["B"]);
								expect(effects.put[0].payload.action.payload)
									.to.have.property("replacementActivity")
									.containSubset({
										initiatingActivityId: "A",
										descriptor: {
											instance: "Document-C",
											model: "CRUD"
										}
									});
							});
					});

					test("and returns when an already opened the child activity did not get cancelled", () => {
						const activityMockA = createNewActivity("A", { model: "CRUD" });
						const activityMockB = createNewActivity("B", { model: "CRUD", instance: "Document-B" }, "A");
						const activities = [activityMockA.object, activityMockB.object];

						const action = CRUDActions.selectRow({
							activityId: "A",
							instanceId: "Document-C"
						});

						return expectSaga(selectRowSaga)
							.withState(
								createGeneralStore({
									activities,
									models: [createMockDm()]
								}).getState()
							)
							.dispatch(action)
							.dispatch(ActivityActions.responseCancelRequested({ cancelled: false }))
							.silentRun()
							.then((result) => {
								const { effects } = result;

								expect(effects.put.length).to.be.equal(1, "Expected one put action");
								expect(effects.put[0].payload.action.payload).to.have.property("activityIds").that.deep.equals(["B"]);
								expect(effects.put[0].payload.action.payload)
									.to.have.property("replacementActivity")
									.containSubset({
										initiatingActivityId: "A",
										descriptor: {
											instance: "Document-C",
											model: "CRUD"
										}
									});
							});
					});
				});
			});

			describe("of which the third", () => {
				const deleteRowSaga = sagas[2];

				describe("listen to a CRUDActions.deleteRow action", () => {
					test("and removes the row directly when no child activity for this instance is active", () => {
						const activityMockA = createNewActivity("A", { model: "CRUD" });
						const activities = [activityMockA.object];

						const action = CRUDActions.deleteRow({
							activityId: "A",
							instanceId: "Document-A"
						});

						return expectSaga(deleteRowSaga)
							.withState(createGeneralStore({ activities }).getState())
							.dispatch(action)
							.silentRun()
							.then((result) => {
								const { effects } = result;

								expect(effects.put.length).to.be.equal(1, "Expected one put action");
								expect(effects.put[0].payload.action.payload).to.containSubset({
									activityId: "A",
									instanceId: "Document-A"
								});
							});
					});

					test("and cancels an already opened child activity for the same instance before removing the row", () => {
						const activityMockA = createNewActivity("A", { model: "CRUD" });
						const activityMockB = createNewActivity("B", { model: "CRUD", instance: "Document-B" }, "A");
						const activities = [activityMockA.object, activityMockB.object];

						const action = CRUDActions.deleteRow({
							activityId: "A",
							instanceId: "Document-B"
						});

						return expectSaga(deleteRowSaga)
							.withState(createGeneralStore({ activities }).getState())
							.dispatch(action)
							.dispatch(ActivityActions.responseCancelRequested({ cancelled: true }))
							.silentRun()
							.then((result) => {
								const { effects } = result;

								expect(effects.put.length).to.be.equal(2, "Expected two put actions");
								expect(effects.put[0].payload.action.payload).to.have.property("activityIds").that.deep.equals(["B"]);
								expect(effects.put[1].payload.action.payload).to.containSubset({
									activityId: "A",
									instanceId: "Document-B"
								});
							});
					});

					test("and returns when an already opened child activity for the same instance did not get cancelled", () => {
						const activityMockA = createNewActivity("A", { model: "CRUD" });
						const activityMockB = createNewActivity("B", { model: "CRUD", instance: "Document-B" }, "A");
						const activities = [activityMockA.object, activityMockB.object];

						const action = CRUDActions.deleteRow({
							activityId: "A",
							instanceId: "Document-B"
						});

						return expectSaga(deleteRowSaga)
							.withState(createGeneralStore({ activities }).getState())
							.dispatch(action)
							.dispatch(ActivityActions.responseCancelRequested({ cancelled: false }))
							.silentRun()
							.then((result) => {
								const { effects } = result;

								expect(effects.put.length).to.be.equal(1, "Expected one put action");
								expect(effects.put[0].payload.action.payload).to.have.property("activityIds").that.deep.equals(["B"]);
							});
					});
				});
			});
		});
	});

	describe("createViewProvider", () => {
		test("returns a ReactComponent that wraps a OverviewEngine view when the component name is OverviewCRUD", async () => {
			const ViewProvider = CRUDFactories.createCRUDRenderer("OverviewCRUD");

			if (ViewProvider === undefined) {
				assert.fail("Expected a ReactComponent");
			} else {
				const view = createView("A", "View-A");
				const store = createStoreForOverviewEngine({
					activity: { id: "A" },
					models: [readOverviewModel("CRUD-overview"), readDocumentAndValidationModel("CRUD-document")],
					modelGraph: { documentModels: [{ modelId: "CRUD-document", subTypes: [], relations: [] }] },
					withOutDocuments: false
				});
				const { container } = render(
					<TestWrapper>
						<Provider store={store}>
							<ViewProvider {...view} />
						</Provider>
					</TestWrapper>
				);
				await waitFor(() => {
					return expect(container.getElementsByClassName("overview-engine").length).to.be.equal(
						1,
						"Expected one OverviewEngine view"
					);
				});
			}
		});

		test("returns no ReactComponent when the component name is unknown", () => {
			const viewProvider = CRUDFactories.createCRUDRenderer("unknown-name");
			expect(viewProvider).to.be.equal(undefined);
		});
	});
});

function createNewActivity(
	id: string,
	descriptor: { model: string; instance?: string },
	initiatingActivityId?: string
): IMock<Activity> {
	const activityMock = Mock.ofType<Activity>();
	activityMock.setup((x) => x.id).returns(() => id);
	activityMock.setup((x) => x.descriptor).returns(() => descriptor);
	activityMock.setup((x) => x.initiatingActivityId).returns(() => initiatingActivityId);
	activityMock
		.setup((x) => x.dataHolders)
		.returns(() => [
			{
				data: {
					documents: [
						{ id: "Document-A", modelId: "CRUD" },
						{ id: "Document-B", modelId: "CRUD" },
						{ id: "Document-C", modelId: "CRUD" }
					]
				},
				descriptor,
				dirty: false,
				loadingState: "loaded",
				savingState: "not_saved",
				slices: {}
			}
		]);

	return activityMock;
}

function createMockDm(): DocumentModel {
	const dm = Mock.ofType<DocumentModel>();

	dm.setup((d) => d.header).returns(() => ({ id: "CRUD", modelType: "document" }) as Header);

	return dm.object;
}

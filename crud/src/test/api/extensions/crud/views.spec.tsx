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

import type { Store } from "redux";
import { Provider } from "react-redux";
import { userEvent } from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { vi, test, expect, describe, afterAll, beforeAll } from "vitest";

import type { FormModel } from "@com.mgmtp.a12.formengine/formengine-core";
import type { Action } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";
import { type Activity, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import {
	type Events,
	type ComponentMap,
	DefaultComponentMap,
	type OverviewEngineActions,
	type OverviewEngineFactories
} from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import { createView } from "../../../utils/activity.js";
import { CRUDViews } from "../../../../internal/views.js";
import { TestWrapper } from "../../../utils/testWrapper.js";
import type { CRUDActions } from "../../../../internal/actions.js";
import { getByDataRole, getAllByDataRole } from "../../../utils/test-utils.js";
import { createRelationshipServerError } from "../../../mocks/errors/activity-error.js";
import { createJsonRpc2ResponseError } from "../../../mocks/errors/server-exceptions.js";
import { readFormModel, readOverviewModel, readDocumentAndValidationModel } from "../../../mocks/ModelsUtil.js";
import { createStoreForFormEngine, createStoreForOverviewEngine } from "../../../mocks/store/storeForEngine.js";
import type { LegacyRelationshipFormEngineView } from "../../../../internal/components/legacy-relationship-form-engine.js";

describe("com.mgmtp.a12.crud.lib.extensions.crud.views", () => {
	describe("OverviewEngine", () => {
		describe("Renders an overview engine which", () => {
			test("dispatches action to delete a document when a document button is clicked and a delete event is thrown", async () => {
				const { store } = setupOverviewEngineTest();

				const deleteButtons = await screen.findAllByRole("button", { name: "Delete" });
				await userEvent.click(deleteButtons[0]);

				const actions = store.getActions();
				expect(actions).to.have.lengthOf(1, "Expected an action to be dispatched");
				expect(actions[0].type).toEqual("OverviewEngine/EVENT/onRowButtonClickedRequest");
				expect(actions[0].payload.engineAction.payload.rowActionModel.event).toEqual("delete");
			});

			test(
				"dispatches an action to show a document when no custom default row action is defined " +
					"and a document row is clicked",
				async () => {
					const expectedSelectAction: Action<CRUDActions.SelectRowPayload> = {
						type: "CRUD/SELECT_ROW",
						payload: {
							activityId: "A",
							instanceId: "1"
						}
					};
					const { store } = setupOverviewEngineTest();

					const rows = screen.getAllByRole("row");

					await userEvent.click(rows[1]);
					const actions = store.getActions();
					expect(actions).to.have.lengthOf(1, "Expected an action to be dispatched");
					expect(actions[0]).to.be.deep.equal(expectedSelectAction);
				}
			);

			test('dispatches an action to create a new document when an event button is clicked and an "Add" event is thrown', async () => {
				const clickSpy = vi.fn();
				const expectedCreateAction: Action<CRUDActions.CreateNewDocumentPayload> = {
					type: "CRUD/CREATE_NEW_DOCUMENT",
					payload: {
						activityId: "A",
						model: "CRUD-document"
					}
				};
				const { store } = setupOverviewEngineTest(false, clickSpy);

				const addButton = screen.getByRole("button", { name: "Add" });
				await userEvent.click(addButton);
				await waitFor(() => {
					expect(clickSpy).toHaveBeenCalledTimes(1);
				});

				const actions = store.getActions();
				expect(actions).to.have.lengthOf(1, "Expected one action to be dispatched");
				const createAction = actions[0];
				expect(createAction).to.be.deep.equal(expectedCreateAction);
			});

			test.skip('dispatches an action to delete documents when an event button is clicked and an "delete_selected" event is thrown', async () => {
				const expectedCreateAction: Action<
					OverviewEngineActions.EventPayload<Action<Events.EventButtonClickedPayload>>
				> = {
					type: "OverviewEngine/EVENT/onEventButtonClicked",
					payload: {
						activityId: "A",
						engineAction: {
							type: "EVENT/onEventButtonClicked",
							payload: {
								event: "delete_selected",
								button: {
									event: "delete_selected"
								}
							}
						}
					}
				};
				const { store } = setupOverviewEngineTest();

				await userEvent.click(screen.getByRole("button", { name: "Expand functions for bulk operation" }));

				const actions = store.getActions();
				expect(actions).to.have.lengthOf(1, "Expected one action to be dispatched");
				const createAction = actions[0];
				expect(createAction).to.be.deep.equal(expectedCreateAction);
			});

			test("uses the component factory that was passed via props", () => {
				const componentMap: ComponentMap = {
					...DefaultComponentMap,
					OverviewHeading: () => <div>Custom Overview Heading</div>
				};
				setupOverviewEngineTest(false, undefined, {
					componentMap: componentMap
				});

				expect(screen.getByText("Custom Overview Heading")).toBeDefined();
			});
		});
	});

	describe("FormEngine", () => {
		// let boundModelElementStub;

		beforeAll(() => {
			// boundModelElementStub = vi.spyOn(RelationshipSelectors, "boundModelElement");
		});

		afterAll(() => {
			// boundModelElementStub.restore();
		});

		describe("Given a form model and certain binding configurations", () => {
			beforeAll(() => {
				// const bindingMock: Relationship.UiConfigurationBinding = {
				// 	elementId: "relationship-section",
				// 	type: "relationship",
				// 	details: {
				// 		name: "",
				// 		relationshipName: "",
				// 		targetRole: "",
				// 		components: [],
				// 		metaInformation: { version: "1.0.0" }
				// 	}
				// };
				// boundModelElementStub.callsFake((_state, _id, modelElementId) =>
				// 	modelElementId === "relationship-section" ? bindingMock : undefined
				// );
			});

			afterAll(() => {
				// boundModelElementStub.restore();
			});

			describe("and no errors", () => {
				test.skip("renders a form engine with a relationship engine", () => {
					setupFormEngineTest();

					expect(screen.getByText("CRUD Form")).toBeInTheDocument();

					expect(document.getElementById("relationship-section")).toBeInTheDocument();
				});
			});

			describe.skip("and one error", () => {
				describe("of type 'RELATIONSHIP_SERVER_ERROR'", () => {
					describe("and of level 'ERROR'", () => {
						test("renders a form engine with a relationship engine and an error messagebox", () => {
							const error = createRelationshipServerError([createJsonRpc2ResponseError("ERROR")]);
							setupFormEngineTest(error);
							expect(screen.getByText("CRUD Form")).toBeInTheDocument();

							expect(document.getElementById("relationship-section")).toBeInTheDocument();
							const messageBox = getByDataRole(document.body, "messagebox");
							expect(messageBox).toBeInTheDocument();

							expect(getByDataRole(messageBox, "messagebox-label")).toHaveTextContent("test");
							expect(getByDataRole(messageBox, "messagebox-title")).toHaveTextContent("Error");
						});
					});

					describe("and of level 'WARNING'", () => {
						test("renders a form engine with a relationship engine and an warning messagebox", () => {
							const warning = createRelationshipServerError([createJsonRpc2ResponseError("WARNING")]);

							setupFormEngineTest(warning);
							expect(screen.getByText("CRUD Form")).toBeInTheDocument();

							expect(document.getElementById("relationship-section")).toBeInTheDocument();
							const messageBox = getByDataRole(document.body, "messagebox");
							expect(messageBox).toBeInTheDocument();

							expect(getByDataRole(messageBox, "messagebox-label")).toHaveTextContent("test");
							expect(getByDataRole(messageBox, "messagebox-title")).toHaveTextContent("Warning");
						});
					});

					describe("and of level 'INFO'", () => {
						test("renders a form engine with a relationship engine and an info messagebox", () => {
							const info = createRelationshipServerError([createJsonRpc2ResponseError("INFO")]);

							setupFormEngineTest(info);
							expect(screen.getByText("CRUD Form")).toBeInTheDocument();

							expect(document.getElementById("relationship-section")).toBeInTheDocument();
							const messageBox = getByDataRole(document.body, "messagebox");
							expect(messageBox).toBeInTheDocument();

							expect(getByDataRole(messageBox, "messagebox-label")).toHaveTextContent("test");
							expect(getByDataRole(messageBox, "messagebox-title")).toHaveTextContent("Info");
						});
					});
				});
			});

			describe.skip("and multiple errors", () => {
				describe("of type 'RELATIONSHIP_SERVER_ERROR'", () => {
					test("renders a form engine with a relationship engine and a message box with a list", () => {
						const error = createRelationshipServerError([
							createJsonRpc2ResponseError("ERROR", "error1"),
							createJsonRpc2ResponseError("ERROR", "error2")
						]);

						setupFormEngineTest(error);
						expect(screen.getByText("CRUD Form")).toBeInTheDocument();

						expect(document.getElementById("relationship-section")).toBeInTheDocument();

						const messageBox = getByDataRole(document.body, "messagebox");
						expect(messageBox).toBeInTheDocument();

						const list = getByDataRole(messageBox, "list");
						expect(list).toBeInTheDocument();

						const items = getAllByDataRole(list, "list-item");
						expect(items).toHaveLength(2);
					});
				});
			});
		});
	});
});

function setupOverviewEngineTest(
	withOutDocuments?: boolean,
	onEventButtonClick?: (event: string) => void,
	additionalProps?: Partial<OverviewEngineFactories.ViewComponentProps>
) {
	const store = createStoreForOverviewEngine({
		activity: { id: "A" },
		models: [readOverviewModel("CRUD-overview"), readDocumentAndValidationModel("CRUD-document")],
		modelGraph: { documentModels: [{ modelId: "CRUD-document", subTypes: [], relations: [] }] },
		withOutDocuments
	});

	const activity = ActivitySelectors.activityById("A")(store.getState());

	const component = CRUDViews.OverviewEngineView;
	const rendered = mountOverviewEngine(store, component, activity, onEventButtonClick, additionalProps);

	return { rendered, store };
}

function setupFormEngineTest(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	error?: Activity.Error<any>
) {
	const formModel = readFormModel("CRUD-form");
	const documentAndValidationModel = readDocumentAndValidationModel("CRUD-document");

	const formModelWithRelationshipComponent: FormModel = {
		...formModel,
		content: {
			...formModel.content,
			screens: [
				{
					...formModel.content.screens[0],
					screenElements: [
						...formModel.content.screens[0].screenElements,
						{
							type: "CustomScreenElement",
							id: "relationship-section",
							name: "relationship-section"
						}
					]
				}
			]
		}
	};

	const store = createStoreForFormEngine({
		activity: { id: "A", error },
		models: [formModelWithRelationshipComponent, documentAndValidationModel]
	});

	const activity = ActivitySelectors.activityById("A")(store.getState());

	const component = CRUDViews.FormEngineView;
	mountFormEngine(store, component, activity);

	return { store };
}

function mountOverviewEngine(
	store: Store<object>,
	Component: React.ComponentType<OverviewEngineFactories.ViewComponentProps>,
	activity?: Activity,
	onEventButtonClick?: (event: string) => void,
	additionalProps?: Partial<OverviewEngineFactories.ViewComponentProps>
) {
	if (!activity) {
		throw new Error(`Activity not found`);
	}

	const view = createView("A", "View-A");

	const eventHandlers: OverviewEngineFactories.ViewComponentProps["eventHandlers"] = onEventButtonClick
		? {
				onEventButtonClick: onEventButtonClick
			}
		: undefined;

	return render(
		<TestWrapper>
			<Provider store={store}>
				<Component
					name={view.name}
					modelDescriptors={view.modelDescriptors}
					activityId={activity.id}
					eventHandlers={eventHandlers}
					{...additionalProps}
				/>
			</Provider>
		</TestWrapper>
	);
}

function mountFormEngine(
	store: Store<object>,
	Component: React.ComponentType<LegacyRelationshipFormEngineView.Props>,
	activity?: Activity,
	additionalProps?: Partial<LegacyRelationshipFormEngineView.Props>
) {
	if (!activity) {
		throw new Error(`Activity not found`);
	}

	const view = createView("A", "View-A");

	return render(
		<TestWrapper>
			<Provider store={store}>
				<Component
					name={view.name}
					modelDescriptors={view.modelDescriptors}
					activityId={activity.id}
					disableScrollToTopLevelScreen
					{...additionalProps}
				/>
			</Provider>
		</TestWrapper>
	);
}

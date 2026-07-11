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

import type { MockStore } from "redux-mock-store";
import type { Middleware, MiddlewareAPI } from "redux";
import { vi, test, expect, describe, beforeEach } from "vitest";

import { type Activity, ActivityActions, type ApplicationModel } from "@com.mgmtp.a12.client/client-core";
import {
	Events,
	Commands,
	createUIState,
	FormEngineActions,
	FormEngineSelectors
} from "@com.mgmtp.a12.formengine/formengine-core";

import { createTestModels } from "../../mocks/ModelsUtil.js";
import { toChangeMap } from "../../../internal/cdm/commons/utils.js";
import { CddActions } from "../../../internal/cdm/cdd/redux/index.js";
import dg from "../../mocks/scdm/loadDG/dg.json" with { type: "json" };
import { toCdd } from "../../../internal/cdm/cdd/core/adapter/toCdd.js";
import { DgActions } from "../../../internal/documentGraph/redux/index.js";
import { createActivity, createDataHolder } from "../../utils/activity.js";
import contractCDM from "../testData/ContractCDM.json" with { type: "json" };
import { newCddState } from "../../../internal/cdm/cdd/core/impl/cddStateImpl.js";
import { createModelGraph, createGeneralStore } from "../../mocks/store/store.js";
import { deserializeDocumentModel } from "../../../internal/cdm/commons/modelUtils.js";
import { createLinkRef, createLinkDescriptor } from "../../mocks/relationships/mocks.js";
import { newChangeLog } from "../../../internal/documentGraph/core/changeLog/changeLogImpl.js";
import type { DeepReadonly, DocumentGraph } from "../../../internal/documentGraph/core/index.js";
import cdmFormEngineChangeLogMiddleware from "../../../internal/cdm/cdd/redux/cdm_fe_changelog.js";
import { createScdmComputationMiddleware } from "../../../internal/cdm/cdd/redux/scdm_computations.js";
import { createMiddlewareAPIWrapper } from "../../../internal/cdm/cdd/redux/cddMiddlewareAdapterFactory.js";

import appModel from "./SimpleCDM.appmodel.json" with { type: "json" };
import cddDocument from "./Contract24CddWithSinceNull.json" with { type: "json" };

describe("com.mgmtp.a12.relationshipengine-core.extensions.cdm.cdd", () => {
	const testActivityId = "123";

	const cdm = deserializeDocumentModel(contractCDM);
	const rootGroup = cdm.content.modelRoot;
	const documentGraph = dg as DeepReadonly<DocumentGraph>;
	const changeLog = newChangeLog();
	const cdd = toCdd(documentGraph, "Contract-document/24", rootGroup);
	const cddState = {
		...newCddState("Contract-document/24", cdm),
		cdd,
		cachedCdd: {
			cdd: cddDocument,
			snapshotChangeCounter: 5
		}
	};

	function createStoreWithMiddleware(middleware?: Middleware, activityDataHolderData?: Activity.DataHolder["data"]) {
		const defaultDataHolder = createDataHolder({
			descriptor: {
				section: "Relationships",
				model: "ContractCDM",
				instance: "Contract-document/24"
			},
			dirty: false,
			data: activityDataHolderData ?? { cddState, documentGraph, changeLog },
			slices: {
				uiState: createUIState({
					screenLocation: [{ path: [], locationPath: [{ elementName: "contract" }] }]
				})
			}
		});

		const modelDescriptors = [
			{
				name: "ContractCDM",
				modelType: "document"
			},
			{
				name: "ContractCDM-form",
				modelType: "form"
			}
		];

		return createGeneralStore({
			middlewares: middleware ? [middleware] : undefined,
			models: createTestModels(modelDescriptors),
			applicationModel: appModel as ApplicationModel,
			activities: [
				createActivity({
					id: testActivityId,
					descriptor: {
						section: "Relationships",
						model: "ContractCDM",
						instance: "Contract-document/24"
					},
					dataHolders: [defaultDataHolder]
				})
			]
		});
	}

	/**
	 * The actual cddFormEngineMiddlewareAdapter is not tested on its own here
	 * because its currently not clear how to achieve this.
	 * For coverage, the inner logic of catching and re-dispatching actions is tested
	 * via createMiddlewareAPIWrapper
	 */
	describe("createMiddlewareAPIWrapper", () => {
		const dispatchSpy = vi.fn();

		let clientStore: MockStore;
		let mockApi: MiddlewareAPI;
		let middlewareApi: MiddlewareAPI;

		beforeEach(() => {
			clientStore = createStoreWithMiddleware();
			mockApi = {
				getState() {
					return clientStore.getState();
				},
				dispatch: dispatchSpy
			};
			middlewareApi = createMiddlewareAPIWrapper(
				mockApi,
				testActivityId,
				FormEngineSelectors.engineState(testActivityId)
			);
		});

		describe("if the client state contains cdd data", () => {
			test("maps a Commands.setDocument action from FE to a CddActions.changeCddDocument action", () => {
				const mockDocument = { field: "value" };
				const mockChanges = [
					{
						type: "ValueChanged" as const,
						path: [
							{
								elementName: "e1",
								index: 1
							},
							{
								elementName: "e2",
								index: 1
							}
						]
					},
					{
						type: "ValueChanged" as const,
						path: [
							{
								elementName: "e3",
								index: 1
							},
							{
								elementName: "e4",
								index: 1
							}
						]
					}
				];

				const feAction = Commands.setDocument({ document: mockDocument, changes: mockChanges });
				middlewareApi.dispatch(feAction);

				const mappedAction = CddActions.changeCddDocument({
					activityId: testActivityId,
					document: mockDocument,
					changes: toChangeMap(mockChanges),
					modelGraph: createModelGraph()
				});

				expect(dispatchSpy).toHaveBeenCalledTimes(1);
				expect(dispatchSpy).toHaveBeenCalledWith(mappedAction);
			});
		});

		describe("if the client state does not contain cdd data", () => {
			test("maps a Commands.setDocument action from FE to an ActivityActions.setData action", () => {
				const mockDocument = { field: "value" };
				const mockChanges = [
					{
						type: "ValueChanged" as const,
						path: [
							{
								elementName: "e1",
								index: 1
							},
							{
								elementName: "e2",
								index: 1
							}
						]
					},
					{
						type: "ValueChanged" as const,
						path: [
							{
								elementName: "e3",
								index: 1
							},
							{
								elementName: "e4",
								index: 1
							}
						]
					}
				];

				// Creates default form engine data
				const defaultData = { dirty: false, document: {} };

				const clientStoreWithoutCdd = createStoreWithMiddleware(undefined, defaultData);

				const mockApi = {
					getState() {
						return clientStoreWithoutCdd.getState();
					},
					dispatch: dispatchSpy
				};
				const middlewareApi = createMiddlewareAPIWrapper(
					mockApi,
					testActivityId,
					FormEngineSelectors.engineState(testActivityId)
				);

				const feAction = Commands.setDocument({ document: mockDocument, changes: mockChanges });
				middlewareApi.dispatch(feAction);

				const mappedAction = ActivityActions.setData({
					activityId: testActivityId,
					data: { document: mockDocument }
				});

				expect(dispatchSpy).toHaveBeenCalledTimes(1);
				expect(dispatchSpy).toHaveBeenCalledWith(mappedAction);
			});
		});

		test("maps a Commands.setDataDirty action from FE to an ActivityActions.setDirty action", () => {
			const feAction = Commands.setDataDirty(true);
			middlewareApi.dispatch(feAction);

			const mappedAction = ActivityActions.setDirty({ dirty: true, activityId: testActivityId });

			expect(dispatchSpy).toHaveBeenCalledTimes(1);
			expect(dispatchSpy).toHaveBeenCalledWith(mappedAction);
		});

		test("wraps a FE command action", () => {
			const feAction = Commands.setReadonly(true);
			middlewareApi.dispatch(feAction);

			const mappedAction = FormEngineActions.command({
				activityId: testActivityId,
				engineEvent: feAction
			});

			expect(dispatchSpy).toHaveBeenCalledTimes(1);
			expect(dispatchSpy).toHaveBeenCalledWith(mappedAction);
		});

		test("maps a Commands.changeScreenState action from FE with the dirty prop set to an ActivityActions.setDirty action before wrapping it", () => {
			const feAction = Commands.changeScreenState({ index: 1, dirty: true });
			middlewareApi.dispatch(feAction);

			const dirtyAction = ActivityActions.setDirty({ dirty: true, activityId: testActivityId });

			const mappedAction = FormEngineActions.command({
				activityId: testActivityId,
				engineEvent: feAction
			});

			expect(dispatchSpy).toHaveBeenCalledTimes(2);
			expect(dispatchSpy.mock.calls[0][0]).to.be.deep.equal(dirtyAction);
			expect(dispatchSpy.mock.calls[1][0]).to.be.deep.equal(mappedAction);
		});

		test("does not map a Commands.changeScreenState action from FE without the dirty prop set to an ActivityActions.setDirty action before wrapping it", () => {
			const feAction = Commands.changeScreenState({ index: 1, path: [] });
			middlewareApi.dispatch(feAction);

			const mappedAction = ActivityActions.setDirty({ dirty: true, activityId: testActivityId });

			expect(dispatchSpy).toHaveBeenCalledTimes(1);
			expect(dispatchSpy.mock.calls[0][0]).not.to.be.deep.equal(mappedAction);
		});

		test("wraps a FE event action", () => {
			const feAction = Events.inputTouched();
			middlewareApi.dispatch(feAction);

			const mappedAction = FormEngineActions.event({
				activityId: testActivityId,
				engineEvent: feAction
			});

			expect(dispatchSpy).toHaveBeenCalledTimes(1);
			expect(dispatchSpy.mock.calls[0][0]).to.be.deep.equal(mappedAction);
		});
	});

	describe("cdmFormEngineChangeLogMiddleware", () => {
		test("does nothing if dispatched action is not of type FormEngineActions.event or .command", () => {
			const store = createStoreWithMiddleware(cdmFormEngineChangeLogMiddleware);
			const action = ActivityActions.cancel({ activityId: "1" });

			store.dispatch(action);
			expect(store.getActions()).to.be.deep.equal([action]);
		});

		test("does nothing if activity data holder does not contain documentGraph and changeLog", () => {
			const store = createStoreWithMiddleware(cdmFormEngineChangeLogMiddleware, { field: "value" });

			const feAction = Commands.pushBackup({ document: {}, messages: {} });
			const action = FormEngineActions.event({ activityId: testActivityId, engineEvent: feAction });

			store.dispatch(action);
			expect(store.getActions()).to.be.deep.equal([action]);
		});

		test("dispatches a beginTransaction action when Commands.pushBackup was dispatched", () => {
			const store = createStoreWithMiddleware(cdmFormEngineChangeLogMiddleware);
			const feAction = Commands.pushBackup({ document: {}, messages: {} });
			const action = FormEngineActions.event({ activityId: testActivityId, engineEvent: feAction });

			const expectedAction = DgActions.beginTransaction({
				activityId: testActivityId,
				id: "repeat"
			});

			store.dispatch(action);
			expect(store.getActions()).to.be.deep.equal([expectedAction, action]);
		});

		test("dispatches an endTransaction action with outcome=commit when Commands.dropBackup was dispatched with trigger=apply", () => {
			const store = createStoreWithMiddleware(cdmFormEngineChangeLogMiddleware);
			const feAction = Commands.dropBackup({ trigger: "apply" });
			const action = FormEngineActions.event({ activityId: testActivityId, engineEvent: feAction });

			const expectedAction = DgActions.endTransaction({
				activityId: testActivityId,
				outcome: "commit",
				setDirty: true
			});

			store.dispatch(action);
			expect(store.getActions()).to.be.deep.equal([expectedAction, action]);
		});

		test("dispatches an endTransaction action with outcome=rollback when Commands.dropBackup was dispatched with trigger=cancel", () => {
			const store = createStoreWithMiddleware(cdmFormEngineChangeLogMiddleware);
			const feAction = Commands.dropBackup({ trigger: "cancel" });
			const action = FormEngineActions.event({ activityId: testActivityId, engineEvent: feAction });

			const expectedAction = DgActions.endTransaction({
				activityId: testActivityId,
				outcome: "rollback",
				setDirty: undefined
			});

			store.dispatch(action);
			expect(store.getActions()).to.be.deep.equal([expectedAction, action]);
		});
	});

	describe("ScdmComputationMiddleware", () => {
		const middleware = createScdmComputationMiddleware();

		test("does nothing if dispatched action does not change the document graph", () => {
			const store = createStoreWithMiddleware(middleware);
			const someAction = ActivityActions.cancel({ activityId: "1" });

			store.dispatch(someAction);
			expect(store.getActions()).to.be.deep.equal([someAction]);
		});

		test("runs computations and dispatches CddActions.changeCddDocument on CDDActions.merge", () => {
			const store = createStoreWithMiddleware(middleware);
			const mergeAction = CddActions.merge({
				activityId: testActivityId,
				cdm,
				documentGraph,
				rootDoc: "Contract-document/24",
				path: ""
			});

			store.dispatch(mergeAction);
			const dispatchedAction = store.getActions()[1];

			expect(dispatchedAction.payload).to.containSubset({
				activityId: testActivityId,
				document: cddDocument
			});
			expect(dispatchedAction.type).to.be.deep.equal(CddActions.changeCddDocument.type);
		});

		test("runs computations and dispatches CddActions.changeCddDocument on CDDActions.addCddLink", () => {
			const store = createStoreWithMiddleware(middleware);
			const addLinkAction = CddActions.addCddLink({
				targetRole: "test",
				activityId: testActivityId,
				linkDescriptor: createLinkDescriptor(
					"CoInsurer",
					"Contract-document/24",
					"contract",
					"BusinessPartner-document/23",
					"businessPartner"
				),
				setDirty: true
			});

			store.dispatch(addLinkAction);
			const dispatchedAction = store.getActions()[1];

			expect(dispatchedAction.payload).to.containSubset({
				activityId: testActivityId,
				document: cddDocument
			});
			expect(dispatchedAction.type).to.be.deep.equal(CddActions.changeCddDocument.type);
		});

		test("runs computations and dispatches CddActions.changeCddDocument on DgActions.removeLink", () => {
			const store = createStoreWithMiddleware(middleware);
			const removeLinkAction = CddActions.removedCddLink({
				activityId: testActivityId,
				linkRef: createLinkRef({
					id: "1",
					docRef1: "Contract-document/24",
					docRef2: "BusinessPartner-document/21",
					role1: "contract",
					role2: "businessPartner",
					relationshipModel: "PolicyHolder"
				}),
				setDirty: true
			});

			store.dispatch(removeLinkAction);
			const dispatchedAction = store.getActions()[1];

			expect(dispatchedAction.payload).to.containSubset({
				activityId: testActivityId,
				document: cddDocument
			});
			expect(dispatchedAction.type).to.be.deep.equal(CddActions.changeCddDocument.type);
		});
	});
});

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

import * as TypeMoq from "typemoq";
import type { Action } from "redux";
import { fork, select } from "typed-redux-saga";
import { expectSaga } from "redux-saga-test-plan";
import * as matchers from "redux-saga-test-plan/matchers.js";
import { vi, test, expect, describe, afterAll, beforeAll, type Mock, type MockInstance } from "vitest";

import type { FormModel } from "@com.mgmtp.a12.formengine/formengine-core";
import type { ModelGraph, JsonRpc2Request } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { ConnectorLocator, RestServerConnector, type RestRequestPayload } from "@com.mgmtp.a12.utils/utils-connector";
import {
	type Model,
	type Activity,
	ModelSelectors,
	ActivityActions,
	type ActivityMap,
	ActivitySelectors,
	type DataProvider,
	NEW_INSTANCE_IDENTIFIER
} from "@com.mgmtp.a12.client/client-core";

import { US_LOCALE } from "../../utils/localization.js";
import { createActivity } from "../../utils/activity.js";
import { createTestModels } from "../../mocks/ModelsUtil.js";
import { createGeneralStore } from "../../mocks/store/store.js";
import documentGraph from "../testData/dg.json" with { type: "json" };
import Contract24Cdd from "../cdd/Contract24Cdd.json" with { type: "json" };
import contractCDM from "../testData/ContractCDM.json" with { type: "json" };
import { CDD_DOC_REF } from "../../../internal/cdm/cdmCommons/cddTechnical.js";
import { CddActions, CddSelectors } from "../../../internal/cdm/cdd/redux/index.js";
import * as CreateInitial from "../../../internal/cdm/cddUtils/createInitialDgCl.js";
import { loadDG, type CDDQuery } from "../../../internal/cdm/dataProvider/loadDG.js";
import { createLinkRef, createModelsMock } from "../../mocks/relationships/mocks.js";
import { deserializeDocumentModel } from "../../../internal/cdm/commons/modelUtils.js";
import { RequestBuilder } from "../../../internal/server-connectors/requestBuilder.js";
import type { ScdmDataHolderShape } from "../../../internal/cdm/cdd/redux/dhReducersImpl.js";
import { toCddChanges } from "../../../internal/cdm/dataProvider/StandaloneActivityHandler.js";
import type { DocumentGraphReferences } from "../../../internal/cdm/cdd/core/adapter/fromCdd.js";
import { resolveModels, cddDataProvider } from "../../../internal/cdm/dataProvider/cddDataProvider.js";
import type { EffectiveChangeList } from "../../../internal/cdm/cdd/core/effectiveChanges/toEffectiveChanges.js";
import { convertToInternalRepresentation } from "../../../internal/cdm/dataProvider/convertToInternalRepresentation.js";
import {
	type DgChange,
	type DgChangeLog,
	type DeepReadonly,
	type DocumentGraph,
	generateLinkDocDocRef
} from "../../../internal/documentGraph/core/index.js";

import { createLinkMutation } from "./testSetup.js";

describe("com.mgmtp.a12.relationshipengine-core.extensions.cdm.data-provider", () => {
	const provideDataFn = cddDataProvider.provideData.bind(cddDataProvider);

	describe("canHandle", () => {
		describe("given a load operation", () => {
			test("returns true if the given dataHolder is the default dh for a cdd activity", async () => {
				const config = mockCanHandleConfig({
					operation: "load",
					cddDataHolder: true
				});

				const returnValue = cddDataProvider.canHandle(config);
				expect(returnValue).to.be.equal(false);
			});

			test("returns false otherwise", async () => {
				const config = mockCanHandleConfig({
					operation: "load",
					cddDataHolder: false
				});
				const returnValue = cddDataProvider.canHandle(config);
				expect(returnValue).to.be.equal(false);
			});
		});

		describe("given a save operation", () => {
			test("returns true if the given activity is a cdd activity", async () => {
				const config = mockCanHandleConfig({
					operation: "save",
					cddActivity: true
				});
				const returnValue = cddDataProvider.canHandle(config);
				expect(returnValue).to.be.equal(true);
			});

			test("returns false otherwise", async () => {
				const config = mockCanHandleConfig({
					operation: "save",
					cddActivity: false
				});
				const returnValue = cddDataProvider.canHandle(config);
				expect(returnValue).to.be.equal(false);
			});
		});

		describe("given a delete operation", () => {
			test("returns false", async () => {
				const config = mockCanHandleConfig({ operation: "delete" });
				const returnValue = cddDataProvider.canHandle(config);
				expect(returnValue).to.be.equal(false);
			});
		});
	});

	describe("provideData", () => {
		let activityByIdSelectorStub: MockInstance;

		describe("load", () => {
			beforeAll(() => {
				let counter = 1;
				activityByIdSelectorStub = vi.spyOn(ActivitySelectors, "activityById").mockReturnValue(() => {
					return makeActivity(`${counter++}`, "Contract-document/24");
				});
			});

			afterAll(() => {
				activityByIdSelectorStub.mockRestore();
			});

			test("Load initial data", () => {
				const activityId = "1";

				const loadDataConfig: DataProvider.ProvideDataConfig = {
					activityId,
					dataHolders: [],
					details: {},
					operation: "load"
				};

				const mockServerDg = { documents: [], links: [] };

				const cdm = deserializeDocumentModel(contractCDM);
				const cdmQuery: CDDQuery = {
					activityId,
					cdmName: cdm.header.id,
					queryRoot: { path: "", docRef: "Contract-document/24" }
				};

				const modelsTask = {
					toPromise() {
						return Promise.resolve({ documentModel: cdm });
					}
				};

				return expectSaga(provideDataFn, loadDataConfig)
					.provide([
						[select(CddSelectors.missingPathSelector(activityId)), [cdmQuery.queryRoot]],
						[matchers.fork.fn(resolveModels), modelsTask],
						[matchers.call.fn(loadDG), mockServerDg],
						[matchers.call.fn(convertToInternalRepresentation), documentGraph]
					])
					.withState(createGeneralStore({}).getState())
					.put(
						CddActions.merge({
							path: "",
							documentGraph: documentGraph as DeepReadonly<DocumentGraph>,
							cdm,
							rootDoc: cdmQuery.queryRoot.docRef,
							activityId
						})
					)
					.run();
			});
		});

		describe("create", () => {
			let modelGraphSelectorStub: MockInstance;
			let modelsInSceneSelectorStub: MockInstance;

			beforeAll(() => {
				let counter = 1;
				activityByIdSelectorStub = vi.spyOn(ActivitySelectors, "activityById").mockReturnValue(() => {
					if (counter === 1) {
						return makeActivity(`${counter++}`, NEW_INSTANCE_IDENTIFIER);
					} else {
						return undefined;
					}
				});
				modelGraphSelectorStub = vi.spyOn(ModelSelectors, "modelGraph").mockReturnValue(() => ({}) as ModelGraph);
				modelsInSceneSelectorStub = vi.spyOn(ModelSelectors, "allModelsInScene").mockReturnValue(() => []);
			});

			afterAll(() => {
				activityByIdSelectorStub.mockRestore();
				modelGraphSelectorStub.mockRestore();
				modelsInSceneSelectorStub.mockRestore();
			});

			test("Create new data", () => {
				const activityId = "1";
				const loadDataConfig: DataProvider.ProvideDataConfig = {
					activityId,
					dataHolders: [],
					details: {},
					operation: "load"
				};

				const cdm = deserializeDocumentModel(contractCDM);
				const formModel = TypeMoq.Mock.ofType<FormModel>().object;

				const modelsTask = {
					toPromise() {
						return Promise.resolve({ documentModel: cdm, formModel });
					}
				};

				const documentGraph: DeepReadonly<DocumentGraph> = {
					documents: {
						byDocRef: {
							[CDD_DOC_REF]: {
								docRef: CDD_DOC_REF,
								document: {},
								documentModelName: "ContractCDM",
								loadingState: "loaded"
							},
							[NEW_INSTANCE_IDENTIFIER]: {
								docRef: NEW_INSTANCE_IDENTIFIER,
								document: {},
								documentModelName: "Contract-document",
								loadingState: "loaded"
							}
						}
					},
					links: { byId: {}, linkIdsByDocId: {} }
				};
				const changeLog: DgChangeLog = {
					changeCounter: 1,
					changes: [
						{
							kind: "docAdded",
							docRef: NEW_INSTANCE_IDENTIFIER
						}
					]
				};

				return expectSaga(provideDataFn, loadDataConfig)
					.provide([
						[matchers.fork.fn(resolveModels), modelsTask],
						[matchers.call.fn(CreateInitial.createInitialDgCl), { documentGraph, changeLog }]
					])
					.put(
						CddActions.merge({
							cdm,
							path: "",
							documentGraph,
							changeLog,
							rootDoc: NEW_INSTANCE_IDENTIFIER,
							activityId
						})
					)
					.run();
			});
		});

		describe("delete", () => {
			let errorLogStub: MockInstance;
			beforeAll(() => {
				errorLogStub = vi.spyOn(console, "error").mockImplementation(() => {});
			});

			afterAll(() => {
				errorLogStub.mockRestore();
			});

			test("throws when trying to delete", () => {
				const deleteDataConfig: DataProvider.ProvideDataConfig = {
					activityId: "1",
					dataHolders: [],
					details: { instanceId: "1" },
					operation: "delete"
				};

				return expectSaga(provideDataFn, deleteDataConfig)
					.run()
					.catch((error) => {
						expect(error.message).to.be.equal("Delete is not supported on CDM activities.");
					});
			});
		});

		function makeActivity(id: string, instanceId?: string) {
			return {
				id,
				activationTimestamp: 1,
				descriptor: { model: "Contract-document", instance: instanceId },
				slices: {},
				dataHolders: []
			};
		}

		test("save - toCddChanges", () => {
			const changeListFromDocumentGraph: EffectiveChangeList = {
				documents: [
					{
						document: {
							docRef: "addedDoc/1",
							content: {},
							documentModelName: "doc"
						},
						mutation: "added"
					},
					{
						document: {
							docRef: "addedDoc/2",
							content: {},
							documentModelName: "doc"
						},
						mutation: "added"
					},
					{
						document: {
							docRef: "modifiedDoc/1",
							content: {},
							documentModelName: "doc"
						},
						mutation: "modified"
					},
					{
						document: {
							docRef: "modifiedDoc/2",
							content: {},
							documentModelName: "doc"
						},
						mutation: "modified"
					},
					{
						document: {
							docRef: "removedDoc/1",
							content: {},
							documentModelName: "doc"
						},
						mutation: "removed"
					},
					{
						document: {
							docRef: "removedDoc/2",
							content: {},
							documentModelName: "doc"
						},
						mutation: "removed"
					}
				],
				links: [
					createLinkMutation("added", "1", "rm1", "addedDoc/1", "left", "modifiedDoc/1", "right"),
					createLinkMutation("added", "2", "rm1", "addedDoc/2", "left", "modifiedDoc/2", "right"),
					createLinkMutation("removed", "3", "rm2", "modifiedDoc/1", "left", "modifiedDoc/2", "right"),
					createLinkMutation("removed", "4", "rm3", "modifiedDoc/2", "left", "modifiedDoc/1", "right"),
					createLinkMutation("existing", "5", "rm4", "someDoc/1", "left", "someDoc/2", "right"),
					createLinkMutation("existing", "6", "rm4", "someDoc/3", "left", "someDoc/4", "right")
				]
			};

			const contentsOfCdd: DocumentGraphReferences = {
				docRefs: [
					"anotherDoc/1",
					"addedDoc/1",
					"addedDoc/3",
					"addedDoc/4",
					"modifiedDoc/1",
					"modifiedDoc/4",
					"modifiedDoc/5",
					"someDoc/1",
					"someDoc/2"
				],
				linkIds: ["7", "8", "1", "5"]
			};

			const filteredResult = toCddChanges(changeListFromDocumentGraph, contentsOfCdd);

			expect(filteredResult).to.be.deep.equal({
				documents: [
					{
						document: {
							docRef: "addedDoc/1",
							content: {},
							documentModelName: "doc"
						},
						mutation: "added"
					},
					{
						document: {
							docRef: "modifiedDoc/1",
							content: {},
							documentModelName: "doc"
						},
						mutation: "modified"
					},
					{
						document: {
							docRef: "removedDoc/1",
							content: {},
							documentModelName: "doc"
						},
						mutation: "removed"
					},
					{
						document: {
							docRef: "removedDoc/2",
							content: {},
							documentModelName: "doc"
						},
						mutation: "removed"
					}
				],
				links: [
					createLinkMutation("added", "1", "rm1", "addedDoc/1", "left", "modifiedDoc/1", "right"),
					createLinkMutation("removed", "3", "rm2", "modifiedDoc/1", "left", "modifiedDoc/2", "right"),
					createLinkMutation("removed", "4", "rm3", "modifiedDoc/2", "left", "modifiedDoc/1", "right"),
					createLinkMutation("existing", "5", "rm4", "someDoc/1", "left", "someDoc/2", "right")
				]
			} as EffectiveChangeList);
		});

		test("save - toCddChanges including link document changes", () => {
			const changeListFromDocumentGraph: EffectiveChangeList = {
				documents: [
					{
						document: {
							docRef: "addedDoc/1",
							content: {},
							documentModelName: "doc"
						},
						mutation: "added"
					},
					{
						document: {
							docRef: "modifiedDoc/1",
							content: {},
							documentModelName: "doc"
						},
						mutation: "modified"
					},
					{
						document: {
							docRef: "removedDoc/1",
							content: {},
							documentModelName: "doc"
						},
						mutation: "removed"
					}
				],
				links: [
					createLinkMutation("added", "1", "rm1", "addedDoc/1", "left", "modifiedDoc/1", "right", {
						foo: {}
					}),
					createLinkMutation("removed", "3", "rm2", "modifiedDoc/1", "left", "modifiedDoc/2", "right", { foo: {} }),
					createLinkMutation("existing", "5", "rm4", "someDoc/1", "left", "someDoc/2", "right", {
						foo: {}
					}),
					createLinkMutation("existing", "7", "rm5", "someDoc/3", "left", "someDoc/4", "right", {
						foo: {}
					})
				]
			};

			const contentsOfCdd: DocumentGraphReferences = {
				docRefs: [
					"anotherDoc/1",
					"addedDoc/1",
					"modifiedDoc/1",
					"modifiedDoc/2",
					"someDoc/1",
					"someDoc/2",
					generateLinkDocDocRef("1"),
					generateLinkDocDocRef("5")
				],
				linkIds: ["1", "5"]
			};

			const filteredResult = toCddChanges(changeListFromDocumentGraph, contentsOfCdd);

			expect(filteredResult).to.be.deep.equal({
				documents: [
					{
						document: {
							docRef: "addedDoc/1",
							content: {},
							documentModelName: "doc"
						},
						mutation: "added"
					},
					{
						document: {
							docRef: "modifiedDoc/1",
							content: {},
							documentModelName: "doc"
						},
						mutation: "modified"
					},
					{
						document: {
							docRef: "removedDoc/1",
							content: {},
							documentModelName: "doc"
						},
						mutation: "removed"
					}
				],
				links: [
					createLinkMutation("added", "1", "rm1", "addedDoc/1", "left", "modifiedDoc/1", "right", {
						foo: {}
					}),
					createLinkMutation("removed", "3", "rm2", "modifiedDoc/1", "left", "modifiedDoc/2", "right", { foo: {} }),
					createLinkMutation("existing", "5", "rm4", "someDoc/1", "left", "someDoc/2", "right", {
						foo: {}
					})
				]
			} as EffectiveChangeList);
		});

		describe("save - requests", () => {
			let fetchSpy: Mock;
			let selectModelTupleStub: MockInstance;

			beforeAll(() => {
				function fetchStub(payload: RestRequestPayload): Promise<Response> {
					const request: JsonRpc2Request[] = JSON.parse(payload.body as string);
					const results = request.map((request) => {
						switch (request.method) {
							case "ADD_DOCUMENT":
								return { jsonrpc: "2.0", id: request.id, result: { docRef: "foo" } };
							case "MODIFY_DOCUMENT":
							case "DELETE_LINK":
								return { jsonrpc: "2.0", id: request.id, result: {} };
							default:
								return { jsonrpc: "2.0", id: request.id, result: {} };
						}
					});

					const response = TypeMoq.Mock.ofType<Response>();
					response.setup((x) => x.json()).returns(() => Promise.resolve(results));
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					response.setup((x) => (x as any).then).returns(() => undefined);
					response.setup((x) => x.ok).returns(() => true);

					return Promise.resolve(response.object);
				}

				fetchSpy = vi.fn(fetchStub);

				const serverConnectorMock = TypeMoq.Mock.ofInstance(new RestServerConnector(""));
				serverConnectorMock.setup((x) => x.fetchData(TypeMoq.It.isAny())).returns(fetchSpy);

				ConnectorLocator.createInstance(serverConnectorMock.object);

				selectModelTupleStub = vi.spyOn(CddSelectors, "selectModelTuple").mockReturnValue(createModelsMock());
			});

			afterAll(() => {
				selectModelTupleStub.mockRestore();
			});

			const cdm = deserializeDocumentModel(contractCDM);
			const dmTask = {
				toPromise() {
					return Promise.resolve(cdm);
				}
			};

			test("returns early and puts commit.done action if request is empty", async () => {
				const dgDataHolder: ScdmDataHolderShape = {
					data: {
						documentGraph: documentGraph as DeepReadonly<DocumentGraph>,
						changeLog: {
							changeCounter: 0,
							changes: []
						},
						cddState: {
							cdm,
							pendingUsages: [],
							rootDocRef: "Contract-document/24",
							cachedCdd: {
								cdd: Contract24Cdd,
								snapshotChangeCounter: 0
							}
						}
					},
					descriptor: { model: "CRUD" },
					dirty: false,
					loadingState: "missing",
					savingState: "not_saved",
					slices: {}
				};

				const activity = createActivity({ id: "TEST1", dataHolders: [dgDataHolder] });
				const saveDataConfig = mockSaveConfig(activity);

				const modelDescriptors = [
					{ name: "PolicyHolder", modelType: "relationship" },
					{ name: "CoInsurer", modelType: "relationship" },
					{ name: "Location", modelType: "relationship" },
					{ name: "PostAddress", modelType: "relationship" },
					{ name: "CoInsurerAdditionalFields", modelType: "document" }
				];

				const { effects } = await expectSaga(provideDataFn, saveDataConfig)
					.provide([[fork(resolveModels, activity.id), dmTask]])
					.withState(
						createGeneralStore({
							activities: [activity],
							models: createTestModels(modelDescriptors)
						}).getState()
					)
					.run();

				expect(fetchSpy).not.toHaveBeenCalled();

				const emptyDoneAction = ActivityActions.commit.done({
					params: { activityId: activity.id },
					result: {}
				});
				const { action } = effects.put[0].payload;

				expect(action).to.be.deep.equal(emptyDoneAction);
			});

			test("puts commit.done action including an instanceId for a newly created document if the request was successful", async () => {
				const changes: DgChange[] = [
					{
						kind: "docAdded" as const,
						docRef: NEW_INSTANCE_IDENTIFIER
					},
					{
						kind: "docChanged" as const,
						docRef: NEW_INSTANCE_IDENTIFIER
					}
				];

				const dgDataHolder: ScdmDataHolderShape = {
					data: {
						documentGraph: {
							documents: {
								byDocRef: {
									[NEW_INSTANCE_IDENTIFIER]: {
										docRef: NEW_INSTANCE_IDENTIFIER,
										documentModelName: "Contract-document",
										document: {
											contract: {
												type: "foo"
											}
										},
										loadingState: "loaded"
									}
								}
							},
							links: {
								byId: {},
								linkIdsByDocId: {}
							}
						},
						changeLog: {
							changeCounter: 5,
							changes
						},
						cddState: {
							cdm,
							pendingUsages: [],
							rootDocRef: "__NEW__",
							cachedCdd: {
								cdd: {
									id: "__NEW__",
									modelId: "Contract-document",
									contractAdditionalFields: {
										numOfCoInsurers: 0
									},
									PolicyHolder: {
										hasPostalAddress: null,
										hasPolicyHolder: null
									},
									contract: {
										type: "foo"
									},
									t_docRef: "__NEW__"
								},
								snapshotChangeCounter: 5
							}
						}
					},
					descriptor: { model: "CRUD" },
					dirty: false,
					loadingState: "missing",
					savingState: "not_saved",
					slices: {}
				};

				const expectedBody = [
					RequestBuilder.addDocument(
						"addDocumentOperationNEW",
						"Contract-document",
						{
							contract: {
								type: "foo"
							}
						},
						US_LOCALE
					)
				];

				const activity = createActivity({ id: "TEST1", dataHolders: [dgDataHolder] });
				const saveDataConfig = mockSaveConfig(activity);

				const modelDescriptors = [{ name: "Contract-document", modelType: "document" }];

				const { effects } = await expectSaga(provideDataFn, saveDataConfig)
					.provide([[fork(resolveModels, activity.id), dmTask]])
					.withState(
						createGeneralStore({
							activities: [activity],
							models: createTestModels(modelDescriptors)
						}).getState()
					)
					.run();

				expect(fetchSpy).toHaveBeenCalledTimes(1);

				const { relativeUrl, method, body } = fetchSpy.mock.calls[0][0];
				expect(relativeUrl).toBe("/v2/rpc");
				expect(method).toBe("POST");
				expect(JSON.parse(body as string)).toEqual(expectedBody);

				const doneAction = ActivityActions.commit.done({
					params: { activityId: activity.id },
					result: { instance: "foo" }
				});
				expect(effects.put).to.have.lengthOf(2);
				// first put is a CddActions.merge action to update the rootDocRef within the activity data holder
				// second put is the commit done with the new instanceId in the payload
				const { action } = effects.put[0].payload;

				expect(action).to.be.deep.equal(doneAction);
			});

			test("puts commit.done action if the request was successful", async () => {
				const changes = [
					{
						kind: "docChanged" as const,
						docRef: "BusinessPartner-document/23",
						documentModelName: "BusinessPartner-document"
					},
					{
						kind: "linkDeleted" as const,
						linkId: "1",
						linkRef: createLinkRef({
							id: "1",
							docRef1: "Contract-document/24",
							role1: "contract",
							docRef2: "BusinessPartner-document/21",
							role2: "businessPartner",
							relationshipModel: "PolicyHolder"
						})
					},
					{
						kind: "linkDeleted" as const,
						linkId: "2",
						linkRef: createLinkRef({
							id: "2",
							docRef1: "Contract-document/24",
							role1: "contract",
							docRef2: "BusinessPartner-document/22",
							role2: "businessPartner",
							relationshipModel: "CoInsurer"
						})
					}
				];

				const dgDataHolder: ScdmDataHolderShape = {
					data: {
						documentGraph: documentGraph as DeepReadonly<DocumentGraph>,
						changeLog: {
							changeCounter: 0,
							changes
						},
						cddState: {
							cdm,
							pendingUsages: [],
							rootDocRef: "Contract-document/24",
							cachedCdd: {
								cdd: Contract24Cdd,
								snapshotChangeCounter: 0
							}
						}
					},
					descriptor: { model: "CRUD" },
					dirty: false,
					loadingState: "missing",
					savingState: "not_saved",
					slices: {}
				};

				const expectedBody = [
					RequestBuilder.modifyDocument(
						"modifyDocumentOperation_BusinessPartner-document/23",
						"BusinessPartner-document/23",
						{
							businessPartner: {
								id: "google",
								name: "Google LLC"
							}
						},
						US_LOCALE
					),
					RequestBuilder.deleteLink({
						id: "1",
						linkDescriptor: {
							entities: [
								{
									docRef: "Contract-document/24",
									role: "contract"
								},
								{
									docRef: "BusinessPartner-document/21",
									role: "businessPartner"
								}
							],
							predecessorLinkRef: null,
							relationshipModel: "PolicyHolder"
						}
					}),
					RequestBuilder.deleteLink({
						id: "2",
						linkDescriptor: {
							entities: [
								{
									docRef: "Contract-document/24",
									role: "contract"
								},
								{
									docRef: "BusinessPartner-document/22",
									role: "businessPartner"
								}
							],
							predecessorLinkRef: null,
							relationshipModel: "CoInsurer"
						}
					})
				];

				const activity = createActivity({ id: "TEST1", dataHolders: [dgDataHolder] });
				const saveDataConfig = mockSaveConfig(activity);

				const modelDescriptors = [
					{ name: "PolicyHolder", modelType: "relationship" },
					{ name: "CoInsurer", modelType: "relationship" },
					{ name: "Location", modelType: "relationship" },
					{ name: "PostAddress", modelType: "relationship" },
					{ name: "CoInsurerAdditionalFields", modelType: "document" },
					{ name: "BusinessPartner-document", modelType: "document" }
				];

				const { effects } = await expectSaga(provideDataFn, saveDataConfig)
					.provide([[fork(resolveModels, activity.id), dmTask]])
					.withState(
						createGeneralStore({
							activities: [activity],
							models: createTestModels(modelDescriptors)
						}).getState()
					)
					.run();

				expect(fetchSpy).toHaveBeenCalledTimes(1);

				const { relativeUrl, method, body } = fetchSpy.mock.calls[0][0];
				expect(relativeUrl).toBe("/v2/rpc");
				expect(method).toBe("POST");
				expect(JSON.parse(body as string)).toEqual(expectedBody);

				const doneAction = ActivityActions.commit.done({
					params: { activityId: activity.id },
					result: { instance: undefined }
				});
				const { action } = effects.put[0].payload;

				expect(action).to.be.deep.equal(doneAction);
			});

			test("puts commit.error if document models are missing for their changes", async () => {
				const dgDataHolder: ScdmDataHolderShape = {
					data: {
						documentGraph: documentGraph as DeepReadonly<DocumentGraph>,
						changeLog: {
							changeCounter: 0,
							changes: [
								{
									kind: "docChanged",
									docRef: "BusinessPartner-document/23"
								},
								{
									kind: "linkDeleted",
									linkId: "1",
									linkRef: createLinkRef({
										id: "1",
										docRef1: "Contract-document/24",
										role1: "contract",
										docRef2: "BusinessPartner-document/21",
										role2: "businessPartner",
										relationshipModel: "PolicyHolder"
									})
								},
								{
									kind: "linkDeleted",
									linkId: "2",
									linkRef: createLinkRef({
										id: "2",
										docRef1: "Contract-document/24",
										role1: "contract",
										docRef2: "BusinessPartner-document/22",
										role2: "businessPartner",
										relationshipModel: "CoInsurer"
									})
								}
							]
						},
						cddState: {
							cdm,
							pendingUsages: [],
							rootDocRef: "Contract-document/24",
							cachedCdd: {
								cdd: Contract24Cdd,
								snapshotChangeCounter: 0
							}
						}
					},
					descriptor: { model: "CRUD" },
					dirty: false,
					loadingState: "missing",
					savingState: "not_saved",
					slices: {}
				};

				const activity = createActivity({ id: "TEST1", dataHolders: [dgDataHolder] });
				const saveDataConfig = mockSaveConfig(activity);

				const modelDescriptors: Model.Descriptor<string>[] = [];

				const { effects } = await expectSaga(provideDataFn, saveDataConfig)
					.provide([[fork(resolveModels, activity.id), dmTask]])
					.withState(
						createGeneralStore({
							activities: [activity],
							models: createTestModels(modelDescriptors)
						}).getState()
					)
					.run();

				expect(fetchSpy).not.toHaveBeenCalled();

				const failAction = ActivityActions.commit.failed({
					params: { activityId: activity.id },
					error: new Error("Cannot persist document without the respective document model 'BusinessPartner-document'")
				});
				const { action } = effects.put[0].payload;

				expect(action.type).to.be.deep.equal(failAction.type);
				expect(action.payload.error.message).to.be.deep.equal((failAction.payload.error as Error).message);
			});
		});
	});

	function mockCanHandleConfig(options: {
		operation: DataProvider.Operation;
		cddDataHolder?: boolean;
		cddActivity?: boolean;
	}): DataProvider.CanHandleConfig {
		const dataHolder = TypeMoq.Mock.ofType<Activity.DataHolder>();
		dataHolder
			.setup((x) => x.descriptor)
			.returns(() => {
				return options.cddDataHolder
					? { example: "scdm", model: "Contract-document", instance: "7" }
					: { noCddDataHolder: "engine" };
			});

		const activityDataHolder = TypeMoq.Mock.ofType<Activity.DataHolder>();
		activityDataHolder
			.setup((x) => x.data)
			.returns(() => {
				return options.cddActivity ? { cddState: "" } : {};
			});

		const activity = createActivity({
			id: "1",
			activityDataHolder: activityDataHolder.object,
			descriptor: dataHolder.object.descriptor
		});

		const activities: ActivityMap = { 1: activity };

		const canHandleConfig = TypeMoq.Mock.ofType<DataProvider.CanHandleConfig>();
		canHandleConfig.setup((x) => x.activityId).returns(() => "1");
		canHandleConfig.setup((x) => x.activities).returns(() => activities);
		canHandleConfig.setup((x) => x.dataHolder).returns(() => dataHolder.object);
		canHandleConfig.setup((x) => x.operation).returns(() => options.operation);

		return canHandleConfig.object;
	}

	function mockSaveConfig(activity: Activity): DataProvider.SaveConfig {
		const saving = TypeMoq.Mock.ofType<{
			done(x: unknown): Action;
			failed(x: unknown): Action;
		}>();
		saving
			.setup((x) => x.done(TypeMoq.It.isAny()))
			.returns((result) => ActivityActions.commit.done({ params: { activityId: activity.id }, result }));
		saving
			.setup((x) => x.failed(TypeMoq.It.isAny()))
			.returns((error) => ActivityActions.commit.failed({ params: { activityId: activity.id }, error }));

		const details = TypeMoq.Mock.ofType<DataProvider.SaveDataActionPayload>();
		details.setup((x) => x.saving).returns(() => saving.object);

		const saveConfig = TypeMoq.Mock.ofType<DataProvider.SaveConfig>();
		saveConfig.setup((x) => x.operation).returns(() => "save");
		saveConfig.setup((x) => x.activityId).returns(() => activity.id);
		saveConfig.setup((x) => x.dataHolders).returns(() => activity.dataHolders ?? []);
		saveConfig.setup((x) => x.details).returns(() => details.object);

		return saveConfig.object;
	}
});

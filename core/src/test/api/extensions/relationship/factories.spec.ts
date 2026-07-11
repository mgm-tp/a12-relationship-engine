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
import { expectSaga, type RunResult } from "redux-saga-test-plan";
import { vi, test, expect, afterAll, describe, beforeAll, type Mock, beforeEach, type MockInstance } from "vitest";

import type { FormActivity } from "@com.mgmtp.a12.formengine/formengine-core";
import type { OverviewEngineApi } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import { ConnectorLocator, RestServerConnector, type RestRequestPayload } from "@com.mgmtp.a12.utils/utils-connector";
import {
	type Activity,
	ModelSelectors,
	ActivityActions,
	LocaleSelectors,
	type ActivityMap,
	type DataProvider,
	NEW_INSTANCE_IDENTIFIER
} from "@com.mgmtp.a12.client/client-core";
import {
	Dispatcher,
	type JsonRpc2Request,
	type JsonRpc2Response,
	type RelationshipJsonRpc2response,
	type Relationship as RelationshipServerApi
} from "@com.mgmtp.a12.dataservices/dataservices-access";

import { thenable } from "../../../utils/promise.js";
import { createDataHolder } from "../../../utils/activity.js";
import { createGeneralStore } from "../../../mocks/store/store.js";
import { RequestBuilder } from "../../../../internal/server-connectors/requestBuilder.js";
import { DocumentProcessors } from "../../../../internal/relationship/platform/document-processor.js";
import {
	createDocumentModel,
	createRelationshipModel,
	createOverviewModelsLoaded
} from "../../../mocks/relationships/mocks.js";
import { RelationshipDataProviderSelectors } from "../../../../internal/relationship/platform/relationshipDataProvider/selectors.js";
import {
	type Relationship,
	RelationshipFactories,
	RelationshipSelectors,
	type RelationshipDocument
} from "../../../../internal/relationship/index.js";

describe("com.mgmtp.a12.relationshipengine-core.lib.extensions.relationship.RelationshipFactories", () => {
	let fetchSpy: Mock;
	let postLoadSpy: MockInstance<typeof DocumentProcessors.postLoad>;
	let preSaveStub: MockInstance<typeof DocumentProcessors.preSave>;

	beforeAll(() => {
		fetchSpy = vi.fn(fetchStub);

		const serverConnectorMock = TypeMoq.Mock.ofInstance(new RestServerConnector(""));
		serverConnectorMock.setup((x) => x.fetchData(TypeMoq.It.isAny())).returns(fetchSpy);

		ConnectorLocator.createInstance(serverConnectorMock.object);
		const documentModelMock = createDocumentModel();
		const omModelsLoadedMock = createOverviewModelsLoaded(documentModelMock);
		vi.spyOn(ModelSelectors, "modelByName").mockImplementation((modelName: string) => {
			return () => {
				return modelName?.includes("RELATIONSHIP") ? createRelationshipModel() : documentModelMock;
			};
		});
		vi.spyOn(RelationshipDataProviderSelectors, "selectLinkDocumentModel").mockReturnValue(documentModelMock);

		vi.spyOn(RelationshipSelectors, "overviewModels").mockReturnValue(() => omModelsLoadedMock);

		postLoadSpy = vi.spyOn(DocumentProcessors, "postLoad");
		preSaveStub = vi.spyOn(DocumentProcessors, "preSave");
	});

	describe("createRelationshipDataProvider", () => {
		const documentModelId = "Test";
		const instanceIdMock = "1";
		const activityDocumentMock: Activity.Data.Document = {
			id: instanceIdMock,
			modelId: documentModelId
		};
		const mockActivityDescriptor: Activity.Descriptor = {
			activityTest: "TestTest",
			instance: instanceIdMock
		};

		let dataProvider: DataProvider;

		beforeAll(() => {
			dataProvider = RelationshipFactories.createRelationshipDataProvider();
		});

		function mockActivity(dataHolders: Activity.DataHolder[] = [mockActivityDataHolder()]): Activity {
			const activity = TypeMoq.Mock.ofType<Activity>();
			activity.setup((x) => x.id).returns(() => "1");
			activity.setup((x) => x.descriptor).returns(() => mockActivityDescriptor);
			activity.setup((x) => x.dataHolders).returns(() => dataHolders);

			return activity.object;
		}

		function mockActivityDataHolder(document: Activity.Data.Document = activityDocumentMock): Activity.DataHolder {
			const dataHolder = TypeMoq.Mock.ofType<Activity.DataHolder>();

			const activityData: FormActivity.Data.SingleDocumentData = { document };
			dataHolder.setup((x) => x.data).returns(() => activityData);
			dataHolder.setup((x) => x.descriptor).returns(() => mockActivityDescriptor);
			dataHolder.setup((x) => x.error).returns(() => undefined);

			return dataHolder.object;
		}

		function mockDataHolder(
			dataHolderType: "link" | "candidate" | "mutation" | "unknown",
			data?: object
		): Activity.DataHolder {
			return createDataHolder({
				descriptor: {
					feature: "relationship",
					type: dataHolderType,
					instanceId: "1"
				},
				data
			});
		}

		test("returns a data provider named 'RelationshipDataProvider'", () => {
			expect(dataProvider.name).toEqual("RelationshipDataProvider");
		});

		describe("canHandle of the returned data provider", () => {
			function mockActivityForCanHandle(
				relationshipActivity = true,
				includeUnknown = false
			): {
				activity: Activity;
				dataHolders: { [key: string]: Activity.DataHolder };
			} {
				const activity = TypeMoq.Mock.ofType<Activity>();
				activity.setup((x) => x.descriptor).returns(() => mockActivityDescriptor);

				const dataHolders: { [key: string]: Activity.DataHolder } = {
					activity: mockActivityDataHolder()
				};

				if (relationshipActivity) {
					dataHolders.link = mockDataHolder("link", {});
					dataHolders.candidate = mockDataHolder("candidate", {});
				}

				if (includeUnknown) {
					dataHolders.unknown = mockDataHolder("unknown", {});
				}

				activity.setup((x) => x.dataHolders).returns(() => Object.values(dataHolders));

				return { activity: activity.object, dataHolders };
			}

			function mockCanHandleConfig(
				action: DataProvider.Operation,
				dataHolderType: "link" | "candidate" | "activity" | "unknown",
				activityAndDataHolders: {
					activity: Activity;
					dataHolders: { [key: string]: Activity.DataHolder };
				}
			): DataProvider.CanHandleConfig {
				const activities: ActivityMap = { 1: activityAndDataHolders.activity };

				const canHandleConfig = TypeMoq.Mock.ofType<DataProvider.CanHandleConfig>();
				canHandleConfig.setup((x) => x.activityId).returns(() => "1");
				canHandleConfig.setup((x) => x.activities).returns(() => activities);
				canHandleConfig.setup((x) => x.dataHolder).returns(() => activityAndDataHolders.dataHolders[dataHolderType]);
				canHandleConfig.setup((x) => x.operation).returns(() => action);

				return canHandleConfig.object;
			}

			test("returns true when loading a link data holder", () => {
				const mockedActivity = mockActivityForCanHandle();
				const canHandleConfig = mockCanHandleConfig("load", "link", mockedActivity);
				expect(dataProvider.canHandle(canHandleConfig)).toEqual(true);
			});

			test("returns true when loading a candidate data holder", () => {
				const mockedActivity = mockActivityForCanHandle();
				const canHandleConfig = mockCanHandleConfig("load", "candidate", mockedActivity);
				expect(dataProvider.canHandle(canHandleConfig)).toEqual(true);
			});

			test("returns false when loading an activity data holder of a relationship activity", () => {
				const mockedActivity = mockActivityForCanHandle();
				const canHandleConfig = mockCanHandleConfig("load", "activity", mockedActivity);
				expect(dataProvider.canHandle(canHandleConfig)).toEqual(false);
			});

			test("returns false when loading an activity data holder of a non-relationship activity", () => {
				const mockedActivity = mockActivityForCanHandle(false);
				const canHandleConfig = mockCanHandleConfig("load", "activity", mockedActivity);
				expect(dataProvider.canHandle(canHandleConfig)).toEqual(false);
			});

			test("returns false when loading a different data holder of a relationship activity", () => {
				const mockedActivity = mockActivityForCanHandle(true, true);
				const canHandleConfig = mockCanHandleConfig("load", "unknown", mockedActivity);
				expect(dataProvider.canHandle(canHandleConfig)).toEqual(false);
			});

			test("returns false when loading a different data holder of a non-relationship activity", () => {
				const mockedActivity = mockActivityForCanHandle(false, true);
				const canHandleConfig = mockCanHandleConfig("load", "unknown", mockedActivity);
				expect(dataProvider.canHandle(canHandleConfig)).toEqual(false);
			});

			test("returns true when saving a link data holder", () => {
				const mockedActivity = mockActivityForCanHandle();
				const canHandleConfig = mockCanHandleConfig("save", "link", mockedActivity);
				expect(dataProvider.canHandle(canHandleConfig)).toEqual(true);
			});

			test("returns true when saving a candidate data holder", () => {
				const mockedActivity = mockActivityForCanHandle();
				const canHandleConfig = mockCanHandleConfig("save", "candidate", mockedActivity);
				expect(dataProvider.canHandle(canHandleConfig)).toEqual(true);
			});

			test("returns true when saving an activity data holder of a relationship activity", () => {
				const mockedActivity = mockActivityForCanHandle();
				const canHandleConfig = mockCanHandleConfig("save", "activity", mockedActivity);
				expect(dataProvider.canHandle(canHandleConfig)).toEqual(true);
			});

			test("returns false when saving an activity data holder of a non-relationship activity", () => {
				const mockedActivity = mockActivityForCanHandle(false);
				const canHandleConfig = mockCanHandleConfig("save", "activity", mockedActivity);
				expect(dataProvider.canHandle(canHandleConfig)).toEqual(false);
			});

			test("returns false when saving a different data holder of a relationship activity", () => {
				const mockedActivity = mockActivityForCanHandle(true, true);
				const canHandleConfig = mockCanHandleConfig("save", "unknown", mockedActivity);
				expect(dataProvider.canHandle(canHandleConfig)).toEqual(false);
			});

			test("returns false when saving a different data holder of a non-relationship activity", () => {
				const mockedActivity = mockActivityForCanHandle(false, true);
				const canHandleConfig = mockCanHandleConfig("save", "unknown", mockedActivity);
				expect(dataProvider.canHandle(canHandleConfig)).toEqual(false);
			});

			test("returns true when deleting a link data holder", () => {
				const mockedActivity = mockActivityForCanHandle();
				const canHandleConfig = mockCanHandleConfig("delete", "link", mockedActivity);
				expect(dataProvider.canHandle(canHandleConfig)).toEqual(true);
			});

			test("returns true when deleting a candidate data holder", () => {
				const mockedActivity = mockActivityForCanHandle();
				const canHandleConfig = mockCanHandleConfig("delete", "candidate", mockedActivity);
				expect(dataProvider.canHandle(canHandleConfig)).toEqual(true);
			});

			test("returns true when deleting an activity data holder of a relationship activity", () => {
				const mockedActivity = mockActivityForCanHandle();
				const canHandleConfig = mockCanHandleConfig("delete", "activity", mockedActivity);
				expect(dataProvider.canHandle(canHandleConfig)).toEqual(true);
			});

			test("returns false when deleting an activity data holder of a non-relationship activity", () => {
				const mockedActivity = mockActivityForCanHandle(false);
				const canHandleConfig = mockCanHandleConfig("delete", "activity", mockedActivity);
				expect(dataProvider.canHandle(canHandleConfig)).toEqual(false);
			});

			test("returns false when deleting a different data holder of a relationship activity", () => {
				const mockedActivity = mockActivityForCanHandle(true, true);
				const canHandleConfig = mockCanHandleConfig("delete", "unknown", mockedActivity);
				expect(dataProvider.canHandle(canHandleConfig)).toEqual(false);
			});

			test("returns false when deleting a different data holder of a non-relationship activity", () => {
				const mockedActivity = mockActivityForCanHandle(false, true);
				const canHandleConfig = mockCanHandleConfig("delete", "unknown", mockedActivity);
				expect(dataProvider.canHandle(canHandleConfig)).toEqual(false);
			});
		});

		describe("provideData of the returned data provider", () => {
			describe("when loading activity data", () => {
				function mockLoadConfig(activity: Activity): DataProvider.LoadConfig {
					const loadConfig = TypeMoq.Mock.ofType<DataProvider.LoadConfig>();
					loadConfig.setup((x) => x.operation).returns(() => "load");
					loadConfig.setup((x) => x.activityId).returns(() => activity.id);
					loadConfig.setup((x) => x.dataHolders).returns(() => activity.dataHolders ?? []);

					return loadConfig.object;
				}

				let counter = 0;

				const filteredField = "testField";
				const filterOption: OverviewEngineApi.Filter.StringOptions = {
					filterType: "String",
					criteria: { value: `STRING_FIELD_FILTER_VALUE_${counter++}` }
				};

				function mockInstanceData(): {
					pagination: Relationship.Pagination;
					query: Relationship.Query;
					source: RelationshipServerApi.LinkEntitySpec;
					uiConfiguration: Relationship.UiConfiguration;
				} {
					const query: Relationship.Query = {
						filter: {
							fulltext: `FULLTEXT_KEYWORD_${counter++}`,
							filters: { [filteredField]: filterOption }
						},
						page: {
							offset: counter++,
							limit: counter++
						},
						sorts: [
							{
								order: "ASC",
								path: "testField"
							}
						]
					};

					const source: RelationshipServerApi.LinkEntitySpec = {
						docRef: `ID_${counter++}`,
						role: `ROLE_${counter++}`
					};

					const configuration: Relationship.ComponentConfiguration = {
						id: `ID_${counter++}`,
						candidatePageSize: counter++,
						name: `COMPONENT_${counter++}`,
						models: [
							{ name: `MODEL_${counter++}`, use: "link" },
							{ name: `MODEL_${counter++}`, use: "candidate" }
						]
					};

					const uiConfiguration: Relationship.UiConfiguration = {
						name: `UI_CONFIG_${counter++}`,
						metaInformation: { version: "1.0.0" },
						relationshipName: `RELATIONSHIP_${counter++}`,
						targetRole: `TARGET_${counter++}`,
						components: [configuration]
					};

					const pagination = { limit: 10, offset: 0, fullCount: 0, pageNumber: 0, pageSize: 10 };

					return { source, query, pagination, uiConfiguration: uiConfiguration };
				}

				function mockLinkInstance(instanceId: string): Relationship.LinkInstance {
					const { uiConfiguration, query, source, pagination } = mockInstanceData();

					return {
						id: instanceId,
						uiConfiguration,
						linkQuery: query,
						linkPagination: pagination,
						sourceEntity: source,
						links: []
					};
				}

				function mockCandidateInstance(instanceId: string): Relationship.CandidateInstance {
					const { uiConfiguration, query, source, pagination } = mockInstanceData();

					return {
						id: instanceId,
						uiConfiguration,
						candidateQuery: query,
						candidatePagination: pagination,
						sourceEntity: source,
						candidates: []
					};
				}

				describe.skip("and the activity handles relationship data", () => {
					let sagaRun: Promise<RunResult>;
					let linkInstance: Relationship.LinkInstance;
					let candidateInstance: Relationship.CandidateInstance;

					beforeEach(() => {
						linkInstance = mockLinkInstance("INSTANCE_100");
						candidateInstance = mockCandidateInstance("INSTANCE_100");

						const dataHolders = [
							mockDataHolder("link", linkInstance),
							mockDataHolder("candidate", candidateInstance),
							mockActivityDataHolder()
						];
						const activity = mockActivity(dataHolders);

						sagaRun = expectSaga(dataProvider.provideData, mockLoadConfig(activity))
							.withState(createGeneralStore({ activities: [activity] }).getState())
							.run();
					});

					test("calls the server API to load the relationship data", async () => {
						const { storeState } = await sagaRun;
						expect(fetchSpy).toHaveBeenCalledTimes(1);

						const locale = LocaleSelectors.locale()(storeState);
						expect(locale).not.toEqual(undefined);

						const linkFilter = linkInstance.linkQuery.filter;
						expect(linkFilter).not.toEqual(undefined);
						const linkPage = linkInstance.linkQuery.page;
						expect(linkPage).not.toEqual(undefined);
						const linkSort = linkInstance.linkQuery.sorts;
						expect(linkSort).not.toEqual(undefined);

						// eslint-disable-next-line @typescript-eslint/ban-ts-comment
						// @ts-ignore
						const listLinksOperation = RequestBuilder.listLinks({
							source: {
								docRef: linkInstance.sourceEntity.docRef,
								role: linkInstance.sourceEntity.role,
								relationshipModel: linkInstance.uiConfiguration.relationshipName
							},
							filter: {
								filters: [filteredField + ":" + filterOption.criteria?.value],
								fulltext: linkFilter?.fulltext ?? "",
								lang: ""
							},
							page: {
								offset: linkPage.offset,
								limit: linkPage.limit
							},
							sort: {},
							resultDocumentModel: "MY_MOCKED_MODEL"
						});

						const candidateFilter = candidateInstance.candidateQuery.filter;
						expect(candidateFilter).not.toEqual(undefined);
						const candidatePage = candidateInstance.candidateQuery.page;
						expect(candidatePage).not.toEqual(undefined);
						const candidateSort = candidateInstance.candidateQuery.sorts;
						expect(candidateSort).not.toEqual(undefined);

						// eslint-disable-next-line @typescript-eslint/ban-ts-comment
						// @ts-ignore
						const listCandidatesOperation = RequestBuilder.listCandidates({
							source: {
								docRef: candidateInstance.sourceEntity.docRef,
								role: candidateInstance.sourceEntity.role,
								relationshipModel: candidateInstance.uiConfiguration.relationshipName
							},
							filter: {
								filters: [filteredField + ":" + filterOption.criteria?.value],
								fulltext: candidateFilter?.fulltext ?? "",
								lang: ""
							},
							page: {
								offset: candidatePage.offset,
								limit: candidatePage.limit
							},
							sort: [
								{
									order: linkSort?.[0].path + " " + linkSort?.[0].order.toString()
								}
							],
							resultDocumentModel: "MY_MOCKED_MODEL"
						});

						expectRequest(fetchSpy, listCandidatesOperation, listLinksOperation, RequestBuilder.loadAllThumbnailURLs());
					});

					test("uses the postLoad processor to process the returned data", async () => {
						await sagaRun;
						expect(postLoadSpy).toHaveBeenCalledTimes(2);

						const candidateCall = postLoadSpy.mock.calls.map((args) => (args[0] as Activity.Data.Document).candidate);
						expect(candidateCall).toContain("candidate");

						const linkCall = postLoadSpy.mock.calls.map((args) => (args[0] as Activity.Data.Document).target?.link);
						expect(linkCall).toContain("link");
					});
				});
			});

			describe("when saving activity data", () => {
				function mockSaveConfig(activity: Activity): DataProvider.SaveConfig {
					const saving = TypeMoq.Mock.ofType<{
						done(x: object): Action;
						failed(x: object): Action;
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

				function extractExpectedDocument(
					activityDocument: Activity.Data.Document
				): Omit<Activity.Data.Document, "modelId" | "id"> {
					const { modelId, id, ...expectedDocument } = activityDocument;

					return expectedDocument;
				}

				describe("and the activity handles changed relationship data", () => {
					test("calls the server API to change the relationship data", async () => {
						let linkCounter = 0;
						let relationshipModelCounter = 0;
						function mockLink(): RelationshipServerApi.LinkWithDocument {
							linkCounter++;
							relationshipModelCounter++;

							const linkDescriptor: RelationshipServerApi.LinkDescriptorResponse = {
								relationshipModel: `RELATIONSHIP_MODEL_${relationshipModelCounter}`,
								entities: [
									{
										docRef: "TEST",
										modelName: "TEST",
										role: "TEST"
									}
								]
							};

							const id = `LINK_ID_${linkCounter}`;

							const link = TypeMoq.Mock.ofType<RelationshipServerApi.LinkWithDocument>();
							link.setup((x) => x.linkRef).returns(() => ({ id, linkDescriptor }));
							link.setup((x) => x.document).returns(() => ({ relationship: {} }));

							return link.object;
						}

						const addedLink = mockLink();
						const removedLink = mockLink();
						const modifiedLink = mockLink();

						const mutations: Relationship.Mutation[] = [
							{
								mutationState: "added",
								link: addedLink as Relationship.LinkWithDocument,
								modified: false,
								relinked: false
							},
							{
								mutationState: "existing",
								link: modifiedLink as Relationship.LinkWithDocument,
								modified: true,
								relinked: false
							},
							{
								mutationState: "removed",
								link: removedLink as Relationship.LinkWithDocument,
								modified: false,
								relinked: false
							}
						];

						const mutationDataHolder = mockDataHolder("mutation", mutations);
						const dataHolders = [mutationDataHolder, mockActivityDataHolder()];

						const activity = mockActivity(dataHolders);

						const sagaRun = expectSaga(dataProvider.provideData, mockSaveConfig(activity))
							.withState(createGeneralStore({ activities: [activity] }).getState())
							.run();

						expect(fetchSpy).toHaveBeenCalledTimes(1);
						const { storeState } = await sagaRun;

						const locale = LocaleSelectors.locale()(storeState);
						expect(locale).not.toEqual(undefined);

						const expectedDocument = extractExpectedDocument(activityDocumentMock);
						const modifyDocumentRequest = RequestBuilder.modifyDocument(
							"modifyDocumentOperation",
							instanceIdMock,
							expectedDocument,
							locale
						);
						const addLinkRequest = RequestBuilder.addLink(
							addedLink.linkRef as RelationshipServerApi.LinkRef,
							(addedLink.document as RelationshipDocument).relationship
						);
						const removeLinkRequest = RequestBuilder.deleteLink(removedLink.linkRef as RelationshipServerApi.LinkRef);
						const modifyLinkRequest = RequestBuilder.modifyLink(
							modifiedLink.linkRef as RelationshipServerApi.LinkRef,
							(modifiedLink.document as RelationshipDocument).relationship
						);
						expectRequest(fetchSpy, modifyDocumentRequest, removeLinkRequest, addLinkRequest, modifyLinkRequest);
						expect(preSaveStub).toHaveBeenCalledTimes(4);
						expect(preSaveStub.mock.calls[3][1].header.id).toBe("MY_MOCKED_MODEL");
					});
				});

				describe("and the activity handles a new document", () => {
					test("calls the server API to create a new document", async () => {
						const newActivityDocumentMock: Activity.Data.Document = {
							id: NEW_INSTANCE_IDENTIFIER,
							modelId: documentModelId
						};

						const dataHolders = [mockActivityDataHolder(newActivityDocumentMock)];
						const activity = mockActivity(dataHolders);

						const sagaRun = expectSaga(dataProvider.provideData, mockSaveConfig(activity))
							.withState(createGeneralStore({ activities: [activity] }).getState())
							.run();
						const { storeState } = await sagaRun;
						expect(fetchSpy).toHaveBeenCalledTimes(1);

						const locale = LocaleSelectors.locale()(storeState);
						expect(locale).not.toBe(undefined);

						const expectedDocument = extractExpectedDocument(newActivityDocumentMock);
						const expectedAddDocumentRequest = RequestBuilder.addDocument(
							"addDocumentOperation",
							"Test",
							expectedDocument,
							locale
						);
						expect(preSaveStub).toHaveBeenCalledTimes(1);
						expect(preSaveStub.mock.calls[0][1].header.id).toBe("MY_MOCKED_MODEL");

						expectRequest(fetchSpy, expectedAddDocumentRequest);
					});
				});

				describe("and the activity handles an existing document", () => {
					test("calls the server API to modify an existing document", async () => {
						const dataHolders = [mockActivityDataHolder()];
						const activity = mockActivity(dataHolders);

						const sagaRun = expectSaga(dataProvider.provideData, mockSaveConfig(activity))
							.withState(createGeneralStore({ activities: [activity] }).getState())
							.run();
						const { storeState } = await sagaRun;
						expect(fetchSpy).toHaveBeenCalledTimes(1);

						const locale = LocaleSelectors.locale()(storeState);
						expect(locale).not.toBe(undefined);

						const expectedDocument = extractExpectedDocument(activityDocumentMock);
						const expectedModifyDocumentRequest = RequestBuilder.modifyDocument(
							"modifyDocumentOperation",
							instanceIdMock,
							expectedDocument,
							locale
						);

						expect(preSaveStub).toHaveBeenCalledTimes(1);
						expect(preSaveStub.mock.calls[0][1].header.id).toBe("MY_MOCKED_MODEL");

						expectRequest(fetchSpy, expectedModifyDocumentRequest);
					});
				});

				describe("and the request returns with an error", () => {
					beforeAll(() => {
						vi.spyOn(Dispatcher, "rpc").mockRejectedValue("xxx");
					});
					afterAll(() => {
						vi.resetAllMocks();
					});

					test("dispatches a Activity/COMMIT_FAILED action", async () => {
						const dataHolders = [mockActivityDataHolder()];
						const activity = mockActivity(dataHolders);

						const sagaRun = expectSaga(dataProvider.provideData, mockSaveConfig(activity))
							.withState(createGeneralStore({ activities: [activity] }).getState())
							.run();
						const {
							effects: { put }
						} = await sagaRun;

						expect(put.some((effect) => effect.payload.action.type === ActivityActions.commit.failed.type)).toEqual(
							true
						);
					});
				});
			});

			describe("when deleting activity data", () => {
				function mockDeleteConfig(activity: Activity): DataProvider.DeleteConfig {
					const deleteConfig = TypeMoq.Mock.ofType<DataProvider.DeleteConfig>();
					deleteConfig.setup((x) => x.operation).returns(() => "delete");
					deleteConfig.setup((x) => x.activityId).returns(() => activity.id);
					deleteConfig.setup((x) => x.dataHolders).returns(() => activity.dataHolders ?? []);
					deleteConfig.setup((x) => x.details).returns(() => ({ instanceId: instanceIdMock }));

					return deleteConfig.object;
				}

				test("calls the server API to delete the document of the activity data holder", async () => {
					const dataHolders = [mockDataHolder("link"), mockDataHolder("candidate"), mockActivityDataHolder()];

					const activity = mockActivity(dataHolders);
					const sagaRun = expectSaga(dataProvider.provideData, mockDeleteConfig(activity))
						.withState(createGeneralStore({ activities: [activity] }).getState())
						.run();
					const { storeState } = await sagaRun;
					const locale = LocaleSelectors.locale()(storeState);
					expect(locale).not.toEqual(undefined);

					const expectedDeleteDocumentRequest = RequestBuilder.deleteDocument(
						"deleteDocumentOperation",
						instanceIdMock,
						locale
					);
					expectRequest(fetchSpy, expectedDeleteDocumentRequest);
				});

				describe("and the request returns with an error", () => {
					test("dispatches an ActivityActions/ERROR action", async () => {
						vi.spyOn(Dispatcher, "rpc").mockRejectedValue("xxx");
						const dataHolders = [mockDataHolder("link"), mockDataHolder("candidate"), mockActivityDataHolder()];

						const activity = mockActivity(dataHolders);
						const sagaRun = expectSaga(dataProvider.provideData, mockDeleteConfig(activity))
							.withState(createGeneralStore({ activities: [activity] }).getState())
							.run();
						const {
							effects: { put }
						} = await sagaRun;

						expect(put.some((effect) => effect.payload.action.type === ActivityActions.error.type)).toEqual(true);
					});
				});
			});
		});
	});
});

function fetchStub(payload: RestRequestPayload): Promise<Response> {
	const requests: JsonRpc2Request[] = JSON.parse(payload.body as string);
	const results = requests.map<JsonRpc2Response>((request) => {
		if (request.id?.toString().includes("candidate")) {
			const candidate = TypeMoq.Mock.ofType<RelationshipServerApi.Candidate>();
			candidate
				.setup((x) => x.linkRef)
				.returns(() => ({ linkDescriptor: { entities: [], relationshipModel: "" }, id: "" }));
			candidate.setup((x) => x.document).returns(() => ({ target: { candidate: "candidate" } }));
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			const candidateResponse: RelationshipJsonRpc2response.CandidateNonMutationJsonRpc2Response = {
				jsonrpc: "2.0",
				id: request.id,
				result: {
					fullSize: 1,
					page: {},
					entries: [
						{
							docRef: "MY_MOCKED_MODEL/1",
							type: "ROOT",
							document: { ...candidate.object }
						}
					],
					links: []
				}
			};

			return candidateResponse;
		} else if (request.id?.toString().includes("link")) {
			const link = TypeMoq.Mock.ofType<RelationshipServerApi.LinkWithDocument>();
			link
				.setup((x) => x.linkRef)
				.returns(() => ({
					linkDescriptor: { entities: [], relationshipModel: "" },
					id: "x"
				}));
			link.setup((x) => x.document).returns(() => ({ target: { link: "link" } }));
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			const linkResponse: RelationshipJsonRpc2response.LinkNonMutationJsonRpc2Response = {
				jsonrpc: "2.0",
				id: request.id,
				result: {
					fullSize: 1,
					page: {},
					entries: [],
					links: [
						{
							docRef: "MY_MOCKED_MODEL/1",
							relationshipModel: "MY_MOCKED_RELATIONSHIP_MODEL",
							sourceRole: "Child",
							sourceDocRef: "MY_MOCKED_MODEL/2",
							targetRole: "Parent",
							targetDocRef: "MY_MOCKED_MODEL/1",
							document: { ...link.object },
							type: "CHILD",
							linkId: "0cb96e7e-7e7b-454c-b113-c9e92d617a3f",
							depth: 0,
							documentModelName: "MY_MOCKED_MODEL"
						}
					]
				}
			};

			return linkResponse;
		} else {
			// load thumbnails
			return { jsonrpc: "2.0", id: request.id, result: {} };
		}
	});

	const response = TypeMoq.Mock.ofType<Response>();
	response.setup((x) => x.json()).returns(() => Promise.resolve(results));
	response.setup((x) => x.ok).returns(() => true);
	thenable(response);

	return Promise.resolve(response.object);
}

function removeId(req: JsonRpc2Request): Omit<JsonRpc2Request, "id"> {
	const { id, ...rest } = req;

	return rest;
}

function expectRequest(fetchSpy: Mock<typeof fetchStub>, ...requests: JsonRpc2Request[]): void {
	expect(fetchSpy).toHaveBeenCalledTimes(1);
	const fetchArg = fetchSpy.mock.calls[0][0];
	expect(fetchArg.relativeUrl).toBe("/v2/rpc");
	expect(fetchArg.method).toBe("POST");

	const actualRequests = JSON.parse(fetchArg.body as string) as JsonRpc2Request[];

	expect(actualRequests.map(removeId)).toEqual(requests.map(removeId));
}

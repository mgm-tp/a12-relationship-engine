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

import { test, expect, describe, beforeEach } from "vitest";

import type { Activity } from "@com.mgmtp.a12.client/client-core";

import { createActivity, createDataHolder } from "../../../utils/activity.js";
import { dhReducersFactory } from "../../../../internal/documentGraph/redux/dhReducers.js";
import type { DeepReadonly } from "../../../../internal/documentGraph/core/utilityTypes.js";
import { createLinkRef, createLinkDescriptor } from "../../../mocks/relationships/mocks.js";
import mockDocumentGraph from "../../../mocks/scdm/loadDG/emptyDg.json" with { type: "json" };
import { resetAddedLinkIndexForTesting } from "../../../../internal/documentGraph/core/index.js";
import googleDocumentGraph from "../../../mocks/scdm/loadDG/dg-google.json" with { type: "json" };
import type { DgDocs, DocumentGraph } from "../../../../internal/documentGraph/core/documentGraph.js";
import {
	nopObserver,
	handleAddDocument,
	type DgClDataHolderShape
} from "../../../../internal/documentGraph/redux/dhReducersImpl.js";
import {
	setDg,
	addLink,
	mergeDG,
	removeLink,
	addDocument,
	changeDocument,
	endTransaction,
	beginTransaction
} from "../../../../internal/documentGraph/redux/actions.js";

describe("document graph change handling reducer", () => {
	const dgReducers = dhReducersFactory(nopObserver);

	describe("DG", () => {
		describe("given a setDG action", () => {
			test("sets the documentGraph", () => {
				const defaultDh = createDataHolder({ descriptor: { model: "test" } });
				const activity = createActivity({
					id: "TEST1",
					descriptor: { model: "test" },
					dataHolders: [
						defaultDh,
						createDataHolder({ descriptor: { other: "1" } }),
						createDataHolder({ descriptor: { other: "2" } })
					]
				});

				const action = setDg({
					activityId: activity.id,
					documentGraph: mockDocumentGraph as DeepReadonly<DocumentGraph>
				});

				const { reduce } = dgReducers[0];

				const updatedDhs = reduce(activity.dataHolders, action, defaultDh);
				expect(updatedDhs?.[0].data).to.be.deep.equal({
					changeLog: {
						changeCounter: 0,
						changes: []
					},
					documentGraph: mockDocumentGraph
				});
			});
		});

		describe("given a mergeDG action", () => {
			test("merges a documentGraph if one exists already", () => {
				const dgDataHolder: DgClDataHolderShape = {
					data: {
						documentGraph: mockDocumentGraph as DeepReadonly<DocumentGraph>,
						changeLog: {
							changeCounter: 0,
							changes: []
						}
					},
					descriptor: { model: "test" },
					dirty: false,
					loadingState: "missing",
					savingState: "not_saved",
					slices: {}
				};

				const activity = createActivity({
					id: "TEST1",
					descriptor: { model: "test" },
					dataHolders: [
						dgDataHolder,
						createDataHolder({ descriptor: { other: "1" } }),
						createDataHolder({ descriptor: { other: "2" } })
					]
				});

				const action = mergeDG({
					activityId: activity.id,
					documentGraph: googleDocumentGraph as DeepReadonly<DocumentGraph>
				});

				const { reduce } = dgReducers[1];

				const mergedDhs = reduce(activity.dataHolders, action, dgDataHolder);
				expect(mergedDhs?.[0].data).to.be.deep.equal({
					changeLog: {
						changeCounter: 1,
						changes: [
							{
								kind: "dgMerged"
							}
						]
					},
					documentGraph: {
						documents: {
							byDocRef: {
								...googleDocumentGraph.documents.byDocRef,
								...mockDocumentGraph.documents.byDocRef
							}
						},
						links: {
							byId: {
								...googleDocumentGraph.links.byId,
								...mockDocumentGraph.links.byId
							},
							linkIdsByDocId: {
								...googleDocumentGraph.links.linkIdsByDocId,
								...mockDocumentGraph.links.linkIdsByDocId
							}
						}
					}
				});
			});

			test("keeps the existing data if data is not a document graph", () => {
				const dataHolder: Activity.DataHolder = {
					data: {
						key: "notDocumentGraph"
					},
					descriptor: { model: "test" },
					dirty: false,
					loadingState: "missing",
					savingState: "not_saved",
					slices: {}
				};

				const activity = createActivity({
					id: "TEST1",
					descriptor: { model: "test" },
					dataHolders: [
						dataHolder,
						createDataHolder({ descriptor: { other: "1" } }),
						createDataHolder({ descriptor: { other: "2" } })
					]
				});

				const action = mergeDG({
					activityId: activity.id,
					documentGraph: googleDocumentGraph as DeepReadonly<DocumentGraph>
				});

				const { reduce } = dgReducers[1];

				const newDataHolders = reduce(activity.dataHolders, action, dataHolder);
				expect(newDataHolders?.[0].data).to.be.deep.equal(dataHolder.data);
			});
		});
	});

	describe("Link", () => {
		beforeEach(() => {
			resetAddedLinkIndexForTesting();
		});

		describe("given an addLink action", () => {
			test("adds a new link and updates document graph and changelog", () => {
				const dgDataHolder: DgClDataHolderShape = {
					data: {
						documentGraph: {
							documents: googleDocumentGraph.documents as DgDocs,
							links: mockDocumentGraph.links
						},
						changeLog: {
							changeCounter: 0,
							changes: []
						}
					},
					descriptor: { model: "test" },
					dirty: false,
					loadingState: "missing",
					savingState: "not_saved",
					slices: {}
				};

				const activity = createActivity({
					id: "TEST1",
					descriptor: { model: "test" },
					dataHolders: [
						dgDataHolder,
						createDataHolder({ descriptor: { other: "1" } }),
						createDataHolder({ descriptor: { other: "2" } })
					]
				});

				const action = addLink({
					activityId: activity.id,
					linkDescriptor: createLinkDescriptor(
						"Location",
						"BusinessPartner-document/23",
						"businessPartner",
						"Address-document/20",
						"address"
					),
					setDirty: true
				});

				const { reduce } = dgReducers[2];

				const newDataHolders = reduce(activity.dataHolders, action, dgDataHolder);

				const newDgDH = newDataHolders?.[0] as DgClDataHolderShape | undefined;

				expect(newDgDH?.data?.changeLog).to.be.deep.equal({
					changeCounter: 1,
					changes: [
						{
							kind: "linkAdded",
							linkId: "Location_NEW_1"
						}
					]
				});
				expect(newDgDH?.data?.documentGraph.documents).to.be.deep.equal(googleDocumentGraph.documents);
				expect(newDgDH?.data?.documentGraph.links).to.containSubset({
					byId: {
						Location_NEW_1: {
							linkRef: {
								id: "Location_NEW_1",
								linkDescriptor: {
									entities: [
										{
											docRef: "BusinessPartner-document/23",
											role: "businessPartner"
										},
										{
											docRef: "Address-document/20",
											role: "address"
										}
									],
									relationshipModel: "Location"
								}
							}
						}
					},
					linkIdsByDocId: {
						"Address-document/20": ["Location_NEW_1"],
						"BusinessPartner-document/23": ["Location_NEW_1"]
					}
				});
			});

			test("keeps the existing data if data is not a document graph", () => {
				const dataHolder: Activity.DataHolder = {
					data: {
						key: "notDocumentGraph"
					},
					descriptor: { model: "test" },
					dirty: false,
					loadingState: "missing",
					savingState: "not_saved",
					slices: {}
				};

				const activity = createActivity({
					id: "TEST1",
					descriptor: { model: "test" },
					dataHolders: [
						dataHolder,
						createDataHolder({ descriptor: { other: "1" } }),
						createDataHolder({ descriptor: { other: "2" } })
					]
				});

				const action = addLink({
					activityId: activity.id,
					linkDescriptor: createLinkDescriptor(
						"Location",
						"BusinessPartner-document/23",
						"businessPartner",
						"Address/20",
						"address"
					),
					setDirty: true
				});

				const { reduce } = dgReducers[2];

				const newDataHolders = reduce(activity.dataHolders, action, dataHolder);
				expect(newDataHolders?.[0].data).to.be.deep.equal(dataHolder.data);
			});
		});

		describe("given a removeLink action", () => {
			test("removes existing link and updates document graph and changelog", () => {
				const dgDataHolder: DgClDataHolderShape = {
					data: {
						documentGraph: googleDocumentGraph as DeepReadonly<DocumentGraph>,
						changeLog: {
							changeCounter: 0,
							changes: []
						}
					},
					descriptor: { model: "test" },
					dirty: false,
					loadingState: "missing",
					savingState: "not_saved",
					slices: {}
				};

				const activity = createActivity({
					id: "TEST1",
					descriptor: { model: "test" },
					dataHolders: [
						dgDataHolder,
						createDataHolder({ descriptor: { other: "1" } }),
						createDataHolder({ descriptor: { other: "2" } })
					]
				});

				const action = removeLink({
					activityId: activity.id,
					linkRef: createLinkRef({
						id: "9",
						docRef1: "BusinessPartner-document/23",
						role1: "businessPartner",
						docRef2: "Address-document/20",
						role2: "address",
						relationshipModel: "Location"
					}),
					setDirty: true
				});

				const { reduce } = dgReducers[3];

				const newDataHolders = reduce(activity.dataHolders, action, dgDataHolder);
				expect(newDataHolders?.[0].data).to.be.deep.equal({
					changeLog: {
						changeCounter: 1,
						changes: [
							{
								kind: "linkDeleted",
								linkId: "9",
								linkRef: {
									id: "9",
									linkDescriptor: {
										entities: [
											{
												docRef: "BusinessPartner-document/23",
												role: "businessPartner"
											},
											{
												docRef: "Address-document/20",
												role: "address"
											}
										],
										relationshipModel: "Location"
									}
								}
							}
						]
					},
					documentGraph: {
						documents: googleDocumentGraph.documents,
						links: {
							byId: {
								"10": {
									linkRef: {
										linkDescriptor: {
											relationshipModel: "Location",
											entities: [
												{
													role: "businessPartner",
													docRef: "BusinessPartner-document/23"
												},
												{
													role: "address",
													docRef: "Address-document/20"
												}
											],
											predecessorLinkRef: null
										},
										id: "10"
									},
									rank: 6
								}
							},
							linkIdsByDocId: {
								"BusinessPartner-document/23": ["10"],
								"Address-document/20": ["10"]
							}
						}
					}
				});
			});

			test("keeps the existing data if data is not a document graph", () => {
				const dataHolder: Activity.DataHolder = {
					data: {
						key: "notDocumentGraph"
					},
					descriptor: { model: "test" },
					dirty: false,
					loadingState: "missing",
					savingState: "not_saved",
					slices: {}
				};

				const activity = createActivity({
					id: "TEST1",
					descriptor: { model: "test" },
					dataHolders: [
						dataHolder,
						createDataHolder({ descriptor: { other: "1" } }),
						createDataHolder({ descriptor: { other: "2" } })
					]
				});

				const action = removeLink({
					activityId: activity.id,
					linkRef: createLinkRef({
						id: "9",
						docRef1: "BusinessPartner-document/23",
						role1: "businessPartner",
						docRef2: "Address/20",
						role2: "address",
						relationshipModel: "Location"
					}),
					setDirty: true
				});

				const { reduce } = dgReducers[3];

				const newDataHolders = reduce(activity.dataHolders, action, dataHolder);
				expect(newDataHolders?.[0].data).to.be.deep.equal(dataHolder.data);
			});
		});
	});

	describe("Document", () => {
		describe("given a changeDocument action", () => {
			test("changes existing document and updates document graph and changelog", () => {
				const dgDataHolder: DgClDataHolderShape = {
					data: {
						documentGraph: googleDocumentGraph as DeepReadonly<DocumentGraph>,
						changeLog: {
							changeCounter: 0,
							changes: []
						}
					},
					descriptor: { model: "test" },
					dirty: false,
					loadingState: "missing",
					savingState: "not_saved",
					slices: {}
				};

				const activity = createActivity({
					id: "TEST1",
					descriptor: { model: "test" },
					dataHolders: [
						dgDataHolder,
						createDataHolder({ descriptor: { other: "1" } }),
						createDataHolder({ descriptor: { other: "2" } })
					]
				});

				const action = changeDocument({
					activityId: activity.id,
					elementRef: "Address-document/20",
					document: {
						address: {
							country: "USA",
							city: "Mountain View",
							street: "Amphitheatre Pkwy",
							number: "1601"
						}
					}
				});

				const { reduce } = dgReducers[4];

				const newDataHolders = reduce(activity.dataHolders, action, dgDataHolder);
				expect(newDataHolders?.[0].data).to.be.deep.equal({
					changeLog: {
						changeCounter: 1,
						changes: [
							{
								docRef: "Address-document/20",
								kind: "docChanged"
							}
						]
					},
					documentGraph: {
						...googleDocumentGraph,
						documents: {
							...googleDocumentGraph.documents,
							byDocRef: {
								...googleDocumentGraph.documents.byDocRef,
								"Address-document/20": {
									docRef: "Address-document/20",
									loadingState: "loaded",
									documentModelName: "Address-document",
									document: {
										address: {
											country: "USA",
											city: "Mountain View",
											street: "Amphitheatre Pkwy",
											number: "1601"
										}
									}
								}
							}
						}
					}
				});
			});

			test("keeps the existing data if data is not a document graph", () => {
				const dataHolder: Activity.DataHolder = {
					data: {
						key: "notDocumentGraph"
					},
					descriptor: { model: "test" },
					dirty: false,
					loadingState: "missing",
					savingState: "not_saved",
					slices: {}
				};

				const activity = createActivity({
					id: "TEST1",
					descriptor: { model: "test" },
					dataHolders: [
						dataHolder,
						createDataHolder({ descriptor: { other: "1" } }),
						createDataHolder({ descriptor: { other: "2" } })
					]
				});

				const action = changeDocument({
					activityId: activity.id,
					elementRef: "ref",
					document: { key: "value" }
				});

				const { reduce } = dgReducers[4];

				const newDataHolders = reduce(activity.dataHolders, action, dataHolder);
				expect(newDataHolders?.[0].data).to.be.deep.equal(dataHolder.data);
			});
		});

		describe("given an addDocument action", () => {
			test("adds document and updates document graph and changelog", () => {
				const dgDataHolder: DgClDataHolderShape = {
					data: {
						documentGraph: mockDocumentGraph as DeepReadonly<DocumentGraph>,
						changeLog: {
							changeCounter: 0,
							changes: []
						}
					},
					descriptor: { model: "test" },
					dirty: false,
					loadingState: "missing",
					savingState: "not_saved",
					slices: {}
				};

				const activity = createActivity({ id: "TEST1", dataHolders: [dgDataHolder] });

				const action = addDocument({
					activityId: activity.id,
					elementRef: "Address-document/21",
					document: {
						address: {
							country: "Germany",
							city: "Berlin",
							street: "Torstraße",
							number: "1"
						}
					},
					documentModelName: "Address-document"
				});

				const reduce = handleAddDocument(nopObserver);

				const newDataHolder = reduce(dgDataHolder, action);
				expect(newDataHolder.data).to.be.deep.equal({
					changeLog: {
						changeCounter: 1,
						changes: [
							{
								docRef: "Address-document/21",
								kind: "docAdded"
							}
						]
					},
					documentGraph: {
						documents: {
							byDocRef: {
								...mockDocumentGraph.documents.byDocRef,
								"Address-document/21": {
									docRef: "Address-document/21",
									documentModelName: "Address-document",
									document: {
										address: {
											country: "Germany",
											city: "Berlin",
											street: "Torstraße",
											number: "1"
										}
									},
									loadingState: "loaded"
								}
							}
						},
						links: mockDocumentGraph.links
					}
				});
			});

			test("keeps the existing data if data is not a document graph", () => {
				const dataHolder: Activity.DataHolder = {
					data: {
						key: "notDocumentGraph"
					},
					descriptor: { model: "test" },
					dirty: false,
					loadingState: "missing",
					savingState: "not_saved",
					slices: {}
				};

				const activity = createActivity({ id: "TEST1", dataHolders: [dataHolder] });

				const action = addDocument({
					activityId: activity.id,
					elementRef: "ref",
					document: { key: "value" },
					documentModelName: "test"
				});

				const reduce = handleAddDocument(nopObserver);

				const newDataHolder = reduce(dataHolder as DgClDataHolderShape, action);
				expect(newDataHolder.data).to.be.deep.equal(dataHolder.data);
			});
		});
	});

	describe("Transaction", () => {
		describe("given a beginTransaction action", () => {
			test("begins a transaction by setting a marker and updates document graph and changelog", () => {
				const dgDataHolder: DgClDataHolderShape = {
					data: {
						documentGraph: googleDocumentGraph as DeepReadonly<DocumentGraph>,
						changeLog: {
							changeCounter: 0,
							changes: []
						}
					},
					descriptor: { model: "test" },
					dirty: false,
					loadingState: "missing",
					savingState: "not_saved",
					slices: {}
				};

				const activity = createActivity({
					id: "TEST1",
					descriptor: { model: "test" },
					dataHolders: [
						dgDataHolder,
						createDataHolder({ descriptor: { other: "1" } }),
						createDataHolder({ descriptor: { other: "2" } })
					]
				});

				const action = beginTransaction({
					activityId: activity.id,
					id: "1337"
				});

				const { reduce } = dgReducers[6];

				const newDataHolders = reduce(activity.dataHolders, action, dgDataHolder);
				expect(newDataHolders?.[0].data).to.be.deep.equal({
					changeLog: {
						changeCounter: 1,
						changes: [
							{
								id: "1337",
								kind: "marker",
								snapshot: googleDocumentGraph
							}
						]
					},
					documentGraph: googleDocumentGraph
				});
			});

			test("keeps the existing data if data is not a document graph", () => {
				const dataHolder: Activity.DataHolder = {
					data: {
						key: "notDocumentGraph"
					},
					descriptor: { model: "test" },
					dirty: false,
					loadingState: "missing",
					savingState: "not_saved",
					slices: {}
				};

				const activity = createActivity({
					id: "TEST1",
					descriptor: { model: "test" },
					dataHolders: [
						dataHolder,
						createDataHolder({ descriptor: { other: "1" } }),
						createDataHolder({ descriptor: { other: "2" } })
					]
				});

				const action = beginTransaction({
					activityId: activity.id,
					id: "1"
				});

				const { reduce } = dgReducers[6];

				const newDataHolders = reduce(activity.dataHolders, action, dataHolder);
				expect(newDataHolders?.[0].data).to.be.deep.equal(dataHolder.data);
			});
		});

		describe("given an endTransaction action", () => {
			describe('with outcome set to "commit"', () => {
				test("ends a transaction by removing a marker and updates document graph and changelog", () => {
					const dgDataHolder: DgClDataHolderShape = {
						data: {
							documentGraph: googleDocumentGraph as DeepReadonly<DocumentGraph>,
							changeLog: {
								changeCounter: 1,
								changes: [
									{
										id: "1337",
										kind: "marker",
										snapshot: googleDocumentGraph as DeepReadonly<DocumentGraph>
									}
								]
							}
						},
						descriptor: { model: "test" },
						dirty: false,
						loadingState: "missing",
						savingState: "not_saved",
						slices: {}
					};

					const activity = createActivity({
						id: "TEST1",
						descriptor: { model: "test" },
						dataHolders: [
							dgDataHolder,
							createDataHolder({ descriptor: { other: "1" } }),
							createDataHolder({ descriptor: { other: "2" } })
						]
					});

					const action = endTransaction({
						activityId: activity.id,
						outcome: "commit",
						setDirty: true
					});

					const { reduce } = dgReducers[7];

					const newDataHolders = reduce(activity.dataHolders, action, dgDataHolder);
					expect(newDataHolders?.[0].data).to.be.deep.equal({
						changeLog: {
							changeCounter: 1,
							changes: []
						},
						documentGraph: googleDocumentGraph
					});
				});
			});

			describe('with outcome set to "rollback"', () => {
				test("ends a transaction by removing a marker and reverts document graph and changelog", () => {
					const dgDataHolder: DgClDataHolderShape = {
						data: {
							documentGraph: googleDocumentGraph as DeepReadonly<DocumentGraph>,
							changeLog: {
								changeCounter: 12,
								changes: [
									{
										id: "1337",
										kind: "marker",
										snapshot: mockDocumentGraph as DeepReadonly<DocumentGraph>
									}
								]
							}
						},
						descriptor: { model: "test" },
						dirty: false,
						loadingState: "missing",
						savingState: "not_saved",
						slices: {}
					};

					const activity = createActivity({
						id: "TEST1",
						descriptor: { model: "test" },
						dataHolders: [
							dgDataHolder,
							createDataHolder({ descriptor: { other: "1" } }),
							createDataHolder({ descriptor: { other: "2" } })
						]
					});

					const action = endTransaction({
						activityId: activity.id,
						outcome: "rollback"
					});

					const { reduce } = dgReducers[7];

					const newDataHolders = reduce(activity.dataHolders, action, dgDataHolder);
					expect(newDataHolders?.[0].data).to.be.deep.equal({
						changeLog: {
							changeCounter: 13,
							changes: []
						},
						documentGraph: mockDocumentGraph
					});
				});
			});

			test("keeps the existing data if data is not a document graph", () => {
				const dataHolder: Activity.DataHolder = {
					data: {
						key: "notDocumentGraph"
					},
					descriptor: { model: "test" },
					dirty: false,
					loadingState: "missing",
					savingState: "not_saved",
					slices: {}
				};

				const activity = createActivity({
					id: "TEST1",
					descriptor: { model: "test" },
					dataHolders: [
						dataHolder,
						createDataHolder({ descriptor: { other: "1" } }),
						createDataHolder({ descriptor: { other: "2" } })
					]
				});

				const action = endTransaction({
					activityId: activity.id,
					outcome: "commit",
					setDirty: true
				});

				const { reduce } = dgReducers[7];

				const newDataHolders = reduce(activity.dataHolders, action, dataHolder);
				expect(newDataHolders?.[0].data).to.be.deep.equal(dataHolder.data);
			});
		});
	});
});

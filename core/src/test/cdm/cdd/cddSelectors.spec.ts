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

import { vi, test, expect, describe, afterAll, beforeAll } from "vitest";

import type { ModelGraph, Relationship } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { ModelSelectors, ActivitySelectors, type ApplicationModel } from "@com.mgmtp.a12.client/client-core";

import { createModule } from "../../utils/appmodel-utils.js";
import { createGeneralStore } from "../../mocks/store/store.js";
import { createLinkMutation } from "../dataProvider/testSetup.js";
import { MOCK_MODEL_GRAPH } from "../../mocks/relationships/ModelGraph.js";
import { createActivity, createDataHolder } from "../../utils/activity.js";
import { CddSelectors } from "../../../internal/cdm/cdd/redux/selectors.js";
import { createModelsMock, createLinkRefResponse } from "../../mocks/relationships/mocks.js";
import type { DocumentGraph, DgLinkInternal } from "../../../internal/documentGraph/core/index.js";
import {
	cddStateAdapter,
	cddActivityStateAdapter
} from "../../../internal/cdm/cdd/redux/cddMiddlewareAdapterFactory.js";
import type {
	DocumentMutation,
	DocumentWithMutationMetadata
} from "../../../internal/cdm/cdd/core/effectiveChanges/documentsWithMetaData.js";

describe("com.mgmtp.a12.relationshipengine-core.extensions.cdm.cdd", () => {
	const testActivityId = "123";
	const mockDocumentGraph: DocumentGraph = {
		documents: {
			byDocRef: {
				doc1: {
					docRef: "doc1",
					documentModelName: "doc",
					document: {},
					loadingState: "loaded"
				},
				doc2: {
					docRef: "doc2",
					documentModelName: "doc",
					document: {},
					loadingState: "loaded"
				},
				doc3: {
					docRef: "doc3",
					documentModelName: "doc",
					document: {},
					loadingState: "loaded"
				}
			}
		},
		links: {
			byId: {
				1: createDgLinkInternal("1", "rm1", "doc1", "doc2"),
				2: createDgLinkInternal("2", "rm1", "doc2", "doc3"),
				3: createDgLinkInternal("3", "rm1", "doc2", "doc1"),
				4: createDgLinkInternal("4", "rm1", "doc3", "doc1")
			},
			linkIdsByDocId: {
				doc1: ["1", "3", "4"],
				doc2: ["1", "2", "3"],
				doc3: ["2", "4"]
			}
		}
	};

	describe("cddCandidates selector", () => {
		describe("given an activityId and a usage (instanceId)", () => {
			test("returns undefined if the activity does not exist", () => {
				const store = createGeneralStore();
				const result = CddSelectors.cddCandidates("1", "test-instance")(store.getState());

				expect(result).to.be.equal(undefined);
			});

			test("returns undefined if the candidate data holder for the given usage does not exist", () => {
				const store = createGeneralStore({
					activities: [createActivity({ id: "1", descriptor: { model: "foo" } })]
				});

				const result = CddSelectors.cddCandidates("1", "test-instance")(store.getState());

				expect(result).to.be.equal(undefined);
			});

			test("returns undefined if the candidate data holder does not contain any data", () => {
				const store = createGeneralStore({
					activities: [
						createActivity({
							id: "1",
							descriptor: { model: "foo" },
							dataHolders: [
								createDataHolder({
									descriptor: {
										type: "candidate",
										feature: "relationship",
										instanceId: "test-instance"
									}
								})
							]
						})
					]
				});

				const result = CddSelectors.cddCandidates("1", "test-instance")(store.getState());

				expect(result).to.be.equal(undefined);
			});

			test("returns the candidates of the candidate data holder if no candidate matches a document in the DG of the activity", () => {
				const candidates: Relationship.Candidate[] = [
					{
						linkRef: createLinkRefResponse({
							id: "1",
							relationshipModel: "rm",
							docRef1: "doc1",
							role1: "left",
							docRef2: "doc2",
							role2: "right"
						}),
						document: {
							target: {
								foo: "bar"
							}
						}
					},
					{
						linkRef: createLinkRefResponse({
							id: "2",
							relationshipModel: "rm",
							docRef1: "doc1",
							role1: "left",
							docRef2: "doc2",
							role2: "right"
						}),
						document: {
							target: {
								foo: "bar"
							}
						}
					}
				];

				const store = createGeneralStore({
					activities: [
						createActivity({
							id: "1",
							descriptor: { model: "foo" },
							dataHolders: [
								createDataHolder({
									descriptor: { model: "foo" },
									data: {
										documentGraph: {
											documents: {
												byDocRef: {}
											},
											links: {
												linkIdsByDocId: {},
												byId: {}
											}
										} as DocumentGraph
									}
								}),
								createDataHolder({
									descriptor: {
										type: "candidate",
										feature: "relationship",
										instanceId: "test-instance"
									},
									data: {
										candidates
									}
								})
							]
						})
					]
				});

				const result = CddSelectors.cddCandidates("1", "test-instance")(store.getState());

				expect(result).to.deep.equal(candidates);
			});

			test("returns the candidates of the candidate data holder which hold the documents of the activity's DG if it are available there", () => {
				const candidates: Relationship.Candidate[] = [
					{
						linkRef: createLinkRefResponse({
							id: "1",
							relationshipModel: "rm",
							docRef1: "doc1",
							role1: "left",
							docRef2: "doc2",
							role2: "right"
						}),
						document: {
							target: {
								foo: "bar"
							}
						}
					},
					{
						linkRef: createLinkRefResponse({
							id: "2",
							relationshipModel: "rm",
							docRef1: "doc3",
							role1: "left",
							docRef2: "doc4",
							role2: "right"
						}),
						document: {
							target: {
								foo: "bar"
							}
						}
					}
				];

				const store = createGeneralStore({
					activities: [
						createActivity({
							id: "1",
							descriptor: { model: "foo" },
							dataHolders: [
								createDataHolder({
									descriptor: { model: "foo" },
									data: {
										documentGraph: {
											documents: {
												byDocRef: {
													doc2: {
														docRef: "doc2",
														documentModelName: "doc",
														loadingState: "loaded",
														document: {
															foo: "test"
														}
													}
												}
											},
											links: {
												linkIdsByDocId: {},
												byId: {}
											}
										} as DocumentGraph
									}
								}),
								createDataHolder({
									descriptor: {
										type: "candidate",
										feature: "relationship",
										instanceId: "test-instance"
									},
									data: {
										candidates
									}
								})
							]
						})
					]
				});

				const result = CddSelectors.cddCandidates("1", "test-instance")(store.getState());

				expect(result).to.deep.equal([
					{
						linkRef: createLinkRefResponse({
							id: "1",
							relationshipModel: "rm",
							docRef1: "doc1",
							role1: "left",
							docRef2: "doc2",
							role2: "right"
						}),
						document: {
							target: {
								foo: "test"
							}
						}
					},
					{
						linkRef: createLinkRefResponse({
							id: "2",
							relationshipModel: "rm",
							docRef1: "doc3",
							role1: "left",
							docRef2: "doc4",
							role2: "right"
						}),
						document: {
							target: {
								foo: "bar"
							}
						}
					}
				]);
			});
		});
	});

	describe("effectiveChanges selector", () => {
		const EMPTY_CHANGE_LIST = { links: [], documents: [] };

		beforeAll(() => {
			vi.spyOn(ModelSelectors, "allModelsInScene").mockReturnValue(() => []);
			vi.spyOn(ModelSelectors, "modelGraph").mockReturnValue(() => ({}) as unknown as ModelGraph);
			vi.spyOn(CddSelectors, "selectModelTuple").mockReturnValue(createModelsMock());
		});

		afterAll(() => {
			vi.restoreAllMocks();
		});

		describe("given an activityId", () => {
			test("returns an empty change list if the activity does not exist", () => {
				const store = createGeneralStore();
				const effectiveChangeList = CddSelectors.effectiveChanges(testActivityId)(store.getState());

				expect(effectiveChangeList).to.be.deep.equal(EMPTY_CHANGE_LIST);
			});

			test("returns an empty change list if no default data holder exists for the activity", () => {
				const store = createGeneralStore({
					activities: [
						createActivity({
							id: testActivityId,
							descriptor: { model: "foo" },
							dataHolders: [
								createDataHolder({
									descriptor: { model: "bar" },
									data: { not: "cdm" }
								})
							]
						})
					]
				});
				const effectiveChangeList = CddSelectors.effectiveChanges(testActivityId)(store.getState());

				expect(effectiveChangeList).to.be.deep.equal(EMPTY_CHANGE_LIST);
			});

			test("returns an empty change list if the default data holder of the activity does not contain CDM data", () => {
				const store = createGeneralStore({
					activities: [
						createActivity({
							id: testActivityId,
							descriptor: { model: "foo" },
							activityDataHolder: {
								data: { not: "cdm" }
							}
						})
					]
				});
				const effectiveChangeList = CddSelectors.effectiveChanges(testActivityId)(store.getState());

				expect(effectiveChangeList).to.be.deep.equal(EMPTY_CHANGE_LIST);
			});

			test("returns all effective changes that the changeLog contains", () => {
				const store = createGeneralStore({
					activities: [
						createActivity({
							id: testActivityId,
							descriptor: { model: "foo" },
							activityDataHolder: {
								data: {
									documentGraph: mockDocumentGraph,
									changeLog: {
										changeCounter: 0,
										changes: [
											{
												kind: "docChanged",
												docRef: "doc1"
											},
											{
												kind: "docChanged",
												docRef: "doc3"
											},
											{
												kind: "linkDeleted",
												linkId: "1",
												linkRef: createLinkRef("1", "rm1", "doc1", "doc2")
											},
											{
												kind: "linkDeleted",
												linkId: "2",
												linkRef: createLinkRef("2", "rm1", "doc2", "doc3")
											}
										]
									},
									cddState: {
										cachedCdd: {
											cdd: {}
										}
									}
								}
							}
						})
					]
				});

				const effectiveChangeList = CddSelectors.effectiveChanges(testActivityId)(store.getState());

				expect(effectiveChangeList.documents).to.be.deep.equal([
					createDocumentMutation("doc1", "doc", "modified"),
					createDocumentMutation("doc3", "doc", "modified")
				]);

				const links = effectiveChangeList.links.map((linkData) => ({
					...linkData,
					time: parseInt(linkData.link.linkRef.id, 10)
				}));

				const expected = [
					createLinkMutation("removed", "1", "rm1", "doc1", "left", "doc2", "right"),
					createLinkMutation("removed", "2", "rm1", "doc2", "left", "doc3", "right"),
					createLinkMutation("existing", "3", "rm1", "doc2", "left", "doc1", "right"),
					createLinkMutation("existing", "4", "rm1", "doc3", "left", "doc1", "right")
				];

				expect(links).to.be.deep.equal(expected);
			});
		});
	});

	describe("links selector", () => {
		const relshModel = "rm1";
		const sourceDocId = "doc1";
		const targetRole = "left";

		describe("given an activityId, a relsh model and a source document", () => {
			test("returns an empty link list if the activity does not exist", () => {
				const store = createGeneralStore();
				const linkList = CddSelectors.links(testActivityId, relshModel, sourceDocId, targetRole)(store.getState());

				expect(linkList).to.be.deep.equal([]);
			});

			test("returns an empty link list if no default data holder exists for the activity", () => {
				const store = createGeneralStore({
					activities: [
						createActivity({
							id: testActivityId,
							descriptor: { model: "foo" },
							dataHolders: [
								createDataHolder({
									descriptor: { model: "bar" },
									data: { not: "cdm" }
								})
							]
						})
					]
				});
				const linkList = CddSelectors.links(testActivityId, relshModel, sourceDocId, targetRole)(store.getState());

				expect(linkList).to.be.deep.equal([]);
			});

			test("returns an empty link list if the default data holder does not contain a document graph", () => {
				const store = createGeneralStore({
					activities: [
						createActivity({
							id: testActivityId,
							descriptor: { model: "foo" },
							activityDataHolder: {
								data: { changeLog: {} }
							}
						})
					]
				});
				const linkList = CddSelectors.links(testActivityId, relshModel, sourceDocId, targetRole)(store.getState());

				expect(linkList).to.be.deep.equal([]);
			});

			test("returns an empty link list if the default data holder does not contain a changelog", () => {
				const store = createGeneralStore({
					activities: [
						createActivity({
							id: testActivityId,
							descriptor: { model: "foo" },
							activityDataHolder: {
								data: { documentGraph: {} }
							}
						})
					]
				});
				const linkList = CddSelectors.links(testActivityId, relshModel, sourceDocId, targetRole)(store.getState());

				expect(linkList).to.be.deep.equal([]);
			});

			test("returns a list of links with mutation metadata", () => {
				const store = createGeneralStore({
					activities: [
						createActivity({
							id: testActivityId,
							descriptor: { model: "foo" },
							activityDataHolder: {
								data: {
									documentGraph: mockDocumentGraph,
									changeLog: {
										changeCounter: 0,
										changes: [
											{
												kind: "linkDeleted",
												linkId: "1",
												linkRef: createLinkRef("1", "rm1", "doc1", "doc2")
											},
											{
												kind: "linkDeleted",
												linkId: "2",
												linkRef: createLinkRef("2", "rm1", "doc2", "doc3")
											},
											{
												kind: "linkAdded",
												linkId: "3"
											},
											{
												kind: "linkAdded",
												linkId: "4"
											}
										]
									},
									cddState: {}
								}
							}
						})
					]
				});
				const linkList = CddSelectors.links(testActivityId, relshModel, sourceDocId, targetRole)(store.getState());

				expect(linkList).to.be.deep.equal([
					{
						link: {
							document: {
								relationship: {},
								t_docRef: "doc2",
								target: {}
							},
							linkRef: createLinkRef("3", relshModel, "doc2", sourceDocId)
						},
						modified: false,
						mutationState: "added",
						relinked: false
					},
					{
						link: {
							document: {
								relationship: {},
								t_docRef: "doc3",
								target: {}
							},
							linkRef: createLinkRef("4", relshModel, "doc3", sourceDocId)
						},
						modified: false,
						mutationState: "added",
						relinked: false
					}
				]);
			});

			test("considers correct roles for filtered links", () => {
				const relshModel = "rm2";
				const sourceDocId = "doc2";
				const targetRole = "right";

				const mockDg: DocumentGraph = {
					documents: {
						byDocRef: {
							doc1: {
								docRef: "doc1",
								documentModelName: "doc",
								document: {},
								loadingState: "loaded"
							},
							doc2: {
								docRef: "doc2",
								documentModelName: "doc",
								document: {},
								loadingState: "loaded"
							}
						}
					},
					links: {
						byId: {
							wrongRelshWrongRole: createDgLinkInternal("wrongRelshWrongRole", "rm1", "doc1", "doc2"),
							wrongRole: createDgLinkInternal("wrongRole", "rm2", "doc1", "doc2"),
							wrongRelsh: createDgLinkInternal("wrongRelsh", "rm1", "doc2", "doc1"),
							correctRole: createDgLinkInternal("correctRole", "rm2", "doc2", "doc1")
						},
						linkIdsByDocId: {
							doc1: ["wrongRelshWrongRole", "wrongRole", "wrongRelsh", "correctRole"],
							doc2: ["wrongRelshWrongRole", "wrongRole", "wrongRelsh", "correctRole"]
						}
					}
				};

				const store = createGeneralStore({
					activities: [
						createActivity({
							id: testActivityId,
							descriptor: { model: "foo" },
							activityDataHolder: {
								data: {
									documentGraph: mockDg,
									changeLog: {
										changeCounter: 0,
										changes: [
											{
												kind: "linkAdded",
												linkId: "wrongRelshWrongRole"
											},
											{
												kind: "linkAdded",
												linkId: "wrongRole"
											},
											{
												kind: "linkAdded",
												linkId: "wrongRelsh"
											},
											{
												kind: "linkAdded",
												linkId: "correctRole"
											}
										]
									},
									cddState: {}
								}
							}
						})
					]
				});
				const linkList = CddSelectors.links(testActivityId, relshModel, sourceDocId, targetRole)(store.getState());

				expect(linkList).to.be.deep.equal([
					{
						link: {
							document: {
								relationship: {},
								t_docRef: "doc1",
								target: {}
							},
							linkRef: createLinkRef("correctRole", relshModel, sourceDocId, "doc1")
						},
						modified: false,
						mutationState: "added",
						relinked: false
					}
				]);
			});
		});
	});

	describe("cdd selector", () => {
		describe("given an activityId", () => {
			test("returns undefined if the activity does not exist", () => {
				const store = createGeneralStore();
				const docWithState = CddSelectors.cdd(testActivityId)(store.getState());

				expect(docWithState).to.be.deep.equal(undefined);
			});

			test("returns undefined if no default data holder exists for the activity", () => {
				const store = createGeneralStore({
					activities: [
						createActivity({
							id: testActivityId,
							descriptor: { model: "foo" },
							dataHolders: [
								createDataHolder({
									descriptor: { model: "bar" }
								})
							]
						})
					]
				});
				const docWithState = CddSelectors.cdd(testActivityId)(store.getState());

				expect(docWithState).to.be.deep.equal(undefined);
			});

			test("returns undefined if the default data holder of the activity does not contain a CDD", () => {
				const store = createGeneralStore({
					activities: [
						createActivity({
							id: testActivityId,
							descriptor: { model: "foo" },
							activityDataHolder: {
								data: { documentGraph: {}, changeLog: {}, cddState: {} }
							}
						})
					]
				});
				const docWithState = CddSelectors.cdd(testActivityId)(store.getState());

				expect(docWithState).to.be.deep.equal(undefined);
			});

			test("returns the CDD with its dirty state if both exist", () => {
				const mockDocument = { some: "content" };
				const store = createGeneralStore({
					activities: [
						createActivity({
							id: testActivityId,
							descriptor: { model: "foo" },
							activityDataHolder: {
								data: {
									cddState: {
										cdm: {},
										pendingUsages: [],
										rootDocRef: "doc1",
										cachedCdd: {
											cdd: mockDocument,
											snapshotChangeCounter: 0
										}
									}
								}
							},
							dirtyStateOfActivityDataHolder: true
						})
					]
				});
				const docWithState = CddSelectors.cdd(testActivityId)(store.getState());

				expect(docWithState).to.be.deep.equal({
					document: mockDocument,
					loadingState: "loaded",
					dirty: true
				});
			});
		});
	});

	describe("missingPaths selector", () => {
		describe("given an activityId", () => {
			test("throws if the activity does not exist", () => {
				const store = createGeneralStore();
				const queryPathSelector = CddSelectors.missingPaths(testActivityId);

				expect(() => queryPathSelector(store.getState())).to.throw("activity.descriptor.instance expected for CDM");
			});

			test("throws if no default data holder exists for the activity", () => {
				const store = createGeneralStore({
					activities: [
						createActivity({
							id: testActivityId,
							descriptor: { model: "foo" },
							dataHolders: [
								createDataHolder({
									descriptor: { model: "bar" }
								})
							]
						})
					]
				});
				const queryPathSelector = CddSelectors.missingPaths(testActivityId);

				expect(() => queryPathSelector(store.getState())).to.throw("activity.descriptor.instance expected for CDM");
			});

			describe("if cdd state is not present", () => {
				test("returns a query path for the root if instance is set in the activity descriptor", () => {
					const mockInstance = "bar";
					const store = createGeneralStore({
						activities: [
							createActivity({
								id: testActivityId,
								descriptor: { model: "foo", instance: mockInstance }
							})
						]
					});
					const queryPaths = CddSelectors.missingPaths(testActivityId)(store.getState());
					expect(queryPaths).to.be.deep.equal([{ docRef: mockInstance, path: "" }]);
				});

				test("throws if instance is not set in the activity descriptor", () => {
					const store = createGeneralStore({
						activities: [
							createActivity({
								id: testActivityId,
								descriptor: { model: "foo" },
								activityDataHolder: {
									data: {}
								}
							})
						]
					});
					const queryPathSelector = CddSelectors.missingPaths(testActivityId);

					expect(() => queryPathSelector(store.getState())).to.throw("activity.descriptor.instance expected for CDM");
				});
			});

			test("returns missing query paths if cdd state is present", () => {
				const store = createGeneralStore({
					activities: [
						createActivity({
							id: testActivityId,
							descriptor: { model: "foo" },
							activityDataHolder: {
								data: {
									cddState: {
										cdm: {},
										pendingUsages: [
											{
												key: {
													relshName: "rm1",
													targetDocRef: "doc1"
												},
												relshUsages: [
													{
														relshPath: "path1",
														loadingState: "missing"
													},
													{
														relshPath: "path2",
														loadingState: "loading"
													},
													{
														relshPath: "path3",
														loadingState: "missing"
													}
												]
											}
										],
										rootDocRef: "doc1"
									}
								}
							}
						})
					]
				});
				const queryPaths = CddSelectors.missingPaths(testActivityId)(store.getState());

				expect(queryPaths).to.be.deep.equal([
					{ docRef: "doc1", path: "path1" },
					{ docRef: "doc1", path: "path3" }
				]);
			});
		});
	});

	describe("cddStateAdapter selector", () => {
		describe("given an activityId", () => {
			test("throws if the activity does not exist", () => {
				const store = createGeneralStore();
				const selector = cddStateAdapter(testActivityId);

				expect(() => selector(store.getState())).to.throw();
			});

			test("returns the state if no cdd exists", () => {
				const store = createGeneralStore({
					activities: [
						createActivity({
							id: testActivityId,
							descriptor: { model: "foo" },
							activityDataHolder: {}
						})
					]
				});
				const state = store.getState() as any;
				const stateWithDoc = cddStateAdapter(testActivityId)(state);

				expect(stateWithDoc).to.be.deep.equal(state);
			});

			test("returns the state with the cdd document if it exists", () => {
				const mockDocument = { field: "value" };
				const store = createGeneralStore({
					activities: [
						createActivity({
							id: testActivityId,
							descriptor: { model: "foo" },
							activityDataHolder: {
								data: {
									cddState: {
										cdm: {},
										pendingUsages: [],
										rootDocRef: "doc1",
										cachedCdd: {
											cdd: mockDocument,
											snapshotChangeCounter: 0
										}
									}
								}
							}
						})
					]
				});
				const state = store.getState();
				const stateWithDoc = cddStateAdapter(testActivityId)(state);

				expect(ActivitySelectors.data(testActivityId)(stateWithDoc)).to.be.deep.equal({
					document: mockDocument
				});
			});
		});
	});

	describe("cddActivityStateAdapter selector", () => {
		describe("given an activity", () => {
			test("returns the state if activity does not contain a cdd document", () => {
				const mockActivity = createActivity({
					id: testActivityId,
					descriptor: { model: "foo" },
					activityDataHolder: {}
				});
				const store = createGeneralStore({
					activities: [mockActivity]
				});
				const stateWithDoc = cddActivityStateAdapter(mockActivity)(store.getState());

				expect(stateWithDoc).to.be.deep.equal(store.getState());
			});

			test("returns the state with the cdd document if it exists", () => {
				const mockDocument = { field: "value" };
				const mockActivity = createActivity({
					id: testActivityId,
					descriptor: { model: "foo" },
					activityDataHolder: {
						data: {
							cddState: {
								cdm: {},
								pendingUsages: [],
								rootDocRef: "doc1",
								cachedCdd: {
									cdd: mockDocument,
									snapshotChangeCounter: 0
								}
							}
						}
					}
				});
				const store = createGeneralStore({
					activities: [mockActivity]
				});
				const state = store.getState();
				const stateWithDoc = cddActivityStateAdapter(mockActivity)(state);

				expect(ActivitySelectors.data(testActivityId)(stateWithDoc)).to.be.deep.equal({
					document: mockDocument
				});
			});
		});
	});

	describe("isCddActivity selector", () => {
		describe("given an activityId", () => {
			test("returns false if the activity does not exist", () => {
				const store = createGeneralStore({
					modelGraph: MOCK_MODEL_GRAPH,
					activities: [],
					modules: [createCDMModule()]
				});
				const result = CddSelectors.isCddActivity(store.getState(), testActivityId);

				expect(result).to.equal(false);
			});

			test("returns false if the modelgraph is empty", () => {
				const mockActivity = createActivity({
					id: testActivityId,
					descriptor: { instance: "cdm/1" },
					activityDataHolder: {}
				});

				const store = createGeneralStore({
					activities: [mockActivity],
					modules: [createCDMModule()]
				});
				const result = CddSelectors.isCddActivity(store.getState(), testActivityId);

				expect(result).to.equal(false);
			});

			test("returns false if the activity has no instance", () => {
				const mockActivity = createActivity({
					id: testActivityId,
					descriptor: { other: "cdm/1" },
					activityDataHolder: {}
				});

				const store = createGeneralStore({
					modelGraph: MOCK_MODEL_GRAPH,
					activities: [mockActivity]
				});
				const result = CddSelectors.isCddActivity(store.getState(), testActivityId);

				expect(result).to.equal(false);
			});

			test("return false if the activity does not reference a cdm and has no parent", () => {
				const mockActivity = createActivity({
					id: testActivityId,
					descriptor: { instance: "cdm/1" },
					activityDataHolder: {}
				});

				const store = createGeneralStore({
					modelGraph: MOCK_MODEL_GRAPH,
					modules: [],
					activities: [mockActivity]
				});
				const result = CddSelectors.isCddActivity(store.getState(), testActivityId);

				expect(result).to.equal(false);
			});

			test("return false if the activity does not reference a cdm and has a parent that does not use cdm", () => {
				const mockActivity = createActivity({
					id: testActivityId,
					initiatingActivityId: "parent",
					descriptor: { instance: "cdm/1" },
					activityDataHolder: {}
				});
				const parentActivity = createActivity({
					id: "parent",
					descriptor: { type: "overview" },
					activityDataHolder: { data: { cddState: undefined } }
				});

				const store = createGeneralStore({
					modelGraph: MOCK_MODEL_GRAPH,
					modules: [],
					activities: [parentActivity, mockActivity]
				});
				const result = CddSelectors.isCddActivity(store.getState(), testActivityId);

				expect(result).to.equal(false);
			});

			test("returns true if the activity has an instance and references a cdm", () => {
				const mockActivity = createActivity({
					id: testActivityId,
					descriptor: { model: "ContractCDM", instance: "cdm/1" },
					activityDataHolder: {}
				});

				const store = createGeneralStore({
					modelGraph: MOCK_MODEL_GRAPH,
					modules: [createCDMModule()],
					activities: [mockActivity]
				});
				const result = CddSelectors.isCddActivity(store.getState(), testActivityId);

				expect(result).to.equal(true);
			});

			test("returns true if the activity has an instance, does not reference a cdm but has a parent that uses cdm", () => {
				const mockActivity = createActivity({
					id: testActivityId,
					initiatingActivityId: "parent",
					descriptor: { model: "Address-document", instance: "dm/1" },
					activityDataHolder: {}
				});
				const parentActivity = createActivity({
					id: "parent",
					descriptor: { type: "overview" },
					activityDataHolder: { data: { cddState: {} } }
				});

				const store = createGeneralStore({
					modelGraph: MOCK_MODEL_GRAPH,
					modules: [],
					activities: [parentActivity, mockActivity]
				});
				const result = CddSelectors.isCddActivity(store.getState(), testActivityId);

				expect(result).to.equal(true);
			});
		});
	});
});

function createDocumentMutation(
	docRef: string,
	documentModelName: string,
	mutation: DocumentMutation,
	content: object = {}
): DocumentWithMutationMetadata {
	return { document: { docRef, content, documentModelName }, mutation };
}

function createLinkRef(id: string, relationshipModel: string, leftDoc: string, rightDoc: string): Relationship.LinkRef {
	return {
		id,
		linkDescriptor: {
			relationshipModel,
			entities: [
				{
					role: "left",
					docRef: leftDoc
				},
				{
					role: "right",
					docRef: rightDoc
				}
			]
		}
	};
}

function createDgLinkInternal(
	id: string,
	relationshipModel: string,
	leftDoc: string,
	rightDoc: string
): DgLinkInternal {
	return {
		linkRef: createLinkRef(id, relationshipModel, leftDoc, rightDoc),
		rank: Date.now()
	};
}

function createCDMModule(): ApplicationModel.Module {
	return createModule({
		flows: [
			{
				name: "CDMFlow",
				scenes: [
					{
						name: "cdmFormScene",
						matchConditions: [
							{ key: "model", mustEqual: "ContractCDM" },
							{ key: "instance", isSet: true }
						],
						sceneChange: {
							onEnter: [
								{
									type: "VIEW_ADD",
									name: "RelshEngine",
									models: [{ modelType: "form", name: "ContractCDM-form" }]
								}
							]
						}
					},
					{
						name: "cdmOverviewScene",
						matchConditions: [
							{ key: "model", mustEqual: "Contract-overview" },
							{ key: "instance", isSet: false }
						]
					}
				]
			}
		]
	});
}

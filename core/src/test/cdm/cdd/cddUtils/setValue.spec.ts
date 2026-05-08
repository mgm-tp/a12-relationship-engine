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

import { describe, test, expect, beforeEach } from "vitest";

import { type EntityInstancePath, type GroupInstance } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";

import { resetDocRefCounterForTesting } from "../../../../internal/cdm/cdd/redux/newDocRef.js";
import { setValue } from "../../../../internal/cdm/cddUtils/setValue.js";
import { DOCUMENT_SERVICE } from "../../../../internal/cdm/cdmCommons/documentService.js";
import {
	type DeepReadonly,
	type DgChangeLog,
	type DgDocument,
	type DocumentGraph,
	resetAddedLinkIndexForTesting
} from "../../../../internal/documentGraph/core/index.js";

import { replaceLinkRanksInDg, setupCddUtilsTestData } from "./testUtils.js";

describe("com.mgmtp.a12.client.extensions.cdm.cdd", () => {
	describe("cddUtils.setValue", () => {
		beforeEach(() => {
			resetDocRefCounterForTesting();
			resetAddedLinkIndexForTesting();
		});
		describe("path to a field", () => {
			describe("given a path containing groups missing in the dg doc and undefined as field value", () => {
				test("doesn't update the given data, since only empty instances would be added", () => {
					const { cdmData, documentModelsInScene, modelGraph } = setupCddUtilsTestData();

					const path: EntityInstancePath = [
						{ elementName: "businessPartner", index: 1 },
						{ elementName: "id", index: 1 }
					];
					const value = undefined;

					const actual = setValue(cdmData, value, path, documentModelsInScene, modelGraph);
					expect(actual).toEqual(cdmData);
				});
			});

			describe("given a path containing groups missing in the dg doc and a defined field value", () => {
				test("returns updated cdm data including the new field value", () => {
					const { cdmData, documentModelsInScene, modelGraph } = setupCddUtilsTestData();
					const path: EntityInstancePath = [
						{ elementName: "businessPartner", index: 1 },
						{ elementName: "id", index: 1 }
					];
					const value = "abc";

					const actual = setValue(cdmData, value, path, documentModelsInScene, modelGraph);

					const actualDgDoc = actual.documentGraph.documents.byDocRef["__NEW__"];
					const expectedDgDoc: DgDocument = {
						docRef: "__NEW__",
						document: { businessPartner: { id: "abc" } },
						documentModelName: "NaturalPerson-document",
						loadingState: "loaded"
					};
					expect(actualDgDoc).toEqual(expectedDgDoc);

					const expectedCl: DgChangeLog = {
						changes: [...cdmData.changeLog.changes, { kind: "docChanged", docRef: "__NEW__" }],
						changeCounter: cdmData.changeLog.changeCounter + 2
					};
					expect(actual.changeLog).toEqual(expectedCl);

					const actualCdd = actual.cddState.cachedCdd?.cdd;
					expect(actualCdd).not.toBeUndefined();

					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					const actualCddValue = DOCUMENT_SERVICE.getAssignedObject(actualCdd!, path);
					expect(actualCddValue).toEqual(value);
				});
			});

			describe("given a path to an existing field instance in the dg and undefined as field value", () => {
				test("returns updated cdm data without the field value", () => {
					const { cdmData, documentModelsInScene, modelGraph } = setupCddUtilsTestData({
						partialDg: createDgForSetup()
					});

					function createDgForSetup(): DocumentGraph {
						const docWithValue: DgDocument = {
							docRef: "__NEW__",
							document: { businessPartner: { id: "abc" } },
							documentModelName: "NaturalPerson-document",
							loadingState: "loaded"
						};
						return {
							documents: {
								byDocRef: {
									__NEW__: docWithValue
								}
							},
							links: {
								byId: {},
								linkIdsByDocId: {}
							}
						};
					}

					const path: EntityInstancePath = [
						{ elementName: "businessPartner", index: 1 },
						{ elementName: "id", index: 1 }
					];
					const value = undefined;

					const actual = setValue(cdmData, value, path, documentModelsInScene, modelGraph);

					const actualDgDoc = actual.documentGraph.documents.byDocRef["__NEW__"];
					const expectedDgDoc: DgDocument = {
						docRef: "__NEW__",
						document: { businessPartner: {} },
						documentModelName: "NaturalPerson-document",
						loadingState: "loaded"
					};
					expect(actualDgDoc).toEqual(expectedDgDoc);

					const expectedCl: DgChangeLog = {
						changes: [...cdmData.changeLog.changes, { kind: "docChanged", docRef: "__NEW__" }],
						changeCounter: cdmData.changeLog.changeCounter + 1
					};
					expect(actual.changeLog).toEqual(expectedCl);

					const actualCdd = actual.cddState.cachedCdd?.cdd;
					expect(actualCdd).not.toBeUndefined();

					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					const actualCddValue = DOCUMENT_SERVICE.getAssignedObject(actualCdd!, path);
					expect(actualCddValue).toEqual(value);
				});
			});

			describe("given a path to an existing field instance in the dg and a defined field value", () => {
				test("returns updated cdm data with updated field value", () => {
					const { cdmData, documentModelsInScene, modelGraph } = setupCddUtilsTestData({
						partialDg: createDgForSetup()
					});

					function createDgForSetup(): DocumentGraph {
						const docWithValue: DgDocument = {
							docRef: "__NEW__",
							document: { businessPartner: { id: "abc" } },
							documentModelName: "NaturalPerson-document",
							loadingState: "loaded"
						};
						return {
							documents: {
								byDocRef: {
									__NEW__: docWithValue
								}
							},
							links: {
								byId: {},
								linkIdsByDocId: {}
							}
						};
					}

					const path: EntityInstancePath = [
						{ elementName: "businessPartner", index: 1 },
						{ elementName: "id", index: 1 }
					];
					const value = "def";

					const actual = setValue(cdmData, value, path, documentModelsInScene, modelGraph);

					const actualDgDoc = actual.documentGraph.documents.byDocRef["__NEW__"];
					const expectedDgDoc: DgDocument = {
						docRef: "__NEW__",
						document: { businessPartner: { id: "def" } },
						documentModelName: "NaturalPerson-document",
						loadingState: "loaded"
					};
					expect(actualDgDoc).toEqual(expectedDgDoc);

					const expectedCl: DgChangeLog = {
						changes: [...cdmData.changeLog.changes, { kind: "docChanged", docRef: "__NEW__" }],
						changeCounter: cdmData.changeLog.changeCounter + 1
					};
					expect(actual.changeLog).toEqual(expectedCl);

					const actualCdd = actual.cddState.cachedCdd?.cdd;
					expect(actualCdd).not.toBeUndefined();

					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					const actualCddValue = DOCUMENT_SERVICE.getAssignedObject(actualCdd!, path);
					expect(actualCddValue).toEqual(value);
				});
			});

			describe("given a path to a field in a missing dg doc and a value", () => {
				test("returns updated cdm data with new dg doc and link, updated cl and updated cdd", () => {
					const { cdmData, documentModelsInScene, modelGraph } = setupCddUtilsTestData();

					const path: EntityInstancePath = [
						{ elementName: "PostAddress", index: 1 },
						{ elementName: "address", index: 1 },
						{ elementName: "country", index: 1 }
					];
					const value = "Germany";

					const expectedDg: DeepReadonly<DocumentGraph> = {
						documents: {
							byDocRef: {
								"cddDocument/0": {
									docRef: "cddDocument/0",
									document: {},
									documentModelName: "NaturalPersonCDM",
									loadingState: "loaded"
								},
								__NEW__: {
									docRef: "__NEW__",
									document: {},
									documentModelName: "NaturalPerson-document",
									loadingState: "loaded"
								},
								"Address-document_NEW_1": {
									docRef: "Address-document_NEW_1",
									document: {
										address: {
											country: "Germany"
										}
									},
									documentModelName: "Address-document",
									loadingState: "loaded"
								}
							}
						},
						links: {
							byId: {
								PostAddress_NEW_1: {
									linkRef: {
										linkDescriptor: {
											relationshipModel: "PostAddress",
											entities: [
												{
													docRef: "__NEW__",
													role: "businessPartner"
												},
												{
													docRef: "Address-document_NEW_1",
													role: "address"
												}
											]
										},
										id: "PostAddress_NEW_1"
									},
									linkDocRef: undefined,
									rank: 0
								}
							},
							linkIdsByDocId: {
								__NEW__: ["PostAddress_NEW_1"],
								"Address-document_NEW_1": ["PostAddress_NEW_1"]
							}
						}
					};

					const expectedCl: DgChangeLog = {
						changes: [
							{
								kind: "docAdded",
								docRef: "__NEW__"
							},
							{
								kind: "docAdded",
								docRef: "Address-document_NEW_1"
							},
							{
								kind: "linkAdded",
								linkId: "PostAddress_NEW_1"
							},
							{
								kind: "docChanged",
								docRef: "Address-document_NEW_1"
							}
						],
						changeCounter: 5
					};

					const expectedCdd: GroupInstance = {
						t_docRef: "__NEW__",
						id: "__NEW__",
						modelId: "NaturalPerson-document",
						PostAddress: {
							address: {
								country: "Germany"
							},
							t_docRef: "Address-document_NEW_1",
							id: "Address-document_NEW_1",
							modelId: "Address-document",
							"meta-link-id": "PostAddress_NEW_1"
						}
					};

					const actual = setValue(cdmData, value, path, documentModelsInScene, modelGraph);

					expect(replaceLinkRanksInDg(actual.documentGraph)).toEqual(expectedDg);
					expect(actual.changeLog).toEqual(expectedCl);
					expect(actual.cddState.cachedCdd?.cdd).toEqual(expectedCdd);
				});
			});

			describe("given a path to a field in a missing link doc group and given a defined value", () => {
				test("returns updated cdm data with a link doc in the dg, updated cl and updated cdd", () => {
					const { cdmData, documentModelsInScene, modelGraph } = setupCddUtilsTestData();

					const path: EntityInstancePath = [
						{ elementName: "CoInsurer", index: 1 },
						{ elementName: "relationship", index: 1 },
						{ elementName: "additionalFields", index: 1 },
						{ elementName: "since", index: 1 }
					];
					const value = new Date(0).toISOString();

					const expectedDg: DocumentGraph = {
						documents: {
							byDocRef: {
								"cddDocument/0": {
									docRef: "cddDocument/0",
									document: {},
									documentModelName: "NaturalPersonCDM",
									loadingState: "loaded"
								},
								__NEW__: {
									docRef: "__NEW__",
									document: {},
									documentModelName: "NaturalPerson-document",
									loadingState: "loaded"
								},
								"Contract-document_NEW_1": {
									docRef: "Contract-document_NEW_1",
									document: {},
									documentModelName: "Contract-document",
									loadingState: "loaded"
								},
								CoInsurer_NEW_1____link_doc: {
									docRef: "CoInsurer_NEW_1____link_doc",
									document: {
										additionalFields: {
											since: "1970-01-01T00:00:00.000Z"
										}
									},
									documentModelName: "",
									loadingState: "loaded"
								}
							}
						},
						links: {
							byId: {
								CoInsurer_NEW_1: {
									linkRef: {
										linkDescriptor: {
											relationshipModel: "CoInsurer",
											entities: [
												{
													docRef: "__NEW__",
													role: "businessPartner"
												},
												{
													docRef: "Contract-document_NEW_1",
													role: "contract"
												}
											]
										},
										id: "CoInsurer_NEW_1"
									},
									linkDocRef: "CoInsurer_NEW_1____link_doc",
									rank: 0
								}
							},
							linkIdsByDocId: {
								__NEW__: ["CoInsurer_NEW_1"],
								"Contract-document_NEW_1": ["CoInsurer_NEW_1"]
							}
						}
					};
					const expectedCl: DgChangeLog = {
						changes: [
							{
								kind: "docAdded",
								docRef: "__NEW__"
							},
							{
								kind: "docAdded",
								docRef: "Contract-document_NEW_1"
							},
							{
								kind: "linkAdded",
								linkId: "CoInsurer_NEW_1"
							},
							{
								kind: "linkDocChanged",
								linkId: "CoInsurer_NEW_1"
							},
							{
								kind: "linkDocChanged",
								linkId: "CoInsurer_NEW_1"
							},
							{
								kind: "linkDocChanged",
								linkId: "CoInsurer_NEW_1"
							}
						],
						changeCounter: 6
					};
					const expectedCdd: GroupInstance = {
						t_docRef: "__NEW__",
						id: "__NEW__",
						modelId: "NaturalPerson-document",
						CoInsurer: {
							t_docRef: "Contract-document_NEW_1",
							id: "Contract-document_NEW_1",
							modelId: "Contract-document",
							"meta-link-id": "CoInsurer_NEW_1",
							relationship: {
								additionalFields: {
									since: "1970-01-01T00:00:00.000Z"
								},
								t_docRef: "CoInsurer_NEW_1____link_doc",
								modelId: ""
							}
						}
					};

					const actual = setValue(cdmData, value, path, documentModelsInScene, modelGraph);

					expect(replaceLinkRanksInDg(actual.documentGraph)).toEqual(expectedDg);
					expect(actual.changeLog).toEqual(expectedCl);
					expect(actual.cddState.cachedCdd?.cdd).toEqual(expectedCdd);
				});
			});

			describe("given a path to a field in the 'cddDocument' and given a defined value", () => {
				test("returns updated cdm data with an updated cddDoc in the dg, updated cl and updated cdd", () => {
					const { cdmData, documentModelsInScene, modelGraph } = setupCddUtilsTestData();

					const path: EntityInstancePath = [
						{ elementName: "cdm", index: 1 },
						{ elementName: "cdmOnlyField", index: 1 }
					];
					const value = "hello";

					const expectedDg: DocumentGraph = {
						documents: {
							byDocRef: {
								"cddDocument/0": {
									docRef: "cddDocument/0",
									document: {
										cdm: {
											cdmOnlyField: "hello"
										}
									},
									documentModelName: "NaturalPersonCDM",
									loadingState: "loaded"
								},
								__NEW__: {
									docRef: "__NEW__",
									document: {},
									documentModelName: "NaturalPerson-document",
									loadingState: "loaded"
								}
							}
						},
						links: {
							byId: {},
							linkIdsByDocId: {}
						}
					};
					const expectedCl: DgChangeLog = {
						changes: [
							{
								kind: "docAdded",
								docRef: "__NEW__"
							},
							{
								kind: "docChanged",
								docRef: "cddDocument/0"
							}
						],
						changeCounter: 3
					};
					const expectedCdd: GroupInstance = {
						t_docRef: "__NEW__",
						id: "__NEW__",
						modelId: "NaturalPerson-document",
						cdm: {
							cdmOnlyField: "hello"
						}
					};

					const actual = setValue(cdmData, value, path, documentModelsInScene, modelGraph);

					expect(replaceLinkRanksInDg(actual.documentGraph)).toEqual(expectedDg);
					expect(actual.changeLog).toEqual(expectedCl);
					expect(actual.cddState.cachedCdd?.cdd).toEqual(expectedCdd);
				});
			});
		});

		describe("path to a group instance", () => {
			describe("given a path to a not yet existing non-relsh / non-linkDoc group and a defined value", () => {
				test("returns updated cdm data containing a new empty group instance", () => {
					const { cdmData, documentModelsInScene, modelGraph } = setupCddUtilsTestData();

					const path: EntityInstancePath = [
						{ elementName: "businessPartner", index: 1 },
						{ elementName: "notes", index: 1 }
					];
					const value = { note: "hello" };

					const expectedDg: DocumentGraph = {
						documents: {
							byDocRef: {
								"cddDocument/0": {
									docRef: "cddDocument/0",
									document: {},
									documentModelName: "NaturalPersonCDM",
									loadingState: "loaded"
								},
								__NEW__: {
									docRef: "__NEW__",
									document: {
										businessPartner: {
											notes: [{}]
										}
									},
									documentModelName: "NaturalPerson-document",
									loadingState: "loaded"
								}
							}
						},
						links: {
							byId: {},
							linkIdsByDocId: {}
						}
					};
					const expectedCl: DgChangeLog = {
						changes: [
							{
								kind: "docAdded",
								docRef: "__NEW__"
							},
							{
								kind: "docChanged",
								docRef: "__NEW__"
							}
						],
						changeCounter: 3
					};
					const expectedCdd: GroupInstance = {
						t_docRef: "__NEW__",
						id: "__NEW__",
						modelId: "NaturalPerson-document",
						businessPartner: {
							notes: [{}]
						}
					};

					const actual = setValue(cdmData, value, path, documentModelsInScene, modelGraph);

					expect(replaceLinkRanksInDg(actual.documentGraph)).toEqual(expectedDg);
					expect(actual.changeLog).toEqual(expectedCl);
					expect(actual.cddState.cachedCdd?.cdd).toEqual(expectedCdd);
				});
			});

			describe("given a path to an existing non-relsh / non-link-doc group and undefined as value", () => {
				test("returns updated cdm data with the group instance removed", () => {
					const { cdmData, documentModelsInScene, modelGraph } = setupCddUtilsTestData({
						partialDg: createDgForSetup()
					});

					function createDgForSetup(): DocumentGraph {
						return {
							documents: {
								byDocRef: {
									__NEW__: {
										docRef: "__NEW__",
										document: {
											businessPartner: {
												notes: [
													{
														note: "hello"
													}
												]
											}
										},
										documentModelName: "NaturalPerson-document",
										loadingState: "loaded"
									}
								}
							},
							links: {
								byId: {},
								linkIdsByDocId: {}
							}
						};
					}

					const path: EntityInstancePath = [
						{ elementName: "businessPartner", index: 1 },
						{ elementName: "notes", index: 1 }
					];
					const value = undefined;

					const expectedDg: DocumentGraph = {
						documents: {
							byDocRef: {
								"cddDocument/0": {
									docRef: "cddDocument/0",
									document: {},
									documentModelName: "NaturalPersonCDM",
									loadingState: "loaded"
								},
								__NEW__: {
									docRef: "__NEW__",
									document: {
										businessPartner: {
											notes: []
										}
									},
									documentModelName: "NaturalPerson-document",
									loadingState: "loaded"
								}
							}
						},
						links: {
							byId: {},
							linkIdsByDocId: {}
						}
					};
					const expectedCl: DgChangeLog = {
						changes: [
							{
								kind: "docAdded",
								docRef: "__NEW__"
							},
							{
								kind: "docChanged",
								docRef: "__NEW__"
							}
						],
						changeCounter: 2
					};
					const expectedCdd: GroupInstance = {
						t_docRef: "__NEW__",
						id: "__NEW__",
						modelId: "NaturalPerson-document",
						businessPartner: {
							notes: []
						}
					};

					const actual = setValue(cdmData, value, path, documentModelsInScene, modelGraph);

					expect(replaceLinkRanksInDg(actual.documentGraph)).toEqual(expectedDg);
					expect(actual.changeLog).toEqual(expectedCl);
					expect(actual.cddState.cachedCdd?.cdd).toEqual(expectedCdd);
				});
			});

			describe("given a path to an existing relsh group and undefined as value", () => {
				test("returns updated cdm data with the group instance removed from cdd and link removed from dg and updated changelog", () => {
					const { cdmData, documentModelsInScene, modelGraph } = setupCddUtilsTestData({
						partialDg: createDgForSetup()
					});

					function createDgForSetup(): DocumentGraph {
						return {
							documents: {
								byDocRef: {
									"cddDocument/0": {
										docRef: "cddDocument/0",
										document: {},
										documentModelName: "NaturalPersonCDM",
										loadingState: "loaded"
									},
									__NEW__: {
										docRef: "__NEW__",
										document: {},
										documentModelName: "NaturalPerson-document",
										loadingState: "loaded"
									},
									"Address-document/1": {
										docRef: "Address-document/1",
										document: {
											address: {
												country: "Germany"
											}
										},
										documentModelName: "Address-document",
										loadingState: "loaded"
									}
								}
							},
							links: {
								byId: {
									"1": {
										linkRef: {
											linkDescriptor: {
												relationshipModel: "PostAddress",
												entities: [
													{
														docRef: "__NEW__",
														role: "businessPartner"
													},
													{
														docRef: "Address-document/1",
														role: "address"
													}
												]
											},
											id: "1"
										},
										linkDocRef: undefined,
										rank: 0
									}
								},
								linkIdsByDocId: {
									__NEW__: ["1"],
									"Address-document/1": ["1"]
								}
							}
						};
					}

					const path: EntityInstancePath = [{ elementName: "PostAddress", index: 1 }];
					const value = undefined;

					const expectedDg = {
						documents: {
							byDocRef: {
								"cddDocument/0": {
									docRef: "cddDocument/0",
									document: {},
									documentModelName: "NaturalPersonCDM",
									loadingState: "loaded"
								},
								__NEW__: {
									docRef: "__NEW__",
									document: {},
									documentModelName: "NaturalPerson-document",
									loadingState: "loaded"
								},
								"Address-document/1": {
									docRef: "Address-document/1",
									document: {
										address: {
											country: "Germany"
										}
									},
									documentModelName: "Address-document",
									loadingState: "loaded"
								}
							}
						},
						links: {
							byId: {},
							linkIdsByDocId: {
								"Address-document/1": [],
								__NEW__: []
							}
						}
					};
					const expectedCl: DgChangeLog = {
						changes: [
							{
								kind: "docAdded",
								docRef: "__NEW__"
							},
							{
								kind: "linkDeleted",
								linkId: "1",
								linkRef: {
									id: "1",
									linkDescriptor: {
										entities: [
											{
												docRef: "__NEW__",
												role: "businessPartner"
											},
											{
												docRef: "Address-document/1",
												role: "address"
											}
										],
										relationshipModel: "PostAddress"
									}
								}
							}
						],
						changeCounter: 2
					};
					const expectedCdd: GroupInstance = {
						t_docRef: "__NEW__",
						id: "__NEW__",
						modelId: "NaturalPerson-document"
					};

					const actual = setValue(cdmData, value, path, documentModelsInScene, modelGraph);

					expect(replaceLinkRanksInDg(actual.documentGraph)).toEqual(expectedDg);
					expect(actual.changeLog).toEqual(expectedCl);
					expect(actual.cddState.cachedCdd?.cdd).toEqual(expectedCdd);
				});
			});
		});
	});
});

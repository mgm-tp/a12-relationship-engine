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

import { test, expect, describe } from "vitest";

import type { Model } from "@com.mgmtp.a12.client/client-core";
import type { Models, FormModel } from "@com.mgmtp.a12.formengine/formengine-core";
import type { Document, DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade";

import { createTestModels } from "../../../mocks/ModelsUtil.js";
import { assertCondition } from "../../../../internal/shared/assertion.js";
import type { CdmData } from "../../../../internal/cdm/cddUtils/cdmData.js";
import { MOCK_MODEL_GRAPH } from "../../../mocks/relationships/ModelGraph.js";
import { filterCdmDataByRelevance } from "../../../../internal/cdm/cddUtils/notRelevant/filterCdmDataByRelevance.js";
import type {
	DgDocs,
	DgChange,
	DgDocument,
	DgChangeLog,
	DgLinksById,
	DocumentGraph
} from "../../../../internal/documentGraph/core/index.js";

describe("com.mgmtp.a12.client.extensions.cdm.cdd", () => {
	describe("filterCdmDataByRelevance", () => {
		const testModelDescriptors: Model.Descriptor[] = [
			{ name: "NaturalPersonCDM", modelType: "document" },
			{ name: "NaturalPersonCDM-form", modelType: "form" }
		];
		const testModelList = createTestModels(testModelDescriptors);
		const testModels: Models = {
			documentModel: testModelList[0] as DocumentModel,
			formModel: testModelList[1] as FormModel
		};
		const documentModelDescriptors: Model.Descriptor[] = [
			"NaturalPersonCDM",
			"NaturalPerson-document",
			"PostAddress_address____generated",
			"Address-document",
			"Location_address____generated",
			"CoInsurerAdditionalFields",
			"Contract-document"
		].map((name) => ({ name, modelType: "document" }));
		const documentModels = createTestModels(documentModelDescriptors) as DocumentModel[];

		describe("given a models tuple with notRelevant dependencies in the form model and given cdm data that has triggered these dependencies", () => {
			describe("given a field is not relevant", () => {
				test("removes the field instance in cdd, dg doc and updates changelog", () => {
					const initialCdmData = createInitialCdmData({ withoutMartialStatus: true });

					const expected = createExpectedCdmData(
						initialCdmData,
						{
							changedDocs: {
								"NaturalPerson-document/fa0b654b-c991-40c3-80b8-3ebcf4c578e1": (dgDoc: DgDocument) => {
									assertCondition(dgDoc.loadingState === "loaded");

									return {
										...dgDoc,
										document: {
											...dgDoc.document,
											businessPartner: {
												// eslint-disable-next-line @typescript-eslint/no-explicit-any
												...(dgDoc.document.businessPartner as any),
												additionalData: {
													// eslint-disable-next-line @typescript-eslint/no-explicit-any
													age: (dgDoc.document.businessPartner as any).additionalData.age
												}
											}
										}
									} as DgDocument;
								}
							},
							removedLinks: []
						},
						{
							newCounter: initialCdmData.changeLog.changeCounter + 1,
							changesToAdd: [
								{
									kind: "docChanged",
									docRef: "NaturalPerson-document/fa0b654b-c991-40c3-80b8-3ebcf4c578e1"
								}
							]
						},
						(cdd) => {
							return {
								...cdd,
								businessPartner: {
									...cdd.businessPartner,
									additionalData: {
										age: cdd.businessPartner.additionalData.age
									}
								}
							};
						}
					);

					const result = filterCdmDataByRelevance(initialCdmData, testModels, documentModels, MOCK_MODEL_GRAPH);

					expect(result.cddState.cachedCdd?.cdd).toEqual(expected.cddState.cachedCdd?.cdd);
					expect(result.documentGraph).toEqual(expected.documentGraph);
					expect(result.changeLog).toEqual(expected.changeLog);
				});
			});

			describe("given a regular non-repeatable group is not relevant", () => {
				test("removes the group instance and its children in cdd, dg and updates changelog", () => {
					const initialCdmData = createInitialCdmData({ withoutAdditionalData: true });

					const expected = createExpectedCdmData(
						initialCdmData,
						{
							changedDocs: {
								"NaturalPerson-document/fa0b654b-c991-40c3-80b8-3ebcf4c578e1": (dgDoc: DgDocument) => {
									assertCondition(dgDoc.loadingState === "loaded");

									return {
										...dgDoc,
										document: {
											...dgDoc.document,
											businessPartner: {
												...(({ additionalData, ...rest }) => rest)(
													// eslint-disable-next-line @typescript-eslint/no-explicit-any
													dgDoc.document.businessPartner as any
												)
											}
										}
									} as DgDocument;
								}
							},
							removedLinks: []
						},
						{
							newCounter: initialCdmData.changeLog.changeCounter + 1,
							changesToAdd: [
								{
									kind: "docChanged",
									docRef: "NaturalPerson-document/fa0b654b-c991-40c3-80b8-3ebcf4c578e1"
								}
							]
						},
						(cdd) => {
							return {
								...cdd,
								businessPartner: {
									...(({ additionalData, ...rest }) => rest)(cdd.businessPartner)
								}
							};
						}
					);

					const result = filterCdmDataByRelevance(initialCdmData, testModels, documentModels, MOCK_MODEL_GRAPH);

					expect(result.cddState.cachedCdd?.cdd).toEqual(expected.cddState.cachedCdd?.cdd);
					expect(result.documentGraph).toEqual(expected.documentGraph);
					expect(result.changeLog).toEqual(expected.changeLog);
				});
			});

			describe("given a regular repeatable group is not relevant", () => {
				test("removes all its group instances and their children from cdd, dg doc and updates the log", () => {
					const initialCdmData = createInitialCdmData({ withoutNotes: true });

					const expected = createExpectedCdmData(
						initialCdmData,
						{
							changedDocs: {
								"NaturalPerson-document/fa0b654b-c991-40c3-80b8-3ebcf4c578e1": (dgDoc: DgDocument) => {
									assertCondition(dgDoc.loadingState === "loaded");

									return {
										...dgDoc,
										document: {
											...dgDoc.document,
											businessPartner: {
												// eslint-disable-next-line @typescript-eslint/no-explicit-any
												...(dgDoc.document.businessPartner as any),
												notes: []
											}
										}
									} as DgDocument;
								}
							},
							removedLinks: []
						},
						{
							newCounter: initialCdmData.changeLog.changeCounter + 2,
							changesToAdd: [
								{
									kind: "docChanged",
									docRef: "NaturalPerson-document/fa0b654b-c991-40c3-80b8-3ebcf4c578e1"
								}
							]
						},
						(cdd) => {
							return {
								...cdd,
								businessPartner: {
									...cdd.businessPartner,
									notes: []
								}
							};
						}
					);

					const result = filterCdmDataByRelevance(initialCdmData, testModels, documentModels, MOCK_MODEL_GRAPH);

					expect(result.cddState.cachedCdd?.cdd).toEqual(expected.cddState.cachedCdd?.cdd);
					expect(result.documentGraph).toEqual(expected.documentGraph);
					expect(result.changeLog).toEqual(expected.changeLog);
				});
			});

			describe("given a non-repeatable relationship group is not relevant", () => {
				test("removes the group instance and its children from cdd, removes the link from dg and updates changelog", () => {
					const initialCdmData = createInitialCdmData({ withoutPostAddress: true });

					const expected = createExpectedCdmData(
						initialCdmData,
						{
							changedDocs: {
								"NaturalPerson-document/fa0b654b-c991-40c3-80b8-3ebcf4c578e1": (dgDoc: DgDocument) => {
									assertCondition(dgDoc.loadingState === "loaded");

									return {
										...dgDoc,
										document: {
											...(({ PostAddress, ...rest }) => rest)(dgDoc.document)
										}
									} as DgDocument;
								}
							},
							removedLinks: ["15"]
						},
						{
							newCounter: initialCdmData.changeLog.changeCounter + 1,
							changesToAdd: [
								{
									kind: "linkDeleted",
									linkId: "15",
									linkRef: {
										id: "15",
										linkDescriptor: {
											entities: [
												{
													docRef: "NaturalPerson-document/fa0b654b-c991-40c3-80b8-3ebcf4c578e1",
													role: "businessPartner"
												},
												{
													docRef: "Address-document/f6c4914a-e79e-483d-b3c3-c5fe1c9840ad",
													role: "address"
												}
											],
											relationshipModel: "PostAddress"
										}
									}
								}
							]
						},
						(cdd) => {
							return {
								...(({ PostAddress, ...rest }) => rest)(cdd)
							};
						}
					);

					const result = filterCdmDataByRelevance(initialCdmData, testModels, documentModels, MOCK_MODEL_GRAPH);

					expect(result.cddState.cachedCdd?.cdd).toEqual(expected.cddState.cachedCdd?.cdd);
					expect(result.documentGraph).toEqual(expected.documentGraph);
					expect(result.changeLog).toEqual(expected.changeLog);
				});
			});

			describe("given a repeatable relationship group is not relevant", () => {
				test("removes all its group instances and their children from cdd, removes the respective links from dg and updates changelog", () => {
					const initialCdmData = createInitialCdmData({ withoutLocations: true });

					const expected = createExpectedCdmData(
						initialCdmData,
						{
							changedDocs: {
								"NaturalPerson-document/fa0b654b-c991-40c3-80b8-3ebcf4c578e1": (dgDoc: DgDocument) => {
									assertCondition(dgDoc.loadingState === "loaded");

									return {
										...dgDoc,
										document: {
											...(({ Location, ...rest }) => rest)(dgDoc.document)
										}
									} as DgDocument;
								}
							},
							removedLinks: ["16", "17"]
						},
						{
							newCounter: initialCdmData.changeLog.changeCounter + 2,
							changesToAdd: [
								{
									kind: "linkDeleted",
									linkId: "17",
									linkRef: {
										id: "17",
										linkDescriptor: {
											entities: [
												{
													docRef: "NaturalPerson-document/fa0b654b-c991-40c3-80b8-3ebcf4c578e1",
													role: "businessPartner"
												},
												{
													docRef: "Address-document/9deafdc0-1454-4c21-a8dc-54c4fbef40bf",
													role: "address"
												}
											],
											relationshipModel: "Location"
										}
									}
								},
								{
									kind: "linkDeleted",
									linkId: "16",
									linkRef: {
										id: "16",
										linkDescriptor: {
											entities: [
												{
													docRef: "NaturalPerson-document/fa0b654b-c991-40c3-80b8-3ebcf4c578e1",
													role: "businessPartner"
												},
												{
													docRef: "Address-document/f6c4914a-e79e-483d-b3c3-c5fe1c9840ad",
													role: "address"
												}
											],
											relationshipModel: "Location"
										}
									}
								}
							]
						},
						(cdd) => {
							return {
								...(({ Location, ...rest }) => rest)(cdd)
							};
						}
					);

					const result = filterCdmDataByRelevance(initialCdmData, testModels, documentModels, MOCK_MODEL_GRAPH);

					expect(result.cddState.cachedCdd?.cdd).toEqual(expected.cddState.cachedCdd?.cdd);
					expect(result.documentGraph).toEqual(expected.documentGraph);
					expect(result.changeLog).toEqual(expected.changeLog);
				});
			});
		});

		interface CreateParams {
			withoutMartialStatus?: true;
			withoutAdditionalData?: true;
			withoutNotes?: true;
			withoutPostAddress?: true;
			withoutLocations?: true;
		}

		function createInitialCdmData(params: CreateParams): CdmData {
			const { withoutMartialStatus, withoutAdditionalData, withoutNotes, withoutPostAddress, withoutLocations } =
				params ?? {};

			const initialDg: DocumentGraph = {
				documents: {
					byDocRef: {
						"cddDocument/0": {
							docRef: "cddDocument/0",
							document: {
								cdm: {
									hasPostalAddress: true,
									isCoInsured: false,
									withoutMartialStatus: withoutMartialStatus ? true : null,
									showAdditionalData: withoutAdditionalData ? null : true,
									withoutNotes: withoutNotes ? true : null,
									withoutPostAddress: withoutPostAddress ? true : null,
									withoutLocations: withoutLocations ? true : null
								}
							},
							documentModelName: "NaturalPersonCDM",
							loadingState: "loaded"
						},
						"NaturalPerson-document/fa0b654b-c991-40c3-80b8-3ebcf4c578e1": {
							docRef: "NaturalPerson-document/fa0b654b-c991-40c3-80b8-3ebcf4c578e1",
							documentModelName: "NaturalPerson-document",
							document: {
								businessPartner: {
									id: "facebook",
									name: "Mark Zuckerberg",
									firstName: "Mark",
									lastName: "Zuckerberg",
									additionalData: {
										age: 40,
										maritalStatus: "married"
									},
									notes: [
										{
											note: "Is he a robot?",
											day: new Date(1721347200000)
										},
										{
											note: "Did he steal the idea?",
											day: new Date(1721347200000)
										}
									]
								},
								__meta: {
									creator: "superUser",
									modifier: "anonymous",
									createdAt: new Date(1721377477000),
									modifiedAt: new Date(1721377731000),
									modelReference: "NaturalPerson-document",
									docRef: "NaturalPerson-document/fa0b654b-c991-40c3-80b8-3ebcf4c578e1",
									modelVersion: null
								}
							},
							loadingState: "loaded"
						},
						"Address-document/f6c4914a-e79e-483d-b3c3-c5fe1c9840ad": {
							docRef: "Address-document/f6c4914a-e79e-483d-b3c3-c5fe1c9840ad",
							documentModelName: "Address-document",
							document: {
								address: {
									country: "USA",
									city: "Menlo Park",
									street: "Hacker Way",
									number: "1"
								},
								__meta: {
									creator: "superUser",
									modifier: "superUser",
									createdAt: new Date(1721377476000),
									modifiedAt: new Date(1721377476000),
									modelReference: "Address-document",
									docRef: "Address-document/f6c4914a-e79e-483d-b3c3-c5fe1c9840ad",
									modelVersion: null
								}
							},
							loadingState: "loaded"
						},
						"Address-document/9deafdc0-1454-4c21-a8dc-54c4fbef40bf": {
							docRef: "Address-document/9deafdc0-1454-4c21-a8dc-54c4fbef40bf",
							documentModelName: "Address-document",
							document: {
								address: {
									country: "Germany",
									city: "Oldenburg",
									street: "Kleine Gasse",
									number: "7",
									view: {}
								},
								__meta: {
									creator: "anonymous",
									modifier: "anonymous",
									createdAt: new Date(1721377731000),
									modifiedAt: new Date(1721377731000),
									modelReference: "Address-document",
									docRef: "Address-document/9deafdc0-1454-4c21-a8dc-54c4fbef40bf",
									modelVersion: null,
									extensions: {}
								}
							},
							loadingState: "loaded"
						}
					}
				},
				links: {
					byId: {
						"15": {
							linkRef: {
								id: "15",
								linkDescriptor: {
									relationshipModel: "PostAddress",
									entities: [
										{
											role: "businessPartner",
											docRef: "NaturalPerson-document/fa0b654b-c991-40c3-80b8-3ebcf4c578e1"
										},
										{
											role: "address",
											docRef: "Address-document/f6c4914a-e79e-483d-b3c3-c5fe1c9840ad"
										}
									]
								}
							},
							rank: 1721377834891,
							linkDocRef: null
						},
						"16": {
							linkRef: {
								id: "16",
								linkDescriptor: {
									relationshipModel: "Location",
									entities: [
										{
											role: "businessPartner",
											docRef: "NaturalPerson-document/fa0b654b-c991-40c3-80b8-3ebcf4c578e1"
										},
										{
											role: "address",
											docRef: "Address-document/f6c4914a-e79e-483d-b3c3-c5fe1c9840ad"
										}
									]
								}
							},
							rank: 1721377834890,
							linkDocRef: null
						},
						"17": {
							linkRef: {
								id: "17",
								linkDescriptor: {
									relationshipModel: "Location",
									entities: [
										{
											role: "businessPartner",
											docRef: "NaturalPerson-document/fa0b654b-c991-40c3-80b8-3ebcf4c578e1"
										},
										{
											role: "address",
											docRef: "Address-document/9deafdc0-1454-4c21-a8dc-54c4fbef40bf"
										}
									]
								}
							},
							rank: 1721377834892,
							linkDocRef: null
						}
					},
					linkIdsByDocId: {
						"NaturalPerson-document/fa0b654b-c991-40c3-80b8-3ebcf4c578e1": ["16", "15", "17"],
						"Address-document/f6c4914a-e79e-483d-b3c3-c5fe1c9840ad": ["16", "15"],
						"Address-document/9deafdc0-1454-4c21-a8dc-54c4fbef40bf": ["17"]
					}
				}
			};
			const initialCdd: Document = {
				businessPartner: {
					id: "facebook",
					name: "Mark Zuckerberg",
					firstName: "Mark",
					lastName: "Zuckerberg",
					additionalData: {
						age: 40,
						maritalStatus: "married"
					},
					notes: [
						{
							note: "Is he a robot?",
							day: new Date(1721347200000)
						},
						{
							note: "Did he steal the idea?",
							day: new Date(1721347200000)
						}
					]
				},
				__meta: {
					creator: "superUser",
					modifier: "anonymous",
					createdAt: new Date(1721377477000),
					modifiedAt: new Date(1721377731000),
					modelReference: "NaturalPerson-document",
					docRef: "NaturalPerson-document/fa0b654b-c991-40c3-80b8-3ebcf4c578e1",
					modelVersion: null
				},
				t_docRef: "NaturalPerson-document/fa0b654b-c991-40c3-80b8-3ebcf4c578e1",
				id: "NaturalPerson-document/fa0b654b-c991-40c3-80b8-3ebcf4c578e1",
				modelId: "NaturalPerson-document",
				Location: [
					{
						address: {
							country: "USA",
							city: "Menlo Park",
							street: "Hacker Way",
							number: "1"
						},
						__meta: {
							creator: "superUser",
							modifier: "superUser",
							createdAt: new Date(1721377476000),
							modifiedAt: new Date(1721377476000),
							modelReference: "Address-document",
							docRef: "Address-document/f6c4914a-e79e-483d-b3c3-c5fe1c9840ad",
							modelVersion: null
						},
						t_docRef: "Address-document/f6c4914a-e79e-483d-b3c3-c5fe1c9840ad",
						id: "Address-document/f6c4914a-e79e-483d-b3c3-c5fe1c9840ad",
						modelId: "Address-document",
						"meta-link-id": "16"
					},
					{
						address: {
							country: "Germany",
							city: "Oldenburg",
							street: "Kleine Gasse",
							number: "7",
							view: {}
						},
						__meta: {
							creator: "anonymous",
							modifier: "anonymous",
							createdAt: new Date(1721377731000),
							modifiedAt: new Date(1721377731000),
							modelReference: "Address-document",
							docRef: "Address-document/9deafdc0-1454-4c21-a8dc-54c4fbef40bf",
							modelVersion: null,
							extensions: {}
						},
						t_docRef: "Address-document/9deafdc0-1454-4c21-a8dc-54c4fbef40bf",
						id: "Address-document/9deafdc0-1454-4c21-a8dc-54c4fbef40bf",
						modelId: "Address-document",
						"meta-link-id": "17"
					}
				],
				PostAddress: {
					address: {
						country: "USA",
						city: "Menlo Park",
						street: "Hacker Way",
						number: "1"
					},
					__meta: {
						creator: "superUser",
						modifier: "superUser",
						createdAt: new Date(1721377476000),
						modifiedAt: new Date(1721377476000),
						modelReference: "Address-document",
						docRef: "Address-document/f6c4914a-e79e-483d-b3c3-c5fe1c9840ad",
						modelVersion: null
					},
					t_docRef: "Address-document/f6c4914a-e79e-483d-b3c3-c5fe1c9840ad",
					id: "Address-document/f6c4914a-e79e-483d-b3c3-c5fe1c9840ad",
					modelId: "Address-document",
					"meta-link-id": "15"
				},
				cdm: {
					hasPostalAddress: true,
					isCoInsured: false,
					withoutMartialStatus: withoutMartialStatus ? true : null,
					showAdditionalData: withoutAdditionalData ? null : true,
					withoutNotes: withoutNotes ? true : null,
					withoutPostAddress: withoutPostAddress ? true : null,
					withoutLocations: withoutLocations ? true : null
				}
			};
			const initialChangeLog: DgChangeLog = {
				changes: [],
				changeCounter: 3
			};

			return {
				documentGraph: initialDg,
				changeLog: initialChangeLog,
				cddState: {
					cdm: testModelList[0] as DocumentModel,
					pendingUsages: [],
					rootDocRef: "NaturalPerson-document/fa0b654b-c991-40c3-80b8-3ebcf4c578e1",
					cachedCdd: {
						cdd: initialCdd
					}
				}
			};
		}

		function createExpectedCdmData(
			originalCdmData: CdmData,
			dgChanges: {
				changedDocs: { [docRef: string]: (dgDoc: DgDocument) => DgDocument };
				removedLinks: string[];
			},
			changeLogChanges: { newCounter: number; changesToAdd: DgChange[] },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			alterCdd: (cdd: any) => any
		): CdmData {
			const changedDocsByDocRef = Object.entries(dgChanges.changedDocs).reduce(
				(acc, curr) => {
					const [docRef, alterDoc] = curr;

					return {
						...acc,
						[docRef]: alterDoc(originalCdmData.documentGraph.documents.byDocRef[docRef])
					};
				},
				{} as DgDocs["byDocRef"]
			);
			const alteredDg: DocumentGraph = {
				...originalCdmData.documentGraph,
				documents: {
					byDocRef: {
						...originalCdmData.documentGraph.documents.byDocRef,
						...changedDocsByDocRef
					}
				},
				links: {
					byId: Object.fromEntries(
						Object.entries(originalCdmData.documentGraph.links.byId).filter(
							(entry) => !dgChanges.removedLinks.includes(entry[0])
						)
					) as DgLinksById,
					linkIdsByDocId: Object.fromEntries(
						Object.entries(originalCdmData.documentGraph.links.linkIdsByDocId).map((entry) => [
							entry[0],
							entry[1]?.filter((id) => !dgChanges.removedLinks.includes(id))
						])
					)
				}
			};
			const alteredChangelog: DgChangeLog = {
				changes: [...originalCdmData.changeLog.changes, ...changeLogChanges.changesToAdd],
				changeCounter: changeLogChanges.newCounter
			};

			return {
				documentGraph: alteredDg,
				changeLog: alteredChangelog,
				cddState: {
					...originalCdmData.cddState,
					cachedCdd: {
						cdd: alterCdd(originalCdmData.cddState.cachedCdd?.cdd as Document)
					}
				}
			};
		}
	});
});

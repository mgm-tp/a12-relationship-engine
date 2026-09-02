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

import { test, assert, expect, describe, beforeAll, beforeEach } from "vitest";

import type { Model } from "@com.mgmtp.a12.client/client-core";
import type { FormModel } from "@com.mgmtp.a12.formengine/formengine-core";
import type { Model as ModelAPI } from "@com.mgmtp.a12.base/base-model-api";
import type { DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade";

import { createTestModels } from "../../../mocks/ModelsUtil.js";
import { MOCK_MODEL_GRAPH } from "../../../mocks/relationships/ModelGraph.js";
import { createInitialDgCl } from "../../../../internal/cdm/cddUtils/createInitialDgCl.js";
import { resetDocRefCounterForTesting } from "../../../../internal/cdm/cdd/redux/newDocRef.js";
import {
	type DgChangeLog,
	type DeepReadonly,
	type DocumentGraph,
	resetAddedLinkIndexForTesting
} from "../../../../internal/documentGraph/core/index.js";

import { replaceLinkRanksInDg, setupCddUtilsTestData } from "./testUtils.js";

describe("com.mgmtp.a12.client.extensions.cdm.cdd", () => {
	describe("cddUtils.createInitialDgCl", () => {
		const testModelDescriptors: Model.Descriptor[] = [
			{
				name: "NaturalPersonCDM",
				modelType: "document"
			},
			{ name: "NaturalPersonCDM-form", modelType: "form" }
		];
		const rootDocumentModelName = "NaturalPerson-document";

		let testModels: ModelAPI[];
		let cdm: DocumentModel;
		let formModel: FormModel;
		let documentModelsInScene: DocumentModel[];

		beforeAll(() => {
			testModels = createTestModels(testModelDescriptors);
			cdm = testModels[0] as DocumentModel;
			formModel = testModels[1] as FormModel;
			documentModelsInScene = setupCddUtilsTestData().documentModelsInScene;
		});

		beforeEach(() => {
			resetDocRefCounterForTesting();
			resetAddedLinkIndexForTesting();
		});

		describe("given the mandatory params including a form model with initial values and rows", () => {
			test(
				"creates a dg with links and docs containing the initial instances " +
					"and a change log reflecting the changes done for the initialization",
				() => {
					const expectedDg: DeepReadonly<DocumentGraph> = {
						documents: {
							byDocRef: {
								"Address-document_NEW_1": {
									docRef: "Address-document_NEW_1",
									document: {
										address: {
											country: "Germany"
										}
									},
									documentModelName: "Address-document",
									loadingState: "loaded"
								},
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
											notes: [
												{
													note: "initial note"
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
									rank: 1710930733900
								}
							},
							linkIdsByDocId: {
								__NEW__: ["PostAddress_NEW_1"],
								"Address-document_NEW_1": ["PostAddress_NEW_1"]
							}
						}
					};
					const expectedCl: DgChangeLog = {
						changeCounter: 9,
						changes: [
							{
								docRef: "__NEW__",
								kind: "docAdded"
							},
							{
								docRef: "__NEW__",
								kind: "docChanged"
							},
							{
								docRef: "Address-document_NEW_1",
								kind: "docAdded"
							},
							{
								kind: "linkAdded",
								linkId: "PostAddress_NEW_1"
							},
							{
								docRef: "Address-document_NEW_1",
								kind: "docChanged"
							}
						]
					};

					const { documentGraph, changeLog } = createInitialDgCl({
						cdm,
						formModel,
						rootDocumentModelName,
						documentModelsInScene,
						modelGraph: MOCK_MODEL_GRAPH
					});

					expect(replaceLinkRanksInDg(documentGraph)).toEqual(replaceLinkRanksInDg(expectedDg));
					expect(changeLog).toEqual(expectedCl);
				}
			);
		});

		describe("given the mandatory params and additionally the optional params including an existing dg and cl", () => {
			test("creates a dg with initial values, that was merged with the existing dg, and a cl containing all changes", () => {
				const rootDocRef = "NaturalPerson-document_NEW_1";
				const existingDocumentGraph: DeepReadonly<DocumentGraph> = {
					documents: {
						byDocRef: {
							"cddDocument/0": {
								docRef: "cddDocument/0",
								document: {},
								documentModelName: "ContractCDM",
								loadingState: "loaded"
							},
							__NEW__: {
								docRef: "__NEW__",
								document: {},
								documentModelName: "Contract-document",
								loadingState: "loaded"
							},
							"NaturalPerson-document_NEW_1": {
								docRef: "NaturalPerson-document_NEW_1",
								document: {},
								documentModelName: "NaturalPerson-document",
								loadingState: "loaded"
							}
						}
					},
					links: {
						byId: {
							PolicyHolder_NEW_1: {
								linkRef: {
									linkDescriptor: {
										relationshipModel: "PolicyHolder",
										entities: [
											{
												docRef: "__NEW__",
												role: "contract"
											},
											{
												docRef: "NaturalPerson-document_NEW_1",
												role: "businessPartner"
											}
										]
									},
									id: "PolicyHolder_NEW_1"
								},
								linkDocRef: undefined,
								rank: 1710937643959
							}
						},
						linkIdsByDocId: {
							__NEW__: ["PolicyHolder_NEW_1"],
							"NaturalPerson-document_NEW_1": ["PolicyHolder_NEW_1"]
						}
					}
				};
				const existingChangeLog: DgChangeLog = {
					changes: [
						{
							kind: "docAdded",
							docRef: "__NEW__"
						},
						{
							kind: "docChanged",
							docRef: "cddDocument/0"
						},
						{
							kind: "docAdded",
							docRef: "NaturalPerson-document_NEW_1"
						},
						{
							kind: "linkAdded",
							linkId: "PolicyHolder_NEW_1"
						}
					],
					changeCounter: 5
				};
				const mergeParams = { existingDocumentGraph, existingChangeLog };

				const expectedDg: DeepReadonly<DocumentGraph> = {
					documents: {
						byDocRef: {
							"cddDocument/0": {
								docRef: "cddDocument/0",
								document: {},
								documentModelName: "NaturalPersonCDM",
								loadingState: "loaded"
							},
							"NaturalPerson-document_NEW_1": {
								docRef: "NaturalPerson-document_NEW_1",
								document: {
									businessPartner: {
										notes: [
											{
												note: "initial note"
											}
										]
									}
								},
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
							},
							__NEW__: {
								docRef: "__NEW__",
								document: {},
								documentModelName: "Contract-document",
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
												docRef: "NaturalPerson-document_NEW_1",
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
								rank: 1710938308707
							},
							PolicyHolder_NEW_1: {
								linkRef: {
									linkDescriptor: {
										relationshipModel: "PolicyHolder",
										entities: [
											{
												docRef: "__NEW__",
												role: "contract"
											},
											{
												docRef: "NaturalPerson-document_NEW_1",
												role: "businessPartner"
											}
										]
									},
									id: "PolicyHolder_NEW_1"
								},
								linkDocRef: undefined,
								rank: 1710937643959
							}
						},
						linkIdsByDocId: {
							"NaturalPerson-document_NEW_1": ["PolicyHolder_NEW_1", "PostAddress_NEW_1"],
							"Address-document_NEW_1": ["PostAddress_NEW_1"],
							__NEW__: ["PolicyHolder_NEW_1"]
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
							kind: "docChanged",
							docRef: "cddDocument/0"
						},
						{
							kind: "docAdded",
							docRef: "NaturalPerson-document_NEW_1"
						},
						{
							kind: "linkAdded",
							linkId: "PolicyHolder_NEW_1"
						},
						{
							docRef: "NaturalPerson-document_NEW_1",
							kind: "docChanged"
						},
						{
							docRef: "Address-document_NEW_1",
							kind: "docAdded"
						},
						{
							kind: "linkAdded",
							linkId: "PostAddress_NEW_1"
						},
						{
							docRef: "Address-document_NEW_1",
							kind: "docChanged"
						}
					],
					changeCounter: 9
				};

				const { documentGraph, changeLog } = createInitialDgCl({
					cdm,
					formModel,
					rootDocumentModelName,
					documentModelsInScene,
					modelGraph: MOCK_MODEL_GRAPH,
					rootDocRef,
					mergeParams
				});

				assert.deepStrictEqual(replaceLinkRanksInDg(documentGraph), replaceLinkRanksInDg(expectedDg));
				assert.deepStrictEqual(changeLog, expectedCl);
			});

			test(
				"discards the initiating activity's cddDocument content instead of merging it " +
					"into the new activity's cddDocument",
				() => {
					const rootDocRef = "NaturalPerson-document_NEW_1";
					// The initiating activity's cddDocument holds cdm-only values keyed by
					// its own (ContractCDM) group paths. It must not survive into the new
					// activity, whose cddDocument belongs to NaturalPersonCDM.
					const existingDocumentGraph: DeepReadonly<DocumentGraph> = {
						documents: {
							byDocRef: {
								"cddDocument/0": {
									docRef: "cddDocument/0",
									document: {
										PolicyHolder: { someInitiatingCdmOnlyField: "leaked" }
									},
									documentModelName: "ContractCDM",
									loadingState: "loaded"
								},
								__NEW__: {
									docRef: "__NEW__",
									document: {},
									documentModelName: "Contract-document",
									loadingState: "loaded"
								},
								"NaturalPerson-document_NEW_1": {
									docRef: "NaturalPerson-document_NEW_1",
									document: {},
									documentModelName: "NaturalPerson-document",
									loadingState: "loaded"
								}
							}
						},
						links: { byId: {}, linkIdsByDocId: {} }
					};
					const mergeParams = {
						existingDocumentGraph,
						existingChangeLog: { changes: [], changeCounter: 0 }
					};

					const { documentGraph } = createInitialDgCl({
						cdm,
						formModel,
						rootDocumentModelName,
						documentModelsInScene,
						modelGraph: MOCK_MODEL_GRAPH,
						rootDocRef,
						mergeParams
					});

					const cddDocument = documentGraph.documents.byDocRef["cddDocument/0"];
					assert(cddDocument.loadingState === "loaded");
					// the new activity's fresh cddDocument prevails: correct cdm, no leaked content
					assert.strictEqual(cddDocument.documentModelName, "NaturalPersonCDM");
					assert.notProperty(cddDocument.document, "PolicyHolder");
				}
			);
		});
	});
});

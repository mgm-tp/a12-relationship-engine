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

import * as Fs from "node:fs";
import * as Path from "node:path";

import { describe, test, expect, assert, it } from "vitest";
import fastDeepEqual from "fast-deep-equal";

import { type Change, DocumentPath } from "@com.mgmtp.a12.formengine/formengine-core";
import {
	type DocumentModel,
	type EntityInstancePath,
	type GroupInstance
} from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";
import { type ModelGraph, type Relationship } from "@com.mgmtp.a12.dataservices/dataservices-access";
import type { ModelType } from "@com.mgmtp.a12.base/base-model-api/lib/main/header/index.js";
import { DocumentServiceFactory } from "@com.mgmtp.a12.kernel/kernel-md-facade";

import { assertCondition, assertObject } from "../../../internal/shared/assertion.js";
import { toCdd } from "../../../internal/cdm/cdd/core/adapter/toCdd.js";
import { type CddState } from "../../../internal/cdm/cdd/core/cddState.js";
import { newCddState } from "../../../internal/cdm/cdd/core/impl/cddStateImpl.js";
import { type ChangeHandler } from "../../../internal/cdm/cdd/redux/changeCdd/changeCddImpl.js";
import { handleGroupAdded } from "../../../internal/cdm/cdd/redux/changeCdd/handleGroupAdded.js";
import { handleGroupMoved } from "../../../internal/cdm/cdd/redux/changeCdd/handleGroupMoved.js";
import { handleGroupRemoved } from "../../../internal/cdm/cdd/redux/changeCdd/handleGroupRemoved.js";
import { handleValueChanged } from "../../../internal/cdm/cdd/redux/changeCdd/handleValueChanged.js";
import { type ScdmDataHolderShape } from "../../../internal/cdm/cdd/redux/dhReducersImpl.js";
import { CDD_DOC_REF, LINKDOC_GROUPNAME } from "../../../internal/cdm/cdmCommons/cddTechnical.js";
import { type DeepReadonly, type DocumentGraph } from "../../../internal/documentGraph/core/index.js";
import { newChangeLog } from "../../../internal/documentGraph/core/changeLog/changeLogImpl.js";
import { readDocumentAndValidationModel } from "../../mocks/ModelsUtil.js";
import { MOCK_MODEL_GRAPH } from "../../mocks/relationships/ModelGraph.js";
import dgCopyRow from "../../mocks/scdm/loadDG/dg-copyRow.json" with { type: "json" };
import dg from "../../mocks/scdm/loadDG/dg.json" with { type: "json" };
import { createDataHolder } from "../../utils/activity.js";

describe.skip("com.mgmtp.a12.client.extensions.cdm.cdd", () => {
	describe("ChangeCDD", () => {
		describe("AddGroup", () => {
			/**
			 * Creates a test body for an GroupAdded change. The test calls handleGroupAdded
			 * with the already changed document (containing a new group with a test
			 * property to compare), and a corresponding change object.
			 *
			 * Then it tests if a new document and a correct link have been added.
			 *
			 * Parameters:
			 *
			 * The change path, as it would be set by the FE
			 *
			 * A factory to produce the document already containing the changes, as it would
			 * be given by the FE. Factory params:
			 * - the existing CDD (constructed from cddDto.json)
			 * - the object to be used for the new group
			 *
			 * A factory to produce the expected link specs. Factory params:
			 * - The DocRef of the newly created document
			 */
			function makeTest(params: {
				changedPath: EntityInstancePath;
				makeFEDoc: (cdd: any, newGroups: object[]) => object;
				makeLinkSpecs: (newDocRefs: string[]) => Relationship.LinkEntitySpec[][];
				getTestGroups: () => object[];
			}) {
				const { changedPath, makeFEDoc, makeLinkSpecs, getTestGroups } = params;
				return () => {
					const { dataHolder, cdd: initialCdd } = initDataHolder();
					const dgBefore = testProps(dataHolder.data?.documentGraph as DocumentGraph);

					const newGroups = getTestGroups();

					const { dgResult } = updateDataHolderState(
						dataHolder,
						initialCdd,
						"unknown",
						{ type: "GroupAdded", path: changedPath },
						(cdd) => makeFEDoc(cdd, newGroups),
						handleGroupAdded
					);

					expect(dgResult.documents.length, "one document added").to.equal(
						dgBefore.documents.length + newGroups.length
					);

					const newDgDocs = newGroups.map((group) =>
						dgResult.documents.find((d) => d.loadingState === "loaded" && fastDeepEqual(d.document as unknown, group))
					);

					for (const newDgDoc of newDgDocs) {
						expect(
							newDgDoc,
							"new DG document with loadingState=loaded and containing given group as document"
						).to.not.equal(undefined);
					}

					const newLinkSpecs = makeLinkSpecs(newDgDocs.map((doc) => doc?.docRef ?? ""));
					expect(
						dgResult.links.length,
						`expected ${dgBefore.links.length + newLinkSpecs.length}, but found ${dgResult.links.length}`
					).to.equal(dgBefore.links.length + newLinkSpecs.length);

					const newLinks = newLinkSpecs.map((spec) => dgResult.links.find(dgLinkComparator(spec)));
					for (const newLink of newLinks) {
						expect(newLink, "new DG link with expected specs").to.not.equal(undefined);
					}
				};
			}
			it(
				"adds a group as a document+link",
				makeTest({
					changedPath: DocumentPath.fromString("PolicyHolder[1]/Location[3]"),
					makeFEDoc: (cdd, newGroups) => ({
						...cdd,
						PolicyHolder: {
							...cdd.PolicyHolder,
							Location: [...cdd.PolicyHolder.Location, newGroups[0]]
						}
					}),
					makeLinkSpecs: (newDocRefs) => [
						[
							{
								docRef: "BusinessPartner-document/21",
								modelName: "BusinessPartner-document",
								role: "businessPartner"
							},
							{
								docRef: newDocRefs[0],
								modelName: "Address",
								role: "address"
							}
						]
					],
					getTestGroups: () => [{ address: { country: "foo" } }]
				})
			);

			it(
				"adds a group as a document+link and adds the link document",
				makeTest({
					changedPath: DocumentPath.fromString("CoInsurer[3]"),
					makeFEDoc: (cdd, newGroups) => ({
						...cdd,
						CoInsurer: [
							...cdd.CoInsurer,
							{
								...newGroups[0],
								[LINKDOC_GROUPNAME]: newGroups[1]
							}
						]
					}),
					makeLinkSpecs: (newDocRefs) => [
						[
							{
								docRef: "Contract-document/24",
								modelName: "Contract-document",
								role: "contract"
							},
							{
								docRef: newDocRefs[0],
								modelName: "BusinessPartner-document",
								role: "businessPartner"
							}
						]
					],
					getTestGroups: () => [
						{
							businessPartner: {
								id: "businessPartnerFoo"
							}
						},
						{
							additionalFields: {
								since: new Date()
							}
						}
					]
				})
			);

			it(
				"adds a nested group as a document+link",
				makeTest({
					changedPath: DocumentPath.fromString("CoInsurer[2]/Location[2]"),
					makeFEDoc: (cdd, newGroups) => {
						const newCoInsurer = {
							...cdd.CoInsurer[1],
							Location: [...cdd.CoInsurer[1].Location, newGroups[0]]
						};

						return {
							...cdd,
							CoInsurer: cdd.CoInsurer.map((ci: any, i: number) => (i === 1 ? newCoInsurer : ci))
						};
					},
					makeLinkSpecs: (newDocRefs) => [
						[
							{
								docRef: "BusinessPartner-document/23",
								modelName: "BusinessPartner-document",
								role: "businessPartner"
							},
							{
								docRef: newDocRefs[0],
								modelName: "Address",
								role: "address"
							}
						]
					],
					getTestGroups: () => [
						{
							address: {
								street: "foo"
							}
						}
					]
				})
			);

			describe("if the added group is not bound to a relationship", () => {
				function addGroupFixture() {
					const { dataHolder, cdd: initialCdd } = initDataHolder();
					const dgBefore = testProps(dataHolder.data?.documentGraph as DocumentGraph);

					const path = DocumentPath.fromString("PolicyHolder[1]/businessPartner[1]/notes[1]");
					const newGroup = { note: "some text" };

					const { dgResult } = updateDataHolderState(
						dataHolder,
						initialCdd,
						"BusinessPartner-document/21",
						{ type: "GroupAdded", path },
						(cdd) => ({
							...cdd,
							PolicyHolder: {
								...cdd.PolicyHolder,
								businessPartner: {
									...cdd.PolicyHolder.businessPartner,
									notes: [newGroup]
								}
							}
						}),
						handleGroupAdded
					);

					return {
						dgResult,
						dgBefore,
						newGroup
					};
				}

				test("does not add a group as a document+link", () => {
					const { dgResult, dgBefore } = addGroupFixture();
					expect(dgResult.documents.length, "no document added").to.equal(dgBefore.documents.length);
					expect(dgResult.links.length, "no link added").to.equal(dgBefore.links.length);
				});

				test("updates the surrounding document with the changed value", () => {
					const { dgResult, newGroup } = addGroupFixture();

					const changedSubDocument = dgResult.documents.find((doc) => doc.docRef === "BusinessPartner-document/21");
					assertObject(changedSubDocument);
					assertCondition(changedSubDocument.loadingState === "loaded");

					expect((changedSubDocument.document as any).businessPartner.notes).to.be.deep.equal([newGroup]);
				});
			});

			describe("if the group instance was copied", () => {
				function copyGroupFixture() {
					const { dataHolder, cdd: initialCdd } = initDataHolder(dgCopyRow as DeepReadonly<DocumentGraph>);
					const dgBefore = testProps(dataHolder.data?.documentGraph as DocumentGraph);

					const path = DocumentPath.fromString("PolicyHolder[1]/businessPartner[1]/notes[3]");
					const newGroup = { note: "some text" };

					const { dgResult, updatedDocument } = updateDataHolderState(
						dataHolder,
						initialCdd,
						"BusinessPartner-document/21",
						{ type: "GroupAdded", path },
						(cdd) => ({
							...cdd,
							PolicyHolder: {
								...cdd.PolicyHolder,
								businessPartner: {
									...cdd.PolicyHolder.businessPartner,
									notes: [...cdd.PolicyHolder.businessPartner.notes, newGroup]
								}
							}
						}),
						handleGroupAdded
					);

					return {
						dgResult,
						dgBefore,
						updatedDocument
					};
				}
				test("updates the surrounding document to contain the group instance copy as last element in the respective array", () => {
					const { updatedDocument } = copyGroupFixture();

					expect((updatedDocument as any).document.businessPartner.notes.length).to.be.equal(3);
					expect((updatedDocument as any).document.businessPartner.notes[2].note).to.be.equal("some text");
				});
			});
		});

		describe("ChangeValue", () => {
			function changeValueFixture(
				targetDocRef: string,
				changePath: EntityInstancePath,
				makeFEDoc: (cdd: any) => object
			) {
				const { dataHolder, cdd } = initDataHolder();

				const dgBefore = testProps(dataHolder.data?.documentGraph as DocumentGraph);

				const { dgResult, updatedDocument, result } = updateDataHolderState(
					dataHolder,
					cdd,
					targetDocRef,
					{ type: "ValueChanged", path: changePath },
					makeFEDoc,
					handleValueChanged
				);

				return {
					dgBefore,
					dgResult,
					updatedDocument,
					result
				};
			}

			describe("If a non-relationship group was added to or removed from the document", () => {
				test("Updates the document in the DG and the cdd cache", () => {
					const note = { note: "some text" };
					const changePath = [
						{ elementName: "PolicyHolder", index: 1 },
						{ elementName: "businessPartner", index: 1 },
						{ elementName: "notes", index: 1 },
						{ elementName: "note", index: 1 }
					];
					const targetDocRef = "BusinessPartner-document/21";

					const { dgBefore, dgResult, updatedDocument, result } = changeValueFixture(
						targetDocRef,
						changePath,
						(cdd) => ({
							...cdd,
							PolicyHolder: {
								...cdd.PolicyHolder,
								businessPartner: {
									...cdd.PolicyHolder.businessPartner,
									notes: [note]
								}
							}
						})
					);
					expect(dgResult.documents.length, "no document added").to.equal(dgBefore.documents.length);
					expect(dgResult.links.length, "no link added").to.equal(dgBefore.links.length);

					if (updatedDocument?.loadingState === "loaded") {
						expect((updatedDocument.document as any).businessPartner.notes).to.be.deep.equal([note]);

						expect((result.data?.cddState.cachedCdd?.cdd as any).PolicyHolder.businessPartner.notes).to.be.deep.equal([
							note
						]);
					} else {
						assert.fail();
					}

					const {
						dgResult: dgResult2,
						result: result2,
						updatedDocument: updatedDocument2
					} = updateDataHolderState(
						result,
						result.data?.cddState.cachedCdd?.cdd as any,
						targetDocRef,
						{ type: "ValueChanged", path: changePath.slice(0, -1) },
						(cdd) => ({
							...cdd,
							PolicyHolder: {
								...cdd.PolicyHolder,
								businessPartner: {
									...cdd.PolicyHolder.businessPartner,
									notes: []
								}
							}
						}),
						handleValueChanged
					);

					expect(dgResult2.documents.length, "no document removed").to.equal(dgBefore.documents.length);
					expect(dgResult2.links.length, "no link removed").to.equal(dgBefore.links.length);

					if (updatedDocument2?.loadingState === "loaded") {
						expect((updatedDocument2.document as any).businessPartner.notes).to.be.deep.equal([]);

						expect((result2.data?.cddState.cachedCdd?.cdd as any).PolicyHolder.businessPartner.notes).to.be.deep.equal(
							[]
						);
					} else {
						assert.fail();
					}
				});
			});

			describe("If a field was modified in the document", () => {
				test("Updates the correct document in the DG and the cdd cache", () => {
					const hasPostalAddress = true;
					const { dgBefore, dgResult, updatedDocument, result } = changeValueFixture(
						"BusinessPartner-document/21",
						[
							{ elementName: "PolicyHolder", index: 1 },
							{ elementName: "hasPostalAddress", index: 1 }
						],
						(cdd) => ({
							...cdd,
							PolicyHolder: {
								...cdd.PolicyHolder,
								hasPostalAddress
							}
						})
					);
					expect(dgResult.documents.length, "no document added").to.equal(dgBefore.documents.length);
					expect(dgResult.links.length, "no link added").to.equal(dgBefore.links.length);

					const cddDoc = dgResult.documents.find((d) => d.docRef === CDD_DOC_REF);
					if (cddDoc?.loadingState === "loaded") {
						expect((cddDoc.document.PolicyHolder as GroupInstance).hasPostalAddress).to.be.equal(hasPostalAddress);
					} else {
						assert.fail(`Expected CDD_DOC to be loaded, got loading state: ${cddDoc?.loadingState}`);
					}

					if (updatedDocument?.loadingState === "loaded") {
						expect(updatedDocument.document.hasPostalAddress).to.be.equal(undefined);

						expect((result.data?.cddState.cachedCdd?.cdd as any).PolicyHolder.hasPostalAddress).to.be.equal(
							hasPostalAddress
						);
					} else {
						assert.fail(`Expected updated document to be loaded, got loading state: ${updatedDocument?.loadingState}`);
					}
				});
			});
		});

		describe("RemoveGroup", () => {
			test("Updates the document in the DG and the cdd cache and does not remove documents or links", () => {
				const { dataHolder, cdd: initialCdd } = initDataHolder();

				const path = DocumentPath.fromString("PolicyHolder[1]/businessPartner[1]/notes[1]");
				const newNote = { note: "some text" };

				const { dgResult: dgBefore, result: updatedDataHolder } = updateDataHolderState(
					dataHolder,
					initialCdd,
					"BusinessPartner-document/21",
					{ type: "GroupAdded", path },
					(cdd) => ({
						...cdd,
						PolicyHolder: {
							...cdd.PolicyHolder,
							businessPartner: {
								...cdd.PolicyHolder.businessPartner,
								notes: [newNote]
							}
						}
					}),
					handleGroupAdded
				);

				const { dgResult, updatedDocument, result } = updateDataHolderState(
					updatedDataHolder,
					initialCdd,
					"BusinessPartner-document/21",
					{ type: "GroupRemoved", path },
					(cdd) => ({
						...cdd,
						PolicyHolder: {
							...cdd.PolicyHolder,
							businessPartner: {
								...cdd.PolicyHolder.businessPartner,
								notes: []
							}
						}
					}),
					handleGroupRemoved
				);

				expect(dgResult.documents.length, "no document removed").to.equal(dgBefore.documents.length);
				expect(dgResult.links.length, "no link removed").to.equal(dgBefore.links.length);

				if (updatedDocument?.loadingState === "loaded") {
					expect((updatedDocument.document as any).businessPartner.notes).to.be.deep.equal([]);

					expect((result.data?.cddState.cachedCdd?.cdd as any).PolicyHolder.businessPartner.notes).to.be.deep.equal([]);
				} else {
					assert.fail();
				}
			});

			describe("When removing a group instance which is not the last in the list", () => {
				test("removes the correct instance in the dg and cached cdd", () => {
					const { dataHolder, cdd: initialCdd } = initDataHolder();

					const path1 = DocumentPath.fromString("PolicyHolder[1]/businessPartner[1]/notes[1]");
					const path2 = DocumentPath.fromString("PolicyHolder[1]/businessPartner[1]/notes[2]");
					const newNote1 = { note: "some text" };
					const newNote2 = { note: "some other text" };

					// prepare data holder

					const { result: updatedDataHolder1 } = updateDataHolderState(
						dataHolder,
						initialCdd,
						"BusinessPartner-document/21",
						{ type: "GroupAdded", path: path1 },
						(cdd) => ({
							...cdd,
							PolicyHolder: {
								...cdd.PolicyHolder,
								businessPartner: {
									...cdd.PolicyHolder.businessPartner,
									notes: [newNote1]
								}
							}
						}),
						handleGroupAdded
					);

					const { dgResult: dgBefore2, result: updatedDataHolder2 } = updateDataHolderState(
						updatedDataHolder1,
						updatedDataHolder1.data?.cddState.cachedCdd?.cdd,
						"BusinessPartner-document/21",
						{ type: "GroupAdded", path: path2 },
						(cdd) => ({
							...cdd,
							PolicyHolder: {
								...cdd.PolicyHolder,
								businessPartner: {
									...cdd.PolicyHolder.businessPartner,
									notes: [...cdd.PolicyHolder.businessPartner.notes, newNote2]
								}
							}
						}),
						handleGroupAdded
					);

					// execute removal

					const { dgResult, updatedDocument, result } = updateDataHolderState(
						updatedDataHolder2,
						updatedDataHolder2.data?.cddState.cachedCdd?.cdd,
						"BusinessPartner-document/21",
						{ type: "GroupRemoved", path: path1 },
						(cdd) => ({
							...cdd,
							PolicyHolder: {
								...cdd.PolicyHolder,
								businessPartner: {
									...cdd.PolicyHolder.businessPartner,
									notes: [newNote2]
								}
							}
						}),
						handleGroupRemoved
					);

					expect(dgResult.documents.length, "no document removed").to.equal(dgBefore2.documents.length);

					expect(dgResult.links.length, "no link removed").to.equal(dgBefore2.links.length);

					if (updatedDocument?.loadingState === "loaded") {
						expect((updatedDocument.document as any).businessPartner.notes).to.be.deep.equal([newNote2]);

						expect((result.data?.cddState.cachedCdd?.cdd as any).PolicyHolder.businessPartner.notes).to.be.deep.equal([
							newNote2
						]);
					} else {
						assert.fail();
					}
				});
			});
		});

		describe("MoveGroup", () => {
			const testDocRef = "BusinessPartner-document/21";

			function moveGroupFixture() {
				const { dataHolder, cdd: initialCdd } = initDataHolder(dgCopyRow as DeepReadonly<DocumentGraph>);
				const dgBefore = testProps(dataHolder.data?.documentGraph as DocumentGraph);

				const path = DocumentPath.fromString("PolicyHolder[1]/businessPartner[1]/notes[2]");

				const { dgResult, updatedDocument } = updateDataHolderState(
					dataHolder,
					initialCdd,
					testDocRef,
					{ type: "GroupMoved", path, delta: -1 },
					(cdd) => ({
						...cdd,
						PolicyHolder: {
							...cdd.PolicyHolder,
							businessPartner: {
								...cdd.PolicyHolder.businessPartner,
								notes: [cdd.PolicyHolder.businessPartner.notes[1], cdd.PolicyHolder.businessPartner.notes[0]]
							}
						}
					}),
					handleGroupMoved
				);

				return {
					dgResult,
					dgBefore,
					updatedDocument
				};
			}

			test("moves the regular group instance by the given delta in dg doc and updates cdd accordingly", () => {
				const dgDoc = testProps(dgCopyRow as DocumentGraph).documents.find((doc) => doc.docRef === testDocRef);
				const firstNoteText = (dgDoc as any).document.businessPartner.notes[0].note;
				const secondNoteText = (dgDoc as any).document.businessPartner.notes[1].note;

				const { updatedDocument } = moveGroupFixture();

				expect((updatedDocument as any).document.businessPartner.notes[0].note).to.equal(secondNoteText);
				expect((updatedDocument as any).document.businessPartner.notes[1].note).to.equal(firstNoteText);
			});
		});
	});

	/**
	 * Updates the dataHolder with the change that is passed to the changeHandler
	 * @returns the resulting dataHolder, the docs and links in it and the updated
	 * document for the given targetDocRef
	 */
	function updateDataHolderState(
		dataHolder: ScdmDataHolderShape,
		cdd: any,
		targetDocRef: string,
		change: Change,
		makeFEDoc: (cdd: any, newGroup?: object) => object,
		changeHandler: ChangeHandler
	) {
		const referencedDocumentModels = expandDescriptors(
			[{ modelType: "document", name: "ContractCDM" }],
			MOCK_MODEL_GRAPH
		).map(({ name }) => readDocumentAndValidationModel(name));

		const result = changeHandler(dataHolder, {
			activityId: "unused",
			document: makeFEDoc(cdd),
			change,
			// will be ignored anyway since it is not required for this type of change
			newDocRef: () => "foo_bar",
			documentModels: referencedDocumentModels,
			modelGraph: MOCK_MODEL_GRAPH
		});
		const dgResult = testProps(result.data?.documentGraph as DocumentGraph);

		const updatedDocument = dgResult.documents.find((doc) => doc.docRef === targetDocRef);

		return {
			dgResult,
			updatedDocument,
			result
		};
	}

	/**
	 * Create a new data holder using mock data.
	 */
	function initDataHolder(mockDg?: DeepReadonly<DocumentGraph>) {
		const cdm = loadCDM();
		const rootGroup = cdm.content.modelRoot;
		const documentGraph = mockDg ?? (dg as DeepReadonly<DocumentGraph>);
		const changeLog = newChangeLog<DeepReadonly<DocumentGraph>>();
		const cdd = toCdd(documentGraph, "Contract-document/24", rootGroup);
		const cddState: CddState = {
			...newCddState("Contract-document/24", cdm),
			cachedCdd: {
				cdd
			}
		};
		const data: ScdmDataHolderShape["data"] = {
			documentGraph,
			changeLog,
			cddState
		};
		const dataHolder = createDataHolder({
			data
		}) as ScdmDataHolderShape;

		return { dataHolder, cdd };
	}

	function loadCDM(): DocumentModel {
		return new DocumentServiceFactory().getDocumentModelSerializer().deserialize(
			Fs.readFileSync(
				Path.join(
					import.meta.dirname,
					"..",
					"..",
					"..",
					"..",
					"..",
					"showcase",
					"target",
					"models",
					"ContractCDM.json"
				),
				{
					encoding: "utf-8"
				}
			)
		);
	}

	function testProps(documentGraph?: DocumentGraph) {
		return {
			documents: objectValues(documentGraph?.documents.byDocRef),
			links: objectValues(documentGraph?.links.byId)
		};
	}

	function objectValues<T>(obj?: { [key: string]: T }) {
		return obj ? Object.keys(obj).map((k) => obj?.[k]) : [];
	}

	/**
	 * Link comparator that uses given link specs as equality predicate.
	 *
	 * For a given set of specs and specs of a given link, matches if both are of
	 * same size and all of the specs of the link occur in the list of given specs.
	 *
	 * Order is ignored.
	 */
	const dgLinkComparator = (specs: Relationship.LinkEntitySpec[]) => (link: { linkRef: Relationship.LinkRef }) => {
		const linkEntities = link.linkRef.linkDescriptor.entities;
		return specs.length === linkEntities.length && specs.every((s) => linkEntities.some(linkEntityComparator(s)));
	};

	// a link spec comparator
	const linkEntityComparator = (spec: Relationship.LinkEntitySpec) => (link: Relationship.LinkEntitySpec) =>
		link.docRef === spec.docRef && link.role === spec.role;
});

interface ModelDescriptor {
	name: string;
	modelType: ModelType;
}

function removeDuplicateDescriptors(modelDescriptors: ModelDescriptor[]): ModelDescriptor[] {
	const uniqueDescriptorsByName = new Map(modelDescriptors.map((md) => [md.name, md]));
	return [...uniqueDescriptorsByName.values()];
}

function expandDescriptors(modelDescriptors: ModelDescriptor[], modelGraph: ModelGraph) {
	const expandedDescriptors = modelDescriptors.reduce(
		(newDescriptors, modelDescriptor) => [...newDescriptors, ...expandRecursive(modelGraph, modelDescriptor)],
		[] as ModelDescriptor[]
	);
	return removeDuplicateDescriptors(expandedDescriptors);
}

function expandRecursive(modelGraph: ModelGraph, modelDescriptor: ModelDescriptor): ModelDescriptor[] {
	const expandedDescriptors = [modelDescriptor];
	const referencedModels = findModelReferences(modelDescriptor, modelGraph);
	const referencedDescriptors = referencedModels?.flatMap((r) =>
		expandRecursive(modelGraph, {
			name: r.reference,
			modelType: r.modelType
		})
	);
	return expandedDescriptors.concat(referencedDescriptors ?? []);
}

function findModelReferences({ modelType, name }: ModelDescriptor, modelGraph: ModelGraph) {
	const match =
		modelType === "document"
			? [...modelGraph.documentModels, ...modelGraph.composeDocumentModels].find((dm) => dm.modelId === name)
			: modelType === "relationship"
				? modelGraph.relationshipModels.find((rm) => rm.header.id === name)
				: modelGraph.genericModels?.find((m) => m.modelId === name);
	// DS does not provide typeguards for this (A12S-4623)
	return match && "header" in match ? match.header.modelReferences : match?.modelReferences;
}

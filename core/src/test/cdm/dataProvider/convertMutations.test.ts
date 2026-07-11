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

import { vi, test, expect, describe, beforeAll } from "vitest";

import { LocaleSelectors } from "@com.mgmtp.a12.client/client-core";
import type { ModelGraph } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { type DocumentModel, DocumentServiceFactory } from "@com.mgmtp.a12.kernel/kernel-md-facade";

import TestDmJson from "../testData/TestDM.json" with { type: "json" };
import { MOCK_MODEL_GRAPH } from "../../mocks/relationships/ModelGraph.js";
import { createLinkRef, createLinkDescriptor } from "../../mocks/relationships/mocks.js";
import { convertMutations } from "../../../internal/cdm/dataProvider/convertMutations.js";
import { DefaultRequestSelectorMap } from "../../../internal/server-connectors/request-selector-map.js";
import type {
	DocumentMutation,
	DocumentWithMutationMetadata
} from "../../../internal/cdm/cdd/core/effectiveChanges/documentsWithMetaData.js";

import { createLinkMutation } from "./testSetup.js";

const ACTIVITY_ID = "test-activity";
const DUMMY_STATE = {} as {};

describe("com.mgmtp.a12.relationshipengine-core.extensions.cdm.data-provider", () => {
	describe("convertMutations", () => {
		beforeAll(() => {
			// Ensure RequestSelectorMap selectors can resolve a locale during tests
			const fakeSelector = (() => "en") as unknown as ReturnType<typeof LocaleSelectors.locale>;
			vi.spyOn(LocaleSelectors, "locale").mockReturnValue(fakeSelector);
		});

		test("returns an empty list if given no link and no document mutations", () => {
			const result = convertMutations(
				{ documents: [], links: [] },
				MOCK_MODEL_GRAPH,
				() => undefined,
				() => undefined,
				ACTIVITY_ID,
				DUMMY_STATE,
				DefaultRequestSelectorMap
			);
			expect(result.length).to.be.equal(0);
		});

		test("throws an error if a document mutation is passed that refers to a non-existent document model", () => {
			const modelName = "bar";
			expect(() =>
				convertMutations(
					{
						documents: [createDocumentMutation("foo", modelName, "added")],
						links: []
					},
					MOCK_MODEL_GRAPH,
					() => undefined,
					() => undefined,
					ACTIVITY_ID,
					DUMMY_STATE,
					DefaultRequestSelectorMap
				)
			).to.throw(`Cannot persist document without the respective document model '${modelName}'`);
		});

		describe("converts all document mutations to requests", () => {
			test("when the referenced document model exists directly", () => {
				const modelName = "TestDM";
				const requests = convertMutations(
					{
						documents: [
							createDocumentMutation("foo", modelName, "added", { base: { stringField: "abc" } }),
							createDocumentMutation("bar", modelName, "modified", { base: { stringField: "def" } })
						],
						links: []
					},
					MOCK_MODEL_GRAPH,
					(name, typeGuard) => (name === "TestDM" && typeGuard(TestDM) ? TestDM : undefined),
					() => undefined,
					ACTIVITY_ID,
					DUMMY_STATE,
					DefaultRequestSelectorMap
				);

				expect(requests.length).to.be.equal(2);
				expect(requests[0].method).to.be.equal("ADD_DOCUMENT");
				expect(requests[0].params).to.deep.include({
					documentModelName: modelName,
					document: { base: { stringField: "abc" } }
				});
				expect(requests[1].method).to.be.equal("MODIFY_DOCUMENT");
				expect(requests[1].params).to.deep.include({
					document: { base: { stringField: "def" } },
					docRef: "bar"
				});
			});

			test("when a super type of the referenced document model exists", () => {
				const modelName = "TestDM";
				const modelGraph: ModelGraph = {
					documentModels: [
						{ modelId: "TestDM", subTypes: [], relations: [] },
						{ modelId: "SuperTestDM", subTypes: ["TestDM"], relations: [] }
					],
					composeDocumentModels: [],
					relationshipModels: []
				};

				const requests = convertMutations(
					{
						documents: [
							createDocumentMutation("foo", modelName, "added", { base: { stringField: "abc" } }),
							createDocumentMutation("bar", modelName, "modified", { base: { stringField: "def" } })
						],
						links: []
					},
					modelGraph,
					(name, typeGuard) => (name === "SuperTestDM" && typeGuard(TestDM) ? TestDM : undefined),
					() => undefined,
					ACTIVITY_ID,
					DUMMY_STATE,
					DefaultRequestSelectorMap
				);

				expect(requests.length).to.be.equal(2);
				expect(requests[0].method).to.be.equal("ADD_DOCUMENT");
				expect(requests[0].params).to.deep.include({
					documentModelName: modelName,
					document: { base: { stringField: "abc" } }
				});
				expect(requests[1].method).to.be.equal("MODIFY_DOCUMENT");
				expect(requests[1].params).to.deep.include({
					document: { base: { stringField: "def" } },
					docRef: "bar"
				});
			});
		});

		test("converts all link mutations to requests", () => {
			const requests = convertMutations(
				{
					documents: [],
					links: [
						createLinkMutation("added", "1", "rm1", "doc1", "left", "doc2", "right"),
						createLinkMutation("removed", "2", "rm1", "doc3", "left", "doc4", "right"),
						createLinkMutation("existing", "3", "rm1", "doc5", "left", "doc6", "right", {
							base: { stringField: "abc" }
						})
					]
				},
				MOCK_MODEL_GRAPH,
				() => undefined,
				(name) => (name === "rm1" ? TestDM : undefined),
				ACTIVITY_ID,
				DUMMY_STATE,
				DefaultRequestSelectorMap
			);

			expect(requests.length).to.be.equal(3);
			expect(requests[0].method).to.be.equal("ADD_LINK");
			expect(requests[0].params).to.deep.equal({
				linkDescriptor: createLinkDescriptor("rm1", "doc1", "left", "doc2", "right"),
				linkDocument: {}
			});
			expect(requests[1].method).to.be.equal("DELETE_LINK");
			expect(requests[1].params).to.deep.equal({
				linkRef: createLinkRef({
					id: "2",
					docRef1: "doc3",
					role1: "left",
					docRef2: "doc4",
					role2: "right",
					relationshipModel: "rm1"
				})
			});
			expect(requests[2].method).to.be.equal("MODIFY_LINK");
			expect(requests[2].params).to.deep.equal({
				linkRef: createLinkRef({
					id: "3",
					docRef1: "doc5",
					role1: "left",
					docRef2: "doc6",
					role2: "right",
					relationshipModel: "rm1"
				}),
				linkDocument: { base: { stringField: "abc" } }
			});
		});

		test("does pre-save processing on all added and modified documents", () => {
			const modelName = "TestDM";
			const requests = convertMutations(
				{
					documents: [
						createDocumentMutation("foo", modelName, "added", {
							base: { dateField: new Date("2021-06-18T00:00:00.000Z") }
						}),
						createDocumentMutation("bar", modelName, "modified", {
							base: { dateField: new Date("2021-06-19T00:00:00.000Z") }
						})
					],
					links: []
				},
				MOCK_MODEL_GRAPH,
				(name, typeGuard) => (name === "TestDM" && typeGuard(TestDM) ? TestDM : undefined),
				() => undefined,
				ACTIVITY_ID,
				DUMMY_STATE,
				DefaultRequestSelectorMap
			);

			expect(requests.length).to.be.equal(2);
			expect(requests[0].params).to.deep.include({
				documentModelName: modelName,
				document: { base: { dateField: "2021-06-18" } }
			});
			expect(requests[1].params).to.deep.include({
				document: { base: { dateField: "2021-06-19" } },
				docRef: "bar"
			});
		});

		test("does pre-save processing on all modified link documents", () => {
			const requests = convertMutations(
				{
					documents: [],
					links: [
						createLinkMutation("added", "1", "rm1", "doc1", "left", "doc2", "right", {
							base: { dateField: new Date("2021-06-18T00:00:00.000Z") }
						}),
						createLinkMutation("existing", "3", "rm1", "doc5", "left", "doc6", "right", {
							base: { dateField: new Date("2021-06-19T00:00:00.000Z") }
						})
					]
				},
				MOCK_MODEL_GRAPH,
				() => undefined,
				(name) => (name === "rm1" ? TestDM : undefined),
				ACTIVITY_ID,
				DUMMY_STATE,
				DefaultRequestSelectorMap
			);

			expect(requests.length).to.be.equal(2);
			expect(requests[0].params).to.deep.equal({
				linkDescriptor: createLinkDescriptor("rm1", "doc1", "left", "doc2", "right"),
				linkDocument: { base: { dateField: "2021-06-18" } }
			});
			expect(requests[1].params).to.deep.equal({
				linkRef: createLinkRef({
					id: "3",
					docRef1: "doc5",
					role1: "left",
					docRef2: "doc6",
					role2: "right",
					relationshipModel: "rm1"
				}),
				linkDocument: { base: { dateField: "2021-06-19" } }
			});
		});

		test("throws if a docDeleted mutation is passed", () => {
			const modelName = "TestDM";
			expect(() =>
				convertMutations(
					{
						documents: [createDocumentMutation("foo", modelName, "removed")],
						links: []
					},
					MOCK_MODEL_GRAPH,
					(name, typeGuard) => (name === "TestDM" && typeGuard(TestDM) ? TestDM : undefined),
					() => undefined,
					ACTIVITY_ID,
					DUMMY_STATE,
					DefaultRequestSelectorMap
				)
			).to.throw("Cannot persist DELETE_DOCUMENT changes from the cdd - not implemented yet!");
		});

		test("uses placeholders for docRefs inside link operations that refer to newly added documents", () => {
			const modelName = "TestDM";
			const requests = convertMutations(
				{
					documents: [
						createDocumentMutation("doc1", modelName, "added", { base: { stringField: "abc" } }),
						createDocumentMutation("doc2", modelName, "added", { base: { stringField: "def" } })
					],
					links: [
						createLinkMutation("added", "1", "rm1", "doc", "left", "doc1", "right"),
						createLinkMutation("added", "2", "rm1", "doc", "left", "doc2", "right")
					]
				},
				MOCK_MODEL_GRAPH,
				(name, typeGuard) => (name === "TestDM" && typeGuard(TestDM) ? TestDM : undefined),
				(name) => (name === "rm1" ? TestDM : undefined),
				ACTIVITY_ID,
				DUMMY_STATE,
				DefaultRequestSelectorMap
			);

			expect(requests.length).to.be.equal(4);
			expect(requests[0].method).to.be.equal("ADD_DOCUMENT");
			const addOp1 = requests[0].id as string;
			expect(requests[1].method).to.be.equal("ADD_DOCUMENT");
			const addOp2 = requests[1].id as string;
			expect(requests[2].method).to.be.equal("ADD_LINK");
			expect(requests[2].params).to.deep.equal({
				linkDescriptor: createLinkDescriptor("rm1", "doc", "left", `#{#${addOp1}.metadata.docRef}`, "right"),
				linkDocument: {}
			});
			expect(requests[3].method).to.be.equal("ADD_LINK");
			expect(requests[3].params).to.deep.equal({
				linkDescriptor: createLinkDescriptor("rm1", "doc", "left", `#{#${addOp2}.metadata.docRef}`, "right"),
				linkDocument: {}
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

const dmSerializer = new DocumentServiceFactory().getDocumentModelSerializer();
const TestDM: DocumentModel = dmSerializer.deserialize(JSON.stringify(TestDmJson));

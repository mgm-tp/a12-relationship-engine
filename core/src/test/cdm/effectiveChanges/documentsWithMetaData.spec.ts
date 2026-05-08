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

import { describe, test, expect } from "vitest";

import { documentsWithMetaData } from "../../../internal/cdm/cdd/core/effectiveChanges/documentsWithMetaData.js";
import { type DgChangeLog, type DocumentGraph } from "../../../internal/documentGraph/core/index.js";

describe("com.mgmtp.a12.relationshipengine-core.extensions.cdm.documentGraph", () => {
	describe("documentsWithMetaData", () => {
		test("returns all document-related changes of the document graph", () => {
			const documentGraph: DocumentGraph = {
				documents: {
					byDocRef: {
						doc1: {
							docRef: "doc1",
							document: {},
							loadingState: "loaded",
							documentModelName: "doc"
						},
						doc2: {
							docRef: "doc2",
							document: {},
							loadingState: "loaded",
							documentModelName: "doc"
						},
						doc3: {
							docRef: "doc3",
							document: {},
							loadingState: "loaded",
							documentModelName: "doc"
						}
					}
				},
				links: {
					byId: {},
					linkIdsByDocId: {}
				}
			};

			const changeLog: DgChangeLog = {
				changeCounter: 0,
				changes: [
					{
						kind: "docChanged",
						docRef: "doc1"
					},
					{
						kind: "docChanged",
						docRef: "doc3"
					}
				]
			};

			const result = documentsWithMetaData(documentGraph, changeLog);

			expect(result).to.include.deep.members([
				{
					mutation: "modified",
					document: {
						content: {},
						docRef: "doc1",
						documentModelName: "doc"
					}
				},
				{
					mutation: "modified",
					document: {
						content: {},
						docRef: "doc3",
						documentModelName: "doc"
					}
				}
			]);
		});

		test("throws an error if a change refers to a non-existent document", () => {
			const documentGraph: DocumentGraph = {
				documents: {
					byDocRef: {}
				},
				links: {
					byId: {},
					linkIdsByDocId: {}
				}
			};

			const changeLog: DgChangeLog = {
				changeCounter: 0,
				changes: [
					{
						kind: "docChanged",
						docRef: "doc1"
					}
				]
			};

			expect(() => documentsWithMetaData(documentGraph, changeLog)).to.throw(
				"Cannot handle addition/change of document [docRef: doc1] that is not part of the document graph!"
			);
		});

		test("throws an error if a change refers to a document which is not in loading state 'loaded'", () => {
			const documentGraph: DocumentGraph = {
				documents: {
					byDocRef: {
						doc1: {
							docRef: "doc1",
							loadingState: "loading"
						}
					}
				},
				links: {
					byId: {},
					linkIdsByDocId: {}
				}
			};

			const changeLog: DgChangeLog = {
				changeCounter: 0,
				changes: [
					{
						kind: "docChanged",
						docRef: "doc1"
					}
				]
			};

			expect(() => documentsWithMetaData(documentGraph, changeLog)).to.throw(
				"An added or changed document must be in loadingState 'loaded'."
			);
		});

		test("throws an error if a docChanged change is followed by a docAdded change for the same document", () => {
			const documentGraph: DocumentGraph = {
				documents: {
					byDocRef: {
						doc1: {
							docRef: "doc1",
							loadingState: "loaded",
							document: {},
							documentModelName: "doc"
						},
						doc2: {
							docRef: "doc2",
							loadingState: "loaded",
							document: {},
							documentModelName: "doc"
						}
					}
				},
				links: {
					byId: {},
					linkIdsByDocId: {}
				}
			};

			const changeLog: DgChangeLog = {
				changeCounter: 0,
				changes: [
					{
						kind: "docChanged",
						docRef: "doc1"
					},
					{
						kind: "docChanged",
						docRef: "doc2"
					},
					{
						kind: "docAdded",
						docRef: "doc1"
					}
				]
			};

			expect(() => documentsWithMetaData(documentGraph, changeLog)).to.throw(
				"Cannot handle 'docAdded' change for document [doc1] that was already used in earlier changes."
			);
		});
	});
});

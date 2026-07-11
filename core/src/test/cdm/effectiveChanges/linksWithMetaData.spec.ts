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

import type { Relationship as RelationshipServerApi } from "@com.mgmtp.a12.dataservices/dataservices-access";

import { linksWithMetaData } from "../../../internal/cdm/cdd/core/effectiveChanges/linksWithMetaData.js";
import type { Relationship as RelationshipClientApi } from "../../../internal/relationship/relationship.js";
import type { DgChangeLog, DocumentGraph, DgLinkInternal } from "../../../internal/documentGraph/core/index.js";

describe("com.mgmtp.a12.relationshipengine-core.extensions.cdm.documentGraph", () => {
	describe("linksWithMetaData", () => {
		test("returns all link-related changes of the document graph", () => {
			const documentGraph: DocumentGraph = {
				documents: {
					byDocRef: {}
				},
				links: {
					byId: {
						1: createDgLinkInternal("1", "rm1", "doc1", "doc2"),
						2: createDgLinkInternal("2", "rm1", "doc3", "doc4"),
						3: createDgLinkInternal("3", "rm1", "doc5", "doc6"),
						4: createDgLinkInternal("4", "rm1", "doc7", "doc8")
					},
					linkIdsByDocId: {
						doc1: ["1"],
						doc2: ["1"],
						doc3: ["2"],
						doc4: ["2"],
						doc5: ["3"],
						doc6: ["3"]
					}
				}
			};

			const changeLog: DgChangeLog = {
				changeCounter: 0,
				changes: [
					{
						kind: "linkAdded",
						linkId: "2"
					},
					{
						kind: "linkDocChanged",
						linkId: "3"
					},
					{
						kind: "linkDeleted",
						linkId: "4",
						linkRef: {
							id: "4",
							linkDescriptor: {
								relationshipModel: "rm1",
								entities: [
									{ role: "left", docRef: "doc7" },
									{ role: "right", docRef: "doc8" }
								]
							}
						}
					}
				]
			};

			const linkMutations = linksWithMetaData(documentGraph, changeLog);
			const linkMutationsWithoutTime: RelationshipClientApi.LinkWithMutationMetadata[] = linkMutations.map((lm) => {
				return {
					link: lm.link,
					modified: lm.modified,
					mutationState: lm.mutationState,
					relinked: lm.relinked
				};
			});

			expect(linkMutationsWithoutTime).to.include.deep.members([
				{
					link: {
						linkRef: createLinkRef("2", "rm1", "doc3", "doc4"),
						document: {}
					},
					modified: false,
					mutationState: "added",
					relinked: false
				},
				{
					link: {
						linkRef: createLinkRef("3", "rm1", "doc5", "doc6"),
						document: {}
					},
					modified: true,
					mutationState: "existing",
					relinked: false
				},
				{
					link: {
						linkRef: createLinkRef("4", "rm1", "doc7", "doc8"),
						document: {}
					},
					modified: false,
					mutationState: "removed",
					relinked: false
				}
			]);
		});

		test("throws an error if there are two LinkAdded changes for the same link", () => {
			const changeLog: DgChangeLog = {
				changeCounter: 0,
				changes: [
					{
						kind: "linkAdded",
						linkId: "1"
					},
					{
						kind: "linkAdded",
						linkId: "1"
					}
				]
			};

			expect(() => linksWithMetaData(emptyDG(), changeLog)).to.throw();
		});

		test("throws an error if there is LinkAdded change for an existing link", () => {
			const changeLog: DgChangeLog = {
				changeCounter: 0,
				changes: [
					{
						kind: "linkDocChanged",
						linkId: "1"
					},
					{
						kind: "linkAdded",
						linkId: "1"
					}
				]
			};

			expect(() => linksWithMetaData(emptyDG(), changeLog)).to.throw();
		});

		test("throws an error if there is LinkDeleted change for an already removed link", () => {
			const changeLog: DgChangeLog = {
				changeCounter: 0,
				changes: [
					{
						kind: "linkDeleted",
						linkId: "1",
						linkRef: {
							id: "1",
							linkDescriptor: {
								relationshipModel: "rm1",
								entities: [
									{ role: "left", docRef: "doc1" },
									{ role: "right", docRef: "doc2" }
								]
							}
						}
					},
					{
						kind: "linkDeleted",
						linkId: "1",
						linkRef: {
							id: "1",
							linkDescriptor: {
								relationshipModel: "rm1",
								entities: [
									{ role: "left", docRef: "doc1" },
									{ role: "right", docRef: "doc2" }
								]
							}
						}
					}
				]
			};

			expect(() => linksWithMetaData(emptyDG(), changeLog)).to.throw();
		});

		test("throws an error if there is LinkDeleted change for a withdrawn link", () => {
			const changeLog: DgChangeLog = {
				changeCounter: 0,
				changes: [
					{
						kind: "linkAdded",
						linkId: "1"
					},
					{
						kind: "linkDeleted",
						linkId: "1",
						linkRef: {
							id: "1",
							linkDescriptor: {
								relationshipModel: "rm1",
								entities: [
									{ role: "left", docRef: "doc1" },
									{ role: "right", docRef: "doc2" }
								]
							}
						}
					},
					{
						kind: "linkDeleted",
						linkId: "1",
						linkRef: {
							id: "1",
							linkDescriptor: {
								relationshipModel: "rm1",
								entities: [
									{ role: "left", docRef: "doc1" },
									{ role: "right", docRef: "doc2" }
								]
							}
						}
					}
				]
			};

			expect(() => linksWithMetaData(emptyDG(), changeLog)).to.throw();
		});

		test("throws an error if there is LinkDocChanged change for a withdrawn link", () => {
			const changeLog: DgChangeLog = {
				changeCounter: 0,
				changes: [
					{
						kind: "linkAdded",
						linkId: "1"
					},
					{
						kind: "linkDeleted",
						linkId: "1",
						linkRef: {
							id: "1",
							linkDescriptor: {
								relationshipModel: "rm1",
								entities: [
									{ role: "left", docRef: "doc1" },
									{ role: "right", docRef: "doc1" }
								]
							}
						}
					},
					{
						kind: "linkDocChanged",
						linkId: "1"
					}
				]
			};

			expect(() => linksWithMetaData(emptyDG(), changeLog)).to.throw();
		});

		test("throws an error if there is LinkDocChanged change for a removed link", () => {
			const changeLog: DgChangeLog = {
				changeCounter: 0,
				changes: [
					{
						kind: "linkDeleted",
						linkId: "1",
						linkRef: {
							id: "1",
							linkDescriptor: {
								relationshipModel: "rm1",
								entities: [
									{ role: "left", docRef: "doc1" },
									{ role: "right", docRef: "doc2" }
								]
							}
						}
					},
					{
						kind: "linkDocChanged",
						linkId: "1"
					}
				]
			};

			expect(() => linksWithMetaData(emptyDG(), changeLog)).to.throw();
		});
	});
});

function emptyDG(): DocumentGraph {
	return {
		documents: {
			byDocRef: {}
		},
		links: {
			byId: {},
			linkIdsByDocId: {}
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

function createLinkRef(
	id: string,
	relationshipModel: string,
	leftDoc: string,
	rightDoc: string
): RelationshipServerApi.LinkRef {
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

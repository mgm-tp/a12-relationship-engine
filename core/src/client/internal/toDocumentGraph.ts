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

import { select, type SagaGenerator } from "typed-redux-saga";

import { Model, ModelSelectors } from "@com.mgmtp.a12.client/client-core";
import type { DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import type { DocumentSpec, QueryJsonRpc2Response } from "@com.mgmtp.a12.dataservices/dataservices-access";

import { DocumentGraph } from "../../store/index.js";

import { DocumentProcessors } from "./documentProcessor.js";
import { getLink, isValidLink, getDocumentModelOfSuperType } from "./utils.js";

/**
 * The document graph returned by the server contains all documents and links
 * as two plain lists.
 *
 * To make later lookups easier we transform them into objects here,
 * mapping ids to their respective document/link.
 *
 * @internal
 */
export function* toDocumentGraph(
	cdmName: string,
	response: QueryJsonRpc2Response.DocumentGraphProjection
): SagaGenerator<DocumentGraph> {
	for (const link of response.result.links) {
		if (link.type === "CHILD" && !isValidLink(link)) {
			throw new Error(`Invalid link object in response ${JSON.stringify(link)}`);
		}
	}

	const documents: DocumentSpec[] = response.result.links.map((item) => {
		return {
			document: item.document,
			docRef: item.docRef,
			documentModelName: item.documentModelName
		};
	});
	// @ts-expect-error DocumentEntry can not be undefined
	documents.push(...response.result.entries);

	const links = convertToDocumentGraphLinkList(response.result.links);
	const modelProvider = yield* buildModelProvider();

	return {
		documents: {
			byDocRef: documentsByRef(cdmName, documents, modelProvider)
		},
		links: {
			byId: linksById(links),
			linkIdsByDocId: linkIdsByDocId(links)
		},
		changelogIndex: 0
	};
}

export function* mergeDocumentGraph(
	base: DocumentGraph,
	incomingResponse: QueryJsonRpc2Response.DocumentGraphProjection
): SagaGenerator<DocumentGraph> {
	// Collect incoming doc specs (skip root doc creation, we'll reuse base's root)
	const incomingDocSpecs: DocumentSpec[] = [];

	for (const link of incomingResponse.result.links) {
		if (link.document && link.docRef && link.documentModelName) {
			incomingDocSpecs.push({
				document: link.document,
				docRef: link.docRef,
				documentModelName: link.documentModelName
			});
		}
	}

	// @ts-expect-error DocumentEntry can not be undefined
	incomingDocSpecs.push(...incomingResponse.result.entries);

	// Pass undefined as first arg to skip root doc creation (we only want to merge into existing root)
	const modelProvider = yield* buildModelProvider();
	const incomingDocs = documentsByRef(undefined, incomingDocSpecs, modelProvider);
	const mergedDocs: Record<string, DocumentGraph.Document> = { ...base.documents.byDocRef };

	for (const [docRef, doc] of Object.entries(incomingDocs)) {
		if (docRef === DocumentGraph.ROOT_DOC_REF) {
			continue; // never override synthetic root
		}

		mergedDocs[docRef] = doc; // always take fresh snapshot
	}

	// 4. Merge links using incoming CHILD links.
	const incomingLinks = convertToDocumentGraphLinkList(incomingResponse.result.links);
	const mergedLinksById: DocumentGraph.LinksById = { ...base.links.byId };

	for (const link of incomingLinks) {
		const linkId = link.linkRef.id;

		if (!mergedLinksById[linkId]) {
			mergedLinksById[linkId] = link;

			continue;
		}

		// Update descriptor/linkDocRef while keeping insertion order
		const existing = mergedLinksById[linkId];
		mergedLinksById[linkId] = {
			linkRef: link.linkRef,
			linkDocRef: link.linkDocRef ?? existing.linkDocRef
		};
	}

	// 5. Recompute linkIdsByDocId for merged set
	const linkIdsByDocIdMerged: { [docId: string]: string[] | undefined } = {};

	for (const link of Object.values(mergedLinksById)) {
		const [e1, e2] = link.linkRef.linkDescriptor.entities;

		if (e1.docRef) {
			linkIdsByDocIdMerged[e1.docRef] = (linkIdsByDocIdMerged[e1.docRef] ?? []).concat(link.linkRef.id);
		}

		if (e2.docRef) {
			linkIdsByDocIdMerged[e2.docRef] = (linkIdsByDocIdMerged[e2.docRef] ?? []).concat(link.linkRef.id);
		}
	}

	return {
		documents: { byDocRef: mergedDocs },
		links: { byId: mergedLinksById, linkIdsByDocId: linkIdsByDocIdMerged },
		changelogIndex: base.changelogIndex + 1
	};
}

/**
 * Converts server documents to a mapping of docRef to (post-processed) document
 */
/**
 * Builds a `modelProvider` function for saga contexts by selecting models from Redux state.
 * Use this to create the `modelProvider` argument for {@link documentsByRef} inside sagas.
 *
 * @internal
 */
export function* buildModelProvider(): SagaGenerator<(id: string) => DocumentModel | undefined> {
	const modelGraph = yield* select(ModelSelectors.modelGraph());
	const state = yield* select();
	const selectModel = (id: string) => ModelSelectors.modelByName(id, Model.isDocumentModel)(state);

	return (id: string) => selectModel(id) ?? getDocumentModelOfSuperType(selectModel, modelGraph, id);
}

export function documentsByRef(
	rootCdmName: string | undefined,
	serverDocuments: DocumentSpec[],
	modelProvider: (id: string) => DocumentModel | undefined
): Record<string, DocumentGraph.Document> {
	const initialDgDocs: Record<string, DocumentGraph.Document> = rootCdmName
		? {
				[DocumentGraph.ROOT_DOC_REF]: {
					docRef: DocumentGraph.ROOT_DOC_REF,
					document: {},
					documentModelName: rootCdmName,
					loadingState: "loaded"
				}
			}
		: {};

	return serverDocuments.reduce((acc, documentSpec) => {
		const documentModel = modelProvider(documentSpec.documentModelName);

		if (!documentModel) {
			throw new Error(`Expected document model '${documentSpec.documentModelName}' to be loaded.`);
		}

		return {
			...acc,
			[documentSpec.docRef]: {
				...documentSpec,
				document: DocumentProcessors.postLoad(documentSpec.document, documentModel),
				loadingState: "loaded" as const
			} satisfies DocumentGraph.Document
		};
	}, initialDgDocs);
}

/**
 * Converts list links to a mapping of linkId to link
 */
function linksById(links: DocumentGraph.Link[]): DocumentGraph.LinksById {
	return links.reduce((linkIdMap, currentLink) => {
		return { ...linkIdMap, [currentLink.linkRef.id]: currentLink };
	}, {});
}

/**
 * Converts list links to a mapping of docRef to linkIds.
 */
function linkIdsByDocId(links: DocumentGraph.Link[]): DocumentGraph.Links["linkIdsByDocId"] {
	return links.reduce<DocumentGraph.Links["linkIdsByDocId"]>((linkIdByDocIdMap, currentLink) => {
		const { linkRef } = currentLink;
		const docRef1 = linkRef.linkDescriptor.entities[0].docRef;
		const docRef2 = linkRef.linkDescriptor.entities[1].docRef;

		if (!docRef1 || !docRef2) {
			throw new Error("Expected docRef for both entities of link!");
		}

		return {
			...linkIdByDocIdMap,
			[docRef1]: (linkIdByDocIdMap[docRef1] ?? []).concat(linkRef.id),
			[docRef2]: (linkIdByDocIdMap[docRef2] ?? []).concat(linkRef.id)
		};
	}, {});
}

export function convertToDocumentGraphLinkList(allLinks: QueryJsonRpc2Response.Link[]): DocumentGraph.Link[] {
	const childLinks = allLinks.filter((item) => item.type === "CHILD");

	return childLinks.map((item) => {
		return {
			linkRef: {
				id: item.linkId,
				linkDescriptor: {
					relationshipModel: item.relationshipModel,
					// modelName can be found in the respective dg document already
					entities: [
						{
							role: item.sourceRole,
							docRef: item.sourceDocRef
						},
						{
							role: item.targetRole,
							docRef: item.targetDocRef
						}
					]
				}
			},
			linkDocRef: getLink(allLinks, item.linkId)?.docRef
		};
	});
}

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

/**
 * @packageDocumentation
 * @experimental
 */

import { select, type SagaGenerator } from "typed-redux-saga";

import { Model, ModelSelectors } from "@com.mgmtp.a12.client/client-core";
import type { GroupInstance } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import type { DocumentSpec, QueryJsonRpc2Response } from "@com.mgmtp.a12.dataservices/dataservices-access";

import { assertObject } from "../../shared/assertion.js";
import { CDD_DOC_REF } from "../cdmCommons/cddTechnical.js";
import { DocumentProcessors } from "../../relationship/shared.js";
import { getLink } from "../../relationship/platform/relationshipDataProvider/server/utils.js";
import { getDocumentModelOfSuperType } from "../../relationship/platform/getDocumentModelOfSuperType.js";
import type {
	DgDocs,
	DgLinks,
	DgLinksById,
	DeepReadonly,
	DocumentGraph,
	DgLinkInternal
} from "../../documentGraph/core/index.js";

let counterForDifferentiation = 0;

/**
 * The document graph returned by the server contains all documents and links
 * as two plain lists.
 *
 * To make later lookups easier we transform them into objects here,
 * mapping ids to their respective document/link.
 *
 * @internal
 */
export function* convertToInternalRepresentation(
	cdmName: string,
	documents: DocumentSpec[],
	serverLinks: QueryJsonRpc2Response.Link[]
): SagaGenerator<DeepReadonly<DocumentGraph>> {
	const links = convertToDgLinkInternalList(serverLinks);

	return {
		documents: {
			byDocRef: yield* documentsByRef(cdmName, documents)
		},
		links: {
			byId: linksById(links),
			linkIdsByDocId: linkIdsByDocId(links)
		}
	};
}

/**
 * Converts server documents to a mapping of docRef to (post-processed) document
 */
function* documentsByRef(cdmName: string, serverDocuments: DocumentSpec[]): SagaGenerator<DgDocs["byDocRef"]> {
	const modelGraph = yield* select(ModelSelectors.modelGraph());

	const state = yield* select();

	const modelProvider = (id: string) => ModelSelectors.modelByName(id, Model.isDocumentModel)(state);

	// first document always exists to store all fields that are only part of the CDM
	const initialDgDocs = {
		[CDD_DOC_REF]: {
			docRef: CDD_DOC_REF,
			document: {},
			documentModelName: cdmName,
			loadingState: "loaded"
		}
	} as DgDocs["byDocRef"];

	return serverDocuments.reduce((acc, documentSpec) => {
		// for overviews that reference an abstract supertype, subtype dms might not be loaded yet
		const documentModel =
			modelProvider(documentSpec.documentModelName) ??
			getDocumentModelOfSuperType(modelProvider, modelGraph, documentSpec.documentModelName);
		assertObject(documentModel, `Expected document model '${documentSpec.documentModelName}' to be loaded.`);

		return {
			...acc,
			[documentSpec.docRef]: {
				...documentSpec,
				document: DocumentProcessors.postLoad(documentSpec.document, documentModel) as GroupInstance,
				loadingState: "loaded" as const
			}
		};
	}, initialDgDocs);
}

/**
 * Converts list links to a mapping of linkId to link
 */
function linksById(links: DgLinkInternal[]): DgLinksById {
	return links.reduce((linkIdMap, currentLink) => {
		return { ...linkIdMap, [currentLink.linkRef.id]: currentLink };
	}, {});
}

/**
 * Converts list links to a mapping of docRef to linkIds.
 */
function linkIdsByDocId(links: DgLinkInternal[]): DgLinks["linkIdsByDocId"] {
	return links.reduce<DgLinks["linkIdsByDocId"]>((linkIdByDocIdMap, currentLink) => {
		const { linkRef } = currentLink;
		const docRef1 = linkRef.linkDescriptor.entities[0].docRef;
		assertObject(docRef1, "Expected docRef for first entity of link!");
		const docRef2 = linkRef.linkDescriptor.entities[1].docRef;
		assertObject(docRef2, "Expected docRef for second entity of link!");

		return {
			...linkIdByDocIdMap,
			[docRef1]: (linkIdByDocIdMap[docRef1] ?? []).concat(linkRef.id),
			[docRef2]: (linkIdByDocIdMap[docRef2] ?? []).concat(linkRef.id)
		};
	}, {});
}

function convertToDgLinkInternalList(allLinks: QueryJsonRpc2Response.Link[]): DgLinkInternal[] {
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
			/*
             * Added to allow sorting of links

             * To avoid multiple links having the same rank (timestamp), an
             * additional counter is added
             *
             * The counter should usually be much smaller than the timestamp
             * and thus should not influence the order as given by the
             * timestamps alone.
             */
			rank: Date.now() + counterForDifferentiation++,
			linkDocRef: getLink(allLinks, item.linkId)?.docRef
		};
	});
}

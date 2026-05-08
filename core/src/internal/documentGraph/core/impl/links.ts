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
 * @module documentGraph/core
 * @experimental
 */
import { type Relationship as RelationshipServerApi } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { type GroupInstance } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";

import { assertObject } from "../../../shared/assertion.js";

import { type LinkAdded, type LinkDeleted, type LinkDocChanged } from "../changeLog/changeLog.js";
import { type DgDocument, type DgLinkInternal, type DgLinks, type DocumentGraph } from "../documentGraph.js";
import { type DgChange } from "../slices.js";
import { type DeepReadonly, type DocRef } from "../utilityTypes.js";

import { mergeInto } from "./dg.js";

/**
 * placeholder for documentModelName of new link documents.
 * Will be overwritten by server.
 */
const LINK_DOC_PLACEHOLDER = "";

const LINKDOC_DOC_REF_SUFFIX = "____link_doc";

let addedLinkIndex = 0;

/**
 * Only used internally to achieve independent test results.
 * @internal
 */
export function resetAddedLinkIndexForTesting(): void {
	addedLinkIndex = 0;
}

export function addLink(
	linkDescriptor: DeepReadonly<RelationshipServerApi.LinkDescriptor>,
	linkDoc: DeepReadonly<GroupInstance> | undefined,
	dg: DeepReadonly<DocumentGraph>
): [DeepReadonly<DocumentGraph>, DgChange[]] {
	const linkRef = makeLinkRef();

	return mergeLink(linkRef, linkDoc, dg);

	function makeLinkRef(): RelationshipServerApi.LinkRef {
		return {
			linkDescriptor: linkDescriptor as RelationshipServerApi.LinkDescriptor,
			id: generateNewLinkId(linkDescriptor.relationshipModel)
		};
	}
	function generateNewLinkId(relshName: string): string {
		// logic taken vom extensions/relationship/internal/reducers/addLink.ts
		return relshName + "_NEW_" + ++addedLinkIndex;
	}
}

let counterForDifferentiation = 0;

function mergeLink(
	linkRef: RelationshipServerApi.LinkRef,
	linkDoc: DeepReadonly<GroupInstance> | undefined,
	dg: DeepReadonly<DocumentGraph>
): [DeepReadonly<DocumentGraph>, DgChange[]] {
	const docRef1 = linkRef.linkDescriptor.entities[0].docRef;
	assertObject(docRef1);
	const docRef2 = linkRef.linkDescriptor.entities[1].docRef;
	assertObject(docRef2);

	const linkDocRef = linkDoc ? generateLinkDocDocRef(linkRef.id) : undefined;

	const documents = {
		byDocRef: {
			[docRef1]: makeMissingTargetDgDocument(docRef1),
			[docRef2]: makeMissingTargetDgDocument(docRef2),
			...(linkDocRef
				? {
						[linkDocRef]: {
							docRef: linkDocRef,
							document: linkDoc,
							documentModelName: LINK_DOC_PLACEHOLDER,
							loadingState: "loaded"
						} as DgDocument
					}
				: {})
			// No need to include [sourceDocRef], since mergeDgs can handle this case!
		}
	};

	const links: DgLinks = {
		byId: {
			[linkRef.id]: {
				linkRef,
				linkDocRef,
				/*
				 * Note: The extra counter is used to avoid having the same
				 * time stamp for multiple links in case they are loaded
				 * together and added shortly one after the other.
				 *
				 * The counter should usually be much smaller than the timestamp
				 * and thus should not influence the order as given by the
				 * timestamps alone.
				 */
				rank: Date.now() + counterForDifferentiation++
			}
		},
		linkIdsByDocId: {
			[docRef1]: [linkRef.id],
			[docRef2]: [linkRef.id]
		}
	};

	const partialDg: DocumentGraph = { documents, links };
	const [newDg /* drop changes */] = mergeInto({ dg, partialDg });
	const change: LinkAdded = {
		kind: "linkAdded",
		linkId: linkRef.id
	};
	return [newDg, [change]];

	function makeMissingTargetDgDocument(docRef: DocRef): DgDocument {
		return {
			docRef,
			loadingState: "missing"
		};
	}
}

export function removeLink(
	linkRef: RelationshipServerApi.LinkRef,
	dg: DeepReadonly<DocumentGraph>
): [DeepReadonly<DocumentGraph>, DgChange[]] {
	// Update links.linkIdsByDocId
	const docIds: DocRef[] = linkRef.linkDescriptor.entities.map((e) => e.docRef ?? "");
	const linkIdsByDocId = { ...dg.links.linkIdsByDocId };
	docIds.forEach((docId) => {
		linkIdsByDocId[docId] = linkIdsByDocId[docId]?.filter((linkId) => linkId !== linkRef.id);
	});
	const { linkDocRef } = dg.links.byId[linkRef.id];

	// Update links.byId
	const byId = { ...dg.links.byId };
	// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
	delete byId[linkRef.id];

	// Update documents.byDocRef
	const byDocRef = { ...dg.documents.byDocRef };
	if (linkDocRef) {
		// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
		delete byDocRef[linkDocRef];
	}

	const newDg: DeepReadonly<DocumentGraph> = {
		documents: {
			byDocRef
		},
		links: {
			byId,
			linkIdsByDocId
		}
	};
	const change: LinkDeleted = {
		kind: "linkDeleted",
		linkId: linkRef.id,
		linkRef
	};
	return [newDg, [change]];
}

export function modifyLink(
	linkDocument: DeepReadonly<GroupInstance>,
	linkId: string,
	dg: DeepReadonly<DocumentGraph>
): [DeepReadonly<DocumentGraph>, DgChange[]] {
	const dgLink = dg.links.byId[linkId];

	// if no linkDocRef yet, the linkDoc is "new"
	const linkDocRef = dgLink.linkDocRef ?? generateLinkDocDocRef(linkId);

	const byId = {
		...dg.links.byId,
		[linkId]: {
			...dgLink,
			linkDocRef
		}
	};

	// Update documents.byDocRef
	const byDocRef = {
		...dg.documents.byDocRef,
		[linkDocRef]: {
			docRef: linkDocRef,
			document: linkDocument,
			documentModelName: LINK_DOC_PLACEHOLDER,
			loadingState: "loaded" as const
		}
	};

	const newDg: DeepReadonly<DocumentGraph> = {
		documents: {
			byDocRef
		},
		links: {
			byId,
			linkIdsByDocId: dg.links.linkIdsByDocId
		}
	};
	const change: LinkDocChanged = {
		kind: "linkDocChanged",
		linkId
	};
	return [newDg, [change]];
}

export function extractLinkDocument(
	{ linkDocRef }: DeepReadonly<DgLinkInternal>,
	dg: DeepReadonly<DocumentGraph>
): GroupInstance | undefined {
	const linkDgDoc = linkDocRef ? dg.documents.byDocRef[linkDocRef] : undefined;

	return linkDgDoc?.loadingState === "loaded" ? linkDgDoc.document : undefined;
}

/** @internal */
export function generateLinkDocDocRef(linkId: string): string {
	return `${linkId}${LINKDOC_DOC_REF_SUFFIX}`;
}

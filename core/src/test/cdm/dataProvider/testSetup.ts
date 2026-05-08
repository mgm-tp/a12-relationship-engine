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

import { type Action } from "typescript-fsa";

import { type DataProvider } from "@com.mgmtp.a12.client/client-core";
import { type Relationship } from "@com.mgmtp.a12.dataservices/dataservices-access";

import { type LinkWithMutationMetadataAndTime } from "../../../internal/cdm/cdd/core/effectiveChanges/linksWithMetaData.js";
import {
	type DgDocs,
	type DgDocument,
	type DgLinks,
	type DocumentGraph,
	generateLinkDocDocRef
} from "../../../internal/documentGraph/core/index.js";
import { type Relationship as RelationshipClientApi } from "../../../internal/relationship/relationship.js";
import { createLinkRef } from "../../mocks/relationships/mocks.js";
import { createDataHolder } from "../../utils/activity.js";

export function setupDG(
	docRefs: string[],
	linkRefs: Relationship.LinkRef[],
	linkDocForLinks?: string[]
): DocumentGraph {
	const documents: DgDocs = {
		byDocRef: {}
	};
	docRefs.forEach((docRef) => {
		documents.byDocRef[docRef] = {
			docRef,
			document: {},
			loadingState: "loaded",
			documentModelName: ""
		};
	});
	if (linkDocForLinks) {
		linkDocForLinks.forEach((linkId) => {
			const linkDocRef = generateLinkDocDocRef(linkId);
			documents.byDocRef[linkDocRef] = {
				docRef: linkDocRef,
				document: {},
				loadingState: "loaded",
				documentModelName: ""
			};
		});
	}

	const links: DgLinks = {
		byId: {},
		linkIdsByDocId: {}
	};
	linkRefs.forEach((linkRef) => {
		links.byId[linkRef.id] = {
			linkRef,
			linkDocRef: linkDocForLinks?.includes(linkRef.id) ? generateLinkDocDocRef(linkRef.id) : undefined, // or null
			rank: 0
		};
		linkRef.linkDescriptor.entities.forEach((entity) => {
			const { docRef } = entity;
			if (docRef === null) {
				throw new Error("No entity found");
			}
			if (!links.linkIdsByDocId[docRef]) {
				links.linkIdsByDocId[docRef] = [];
			}
			links.linkIdsByDocId[docRef]?.push(linkRef.id);
		});
	});

	return { documents, links };
}

export function createLinkMutation(
	mutationState: RelationshipClientApi.LinkMutationState,
	linkId: string,
	relationshipModel: string,
	leftDocRef: string,
	leftRole: string,
	rightDocRef: string,
	rightRole: string,
	linkDoc?: RelationshipClientApi.LinkWithDocument["document"]
): LinkWithMutationMetadataAndTime {
	return {
		link: {
			linkRef: createLinkRef({
				id: linkId,
				docRef1: leftDocRef,
				role1: leftRole,
				docRef2: rightDocRef,
				role2: rightRole,
				relationshipModel
			}),
			document: linkDoc ?? {}
		},
		modified: mutationState === "existing" && linkDoc !== undefined,
		mutationState,
		relinked: false,
		time: parseInt(linkId, 10)
	};
}

export function createMockSaveConfig({
	activityId,
	dataHolders,
	details
}: Partial<DataProvider.SaveConfig> = {}): DataProvider.SaveConfig {
	return {
		dataHolders: dataHolders ?? [createDataHolder()],
		activityId: activityId ?? "1",
		operation: "save",
		details: details ?? mockSaveDetails()
	};
}

export function mockSaveDoneAction(payload: object): Action<object> {
	return { type: "mockSaveDone", payload };
}

function mockSaveDetails(): DataProvider.SaveDataActionPayload {
	return {
		saving: {
			done(result) {
				return mockSaveDoneAction(result);
			},
			failed(error) {
				return { type: "mockSaveFailed", payload: error };
			}
		},
		updateActivityData: false
	};
}

export function createMockDg(docs: DgDocument[] = []): DocumentGraph {
	return {
		documents: {
			byDocRef: docs.reduce(
				(acc, doc) => {
					acc[doc.docRef] = doc;
					return acc;
				},
				{} as DgDocs["byDocRef"]
			)
		},
		links: {
			byId: {},
			linkIdsByDocId: {}
		}
	};
}

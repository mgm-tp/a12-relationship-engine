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

import { call, select, type SagaGenerator } from "typed-redux-saga";

import { Dispatcher } from "@com.mgmtp.a12.dataservices/dataservices-access";
import type { Relationship as RelationshipServerApi } from "@com.mgmtp.a12.dataservices/dataservices-access";

import { A12InternalConstants } from "../../constants.js";
import type { Changelog } from "../../../../store/index.js";
import { isDraftingDocRef } from "../../../../store/index.js";
import type { RequestSelectorMap as RERequestSelectorMap } from "../../requestSelectorMap.js";

import type { SaveRequest, DocRefPlaceholders } from "./types.js";
import { getDocument, getLinkDocument } from "./documentResolvers.js";

export function collectChangedDocRefs(effectiveChanges: readonly Changelog.Change[]): string[] {
	const docRefs = new Set<string>();

	for (const change of effectiveChanges) {
		if (change.kind === "docChanged") {
			docRefs.add(change.docRef);
		}
	}

	return [...docRefs];
}

export function* buildDocumentRequests(
	activityId: string,
	effectiveChanges: readonly Changelog.Change[],
	locale: { language: string },
	requestSelectorMap: RERequestSelectorMap
): SagaGenerator<{ requests: SaveRequest[]; docRefPlaceholders: DocRefPlaceholders }> {
	const requests: SaveRequest[] = [];
	const docRefPlaceholders: DocRefPlaceholders = {};
	const changedDocumentReferences = collectChangedDocRefs(effectiveChanges);

	for (const docRef of changedDocumentReferences) {
		const [document, documentModelName] = yield* call(getDocument, activityId, docRef);

		if (isDraftingDocRef(docRef)) {
			const requestId = toAddDocumentRequestId(docRef);
			docRefPlaceholders[docRef] = requestId;
			requests.push(
				yield* select(
					requestSelectorMap.addDocument({ activityId, id: requestId, modelId: documentModelName, document })
				)
			);
		} else {
			requests.push(
				yield* select(requestSelectorMap.modifyDocument({ activityId, id: `modify_${docRef}`, docRef, document }))
			);
		}
	}

	const addedDocuments = effectiveChanges.filter((change): change is Changelog.DocAdded => change.kind === "docAdded");

	for (const addedDocument of addedDocuments) {
		const [document, documentModelName] = yield* call(getDocument, activityId, addedDocument.docRef);
		const requestId = toAddDocumentRequestId(addedDocument.docRef);
		docRefPlaceholders[addedDocument.docRef] = requestId;
		requests.push(
			yield* select(requestSelectorMap.addDocument({ activityId, id: requestId, modelId: documentModelName, document }))
		);
	}

	// docRemoved is not supported by CDM operation therefore skipped here.

	return { requests, docRefPlaceholders };
}

export function* buildLinkRequests(
	activityId: string,
	effectiveChanges: Changelog.Change[],
	docRefPlaceholders: DocRefPlaceholders,
	requestSelectorMap: RERequestSelectorMap
): SagaGenerator<SaveRequest[]> {
	const requests: SaveRequest[] = [];

	for (const change of effectiveChanges) {
		if (change.kind === "linkAdded") {
			const preparedLinkDocument = yield* call(getLinkDocument, activityId, change);
			const linkRef = replaceNewDocRefsWithSpEL(change.linkRef, docRefPlaceholders);
			requests.push(
				yield* select(
					requestSelectorMap.addLink({ activityId, id: linkRef.id, linkRef, linkDocument: preparedLinkDocument })
				)
			);
		} else if (change.kind === "linkDeleted") {
			requests.push(
				yield* select(requestSelectorMap.deleteLink({ activityId, id: change.linkRef.id, linkRef: change.linkRef }))
			);
		} else if (change.kind === "linkDocChanged") {
			const preparedLinkDocument = yield* call(getLinkDocument, activityId, change);
			requests.push(
				yield* select(
					requestSelectorMap.modifyLink({
						activityId,
						id: change.linkRef.id,
						linkRef: change.linkRef,
						linkDocument: preparedLinkDocument
					})
				)
			);
		}
	}

	return requests;
}

export function* dispatchSaveRequests(language: string, requests: SaveRequest[]): SagaGenerator<unknown[]> {
	return yield* call(() => Dispatcher.rpc(language, requests));
}

export function toAddDocumentRequestId(docRef: string): string {
	return `${A12InternalConstants.ADD_DOC_OPERATION}${docRef.replace(/[_-]/g, "")}`;
}

export function replaceNewDocRefsWithSpEL(
	linkRef: RelationshipServerApi.LinkRef,
	docRefPlaceholders: DocRefPlaceholders
): RelationshipServerApi.LinkRef {
	return {
		...linkRef,
		linkDescriptor: {
			...linkRef.linkDescriptor,
			entities: linkRef.linkDescriptor.entities.map((entity) => {
				const placeholder = entity.docRef ? docRefPlaceholders[entity.docRef] : undefined;

				return placeholder
					? { ...entity, docRef: `#{#${placeholder}.${A12InternalConstants.LINK_ENTITY_DOC_REF_SPEC}}` }
					: entity;
			})
		}
	};
}

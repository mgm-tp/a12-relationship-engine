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

import type { Middleware, MiddlewareAPI } from "redux";

import type { EntityInstancePath } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import type { Attachment } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { Events, FormEngineActions } from "@com.mgmtp.a12.formengine/formengine-core";
import { Model, ModelSelectors as ClientModelSelectors } from "@com.mgmtp.a12.client/client-core";

import type { Changelog } from "../state.js";
import { LinkSelectors } from "../selectors/link.js";
import { RelationshipEngineActions } from "../actions.js";
import { DocumentUtils } from "../utils/documentUtils.js";
import { ChangelogSelectors } from "../selectors/changelog.js";
import { DataHolderSelectors } from "../selectors/dataHolder.js";
import { DocumentGraphSelectors } from "../selectors/documentGraph.js";

import { dispatchScdmIfCdm } from "./changeHelpers.js";

/** @internal Middleware that captures attachment value changes into the changelog for CDM activities. */
export const onAttachmentValueChangedMiddleware: Middleware = (store) => (next) => (action) => {
	const result = next(action);

	if (!FormEngineActions.event.match(action)) {
		return result;
	}

	const { activityId, engineEvent } = action.payload;
	const state = store.getState();

	if (Events.attachmentValueChange.match(engineEvent)) {
		handleAttachmentValueChange(activityId, engineEvent.payload, state, store);
	} else if (Events.Repeat.multiFileUpload.match(engineEvent)) {
		handleMultiFileUpload(activityId, engineEvent.payload, state, store);
	} else {
		return result;
	}

	return result;
};

function handleAttachmentValueChange(
	activityId: string,
	payload: Events.AttachmentValueChange,
	state: object,
	store: MiddlewareAPI
): void {
	if (!ChangelogSelectors.changelog(activityId)(state)) {
		return;
	}

	const docRefResult = DataHolderSelectors.documentDescriptor(activityId, payload.path)(state);

	if (!docRefResult) {
		return;
	}

	const { documentId, documentModelName, document } = docRefResult;

	const updatedDoc = applyAttachmentToDoc(document, payload.path, payload.value, documentModelName, state);
	const linkResult = LinkSelectors.findByDocRef(activityId, documentId)(state);

	if (linkResult) {
		store.dispatch(
			RelationshipEngineActions.Commands.addChangeLog({
				activityId,
				change: {
					kind: "linkDocChanged",
					linkId: linkResult.linkId,
					linkRef: linkResult.linkRef,
					documentModelName,
					linkDocument: updatedDoc
				}
			})
		);
	} else {
		store.dispatch(
			RelationshipEngineActions.Commands.addChangeLog({
				activityId,
				change: {
					kind: "docChanged",
					docRef: documentId,
					documentModelName,
					document: updatedDoc
				}
			})
		);
	}

	dispatchScdmIfCdm(activityId, state, store);
}

function handleMultiFileUpload(
	activityId: string,
	payload: Events.Repeat.MultiFileUploadPayload,
	state: object,
	store: MiddlewareAPI
): void {
	if (!ChangelogSelectors.changelog(activityId)(state)) {
		return;
	}

	const changes: Changelog.Change[] = [];

	for (const { path: itemPath, value: itemAttachment } of payload.toBeReplaced ?? []) {
		const docRefResult = DataHolderSelectors.documentDescriptor(activityId, itemPath)(state);

		if (!docRefResult) {
			continue;
		}

		const { documentId, documentModelName } = docRefResult;
		const currentDoc = DocumentGraphSelectors.documentByRef(activityId, documentId)(state);

		if (!currentDoc) {
			continue;
		}

		const updatedDoc = applyAttachmentToDoc(currentDoc, payload.path, itemAttachment, documentModelName, state);
		const linkResult = LinkSelectors.findByDocRef(activityId, documentId)(state);

		if (linkResult) {
			changes.push({
				kind: "linkDocChanged",
				linkId: linkResult.linkId,
				linkRef: linkResult.linkRef,
				documentModelName,
				linkDocument: updatedDoc
			});
		} else {
			changes.push({
				kind: "docChanged",
				docRef: documentId,
				documentModelName,
				document: updatedDoc
			});
		}
	}

	if (changes.length > 0) {
		store.dispatch(RelationshipEngineActions.Commands.addChangeLogs({ activityId, changes }));
		dispatchScdmIfCdm(activityId, state, store);
	}

	if (payload.toBeAdded.length > 0) {
		// toBeAdded entries in multiFileUpload are not yet supported;
		// attachments added via multi-file upload are not captured in the changelog and may be lost after SCDM recomputation.
	}
}

/**
 * @internal Applies each field of an Attachment value to the document body using DocumentUtils.setField.
 */
export function applyAttachmentToDoc(
	currentDoc: object,
	targetPath: EntityInstancePath,
	value: Attachment,
	documentModelName: string,
	state: object
): object {
	const documentModel = ClientModelSelectors.modelByName(documentModelName, Model.isDocumentModel)(state);

	if (documentModel === undefined) {
		return currentDoc;
	}

	let updatedDoc = currentDoc;

	for (const [fieldName, fieldValue] of Object.entries(value)) {
		const fieldPath: EntityInstancePath = [...targetPath, { elementName: fieldName, index: 1 }];
		updatedDoc = DocumentUtils.setField(updatedDoc, fieldPath, fieldValue, documentModel);
	}

	return updatedDoc;
}

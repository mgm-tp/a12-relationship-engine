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

import { FormEngineSelectors } from "@com.mgmtp.a12.formengine/formengine-core";
import { Model, ModelSelectors as ClientModelSelectors } from "@com.mgmtp.a12.client/client-core";
import {
	isRelationshipModel,
	ModifyJsonRpc2Response,
	DocumentJsonRpc2Request,
	AddDocumentJsonRpc2Response
} from "@com.mgmtp.a12.dataservices/dataservices-access";

import type { Changelog } from "../../../../store/index.js";
import { ModelSelectors } from "../../../../store/index.js";
import { DocumentProcessors } from "../../documentProcessor.js";
import { DocumentGraphSelectors } from "../../../../store/index.js";

/** @internal */
export function stripDocumentMeta(object: object): object {
	const { __meta, modelId, id, ...rest } = object as Record<string, unknown>;

	return rest as object;
}

/** @internal */
export function extractDocRef(requests: unknown[], responses: unknown[]): string | undefined {
	const modifyIndex = requests.findIndex((req) => DocumentJsonRpc2Request.ModifyJsonRpc2Request.isInstance(req));
	const modifyResponse = responses[modifyIndex];

	if (modifyResponse && ModifyJsonRpc2Response.isInstance(modifyResponse)) {
		return undefined;
	}

	const addIndex = requests.findIndex((req) => DocumentJsonRpc2Request.AddJsonRpc2Request.isInstance(req));
	const addResponse = responses[addIndex];

	if (addResponse && AddDocumentJsonRpc2Response.isInstance(addResponse)) {
		return addResponse?.result?.docRef;
	}

	return undefined;
}

/** @internal */
export function* getDocument(activityId: string, docRef: string): SagaGenerator<[object, string]> {
	const documentGraph = yield* select(DocumentGraphSelectors.documentGraph(activityId));

	if (!documentGraph) {
		return yield* call(getDocumentFromFormEngine, activityId);
	}

	const byDocRef = documentGraph.documents.byDocRef ?? {};
	const node = docRef ? byDocRef[docRef] : undefined;

	if (node?.loadingState !== "loaded") {
		throw new Error(`Document not loaded or missing for docRef: ${docRef}`);
	}

	const documentModel = yield* select(ClientModelSelectors.modelByName(node.documentModelName, Model.isDocumentModel));

	if (!documentModel) {
		throw new Error(`Can not find document model "${node.documentModelName}"`);
	}

	return [DocumentProcessors.preSave(stripDocumentMeta(node.document), documentModel), node.documentModelName];
}

/** @internal */
export function* getDocumentFromFormEngine(activityId: string): SagaGenerator<[object, string]> {
	const engineState = yield* select(FormEngineSelectors.engineState(activityId));
	const document = engineState?.data?.document as object | undefined;

	if (!document) {
		throw new Error(`No document found in FormEngine state for activity ${activityId}`);
	}

	const rootDocumentModels = yield* select(ModelSelectors.rootDocumentModel(activityId));

	if (!rootDocumentModels) {
		throw new Error(`Root document model not loaded for activity ${activityId}`);
	}

	const documentModelName = rootDocumentModels.documentModel.header.id;
	const documentModel = yield* select(ClientModelSelectors.modelByName(documentModelName, Model.isDocumentModel));

	if (!documentModel) {
		throw new Error(`Can not find document model "${documentModelName}"`);
	}

	return [DocumentProcessors.preSave(stripDocumentMeta(document), documentModel), documentModelName];
}

/** @internal */
export function* getLinkDocument(
	activityId: string,
	linkChange: Changelog.LinkAdded | Changelog.LinkDocChanged
): SagaGenerator<object | undefined> {
	const documentGraph = yield* select(DocumentGraphSelectors.documentGraph(activityId));
	const existingLink = documentGraph?.links.byId[linkChange.linkId ?? linkChange.linkRef.id];

	if (existingLink?.linkDocRef) {
		const linkDocumentNode = documentGraph?.documents.byDocRef[existingLink.linkDocRef];

		if (linkDocumentNode?.loadingState === "loaded") {
			const linkDocumentModel = yield* select(
				ClientModelSelectors.modelByName(linkDocumentNode.documentModelName, Model.isDocumentModel)
			);

			if (!linkDocumentModel) {
				throw new Error(
					`Cannot find link document model "${linkDocumentNode.documentModelName}" for link ${linkChange.linkRef.id}`
				);
			}

			return DocumentProcessors.preSave(stripDocumentMeta(linkDocumentNode.document), linkDocumentModel);
		}
	}

	const linkDocument = linkChange.linkDocument;

	if (!linkDocument) {
		return undefined;
	}

	const relationshipModelName = linkChange.linkRef.linkDescriptor.relationshipModel;
	const relationshipModel = yield* select(ClientModelSelectors.modelByName(relationshipModelName, isRelationshipModel));

	if (!relationshipModel) {
		throw new Error(`Cannot find relationship model "${relationshipModelName}"`);
	}

	const linkDocumentModelName = relationshipModel.content.linkDocumentModel;

	if (!linkDocumentModelName) {
		return linkDocument;
	}

	const linkDocumentModel = yield* select(
		ClientModelSelectors.modelByName(linkDocumentModelName, Model.isDocumentModel)
	);

	if (!linkDocumentModel) {
		throw new Error(
			`Cannot find link document model "${linkDocumentModelName}" for relationship "${relationshipModelName}"`
		);
	}

	return DocumentProcessors.preSave(stripDocumentMeta(linkDocument), linkDocumentModel);
}

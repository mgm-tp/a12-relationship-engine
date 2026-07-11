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
 * @module relationship
 */

import { all, call, select, type SagaGenerator } from "typed-redux-saga";

import { JsonRpc2Response } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { filterDocumentByRelevance } from "@com.mgmtp.a12.formengine/formengine-core";
import { type Activity, NEW_INSTANCE_IDENTIFIER } from "@com.mgmtp.a12.client/client-core";
import type { DocumentModel, Document as KernelDocument } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import {
	AddDocumentJsonRpc2Response,
	type DocumentJsonRpc2Request,
	type RelationshipJsonRpc2request
} from "@com.mgmtp.a12.dataservices/dataservices-access";

import { DocumentProcessors } from "../../document-processor.js";
import { RelationshipDataProviderSelectors } from "../selectors.js";
import { A12InternalConstants } from "../../../../shared/constants.js";
import type { Relationship as RelationshipClientApi } from "../../../relationship.js";
import type { RequestSelectorMap } from "../../../../server-connectors/request-selector-map.js";

import { createMutationRequests } from "./createMutationRequests.js";

/* @internal */
export function* createSaveRequests(
	{ modelId, id, ...doc }: Activity.Data.Document,
	documentModel: DocumentModel,
	activityId: string,
	requestSelectorMap: RequestSelectorMap,
	mutationDH?: Activity.DataHolder<RelationshipClientApi.Mutation[]>
): SagaGenerator<(DocumentJsonRpc2Request | RelationshipJsonRpc2request)[]> {
	const docRef = id === NEW_INSTANCE_IDENTIFIER ? A12InternalConstants.SPEL_CREATED_DOC_REF : id;
	const mutations = yield* all(
		mutationDH?.data?.map((mutation) => call(preSaveMutation, mutation, activityId, docRef)) ?? []
	);

	const document = yield* call(processDocument, doc, documentModel, activityId);
	const state = yield* select();
	const mutationRequestSelectors = createMutationRequests(mutations, activityId, state, requestSelectorMap);

	// it is important that the documentOperation is done first, otherwise we can not
	// add links on a newly created document
	if (id === NEW_INSTANCE_IDENTIFIER) {
		const addDocRequest = yield* select(
			requestSelectorMap.addDocument({
				activityId,
				id: A12InternalConstants.ADD_DOC_OPERATION,
				modelId,
				document
			})
		);

		return [addDocRequest, ...mutationRequestSelectors];
	} else {
		const modifyDocRequest = yield* select(
			requestSelectorMap.modifyDocument({
				activityId,
				id: "modifyDocumentOperation",
				docRef: id,
				document
			})
		);

		return [modifyDocRequest, ...mutationRequestSelectors];
	}
}

function replaceNullDocRef(
	link: RelationshipClientApi.LinkWithDocument,
	newDocRef: string
): RelationshipClientApi.LinkWithDocument {
	const entities = link.linkRef.linkDescriptor.entities.map((entity) => {
		return {
			...entity,
			docRef: entity.docRef === NEW_INSTANCE_IDENTIFIER ? newDocRef : entity.docRef
		};
	});

	return {
		...link,
		linkRef: {
			...link.linkRef,
			linkDescriptor: {
				...link.linkRef.linkDescriptor,
				entities
			}
		}
	};
}

function* preSaveMutation(
	preMutation: RelationshipClientApi.Mutation,
	activityId: string,
	defaultDocRef: string
): SagaGenerator<RelationshipClientApi.Mutation> {
	const mutation = { ...preMutation, link: replaceNullDocRef(preMutation.link, defaultDocRef) };

	if (mutation.link.document.relationship === undefined) {
		return mutation;
	}

	const relationshipModelName = mutation.link.linkRef.linkDescriptor.relationshipModel;
	const linkDocumentModel = yield* select(
		RelationshipDataProviderSelectors.selectLinkDocumentModel,
		relationshipModelName
	);

	if (!linkDocumentModel) {
		return mutation;
	}

	const { id, modelId, ...linkDocRelationship } = mutation.link.document.relationship as KernelDocument;

	return {
		...mutation,
		link: {
			...mutation.link,
			document: {
				...mutation.link.document,
				relationship: yield* call(processDocument, linkDocRelationship, linkDocumentModel, activityId)
			}
		}
	};
}

/* @internal */
export function isAddDocumentOperationResponse(response: unknown): response is AddDocumentJsonRpc2Response {
	return JsonRpc2Response.ok.isInstance(response) && typeof response.result === "object" && response.result !== null
		? AddDocumentJsonRpc2Response.isInstance(response) && response.id === A12InternalConstants.ADD_DOC_OPERATION
		: false;
}

function* processDocument(
	document: KernelDocument,
	documentModel: DocumentModel,
	activityId: string
): SagaGenerator<object> {
	const models = yield* select(RelationshipDataProviderSelectors.selectModelTuple, activityId, documentModel);

	// In case of the link document, if there is no modal form model provided in
	// the scene, there also is no notRelevant filtering needed.
	const filteredLinkDoc = models ? filterDocumentByRelevance(document, models) : document;

	return DocumentProcessors.preSave(filteredLinkDoc, documentModel);
}

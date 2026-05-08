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
 * @module cdm/data-provider
 * @experimental
 */

import { type Model as ModelAPI } from "@com.mgmtp.a12.base/base-model-api/lib/main/model/index.js";
import { Model } from "@com.mgmtp.a12.client/client-core";
import {
	type DocumentModel,
	type Document as KernelDocument
} from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";
import {
	type DocumentJsonRpc2Request,
	type RelationshipJsonRpc2request,
	type ModelGraph,
	type Relationship as RelationshipServerApi
} from "@com.mgmtp.a12.dataservices/dataservices-access";

import { assertObject, assertUnreachable } from "../../shared/assertion.js";
import { A12InternalConstants } from "../../shared/constants.js";
import { type RequestSelectorMap } from "../../server-connectors/request-selector-map.js";
import { type Relationship } from "../../relationship/index.js";
import { DocumentProcessors } from "../../relationship/platform/document-processor.js";
import { getDocumentModelOfSuperType } from "../../relationship/platform/getDocumentModelOfSuperType.js";

import { type DocumentWithMutationMetadata } from "../cdd/core/effectiveChanges/documentsWithMetaData.js";
import { type EffectiveChangeList } from "../cdd/core/effectiveChanges/toEffectiveChanges.js";

const UNDERSCORE_REGEX = new RegExp("_", "g");
const HYPHEN_REGEX = new RegExp("-", "g");

/** @internal */
export type ModelTypeGuard<T extends ModelAPI> = (m: ModelAPI) => m is T;

/** @internal */
export type ModelProvider = <T extends ModelAPI = ModelAPI>(
	modelName: string,
	typeGuard: ModelTypeGuard<T>
) => T | undefined;

/** @internal */
export type LinkDocumentModelProvider = (relationshipModel: string) => DocumentModel | undefined;

/**
 * @internal
 * Converts the link and document mutations of the change log into JsonRpc2Requests
 * for the platform server. This includes the pre-processing of all documents
 * and link documents that serializes all field value objects into their string
 * representation.
 */
export function convertMutations(
	changes: EffectiveChangeList,
	modelGraph: ModelGraph,
	modelProvider: ModelProvider,
	linkDocumentModelProvider: LinkDocumentModelProvider,
	activityId: string,
	state: object,
	requestSelectorMap: RequestSelectorMap
): (DocumentJsonRpc2Request | RelationshipJsonRpc2request)[] {
	const docRefPlaceholders: { [key: string]: string } = {};

	return [
		...changes.documents.flatMap((m) => documentMutationToRequest(m) ?? []),
		...changes.links.flatMap((m) => linkMutationToRequest(m) ?? [])
	];

	function documentMutationToRequest(documentMutation: DocumentWithMutationMetadata) {
		const {
			mutation,
			document: { docRef, documentModelName, content }
		} = documentMutation;

		const documentModel =
			modelProvider(documentModelName, Model.isDocumentModel) ??
			getDocumentModelOfSuperType((n) => modelProvider(n, Model.isDocumentModel), modelGraph, documentModelName);
		assertObject(documentModel, `Cannot persist document without the respective document model '${documentModelName}'`);

		switch (mutation) {
			case "added": {
				/*
				 * Note:
				 * There may not be any underscores or hyphens in this id
				 * because of the spring expression language which is used when
				 * referring to these operations later on in
				 * link descriptor->entity->docRef
				 */
				const id = `addDocumentOperation${stripUnderscoresAndHyphens(docRef)}`;
				docRefPlaceholders[docRef] = id;
				return requestSelectorMap.addDocument({
					activityId,
					id,
					modelId: documentModelName,
					document: DocumentProcessors.preSave(content, documentModel)
				})(state);
			}
			case "modified":
				return requestSelectorMap.modifyDocument({
					activityId,
					id: `modifyDocumentOperation_${docRef}`,
					docRef,
					document: DocumentProcessors.preSave(content, documentModel)
				})(state);
			case "removed":
				/*
				 * Note:
				 * CDMs may currently only handle shared relationships since
				 * owned link targets/documents cannot be removed like this (the
				 * server doesn't handle this accordingly so far).
				 *
				 * We could also check the relationship model to find out
				 * whether this is shared or owned relationship and then handle
				 * the situation accordingly.
				 */
				throw new Error("Cannot persist DELETE_DOCUMENT changes from the cdd - not implemented yet!");
			default:
				assertUnreachable(mutation);
		}
	}

	function linkMutationToRequest(linkMutation: Relationship.LinkWithMutationMetadata) {
		if (!linkMutation.mutationState || linkMutation.mutationState === "withdrawn") {
			return undefined;
		}

		const link = linkMutation.link;

		const relationshipModelName = linkMutation.link.linkRef.linkDescriptor.relationshipModel;
		const linkDocumentModel = linkDocumentModelProvider(relationshipModelName);

		const linkDocument = extractLinkDocument(link.document as KernelDocument, linkDocumentModel);

		switch (linkMutation.mutationState) {
			case "added": {
				return requestSelectorMap.addLink({
					activityId,
					id: link.linkRef.id,
					linkRef: {
						...link.linkRef,
						linkDescriptor: replaceDocRefsForCreatedDocuments(link.linkRef.linkDescriptor)
					},
					linkDocument
				})(state);
			}
			case "existing": {
				return linkMutation.modified
					? requestSelectorMap.modifyLink({
							activityId,
							id: link.linkRef.id,
							linkRef: link.linkRef,
							linkDocument
						})(state)
					: undefined;
			}
			case "removed": {
				return requestSelectorMap.deleteLink({
					activityId,
					id: link.linkRef.id,
					linkRef: link.linkRef
				})(state);
			}
			default:
				assertUnreachable(linkMutation.mutationState);
		}

		function replaceDocRefsForCreatedDocuments(
			linkDescriptor: RelationshipServerApi.LinkDescriptor
		): RelationshipServerApi.LinkDescriptor {
			return {
				...linkDescriptor,
				entities: linkDescriptor.entities.map((entity) => {
					const currentDocRef = entity.docRef;
					assertObject(currentDocRef);
					const docRef = docRefPlaceholders[currentDocRef]
						? `#{#${docRefPlaceholders[currentDocRef]}.${A12InternalConstants.LINK_ENTITY_DOC_REF_SPEC}}`
						: currentDocRef;
					return {
						...entity,
						docRef
					};
				})
			};
		}
	}
}

function extractLinkDocument(linkDoc: KernelDocument, linkDocumentModel?: DocumentModel): object | undefined {
	const { id, modelId, ...preliminaryLinkDocument } = linkDoc;

	return linkDocumentModel && preliminaryLinkDocument
		? DocumentProcessors.preSave(preliminaryLinkDocument, linkDocumentModel)
		: undefined;
}

function stripUnderscoresAndHyphens(input: string): string {
	return input.replace(UNDERSCORE_REGEX, "").replace(HYPHEN_REGEX, "");
}

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

import { call, select, type SagaGenerator } from "typed-redux-saga";

import { LocaleSelectors } from "@com.mgmtp.a12.client/client-core";
import type { Document as KernelDocument } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import {
	Query,
	Dispatcher,
	Relationship,
	type JsonRpc2Response,
	LoadThumbnailUrlsJsonRpc2,
	type QueryJsonRpc2Response
} from "@com.mgmtp.a12.dataservices/dataservices-access";

import { PaginationUtils } from "../../../paginationUtils.js";
import type { RelationshipActions } from "../../../actions.js";
import { removeModelNameFromEntities } from "../../../shared.js";
import { DocumentProcessors } from "../../document-processor.js";
import { RelationshipDataProviderSelectors } from "../selectors.js";
import type { RelationshipDocument } from "../../../ui/components/api.js";
import { DocumentUtils, partitionList } from "../../../../shared/utils.js";
import { RequestBuilder } from "../../../../server-connectors/requestBuilder.js";
import type { Relationship as RelationshipClientApi } from "../../../relationship.js";

import { getLink, isValidLink, getModelName } from "./utils.js";
import type { RequestConfig, ResultPayloads, LoadResponseResult } from "./types.js";

/* @internal */
export function* convertResponses(params: LoadResponseResult): SagaGenerator<ResultPayloads> {
	const {
		responses,
		activity,
		updatePage,
		linkRequests,
		linkInstances,
		candidateRequests,
		candidateInstances,
		linkResultDocumentModels,
		candidateResultDocumentModels
	} = params;

	const [setPagePayloads, mergedResponses] = updatePage ? yield* call(handlePageUpdate, params) : [[], responses];

	// page updates potentially trigger more LIST_LINKS requests, so there
	// might be an additional thumbnail response at the end here
	const maybeThumbnailResponse = mergedResponses.at(-1);

	// cant use generators in callbacks, so we select the state once before
	const state = yield* select();

	const linkPayloads = linkInstances.map(({ id: instanceId }) => {
		const { entries: serverLinks, pageSpec } = findResultEntries(mergedResponses, linkRequests, instanceId);

		const resultDocumentModel = linkResultDocumentModels.find((model) => model.instanceId === instanceId);

		if (resultDocumentModel === undefined) {
			throw new Error(`No result document model found for instance ${instanceId}`);
		}

		const links = (serverLinks as Relationship.LinkWithDocument[]).map((serverLink) => {
			const processedDocument = DocumentProcessors.postLoad(
				serverLink.document,
				resultDocumentModel.model
			) as KernelDocument;

			// if the link contains a link document, add metadata to it
			const document =
				DocumentUtils.isGroupInstance(processedDocument.relationship) &&
				DocumentUtils.isGroupInstance(processedDocument.relationship.__meta) &&
				"docRef" in processedDocument.relationship.__meta &&
				typeof processedDocument.relationship.__meta.docRef === "string"
					? {
							...processedDocument,
							relationship: {
								...processedDocument.relationship,
								id: processedDocument.relationship.__meta.docRef,
								modelId: RelationshipDataProviderSelectors.selectLinkDocumentModelName(
									state,
									serverLink.linkRef.linkDescriptor.relationshipModel
								)
							}
						}
					: processedDocument;

			return {
				linkRef: {
					...serverLink.linkRef,
					linkDescriptor: removeModelNameFromEntities(serverLink.linkRef.linkDescriptor)
				},
				document
			};
		}) as RelationshipClientApi.LinkWithDocument[];

		return { activityId: activity.id, instanceId, links, ...pageSpec };
	});

	const candidatePayloads = candidateInstances.map(({ id: instanceId }) => {
		const { entries: serverCandidates, pageSpec } = findResultEntries(responses, candidateRequests, instanceId);

		const resultDocumentModel = candidateResultDocumentModels.find((model) => model.instanceId === instanceId);

		if (resultDocumentModel === undefined) {
			throw new Error(`No result document model found for instance ${instanceId}`);
		}

		const candidates: Relationship.Candidate[] = (serverCandidates as Relationship.Candidate[]).map(
			(serverCandidate) => ({
				linkRef: serverCandidate.linkRef,
				document: {
					...serverCandidate.document,
					target: DocumentProcessors.postLoad(
						(serverCandidate.document as RelationshipDocument).target,
						resultDocumentModel.model
					)
				}
			})
		);

		return {
			activityId: activity.id,
			instanceId,
			candidates,
			...pageSpec
		};
	});

	return {
		candidatePayloads,
		linkPayloads,
		setPagePayloads,
		additionalThumbnailResponse: LoadThumbnailUrlsJsonRpc2.Response.isInstance(maybeThumbnailResponse)
			? maybeThumbnailResponse
			: undefined
	};
}

function* handlePageUpdate(
	params: LoadResponseResult
): SagaGenerator<[payloads: RelationshipActions.Commands.SetPagePayload[], responses: JsonRpc2Response[]]> {
	const { responses, activity, linkRequests, linkInstances } = params;

	const [validInstances, invalidInstances] = partitionList(
		linkInstances,
		isValidPaginationInstance(responses, linkRequests)
	);

	const [validRequests] = partitionList(linkRequests, (request) => validInstances.some((i) => i.id === request.id));

	const [validLinkResponses] = partitionList(responses, (response) =>
		validRequests.some((r) => r.request.id === response.id)
	);

	const handleInvalidInstancesResult = yield* call(
		handleInvalidInstances,
		activity.id,
		invalidInstances,
		linkRequests,
		responses
	);

	return [
		handleInvalidInstancesResult.setPagePayloads,
		[...validLinkResponses, ...handleInvalidInstancesResult.updatedResponses]
	];
}

function isValidPaginationInstance(response: JsonRpc2Response[], linkRequests: RequestConfig[]) {
	return (linkInstance: RelationshipClientApi.LinkInstance) => {
		const instanceId = linkInstance.id;
		const { pageSpec } = findResultEntries(response, linkRequests, instanceId);

		const currentPageNumber = linkInstance.linkPagination.pageNumber;

		const maxPageNumber = PaginationUtils.getMaxPageNumber({
			...linkInstance.linkPagination,
			fullCount: pageSpec.fullCount
		});

		return currentPageNumber <= maxPageNumber;
	};
}

function createNextRequest(invalidRequest: RequestConfig, paging: Query.Paging): RequestConfig {
	const {
		request: { params }
	} = invalidRequest;

	return {
		...invalidRequest,
		request: {
			...invalidRequest.request,
			params: {
				...params,
				query: {
					...params.query,
					paging
				}
			}
		}
	};
}

function* handleInvalidInstances(
	activityId: string,
	invalidInstance: RelationshipClientApi.LinkInstance[],
	requests: RequestConfig[],
	responses: JsonRpc2Response[]
): SagaGenerator<{
	updatedResponses: JsonRpc2Response[];
	setPagePayloads: RelationshipActions.Commands.SetPagePayload[];
}> {
	const nextRequests: RequestConfig[] = [];
	const setPagePayloads: RelationshipActions.Commands.SetPagePayload[] = [];

	for (const instance of invalidInstance) {
		const instanceId = instance.id;
		const { pageSpec } = findResultEntries(responses, requests, instanceId);
		const invalidRequest = requests.find((r) => r.id === instanceId);

		if (!invalidRequest) {
			continue;
		}

		const maxPageNumber = PaginationUtils.getMaxPageNumber({
			...instance.linkPagination,
			fullCount: pageSpec.fullCount
		});

		const { pageSize } = instance.linkPagination;
		const nextRequest: RequestConfig = createNextRequest(invalidRequest, {
			pageNumber: maxPageNumber,
			pageSize
		});

		setPagePayloads.push({
			type: "link",
			activityId,
			instanceId,
			pageNumber: maxPageNumber
		});

		nextRequests.push(nextRequest);
	}

	if (nextRequests.length === 0) {
		return { setPagePayloads, updatedResponses: [] };
	}

	const { language } = yield* select(LocaleSelectors.locale());
	const updatedResponses: JsonRpc2Response[] = yield* call(() =>
		Dispatcher.rpc(language, [...nextRequests.map(({ request }) => request), RequestBuilder.loadAllThumbnailURLs()])
	);

	return { setPagePayloads, updatedResponses };
}

interface ResultEntries {
	entries: Relationship.LinkWithDocument[] | Relationship.Candidate[];
	pageSpec: { offset: number; limit: number; fullCount: number };
}

type ResponseResult = QueryJsonRpc2Response<QueryJsonRpc2Response.BaseEntry[], QueryJsonRpc2Response.Link[]>;

function findResultEntries(
	responses: JsonRpc2Response[],
	requestConfigs: RequestConfig[],
	instanceId: string
): ResultEntries {
	const requestConfig = requestConfigs.find((rc) => rc.id === instanceId);
	const emptyResult = { entries: [], pageSpec: { limit: 0, fullCount: 0, offset: 0 } };

	if (requestConfig === undefined) {
		return emptyResult;
	}

	const singleResponse = responses.find((sr) => sr.id === requestConfig.request.id);

	if (singleResponse === undefined) {
		return emptyResult;
	}

	return mapResponse(requestConfig, singleResponse as ResponseResult);
}

function mapResponse(requestConfig: RequestConfig, response: ResponseResult): ResultEntries {
	const {
		result: { entries, fullSize, page, links }
	} = response;

	if (!isValidEntries(entries)) {
		throw Error("Invalid entries response");
	}

	if (!links.every(isValidLink)) {
		throw Error("Invalid entries response");
	}

	const convertedEntries =
		requestConfig.type === "link"
			? convertLinkEntries(links, requestConfig.additionalConfig)
			: convertCandidateEntries(entries, links, requestConfig.additionalConfig);

	return {
		entries: convertedEntries,
		pageSpec: {
			fullCount: fullSize,
			limit: page.pageSize ?? 0,
			offset: (page.pageSize ?? 0) * (page.pageNumber ?? 0)
		}
	};
}

function createLinkDescriptor(params: {
	relationshipModel: string;
	sourceEntity: Relationship.LinkEntitySpec;
	targetRole: string;
	targetDocRef: string;
}): Relationship.LinkDescriptorResponse {
	const { relationshipModel, sourceEntity, targetRole, targetDocRef } = params;

	return {
		relationshipModel,
		entities: [
			{
				role: sourceEntity.role,
				docRef: sourceEntity.docRef,
				modelName: getModelName(sourceEntity.docRef)
			},
			{
				role: targetRole,
				docRef: targetDocRef,
				modelName: getModelName(targetDocRef)
			}
		],
		predecessorLinkRef: null,
		position: Relationship.LinkPosition.TOP
	};
}

function getLinkId(
	links: QueryJsonRpc2Response.Link[],
	params: {
		sourceDocRef: string | undefined;
		targetDocRef: string | null;
		relationshipModel: string;
	}
): string | null {
	const { sourceDocRef, targetDocRef, relationshipModel } = params;

	if (!targetDocRef) {
		return null;
	}

	const linkResponse = links.find(
		(link) =>
			link.sourceDocRef === sourceDocRef &&
			link.targetDocRef === targetDocRef &&
			link.relationshipModel === relationshipModel &&
			link.type === "CHILD"
	);

	return linkResponse?.linkId ?? null;
}

function convertCandidateEntries(
	entries: Query.DocumentTreeResult[],
	listLinks: QueryJsonRpc2Response.Link[],
	additionalConfig: RequestConfig["additionalConfig"]
) {
	return entries.map((entry) => {
		const linkId = getLinkId(listLinks, {
			sourceDocRef: entry.docRef,
			targetDocRef: additionalConfig.sourceEntity.docRef,
			relationshipModel: additionalConfig.relationshipModel
		});

		return {
			linkRef: {
				linkDescriptor: createLinkDescriptor({
					...additionalConfig,
					targetDocRef: entry.docRef
				}),
				id: linkId?.toString() ?? null
			},
			document: {
				target: entry.document,
				relationship: linkId ? getLink(listLinks, linkId)?.document : undefined
			}
		};
	});
}

function convertLinkEntries(
	listLinks: QueryJsonRpc2Response.Link[],
	additionalConfig: RequestConfig["additionalConfig"]
) {
	return listLinks
		.filter((item) => item.type === "CHILD")
		.map((item) => {
			return {
				linkRef: {
					linkDescriptor: createLinkDescriptor({
						...additionalConfig,
						targetDocRef: item.docRef
					}),
					id: item.linkId
				},
				document: {
					target: item.document,
					relationship: getLink(listLinks, item.linkId)?.document
				}
			};
		});
}

function isValidEntries(entries: object[]): entries is Query.DocumentTreeResult[] {
	return entries.every((entry) => Query.DocumentTreeResult.isInstance(entry));
}

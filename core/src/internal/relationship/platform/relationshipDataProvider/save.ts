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

import { put, call, select, type SagaGenerator } from "typed-redux-saga";

import { FormActivity } from "@com.mgmtp.a12.formengine/formengine-core";
import { setThumbnails, convertThumbnailResponse } from "@com.mgmtp.a12.client/client-core/a12internal";
import {
	Dispatcher,
	LoadThumbnailUrlsJsonRpc2,
	type DocumentJsonRpc2Request,
	type RelationshipJsonRpc2request
} from "@com.mgmtp.a12.dataservices/dataservices-access";
import {
	Model,
	Activity,
	ModelSelectors,
	ActivityActions,
	LocaleSelectors,
	ActivitySelectors,
	type DataProvider,
	NEW_INSTANCE_IDENTIFIER
} from "@com.mgmtp.a12.client/client-core";

import { RelationshipActions } from "../../actions.js";
import { assertObject, assertCondition } from "../../../shared/assertion.js";
import { Relationship as RelationshipClientApi } from "../../relationship.js";
import { RequestBuilder } from "../../../server-connectors/requestBuilder.js";
import { getDocumentModelOfSuperType } from "../getDocumentModelOfSuperType.js";
import type { RequestSelectorMap } from "../../../server-connectors/request-selector-map.js";

import { convertResponses } from "./server/convertResponses.js";
import { wrapIfServerError } from "./server/wrapIfServerError.js";
import { createLoadRequests } from "./server/createLoadRequests.js";
import type { RequestConfig, LoadRequestResult } from "./server/types.js";
import { createSaveRequests, isAddDocumentOperationResponse } from "./server/createSaveRequests.js";

/* @internal */
export function* saveData(
	config: DataProvider.SaveConfig,
	requestSelectorMap: RequestSelectorMap
): SagaGenerator<void> {
	const modelGraph = yield* select(ModelSelectors.modelGraph());

	const { activityId, dataHolders, details } = config;
	const { saving, updateActivityData } = details;

	const activity = yield* select(ActivitySelectors.activityById(activityId));

	if (activity === undefined) {
		throw new Error(`No activity found for id ${activityId}.`);
	}

	if (activity.dataHolders === undefined) {
		throw new Error(`No data holders found for activity ${activityId}.`);
	}

	if (!activity.descriptor.instance) {
		throw new Error("Instance must be set to save a document!");
	}

	const mutationDataHolder = activity.dataHolders.find(RelationshipClientApi.MutationDataHolder.isInstance);

	const defaultDh = Activity.findDefaultDataHolder(activity);
	const documentData = defaultDh?.data;

	assertCondition(
		FormActivity.Data.SingleDocumentData.isInstance(documentData),
		`There is no document data for descriptor ${activity.descriptor}.`
	);

	const modelId = documentData.document.modelId;

	const state = yield* select();
	const modelProvider = (id: string) => ModelSelectors.modelByName(id, Model.isDocumentModel)(state);

	const documentModel = modelProvider(modelId) ?? getDocumentModelOfSuperType(modelProvider, modelGraph, modelId);
	assertObject(documentModel, `Expected document model "${modelId}" to exist!`);

	try {
		const saveRequests = yield* createSaveRequests(
			documentData.document,
			documentModel,
			activity.id,
			requestSelectorMap,
			mutationDataHolder
		);

		const { candidatePayloads, linkPayloads, setPagePayloads, documentId } = updateActivityData
			? yield* createForSave(saveRequests, activity, dataHolders, requestSelectorMap)
			: yield* createForCommit(saveRequests);

		yield* put(
			RelationshipActions.Commands.dataSaved({
				activityId,
				candidatePayloads,
				linkPayloads,
				setPagePayloads,
				documentModel,
				documentId
			})
		);

		// we need to store the relatedActivityId before we do the activity's commit
		const relatedActivityId = defaultDh?.datasourceActivityId ?? activity.initiatingActivityId;
		yield* put(saving.done(documentId !== undefined ? { instance: documentId } : {}));

		if (relatedActivityId) {
			yield* put(ActivityActions.reloadData({ activityId: relatedActivityId }));
		}
	} catch (error) {
		const activityError = yield* call(wrapIfServerError, error);
		yield* put(saving.failed(activityError as {}));
	}
}

/**
 * After commit the activity will be removed,
 * so we just persist the data on the server
 */
function* createForCommit(
	saveRequests: (DocumentJsonRpc2Request | RelationshipJsonRpc2request)[]
): SagaGenerator<Omit<RelationshipActions.Commands.DataSavedPayload, "activityId" | "documentModel">> {
	const { language } = yield* select(LocaleSelectors.locale());
	const responses = yield* call(() => Dispatcher.rpc(language, saveRequests));
	const documentId = responses.find(isAddDocumentOperationResponse)?.result.docRef;

	return { documentId };
}

/**
 * After save the activity stays open, so we
 * load candidates/links again to populate it with the latest values
 */
function* createForSave(
	saveRequests: (DocumentJsonRpc2Request | RelationshipJsonRpc2request)[],
	activity: Activity,
	dataHolders: Activity.DataHolder[],
	requestSelectorMap: RequestSelectorMap
): SagaGenerator<Omit<RelationshipActions.Commands.DataSavedPayload, "activityId" | "documentModel">> {
	const requestParams = yield* call(createLoadRequests, {
		activityId: activity.id,
		dataHolders,
		forSave: true,
		requestSelectorMap
	});

	const requests = [
		...saveRequests,
		...requestParams.candidateRequests.map(({ request }) => request),
		...requestParams.linkRequests.map(({ request }) => request),
		RequestBuilder.loadAllThumbnailURLs()
	];

	// only reload thumbnails if also reloading candidates/links
	if (requests.length === saveRequests.length + 1) {
		requests.pop();
	}

	const { language } = yield* select(LocaleSelectors.locale());

	const responses = yield* call(() => Dispatcher.rpc(language, requests));

	const thumbnailResponse = responses.at(-1);

	if (LoadThumbnailUrlsJsonRpc2.Response.isInstance(thumbnailResponse)) {
		yield* put(
			setThumbnails({
				activityId: activity.id,
				thumbnails: convertThumbnailResponse(thumbnailResponse)
			})
		);
	}

	const documentId = responses.find(isAddDocumentOperationResponse)?.result.docRef;
	const updatedRequestParams: LoadRequestResult = {
		...requestParams,
		candidateRequests: updateSourceEntityForAdditionalConfig(requestParams.candidateRequests, documentId),
		linkRequests: updateSourceEntityForAdditionalConfig(requestParams.linkRequests, documentId)
	};

	const { additionalThumbnailResponse, ...payloads } = yield* call(convertResponses, {
		...updatedRequestParams,
		responses,
		activity,
		updatePage: true
	});

	if (additionalThumbnailResponse) {
		yield* put(
			setThumbnails({
				activityId: activity.id,
				thumbnails: convertThumbnailResponse(additionalThumbnailResponse)
			})
		);
	}

	return { ...payloads, documentId };
}

function updateSourceEntityForAdditionalConfig(
	requestConfigs: RequestConfig[],
	documentId: string | undefined
): RequestConfig[] {
	return requestConfigs.map((request) => {
		const { sourceEntity } = request.additionalConfig;

		if (documentId && sourceEntity.docRef === NEW_INSTANCE_IDENTIFIER) {
			request.additionalConfig.sourceEntity = { ...sourceEntity, docRef: documentId };
		}

		return request;
	});
}

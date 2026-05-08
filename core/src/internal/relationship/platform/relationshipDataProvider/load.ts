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

import { all, call, put, type SagaGenerator, select } from "typed-redux-saga";

import { type Activity, ActivityActions, ActivitySelectors, LocaleSelectors } from "@com.mgmtp.a12.client/client-core";
import { Dispatcher, LoadThumbnailUrlsJsonRpc2 } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { setThumbnails } from "@com.mgmtp.a12.client/client-core/lib/core/activity/a12-internal/thumbnails/action.js";
import { convertThumbnailResponse } from "@com.mgmtp.a12.client/client-core/lib/core/activity/a12-internal/thumbnails/slice.js";

import { type RequestSelectorMap } from "../../../server-connectors/request-selector-map.js";
import { RequestBuilder } from "../../../server-connectors/requestBuilder.js";
import { RelationshipActions } from "../../actions.js";

import { convertResponses } from "./server/convertResponses.js";
import { createLoadRequests } from "./server/createLoadRequests.js";
import { wrapIfServerError } from "./server/wrapIfServerError.js";

/* @internal */
export function* loadData(
	config: { activityId: string; dataHolders: Activity.DataHolder[] },
	requestSelectorMap: RequestSelectorMap
): SagaGenerator<void> {
	const { activityId, dataHolders } = config;
	const activity = yield* select(ActivitySelectors.activityById(activityId));
	if (activity === undefined) {
		throw new Error(`No activity found for id ${activityId}.`);
	}

	const result = yield* call(createLoadRequests, { activityId, dataHolders, requestSelectorMap });
	const thumbnailRequest = RequestBuilder.loadAllThumbnailURLs();

	try {
		const { language } = yield* select(LocaleSelectors.locale());
		const responses = yield* call(() =>
			Dispatcher.rpc(language, [
				...result.candidateRequests.map(({ request }) => request),
				...result.linkRequests.map(({ request }) => request),
				thumbnailRequest
			])
		);

		const thumbnailResponse = responses.find(LoadThumbnailUrlsJsonRpc2.Response.isInstance);
		if (thumbnailResponse) {
			yield* put(setThumbnails({ activityId, thumbnails: convertThumbnailResponse(thumbnailResponse) }));
		}

		const { candidatePayloads, linkPayloads, setPagePayloads } = yield* call(convertResponses, {
			...result,
			responses,
			activity
		});

		yield* all([
			...candidatePayloads.map((p) => put(RelationshipActions.Commands.setCandidates(p))),
			...linkPayloads.map((p) => put(RelationshipActions.Commands.setLinks(p))),
			...setPagePayloads.map((p) => put(RelationshipActions.Commands.setPage(p)))
		]);
	} catch (error) {
		const activityError = yield* call(wrapIfServerError, error);
		yield* put(
			ActivityActions.error({
				activityId,
				error: activityError,
				operationType: "loading"
			})
		);
	}
}

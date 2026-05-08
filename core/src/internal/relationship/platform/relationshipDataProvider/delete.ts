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

import { call, put, type SagaGenerator, select } from "typed-redux-saga";

import {
	Activity,
	ActivityActions,
	ActivitySagas,
	ActivitySelectors,
	type DataProvider,
	LocaleSelectors
} from "@com.mgmtp.a12.client/client-core";
import {
	Dispatcher,
	type DocumentJsonRpc2Request,
	type RelationshipJsonRpc2request
} from "@com.mgmtp.a12.dataservices/dataservices-access";

import { Relationship as RelationshipClientApi } from "../../relationship.js";
import { type RequestSelectorMap } from "../../../server-connectors/request-selector-map.js";

import { createMutationRequests } from "./server/createMutationRequests.js";
import { wrapIfServerError } from "./server/wrapIfServerError.js";

/* @internal */
export function* deleteData(
	config: DataProvider.DeleteConfig,
	requestSelectorMap: RequestSelectorMap
): SagaGenerator<void> {
	const { activityId, dataHolders, details } = config;
	const { instanceId } = details;

	const state = yield* select();
	const activity = yield* select(ActivitySelectors.activityById(activityId));
	if (activity === undefined) {
		throw new Error(`No activity found for id ${activityId}.`);
	}
	if (activity.dataHolders === undefined) {
		throw new Error(`No data holders found for activity ${activityId}.`);
	}

	const mutationDataHolder = activity.dataHolders.find(RelationshipClientApi.MutationDataHolder.isInstance);
	const mutations = mutationDataHolder?.data ?? [];

	let request: DocumentJsonRpc2Request | undefined;

	const activityDataHolder = dataHolders.find(Activity.DataHolder.hasDescriptor(activity.descriptor));
	if (activityDataHolder !== undefined) {
		const childActivity = yield* select(ActivitySelectors.childActivityByInstanceId(activity, instanceId));

		if (childActivity) {
			yield* put(
				ActivityActions.cancelRequested({
					activityIds: [childActivity.id]
				})
			);
			const cancelled = yield* call(ActivitySagas.waitForResponseCancelRequested);
			if (!cancelled) {
				return;
			}
		}

		request = requestSelectorMap.deleteDocument({
			id: "deleteDocumentOperation",
			activityId,
			docRef: instanceId
		})(state);
	}

	try {
		// it is important that the documentOperation is done first, otherwise we can not
		// add links on a newly created document
		const requests: (DocumentJsonRpc2Request | RelationshipJsonRpc2request)[] = request ? [request] : [];
		requests.push(...createMutationRequests(mutations, activityId, state, requestSelectorMap));

		const { language } = LocaleSelectors.locale()(state);
		yield* call(() => Dispatcher.rpc(language, requests));

		yield* put(ActivityActions.reloadData({ activityId }));
	} catch (error) {
		const activityError = yield* call(wrapIfServerError, error);
		yield* put(
			ActivityActions.error({
				activityId: activityId,
				error: activityError,
				operationType: "saving"
			})
		);
	}
}

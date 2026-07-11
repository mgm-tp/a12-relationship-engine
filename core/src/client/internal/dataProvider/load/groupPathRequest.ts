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

import { ModelPath } from "@com.mgmtp.a12.base/base-model-api";
import { LocaleSelectors } from "@com.mgmtp.a12.client/client-core";
import {
	Dispatcher,
	type QueryJsonRpc2Request,
	type QueryJsonRpc2Response
} from "@com.mgmtp.a12.dataservices/dataservices-access";

import type { RequestSelectorMap as RERequestSelectorMap } from "../../requestSelectorMap.js";

/**
 * @internal
 * Extra payload passed via `ActivityActions.loadData` to trigger a groupPath-scoped
 * document graph reload (e.g. after a link add or dropdown selection).
 */
export interface GroupPathLoadPayload {
	readonly groupPath: ModelPath;
	readonly docRef?: string;
}

/**
 * @internal
 */
export function isGroupPathLoadPayload(details: unknown): details is GroupPathLoadPayload {
	return typeof details === "object" && details !== null && "groupPath" in details;
}

/**
 * @internal
 * Specification for building a single groupPath subtree query request.
 */
export interface GroupPathRequestSpec {
	readonly activityId: string;
	readonly id: string;
	readonly cdmName: string;
	readonly docRef: string;
	readonly groupPath: ModelPath;
}

/**
 * @internal
 * Builds a `queryDocumentGraph` request for a single groupPath subtree.
 */
export function* buildGroupPathRequest(
	spec: GroupPathRequestSpec,
	requestSelectorMap: RERequestSelectorMap
): SagaGenerator<QueryJsonRpc2Request> {
	return yield* select(
		requestSelectorMap.queryDocumentGraph({
			activityId: spec.activityId,
			id: spec.id,
			targetDocumentModel: spec.cdmName,
			paging: { pageNumber: 0, pageSize: 1 },
			constraint: { operator: "exact_match", field: "/__meta/docRef", value: spec.docRef },
			fields: [ModelPath.toString(spec.groupPath)]
		})
	);
}

/**
 * @internal
 * Builds and executes a batched RPC call for N groupPath subtree specs.
 * Returns one `DocumentGraphProjection` per spec, in the same order.
 */
export function* fetchGroupPathProjections(
	specs: ReadonlyArray<GroupPathRequestSpec>,
	requestSelectorMap: RERequestSelectorMap
): SagaGenerator<QueryJsonRpc2Response.DocumentGraphProjection[]> {
	const { language } = yield* select(LocaleSelectors.locale());

	const requests: QueryJsonRpc2Request[] = [];

	for (const spec of specs) {
		const request = yield* buildGroupPathRequest(spec, requestSelectorMap);
		requests.push(request);
	}

	const responses = yield* call(() => Dispatcher.rpc(language, requests));

	return responses as QueryJsonRpc2Response.DocumentGraphProjection[];
}

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

import { call, type SagaGenerator, select } from "typed-redux-saga";

import { ModelPath } from "@com.mgmtp.a12.base/base-model-api/lib/main/model/index.js";
import { Model, ModelSelectors, LocaleSelectors } from "@com.mgmtp.a12.client/client-core";
import {
	Dispatcher,
	Query,
	type QueryJsonRpc2Response,
	type LoadThumbnailUrlsJsonRpc2,
	DocumentSpec
} from "@com.mgmtp.a12.dataservices/dataservices-access";

import { assertNotNullish, assertObject } from "../../shared/assertion.js";
import { type RelshPath } from "../../documentGraph/core/index.js";
import { type RequestSelectorMap } from "../../server-connectors/request-selector-map.js";
import { RequestBuilder } from "../../server-connectors/requestBuilder.js";
import { isValidLink } from "../../relationship/platform/relationshipDataProvider/server/utils.js";

import { relshPathToModelPath } from "../cdd/core/index.js";
import { type QueryPath } from "../cdmCommons/queryPath.js";

/** @internal */
export interface CDDQuery {
	readonly activityId: string;
	readonly cdmName: string;
	readonly queryRoot: QueryPath;
}

let requestCounter = 0;

/**
 * Returns the correct `path` parameter for the `LOAD_DG` operation
 *
 * For the top level group, `path` should be `null`. Otherwise, it should point to
 * a group inside the cdm (in that case, the CDM referenced by `cdmName` has to
 * exist already and is used for traversing).
 */
function* pathOrNull(cdmName: string, path: RelshPath): SagaGenerator<string | null> {
	if (path === "" || path === "/") {
		return null;
	}

	const cdm = assertNotNullish(
		yield* select(ModelSelectors.modelByName(cdmName, Model.isDocumentModel)),
		`Expected cdm ${cdmName} to exist!`
	);

	const modelPath = relshPathToModelPath(cdm.content.modelRoot, path);
	assertObject(modelPath, `Expected model path to exist for relationship ${path}`);

	return modelPath.length > 0 ? ModelPath.toString(modelPath) : null;
}

/** @internal */
export interface LoadDGResult {
	readonly links: QueryJsonRpc2Response.Link[];
	readonly documents: DocumentSpec[];
	readonly thumbnailResponse?: LoadThumbnailUrlsJsonRpc2.Response;
}

/** @internal */
export function* loadDG(
	{ activityId, cdmName, queryRoot }: CDDQuery,
	requestSelectorMap: RequestSelectorMap
): SagaGenerator<LoadDGResult> {
	const { docRef } = queryRoot;
	const path = yield* call(pathOrNull, cdmName, queryRoot.path);
	const state = yield* select();

	const constraint: Query.Operator = {
		operator: Query.OPERATORS.EXACT_MATCH_OPERATOR,
		field: "/__meta/docRef",
		value: docRef
	};

	const loadDgRequest = requestSelectorMap.loadDocumentGraph({
		id: `LoadDocumentGraph-${requestCounter++}`,
		activityId,
		targetDocumentModel: cdmName,
		fields: path ? [path] : undefined,
		constraint,
		paging: { pageNumber: 0, pageSize: 100 }
	})(state);

	const { language } = LocaleSelectors.locale()(state);

	const [response, thumbnailResponse] = yield* call(() =>
		Dispatcher.rpc(language, [loadDgRequest, RequestBuilder.loadAllThumbnailURLs()])
	);

	const links = response.result.links ?? [];

	for (const link of links) {
		if (link.type === "CHILD" && !isValidLink(link)) {
			throw new Error(`Invalid link object in response ${JSON.stringify(link)}`);
		}
	}

	const documents: DocumentSpec[] = links.map((item: QueryJsonRpc2Response.Link) => {
		return {
			document: item.document,
			docRef: item.docRef,
			documentModelName: item.documentModelName
		};
	});
	if (response.result.entries && response.result.entries.length > 0) {
		for (const entry of response.result.entries) {
			if (entry && DocumentSpec.isInstance(entry)) {
				documents.push(entry);
			}
		}
	}

	return { documents, links, thumbnailResponse };
}

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
 * @module server-connectors
 */

import { type JsonRpc2Response } from "@com.mgmtp.a12.dataservices/dataservices-access";
import {
	ConnectorLocator,
	type RestRequestPayload,
	type RestServerConnector
} from "@com.mgmtp.a12.utils/utils-connector/lib/main/index.js";
import { LoggerFactory } from "@com.mgmtp.a12.utils/utils-logging";

const logger = LoggerFactory.getLogger("extensions/platform-server-connectors");

type TypeGuard<T, U extends T> = (obj: T) => obj is U;

/** @internal */
async function fetchServerRequest(request: RestRequestPayload): Promise<Response> {
	logger.log("Request", request);
	const response = await (ConnectorLocator.getInstance().getServerConnector() as RestServerConnector).fetchData(
		request
	);
	logger.log("Response", response);

	/**
	 * NOTE: The RestServerConnecter uses an error filter that will always reject
	 * if the fetch `response.ok` is `false`. Therefore, the following code will
	 * not be reached.
	 *
	 * However, we cannot guarantee this for the future therefore we will keep it.
	 */
	if (!response.ok) {
		throw new Error(response.statusText);
	}

	return response;
}

/** @internal */
export const RestRequestDispatcher = {
	async raw(request: RestRequestPayload): Promise<Response> {
		return await fetchServerRequest(request);
	},
	async text(request: RestRequestPayload): Promise<string> {
		return (await fetchServerRequest(request)).text();
	},
	async blob(request: RestRequestPayload): Promise<Blob> {
		return (await fetchServerRequest(request)).blob();
	},
	async json<T>(
		request: RestRequestPayload,
		responseChecker: TypeGuard<T | JsonRpc2Response.JsonRpc2Error, T>
	): Promise<T> {
		const response = await fetchServerRequest(request);
		const data = await response.json();

		if (!responseChecker(data)) {
			throw new Error("The server response cannot be interpreted!");
		}

		return data;
	}
};

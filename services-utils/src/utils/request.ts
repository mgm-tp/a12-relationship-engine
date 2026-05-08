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

import Chance from "chance";

import {
	type JsonRpc2Request,
	type JsonRpc2Response,
	type DocumentJsonRpc2Request
} from "@com.mgmtp.a12.dataservices/dataservices-access";

import { type BaseUrlOption } from "./common.js";

export async function rpcRequest(options: BaseUrlOption, requests: JsonRpc2Request[]): Promise<JsonRpc2Response[]> {
	const res = await fetch(`${options.baseUrl}/api/v2/rpc`, {
		method: "POST",
		body: JSON.stringify(requests),
		headers: { "Content-Type": "application/json", "Accept-Language": "en" }
	});
	if (res.status > 400) {
		throw new Error(`Cannot call the JSON RPC request. Error: ${res.status} - ${res.statusText}`);
	}
	return res.json();
}

type Document = Record<string, object>;

export function addRequest(
	documentModelName: string,
	document: Document,
	suffix: number
): DocumentJsonRpc2Request.AddJsonRpc2Request {
	return {
		jsonrpc: "2.0",
		id: `Add${documentModelName}${suffix}`,
		method: "ADD_DOCUMENT",
		params: { document, documentModelName, locale: "en_US" }
	};
}

export function createRequests(
	size: number,
	documentName: string,
	documentGenerator: (chance: Chance.Chance) => Document
) {
	return Array.from({ length: size }, (_, index) => {
		return addRequest(documentName, documentGenerator(new Chance(index)), index);
	});
}

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

import { test, expect, describe } from "vitest";

import { toServerErrors } from "../../../../internal/components/error-panel.js";
import { createJsonRpc2ResponseError } from "../../../mocks/errors/server-exceptions.js";

describe("toServerErrors", () => {
	test("unwraps a single response, as rejected by Dispatcher.rpcSettled", () => {
		const error = createJsonRpc2ResponseError("ERROR");

		expect(toServerErrors(error)).toStrictEqual([error]);
	});

	test("keeps an array of responses, as thrown by Dispatcher.rpc", () => {
		const first = createJsonRpc2ResponseError("ERROR", "error1");
		const second = createJsonRpc2ResponseError("ERROR", "error2");

		expect(toServerErrors([first, second])).toStrictEqual([first, second]);
	});

	test("drops entries that are no json-rpc error responses", () => {
		const error = createJsonRpc2ResponseError("ERROR");

		expect(toServerErrors([error, { some: "other error" }])).toStrictEqual([error]);
	});

	const nonErrorContents = [
		{ condition: "an unrelated object", content: { some: "other error" } },
		{ condition: "an empty array", content: [] },
		{ condition: "a plain error", content: new Error("boom") },
		{ condition: "undefined", content: undefined }
	];

	test.each(nonErrorContents)("returns no errors for $condition", ({ content }) => {
		expect(toServerErrors(content)).toStrictEqual([]);
	});
});

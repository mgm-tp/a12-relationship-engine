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

import { inspect } from "node:util";

import { type CommandModule } from "yargs";

import { type JsonRpc2Request, JsonRpc2Response } from "@com.mgmtp.a12.dataservices/dataservices-access";

import {
	BaseUrlOption,
	type PresetMap,
	PresetsOption,
	resolvePresets,
	type RequestsCreator,
	rpcRequest
} from "../utils/index.js";
import CDMRequest from "../utils/data/cdmRequests.json" with { type: "json" };
import RelationshipRequest from "../utils/data/relationshipRequest.json" with { type: "json" };

import { handleWaitOn } from "./wait-on.js";

interface Options extends BaseUrlOption, PresetsOption {
	waitOn: boolean;
}

export const seedCommand: CommandModule<unknown, Options> = {
	command: "seed [presets..]",
	describe: "Seed the data to server for all or specific preset(s)",
	builder: (yargs) =>
		yargs.positional("presets", PresetsOption).option({
			...BaseUrlOption,
			waitOn: {
				type: "boolean",
				description: "Wait until the server is initialized",
				default: false
			}
		}),
	handler: handleSeed
};

async function handleSeed(options: Options) {
	if (options.waitOn) {
		await handleWaitOn(options);
	}

	await Promise.all(
		resolvePresets({ ...options, presetMap }).map(async (requestsCreator) => {
			const responses = await rpcRequest(options, requestsCreator());

			if (JsonRpc2Response.hasErrors(responses)) {
				console.error(
					inspect(
						responses.filter((res) => !!res.error),
						{ depth: 10 }
					)
				);
				process.exit(1);
			} else {
				console.log(inspect(responses, { depth: 10 }));
			}
		})
	);

	console.log("== Seeding Finished ==");
}

const presetMap: PresetMap<RequestsCreator> = {
	cdm: [() => CDMRequest as JsonRpc2Request[]],
	relationship: [() => RelationshipRequest as JsonRpc2Request[]]
};

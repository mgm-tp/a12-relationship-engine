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

import type { CommandModule } from "yargs";

import { JsonRpc2Response, type JsonRpc2Request } from "@com.mgmtp.a12.dataservices/dataservices-access";

import CDMRequest from "../utils/data/cdmRequests.json" with { type: "json" };
import {
	rpcRequest,
	BaseUrlOption,
	PresetsOption,
	type PresetMap,
	resolvePresets,
	type RequestsCreator,
	createRelationshipGraph
} from "../utils/index.js";

import { handleClean } from "./clean.js";
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

export async function handleSeed(options: Options) {
	if (options.waitOn) {
		await handleWaitOn(options);
	}

	console.log("== Cleaning existing documents before seeding ==");
	await handleClean(options);

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
				console.log("== Successfully seeded with ", responses.length, " requests ==");
			}
		})
	);

	console.log("== Seed Finished ==");
}

const presetMap: PresetMap<RequestsCreator> = {
	cdm: [() => CDMRequest as JsonRpc2Request[]],
	relationship: [() => createRelationshipGraph()]
};

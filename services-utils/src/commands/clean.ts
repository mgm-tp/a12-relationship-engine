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

import * as fs from "node:fs";
import * as path from "node:path";
import { inspect } from "node:util";
import { fileURLToPath } from "node:url";

import { type CommandModule } from "yargs";

import { JsonRpc2Response, type QueryJsonRpc2Response } from "@com.mgmtp.a12.dataservices/dataservices-access";

import {
	rpcRequest,
	BaseUrlOption,
	deleteDocument,
	listDocuments,
	PresetsOption,
	resolvePresets
} from "../utils/index.js";

import { handleWaitOn } from "./wait-on.js";

interface Options extends PresetsOption, BaseUrlOption {
	waitOn: boolean;
}

export const cleanCommand: CommandModule<unknown, Options> = {
	command: "clean-documents [presets..]",
	describe: "Clean documents of all or specific preset(s)",
	builder: (yargs) =>
		yargs.positional("presets", PresetsOption).option({
			...BaseUrlOption,
			waitOn: {
				type: "boolean",
				description: "Wait until the server is initialized",
				default: false
			}
		}),
	handler: handleClean
};

export async function handleClean(options: Options) {
	if (options.waitOn) {
		await handleWaitOn(options);
	}

	const listDocumentsRequests = resolvePresets({ ...options, presetMap }).map((documentModel) =>
		listDocuments(documentModel)
	);

	const listDocumentsResponses = (await rpcRequest(options, listDocumentsRequests)) as QueryJsonRpc2Response<
		QueryJsonRpc2Response.DocumentEntry[]
	>[];

	if (JsonRpc2Response.hasErrors(listDocumentsResponses)) {
		console.error(inspect(listDocumentsResponses, { depth: 10 }));
		process.exit(1);
	}

	const deleteDocumentRequests = listDocumentsResponses.flatMap((response) => {
		return response.result.entries.map(({ docRef }) => deleteDocument(getActualDocRef(docRef)));
	});

	const deleteDocumentResponses = await rpcRequest(options, deleteDocumentRequests);
	console.log(deleteDocumentResponses);

	if (JsonRpc2Response.hasErrors(deleteDocumentResponses)) {
		console.error(inspect(deleteDocumentResponses, { depth: 10 }));
		process.exit(1);
	} else {
		console.log(inspect(deleteDocumentResponses, { depth: 10 }));
	}
}

function getActualDocRef(docRef: string): string {
	const segments = docRef.split("/");

	if (segments.length === 3) {
		return segments.slice(1).join("/");
	}

	return docRef;
}
console.log("Preparing the default models preset for clean up scripts");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const directPath = path.join(__dirname, "models");
const localPath = path.join(process.cwd(), "..", "showcase", "resources", "models");
const fallbackPath = path.join("/", "usr", "share", "services-utils", "models");

const candidatePaths = [directPath, localPath, fallbackPath];
const targetPath = candidatePaths.find(fs.existsSync);
if (!targetPath) {
	throw new Error(`No valid "models" directory found. Checked paths: ${candidatePaths.join(", ")}`);
}

console.log("Reading models from:", targetPath);
const presetMap = {
	cdm: getDocumentModelNames(path.join(targetPath, "scdm")),
	relationship: getDocumentModelNames(path.join(targetPath, "vanilla-relationships"))
};

console.log("Found", presetMap.cdm.length + presetMap.relationship.length, "models.");

function getDocumentModelNames(directoryPath: string) {
	const files = fs.readdirSync(directoryPath);

	return files
		.filter((file) => file.endsWith(".json"))
		.filter((file) => {
			const content = fs.readFileSync(path.join(directoryPath, file), "utf-8");
			const json = JSON.parse(content);
			return json.header?.modelType === "document";
		})
		.map((file) => path.parse(file).name);
}

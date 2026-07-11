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

import Fs from "node:fs";
import Path from "node:path";
import Process from "node:process";
import { inspect } from "node:util";

import JSZip from "jszip";
import { sync as globSync } from "glob";
import type { CommandModule } from "yargs";

import { type Model, isModelInstance } from "@com.mgmtp.a12.base/base-model-api";

import { BaseUrlOption } from "../utils/index.js";

interface UploadModelsOptions extends BaseUrlOption {
	path: string;
}

export const uploadModelsCommand: CommandModule<unknown, UploadModelsOptions> = {
	command: "upload-models",
	describe: "Upload all models in target path",
	builder: (yargs) =>
		yargs
			.positional("path", {
				default: "resources/models",
				description: "ONLY WORK with relative path"
			})
			.option(BaseUrlOption),
	handler: handleUploadModels
};

async function handleUploadModels(options: UploadModelsOptions) {
	const resolvedDir = Path.join(Process.cwd(), options.path);
	console.log("Querying files under", resolvedDir);

	const filePaths = globSync("**/*.json", { cwd: resolvedDir });
	const models: Model[] = [];

	for (const filePath of filePaths) {
		const fullPath = Path.join(resolvedDir, filePath);

		const fileContent = JSON.parse(Fs.readFileSync(fullPath, "utf8"));

		if (
			isModelInstance(fileContent) &&
			fileContent.header.modelType !== "document" &&
			fileContent.header.modelType !== "relationship"
		) {
			models.push(applyRoleAnnotation(fileContent));
		}
	}

	console.log("Found", models.length, "UI model files.");
	console.log("Preparing the bulk upload process...");

	try {
		const results = await bulkModelUploadRequest(options, models);
		console.log("Successfully upload these models: ");
		console.table(results);
	} catch (e) {
		console.error(inspect(e, { depth: 10 }));
		process.exit(1);
	}
}

/**
 * Mirrors the build-time WCF converter chain (see showcase-models-converters) so
 * that runtime uploads (e2e overrides, ad-hoc seed) match what `:server:convertModels`
 * would emit. Currently only injects the `roles: anonymous` annotation required by
 * the showcase's anonymous auth setup. Extend here when new WCF converters are added.
 */
function applyRoleAnnotation(model: Model): Model {
	const header = model?.header;

	const annotations = header.annotations ?? [];

	if (annotations.some((a) => a?.name === "roles")) {
		return model;
	}

	return { ...model, header: { ...header, annotations: [...annotations, { name: "roles", value: "anonymous" }] } };
}

async function bulkModelUploadRequest(options: BaseUrlOption, models: Model[]): Promise<string[]> {
	const arrayBuffer = await createArrayBuffer(models);
	const response = await fetch(`${options.baseUrl}/api/v2/models`, {
		method: "PUT",
		body: arrayBuffer,
		headers: { Accept: "*/*" }
	});

	return response.json();
}

async function createArrayBuffer(models: Model[]): Promise<ArrayBuffer> {
	const zip = new JSZip();
	models.forEach((model) => zip.file(`${model.header.id}.json`, JSON.stringify(model)));

	return zip
		.generateAsync({ type: "blob", compression: "DEFLATE" })
		.then((blob) => (blob as AugmentedBlob).arrayBuffer());
}

interface AugmentedBlob extends Blob {
	arrayBuffer(): Promise<ArrayBuffer>;
}

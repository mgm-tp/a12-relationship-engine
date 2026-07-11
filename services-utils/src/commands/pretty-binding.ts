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

import path from "node:path";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";

import type { Argv, CommandModule, ArgumentsCamelCase } from "yargs";

interface ExtractOptions {
	inputFiles: string[];
	targetDir: string;
	prefix: string;
}

interface MergeOptions {
	prettyFile: string;
}

interface PrettyBindingMetadata {
	sourceFilePath: string;
	bindingAnnotationIndex: number;
	annotationName: string;
	exportedAt: string;
}

const BINDING_ANNOTATION_NAME = "bindingConfiguration";
const METADATA_KEY = "__prettyBindingMetadata__";
const DEFAULT_TARGET_DIR = path.resolve(process.cwd(), "target");

export const prettyBindingCommand: CommandModule = {
	command: "pretty-binding",
	describe: "Tools for exporting and merging bindingConfiguration annotations",
	builder: (yargs: Argv): Argv =>
		yargs
			.command<ExtractOptions>({
				command: "extract <inputFiles..>",
				describe: "Export bindingConfiguration annotations into standalone JSON files",
				builder: (subYargs: Argv): Argv<ExtractOptions> =>
					subYargs
						.positional("inputFiles", {
							type: "string",
							describe: "Path to the input CDM form files",
							array: true,
							demandOption: true
						})
						.option("targetDir", {
							type: "string",
							describe: "Directory where prettified bindings are written",
							default: DEFAULT_TARGET_DIR
						})
						.option("prefix", {
							type: "string",
							describe: "Prefix for exported binding filenames",
							default: "pretty-binding"
						}) as Argv<ExtractOptions>,
				handler: handleExtractCommand
			})
			.command<MergeOptions>({
				command: "merge <prettyFile>",
				describe: "Write a prettified binding file back into its original CDM form",
				builder: (subYargs: Argv): Argv<MergeOptions> =>
					subYargs.positional("prettyFile", {
						type: "string",
						describe: "Path to the prettified binding JSON file",
						demandOption: true
					}) as Argv<MergeOptions>,
				handler: handleMergeCommand
			})
			.demandCommand(1, "Specify either extract or merge")
			.strict(),
	handler: () => {
		// No-op: sub-commands handle the work
	}
};

function handleExtractCommand(args: ArgumentsCamelCase<ExtractOptions>): void {
	const files = normalizeInputFiles(args.inputFiles);
	const targetDir = path.resolve(process.cwd(), args.targetDir);
	const prefix = args.prefix ?? "pretty-binding";
	ensureDirectory(targetDir);

	for (const file of files) {
		const filePath = path.resolve(process.cwd(), file);

		if (!existsSync(filePath)) {
			console.log("Could not locate file at", filePath);
			continue;
		}

		const fileContent = readFileSync(filePath, "utf-8");
		exportBinding(filePath, fileContent, targetDir, prefix);
	}
}

function handleMergeCommand(args: ArgumentsCamelCase<MergeOptions>): void {
	applyBindingFromFile(args.prettyFile);
}

function ensureDirectory(directory: string): void {
	if (!existsSync(directory)) {
		mkdirSync(directory, { recursive: true });
	}
}

function exportBinding(sourcePath: string, fileContent: string, targetDir: string, prefix: string): void {
	const { bindingJson, annotationIndex } = extractBinding(fileContent, sourcePath);
	const sourceBaseName = path.basename(sourcePath, path.extname(sourcePath));
	const outputFileName = `${prefix}-${sourceBaseName}-binding.json`;
	const outputPath = path.join(targetDir, outputFileName);

	const payload = {
		[METADATA_KEY]: {
			sourceFilePath: sourcePath,
			bindingAnnotationIndex: annotationIndex,
			annotationName: BINDING_ANNOTATION_NAME,
			exportedAt: new Date().toISOString()
		} satisfies PrettyBindingMetadata,
		binding: bindingJson
	};

	writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf-8");
	console.log("Exported binding for", sourcePath, "→", outputPath);
}

function extractBinding(fileContent: string, sourcePath: string): { bindingJson: unknown; annotationIndex: number } {
	const model = JSON.parse(fileContent);
	const annotations = model.header?.annotations;

	if (!Array.isArray(annotations)) {
		throw new Error(`No annotations found in ${sourcePath}`);
	}

	const annotationIndex = annotations.findIndex(
		(annotation: Record<string, unknown>) =>
			annotation.name === BINDING_ANNOTATION_NAME && typeof annotation.value === "string"
	);

	if (annotationIndex < 0) {
		throw new Error(`No ${BINDING_ANNOTATION_NAME} annotation found in ${sourcePath}`);
	}

	const bindingValue = annotations[annotationIndex].value as string;

	if (!bindingValue) {
		throw new Error(`Empty ${BINDING_ANNOTATION_NAME} in ${sourcePath}`);
	}

	return {
		bindingJson: JSON.parse(bindingValue),
		annotationIndex
	};
}

function applyBindingFromFile(prettyFile: string): void {
	const prettyPath = path.resolve(process.cwd(), prettyFile);

	if (!existsSync(prettyPath)) {
		throw new Error(`Prettified binding file not found at ${prettyPath}`);
	}

	const { metadata, binding } = readPrettyFile(prettyPath);
	const sourcePath = path.resolve(metadata.sourceFilePath);

	if (!existsSync(sourcePath)) {
		throw new Error(`Original CDM form missing at ${sourcePath}`);
	}

	const fileContent = readFileSync(sourcePath, "utf-8");
	const model = JSON.parse(fileContent);
	const annotations = model.header?.annotations as Array<Record<string, unknown>>;

	if (!Array.isArray(annotations)) {
		throw new Error(`No annotations found in ${sourcePath}`);
	}

	let annotation = annotations[metadata.bindingAnnotationIndex];

	if (!annotation || annotation.name !== metadata.annotationName) {
		const fallbackIndex = annotations.findIndex(
			(maybeAnnotation: Record<string, unknown>) => maybeAnnotation.name === metadata.annotationName
		);

		if (fallbackIndex < 0) {
			throw new Error(`Unable to locate ${metadata.annotationName} in ${sourcePath}`);
		}

		annotation = annotations[fallbackIndex];
	}

	annotation.value = JSON.stringify(binding);
	writeFileSync(sourcePath, JSON.stringify(model, null, 2), "utf-8");
	console.log("Updated source form", sourcePath, "with", prettyPath);
}

function readPrettyFile(prettyPath: string): { metadata: PrettyBindingMetadata; binding: unknown } {
	const fileContent = readFileSync(prettyPath, "utf-8");
	const parsed = JSON.parse(fileContent);
	const metadata = parsed[METADATA_KEY];

	if (!metadata) {
		throw new Error(`Metadata missing in ${prettyPath}`);
	}

	if (typeof metadata.sourceFilePath !== "string" || typeof metadata.bindingAnnotationIndex !== "number") {
		throw new Error(`Invalid metadata in ${prettyPath}`);
	}

	if (metadata.annotationName !== BINDING_ANNOTATION_NAME) {
		throw new Error(`Unexpected annotation stored in ${prettyPath}`);
	}

	return {
		metadata,
		binding: parsed.binding
	};
}

function normalizeInputFiles(values?: string | string[] | never[]): string[] {
	if (!values) {
		return [];
	}

	return Array.isArray(values) ? values : [values];
}

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
 * copy-models script
 *
 * Reads model-imports.config.json and copies model files from node_modules (or
 * a local path) into src/models/. Idempotent — overwrites existing files.
 *
 * Usage: node --experimental-strip-types tools/copy-models.ts
 */

import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve, relative } from "node:path";
import { mkdirSync, existsSync, readdirSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";

import semver from "semver";

type ResolvedModelType = "form" | "overview";

interface LegacyFileMapping {
	/** Relative path inside the package (or local path root). */
	from: string;
	/** Destination filename inside src/models/. */
	to: string;
}

interface SemverFileMapping {
	/** File name inside the resolved version folder. */
	filename: string;
	/** Destination filename inside src/models/. */
	to: string;
}

type FileMapping = LegacyFileMapping | SemverFileMapping;

interface SemverPackageEntry {
	/** Human-readable label for logging (documentation only). */
	name: string;
	/** Stable model family key used in generated resolved-version metadata. */
	modelType?: ResolvedModelType;
	/** npm package name — resolves via node_modules. */
	package: string;
	stepsPath: string;
	versionRange: string;
	files: FileMapping[];
}

interface LegacyPackageEntry {
	/** Human-readable label for logging (documentation only). */
	name: string;
	/** npm package name — resolves via node_modules. Mutually exclusive with `path`. */
	package?: string;
	/** Local path relative to extraction-tool/ root. Mutually exclusive with `package`. */
	path?: string;
	files: FileMapping[];
}

type PackageEntry = SemverPackageEntry | LegacyPackageEntry;

interface Config {
	entries: PackageEntry[];
}

interface VersionFolder {
	folderName: string;
	version: string;
}

interface SelectedVersionFolder extends VersionFolder {
	sourceDir: string;
}

interface CopyResult {
	entryName: string;
	sourceFile: string;
	destinationFile: string;
	selectedVersionFolder?: string;
	selectedVersion?: string;
}

interface ResolvedEntryMetadata {
	modelType: ResolvedModelType;
	entryName: string;
	packageName: string;
	stepsPath: string;
	versionRange: string;
	version: string;
	selectedVersionFolder: string;
	copiedFiles: string[];
}

type CommandRunner = (command: string, args: string[], options: { cwd: string }) => void;

interface CopyModelsOptions {
	toolDir?: string;
	log?: (message: string) => void;
	formatCopiedFiles?: boolean;
	runCommand?: CommandRunner;
}

const extractionToolDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VERSION_FOLDER_PREFIX = "version-";
const INCLUDE_PRERELEASE = { includePrerelease: true };
const GENERATED_METADATA_FILENAME = "resolved-model-versions.ts";
const GENERATED_METADATA_HEADER = readFileSync(resolve(extractionToolDir, "..", "license_header.txt"), "utf8");

function resolveConfig(configPath = resolve(extractionToolDir, "model-imports.config.json")): Config {
	if (!existsSync(configPath)) {
		throw new Error(`Config file not found: ${configPath}`);
	}

	return JSON.parse(readFileSync(configPath, "utf8")) as Config;
}

function isSemverEntry(entry: PackageEntry): entry is SemverPackageEntry {
	return (
		"package" in entry &&
		typeof entry.package === "string" &&
		"stepsPath" in entry &&
		typeof entry.stepsPath === "string" &&
		"versionRange" in entry &&
		typeof entry.versionRange === "string"
	);
}

function isLegacyFileMapping(fileMapping: FileMapping): fileMapping is LegacyFileMapping {
	return "from" in fileMapping;
}

function resolvePackageDir(packageName: string, toolDir: string, entryName: string): string {
	const packageDir = resolve(toolDir, "node_modules", packageName);

	if (!existsSync(packageDir)) {
		throw new Error(`Entry "${entryName}": package not found: ${packageName} (${packageDir})`);
	}

	return packageDir;
}

function readVersionFolders(stepsDir: string, entryName: string): VersionFolder[] {
	if (!existsSync(stepsDir)) {
		throw new Error(`Entry "${entryName}": steps path not found: ${stepsDir}`);
	}

	const versionFolders = readdirSync(stepsDir, { withFileTypes: true })
		.filter(function filterDirectory(entry) {
			return entry.isDirectory() && entry.name.startsWith(VERSION_FOLDER_PREFIX);
		})
		.map(function mapDirectory(entry): VersionFolder | undefined {
			const versionCandidate = entry.name.slice(VERSION_FOLDER_PREFIX.length);
			const version = semver.valid(versionCandidate);

			if (version === null) {
				return undefined;
			}

			return { folderName: entry.name, version };
		})
		.filter(function isVersionFolder(folder): folder is VersionFolder {
			return folder !== undefined;
		});

	if (versionFolders.length === 0) {
		throw new Error(`Entry "${entryName}": no valid version-* folders found in ${stepsDir}`);
	}

	return versionFolders;
}

function resolveSelectedVersionFolder(
	packageDir: string,
	stepsPath: string,
	versionRange: string,
	entryName: string
): SelectedVersionFolder {
	const stepsDir = resolve(packageDir, stepsPath);
	const versionFolders = readVersionFolders(stepsDir, entryName);
	const matchingFolders = versionFolders
		.filter(function filterByRange(folder) {
			return semver.satisfies(folder.version, versionRange, INCLUDE_PRERELEASE);
		})
		.sort(function sortByVersion(left, right) {
			return semver.rcompare(left.version, right.version);
		});

	if (matchingFolders.length === 0) {
		const availableVersions = versionFolders.map(function mapVersion(folder) {
			return folder.version;
		});
		throw new Error(
			`Entry "${entryName}": no version folder in ${stepsDir} satisfies range "${versionRange}". Available: ${availableVersions.join(", ")}`
		);
	}

	const selectedFolder = matchingFolders[0];

	return {
		...selectedFolder,
		sourceDir: resolve(stepsDir, selectedFolder.folderName)
	};
}

function resolveVersionFolder(packageDir: string, stepsPath: string, versionRange: string, entryName: string): string {
	return resolveSelectedVersionFolder(packageDir, stepsPath, versionRange, entryName).sourceDir;
}

function resolveSourceDir(entry: PackageEntry, toolDir: string): string {
	return resolveSourceDirDetails(entry, toolDir).sourceDir;
}

function resolveSourceDirDetails(
	entry: PackageEntry,
	toolDir: string
): { sourceDir: string; selectedVersionFolder?: SelectedVersionFolder; packageDir?: string } {
	if (isSemverEntry(entry)) {
		const packageDir = resolvePackageDir(entry.package, toolDir, entry.name);
		const selectedVersionFolder = resolveSelectedVersionFolder(
			packageDir,
			entry.stepsPath,
			entry.versionRange,
			entry.name
		);

		return { sourceDir: selectedVersionFolder.sourceDir, selectedVersionFolder, packageDir };
	}

	if (entry.package !== undefined && entry.path !== undefined) {
		throw new Error(`Entry "${entry.name}": only one of "package" or "path" may be specified.`);
	}

	if (entry.package !== undefined) {
		return { sourceDir: resolvePackageDir(entry.package, toolDir, entry.name) };
	}

	if (entry.path !== undefined) {
		return { sourceDir: resolve(toolDir, entry.path) };
	}

	throw new Error(`Entry "${entry.name}": either "package" or "path" is required.`);
}

function resolveSourceFile(entry: PackageEntry, fileMapping: FileMapping, sourceDir: string): string {
	const relativeSourcePath = isLegacyFileMapping(fileMapping) ? fileMapping.from : fileMapping.filename;
	const sourceFile = resolve(sourceDir, relativeSourcePath);

	if (!existsSync(sourceFile)) {
		throw new Error(`Required source file not found for "${entry.name}": ${sourceFile}`);
	}

	return sourceFile;
}

// Some upstream packages use passthrough re-exports when a new version folder has no schema changes.
// Copying the shim verbatim would break compilation because the relative sibling path does not exist at the copy destination.
function resolveReexportFile(filePath: string): string {
	const MAX_DEPTH = 10;
	let current = filePath;

	for (let depth = 0; depth < MAX_DEPTH; depth++) {
		const content = readFileSync(current, "utf8");
		const withoutHeader = content.replace(/^\/\*[\s\S]*?\*\/\s*/, "").trim();
		const match = /^export\s*\*\s*from\s*["'](\.\.?\/[^"']*)["'];?$/.exec(withoutHeader);

		if (match === null) {
			return current;
		}

		const reexportPath = match[1].replace(/\.js$/, ".ts");
		const resolved = resolve(dirname(current), reexportPath);

		if (!existsSync(resolved)) {
			throw new Error(`Re-export shim at "${current}" references missing file: ${resolved}`);
		}

		current = resolved;
	}

	throw new Error(`Re-export chain exceeded ${MAX_DEPTH} levels starting at ${filePath}`);
}

function copyFile(srcFile: string, destFile: string): void {
	mkdirSync(dirname(destFile), { recursive: true });
	copyFileSync(srcFile, destFile);
}

function runCommand(command: string, args: string[], options: { cwd: string }): void {
	execFileSync(command, args, {
		cwd: options.cwd,
		stdio: "inherit"
	});
}

function formatCopiedFiles(
	destinationFiles: string[],
	toolDir: string,
	log: (message: string) => void,
	commandRunner: CommandRunner
): void {
	if (destinationFiles.length === 0) {
		return;
	}

	const workspaceRootDir = resolve(toolDir, "..");
	const uniqueDestinationFiles = [...new Set(destinationFiles)].map(function toRelativePath(filePath) {
		return relative(workspaceRootDir, filePath);
	});
	log(`Formatting copied files with Prettier: ${uniqueDestinationFiles.join(", ")}\n`);
	commandRunner("pnpm", ["prettier", "--write", ...uniqueDestinationFiles], { cwd: workspaceRootDir });
}

function copyModels(config: Config, options: CopyModelsOptions = {}): CopyResult[] {
	const toolDir = options.toolDir ?? extractionToolDir;
	const log = options.log ?? process.stdout.write.bind(process.stdout);
	const shouldFormatCopiedFiles = options.formatCopiedFiles ?? true;
	const commandRunner = options.runCommand ?? runCommand;
	const destDir = resolve(toolDir, "src", "models");
	const results: CopyResult[] = [];
	const metadataEntries: ResolvedEntryMetadata[] = [];
	const filesToFormat: string[] = [];

	for (const entry of config.entries) {
		const sourceDetails = resolveSourceDirDetails(entry, toolDir);
		const copiedFiles: string[] = [];
		log(`Resolved [${entry.name}]: ${sourceDetails.sourceDir}\n`);

		for (const fileMapping of entry.files) {
			const resolvedSourceFile = resolveSourceFile(entry, fileMapping, sourceDetails.sourceDir);
			const sourceFile = resolveReexportFile(resolvedSourceFile);

			if (sourceFile !== resolvedSourceFile) {
				log(`Followed re-export shim [${entry.name}]: ${resolvedSourceFile} → ${sourceFile}\n`);
			}

			const destinationFile = join(destDir, fileMapping.to);
			copyFile(sourceFile, destinationFile);
			log(`Copied [${entry.name}]: ${sourceFile} → ${destinationFile}\n`);
			filesToFormat.push(destinationFile);
			copiedFiles.push(fileMapping.to);
			results.push({
				entryName: entry.name,
				sourceFile,
				destinationFile,
				selectedVersionFolder: sourceDetails.selectedVersionFolder?.sourceDir,
				selectedVersion: sourceDetails.selectedVersionFolder?.version
			});
		}

		if (isSemverEntry(entry) && entry.modelType !== undefined && sourceDetails.selectedVersionFolder !== undefined) {
			metadataEntries.push({
				modelType: entry.modelType,
				entryName: entry.name,
				packageName: entry.package,
				stepsPath: entry.stepsPath,
				versionRange: entry.versionRange,
				version: sourceDetails.selectedVersionFolder.version,
				selectedVersionFolder: sourceDetails.selectedVersionFolder.folderName,
				copiedFiles
			});
		}
	}

	if (metadataEntries.length > 0) {
		const metadataFile = writeResolvedModelVersions(metadataEntries, destDir);
		filesToFormat.push(metadataFile);
		log(`Generated resolved model-version metadata: ${metadataFile}\n`);
	}

	if (shouldFormatCopiedFiles) {
		formatCopiedFiles(filesToFormat, toolDir, log, commandRunner);
	}

	log(`copy-models: done ${results.length} file(s) copied.\n`);

	return results;
}

function writeResolvedModelVersions(metadataEntries: ResolvedEntryMetadata[], destDir: string): string {
	const metadataByModelType = metadataEntries.reduce<Record<string, ResolvedEntryMetadata>>(function indexMetadata(
		accumulator,
		metadata
	) {
		if (accumulator[metadata.modelType] !== undefined) {
			throw new Error(`Duplicate resolved model-version metadata for modelType "${metadata.modelType}"`);
		}

		accumulator[metadata.modelType] = metadata;

		return accumulator;
	}, {});
	const generatedFile = join(destDir, GENERATED_METADATA_FILENAME);
	const serializedMetadata = JSON.stringify(metadataByModelType, undefined, "\t")
		.replaceAll('"modelType"', "modelType")
		.replaceAll('"entryName"', "entryName")
		.replaceAll('"packageName"', "packageName")
		.replaceAll('"stepsPath"', "stepsPath")
		.replaceAll('"versionRange"', "versionRange")
		.replaceAll('"version"', "version")
		.replaceAll('"selectedVersionFolder"', "selectedVersionFolder")
		.replaceAll('"copiedFiles"', "copiedFiles");
	const content = `${GENERATED_METADATA_HEADER}
/** Model families with copied upstream model artifacts. */
export type ResolvedModelType = "form" | "overview";

/** Metadata for model artifacts copied from upstream model-migration packages. */
export interface ResolvedModelVersionMetadata {
	readonly modelType: ResolvedModelType;
	readonly entryName: string;
	readonly packageName: string;
	readonly stepsPath: string;
	readonly versionRange: string;
	readonly version: string;
	readonly selectedVersionFolder: string;
	readonly copiedFiles: readonly string[];
}

/** Resolved model versions selected by tools/copy-models.ts. */
export const RESOLVED_MODEL_VERSIONS = ${serializedMetadata} as const satisfies Record<
	ResolvedModelType,
	ResolvedModelVersionMetadata
>;

/** Resolved form-model version selected by tools/copy-models.ts. */
export const FORM_MODEL_VERSION = RESOLVED_MODEL_VERSIONS.form.version;

/** Resolved overview-model version selected by tools/copy-models.ts. */
export const OVERVIEW_MODEL_VERSION = RESOLVED_MODEL_VERSIONS.overview.version;
`;

	mkdirSync(destDir, { recursive: true });
	writeFileSync(generatedFile, content);

	return generatedFile;
}

function run(): void {
	copyModels(resolveConfig());
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	run();
}

export { copyModels, resolveConfig, resolveSourceDir, resolveVersionFolder };
export type { Config, CopyModelsOptions, CopyResult, FileMapping, PackageEntry };

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

import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { rmSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";

import { it, expect, describe, afterEach } from "vitest";

import { copyModels, type Config, resolveVersionFolder } from "../../tools/copy-models.js";

const createdDirectories: string[] = [];
const RANGE_START_VERSION = "1.2.0-beta.1";
const LOWER_VERSION = "1.1.0";
const MATCHING_VERSION = "1.2.0";
const HIGHEST_MATCHING_VERSION = "1.3.0-beta.2";
const HIGHER_PACKAGE_VERSION = "9.9.9";
const VERSION_RANGE = `>=${RANGE_START_VERSION}`;

afterEach(function cleanup() {
	for (const directory of createdDirectories.splice(0)) {
		rmSync(directory, { recursive: true, force: true });
	}
});

describe("copy-models", function testCopyModels() {
	it("selects the highest matching prerelease version folder", function testHighestMatchingPrerelease() {
		const toolDir = createToolDir();
		const packageDir = createPackageDir(toolDir, "@scope/upstream-package");
		const stepsDir = join(packageDir, "steps");

		writeVersionedFile(stepsDir, MATCHING_VERSION, "model.ts", "matching");
		writeVersionedFile(stepsDir, HIGHEST_MATCHING_VERSION, "model.ts", "highest");
		writeVersionedFile(stepsDir, LOWER_VERSION, "model.ts", "old");

		const logs: string[] = [];
		const config: Config = createOverviewConfig("@scope/upstream-package");

		const results = copyModels(config, {
			toolDir,
			formatCopiedFiles: false,
			log: function log(message) {
				logs.push(message);
			}
		});

		const selectedFolder = `version-${HIGHEST_MATCHING_VERSION}`;
		expect(readFileSync(join(toolDir, "src", "models", "copied-model.ts"), "utf8")).toBe("highest");
		expect(results[0]?.selectedVersionFolder).toContain(selectedFolder);
		expect(results[0]?.selectedVersion).toBe(HIGHEST_MATCHING_VERSION);
		expect(logs.join("")).toContain(selectedFolder);
	});

	it("writes resolved metadata from selected folders rather than package versions", function testResolvedMetadata() {
		const toolDir = createToolDir();
		const overviewPackageDir = createPackageDir(toolDir, "@scope/overview-package");
		const formPackageDir = createPackageDir(toolDir, "@scope/form-package");
		writePackageVersion(overviewPackageDir, HIGHER_PACKAGE_VERSION);
		writePackageVersion(formPackageDir, HIGHER_PACKAGE_VERSION);

		writeVersionedFile(join(overviewPackageDir, "steps"), MATCHING_VERSION, "model.ts", "overview-model");
		writeVersionedFile(join(overviewPackageDir, "steps"), HIGHEST_MATCHING_VERSION, "model.ts", "overview-latest");
		writeVersionedFile(join(formPackageDir, "steps"), MATCHING_VERSION, "model.ts", "form-model");

		copyModels(createResolvedMetadataConfig(), { toolDir, formatCopiedFiles: false, log: function noop() {} });

		const metadata = readFileSync(join(toolDir, "src", "models", "resolved-model-versions.ts"), "utf8");
		expect(metadata).toContain(`version: "${HIGHEST_MATCHING_VERSION}"`);
		expect(metadata).toContain(`selectedVersionFolder: "version-${HIGHEST_MATCHING_VERSION}"`);
		expect(metadata).toContain(`version: "${MATCHING_VERSION}"`);
		expect(metadata).not.toContain(`version: "${HIGHER_PACKAGE_VERSION}"`);
		expect(metadata).toContain('"overview-model.ts"');
		expect(metadata).toContain('"form-model.ts"');
	});

	it("reports available versions when no folder satisfies the configured range", function testNoMatchError() {
		const toolDir = createToolDir();
		const packageDir = createPackageDir(toolDir, "@scope/upstream-package");
		const stepsDir = join(packageDir, "steps");

		writeVersionedFile(stepsDir, MATCHING_VERSION, "model.ts", "matching");
		writeVersionedFile(stepsDir, HIGHEST_MATCHING_VERSION, "model.ts", "highest");

		expect(function expectNoMatch() {
			return resolveVersionFolder(packageDir, "steps", ">=99.0.0", "OverviewModel");
		}).toThrow('Entry "OverviewModel": no version folder in');
		expect(function expectAvailableVersions() {
			return resolveVersionFolder(packageDir, "steps", ">=99.0.0", "OverviewModel");
		}).toThrow(new RegExp(`Available: ${MATCHING_VERSION}, ${HIGHEST_MATCHING_VERSION}`));
	});

	it("throws a clear error when the configured steps path is missing", function testMissingStepsPath() {
		const toolDir = createToolDir();
		createPackageDir(toolDir, "@scope/upstream-package");

		expect(function expectMissingStepsPath() {
			return copyModels(
				{
					entries: [
						{
							name: "OverviewModel",
							modelType: "overview",
							package: "@scope/upstream-package",
							stepsPath: "missing-steps",
							versionRange: VERSION_RANGE,
							files: [{ filename: "model.ts", to: "copied-model.ts" }]
						}
					]
				},
				{ toolDir, formatCopiedFiles: false, log: function noop() {} }
			);
		}).toThrow(/steps path not found/);
	});

	it("formats copied files and generated metadata with Prettier by default", function testFormatsCopiedFiles() {
		const toolDir = createToolDir();
		const packageDir = createPackageDir(toolDir, "@scope/upstream-package");
		const stepsDir = join(packageDir, "steps");
		const commandCalls: Array<{ command: string; args: string[]; cwd: string }> = [];

		writeVersionedFile(stepsDir, HIGHEST_MATCHING_VERSION, "model.ts", "export    const value='x'\n");

		copyModels(createOverviewConfig("@scope/upstream-package"), {
			toolDir,
			log: function noop() {},
			runCommand: function captureCommand(command, args, options) {
				commandCalls.push({ command, args, cwd: options.cwd });
			}
		});

		expect(commandCalls).toEqual([
			{
				command: "pnpm",
				args: [
					"prettier",
					"--write",
					`${basename(toolDir)}/src/models/copied-model.ts`,
					`${basename(toolDir)}/src/models/resolved-model-versions.ts`
				],
				cwd: join(toolDir, "..")
			}
		]);
	});

	it("can skip formatting copied files when requested", function testSkipFormattingCopiedFiles() {
		const toolDir = createToolDir();
		const packageDir = createPackageDir(toolDir, "@scope/upstream-package");
		const stepsDir = join(packageDir, "steps");
		const commandCalls: Array<{ command: string; args: string[]; cwd: string }> = [];

		writeVersionedFile(stepsDir, HIGHEST_MATCHING_VERSION, "model.ts", "export    const value='x'\n");

		copyModels(createOverviewConfig("@scope/upstream-package"), {
			toolDir,
			formatCopiedFiles: false,
			log: function noop() {},
			runCommand: function captureCommand(command, args, options) {
				commandCalls.push({ command, args, cwd: options.cwd });
			}
		});

		expect(commandCalls).toEqual([]);
	});

	it("copies the actual file content when the selected version re-exports a previous version", function testShimResolution() {
		const toolDir = createToolDir();
		const packageDir = createPackageDir(toolDir, "@scope/upstream-package");
		const stepsDir = join(packageDir, "steps");
		const logs: string[] = [];

		writeVersionedFile(stepsDir, MATCHING_VERSION, "model.ts", "actual-schema");
		writeReexportShim(stepsDir, HIGHEST_MATCHING_VERSION, MATCHING_VERSION, "model.ts");

		const results = copyModels(createOverviewConfig("@scope/upstream-package"), {
			toolDir,
			formatCopiedFiles: false,
			log: function captureLog(message) {
				logs.push(message);
			}
		});

		expect(readFileSync(join(toolDir, "src", "models", "copied-model.ts"), "utf8")).toBe("actual-schema");
		expect(results[0]?.selectedVersion).toBe(HIGHEST_MATCHING_VERSION);
		expect(logs.join("")).toContain("Followed re-export shim");
		expect(logs.join("")).toContain(`version-${HIGHEST_MATCHING_VERSION}`);
		expect(logs.join("")).toContain(`version-${MATCHING_VERSION}`);
	});

	it("follows a multi-hop re-export chain to the actual schema file", function testMultiHopShimResolution() {
		const toolDir = createToolDir();
		const packageDir = createPackageDir(toolDir, "@scope/upstream-package");
		const stepsDir = join(packageDir, "steps");
		const INTERMEDIATE_VERSION = "1.3.0-beta.1";

		writeVersionedFile(stepsDir, MATCHING_VERSION, "model.ts", "actual-schema");
		writeReexportShim(stepsDir, INTERMEDIATE_VERSION, MATCHING_VERSION, "model.ts");
		writeReexportShim(stepsDir, HIGHEST_MATCHING_VERSION, INTERMEDIATE_VERSION, "model.ts");

		copyModels(createOverviewConfig("@scope/upstream-package"), {
			toolDir,
			formatCopiedFiles: false,
			log: function noop() {}
		});

		expect(readFileSync(join(toolDir, "src", "models", "copied-model.ts"), "utf8")).toBe("actual-schema");
	});

	it("throws a clear error when a re-export shim references a missing file", function testShimMissingTarget() {
		const toolDir = createToolDir();
		const packageDir = createPackageDir(toolDir, "@scope/upstream-package");
		const stepsDir = join(packageDir, "steps");

		writeReexportShim(stepsDir, HIGHEST_MATCHING_VERSION, MATCHING_VERSION, "model.ts");

		expect(function expectMissingShimTarget() {
			return copyModels(createOverviewConfig("@scope/upstream-package"), {
				toolDir,
				formatCopiedFiles: false,
				log: function noop() {}
			});
		}).toThrow(/references missing file/);
	});

	it("throws a clear error when the configured source file is missing", function testMissingSourceFile() {
		const toolDir = createToolDir();
		const packageDir = createPackageDir(toolDir, "@scope/upstream-package");
		const stepsDir = join(packageDir, "steps");

		mkdirSync(join(stepsDir, `version-${HIGHEST_MATCHING_VERSION}`), { recursive: true });

		expect(function expectMissingSourceFile() {
			return copyModels(createOverviewConfig("@scope/upstream-package"), {
				toolDir,
				formatCopiedFiles: false,
				log: function noop() {}
			});
		}).toThrow(/Required source file not found/);
	});
});

function createToolDir(): string {
	const directory = mkdtempSync(join(tmpdir(), "copy-models-"));
	createdDirectories.push(directory);
	mkdirSync(join(directory, "src", "models"), { recursive: true });
	mkdirSync(join(directory, "node_modules"), { recursive: true });

	return directory;
}

function createPackageDir(toolDir: string, packageName: string): string {
	const packageDir = join(toolDir, "node_modules", packageName);
	mkdirSync(packageDir, { recursive: true });

	return packageDir;
}

function createOverviewConfig(packageName: string): Config {
	return {
		entries: [
			{
				name: "OverviewModel",
				modelType: "overview",
				package: packageName,
				stepsPath: "steps",
				versionRange: VERSION_RANGE,
				files: [{ filename: "model.ts", to: "copied-model.ts" }]
			}
		]
	};
}

function createResolvedMetadataConfig(): Config {
	return {
		entries: [
			{
				name: "OverviewModel",
				modelType: "overview",
				package: "@scope/overview-package",
				stepsPath: "steps",
				versionRange: VERSION_RANGE,
				files: [{ filename: "model.ts", to: "overview-model.ts" }]
			},
			{
				name: "FormModel",
				modelType: "form",
				package: "@scope/form-package",
				stepsPath: "steps",
				versionRange: VERSION_RANGE,
				files: [{ filename: "model.ts", to: "form-model.ts" }]
			}
		]
	};
}

function writeVersionedFile(stepsDir: string, version: string, filename: string, content: string): void {
	const filePath = join(stepsDir, `version-${version}`, filename);
	mkdirSync(join(stepsDir, `version-${version}`), { recursive: true });
	writeFileSync(filePath, content);
}

function writePackageVersion(packageDir: string, version: string): void {
	writeFileSync(join(packageDir, "package.json"), JSON.stringify({ version }));
}

function writeReexportShim(stepsDir: string, shimVersion: string, targetVersion: string, filename: string): void {
	const shimPath = join(stepsDir, `version-${shimVersion}`, filename);
	mkdirSync(join(stepsDir, `version-${shimVersion}`), { recursive: true });
	const targetFilename = filename.replace(/\.ts$/, ".js");
	writeFileSync(shimPath, `export * from "../version-${targetVersion}/${targetFilename}";\n`);
}

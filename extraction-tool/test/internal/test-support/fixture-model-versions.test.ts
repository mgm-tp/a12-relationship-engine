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

import { fileURLToPath } from "node:url";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname, extname, relative } from "node:path";

import { it, expect, describe } from "vitest";

import {
	RUM_VERSION,
	FORM_MODEL_VERSION,
	QUERY_MODEL_VERSION,
	DOCUMENT_MODEL_VERSION,
	OVERVIEW_MODEL_VERSION,
	RELATIONSHIP_MODEL_VERSION,
	GENERATED_MODEL_VERSION_PREFIX
} from "../../../src/internal/steps/RuM/extraction/constants.js";
import {
	RUM_VERSION as PRODUCTION_RUM_VERSION,
	FORM_MODEL_VERSION as PRODUCTION_FORM_MODEL_VERSION,
	QUERY_MODEL_VERSION as PRODUCTION_QUERY_MODEL_VERSION,
	OVERVIEW_MODEL_VERSION as PRODUCTION_OVERVIEW_MODEL_VERSION,
	GENERATED_MODEL_VERSION_PREFIX as PRODUCTION_GENERATED_MODEL_VERSION_PREFIX
} from "../../../src/internal/steps/RuM/extraction/constants.js";

const fixtureRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "__fixtures__");

describe("fixture model-version constants", () => {
	it.each(readFormAndOverviewFixtures())(
		"matches the resolved form/overview fixture version in $fixturePath",
		({ model }) => {
			const expectedVersion = model.header.modelType === "form" ? FORM_MODEL_VERSION : OVERVIEW_MODEL_VERSION;

			expect(model.header.modelVersion).toBe(expectedVersion);
		}
	);

	it.each([
		{
			fixturePath: "shared/document-models/Address-document.json",
			expectedVersion: DOCUMENT_MODEL_VERSION
		},
		{
			fixturePath: "shared/relationship-models/Location.json",
			expectedVersion: RELATIONSHIP_MODEL_VERSION
		}
	])("matches the committed fixture version in $fixturePath", ({ fixturePath, expectedVersion }) => {
		const model = readFixtureModel(join(fixtureRoot, fixturePath));

		expect(model.header.modelVersion).toBe(expectedVersion);
	});

	it("re-exports extraction constants from the source constants module", () => {
		expect(QUERY_MODEL_VERSION).toBe(PRODUCTION_QUERY_MODEL_VERSION);
		expect(RUM_VERSION).toBe(PRODUCTION_RUM_VERSION);
		expect(GENERATED_MODEL_VERSION_PREFIX).toBe(PRODUCTION_GENERATED_MODEL_VERSION_PREFIX);
		expect(FORM_MODEL_VERSION).toBe(PRODUCTION_FORM_MODEL_VERSION);
		expect(OVERVIEW_MODEL_VERSION).toBe(PRODUCTION_OVERVIEW_MODEL_VERSION);
	});
});

interface FixtureModelHeader {
	readonly modelType?: string;
	readonly modelVersion: string;
}

interface FixtureModel {
	readonly header: FixtureModelHeader;
}

interface VersionedFixture {
	readonly fixturePath: string;
	readonly model: FixtureModel & { readonly header: FixtureModelHeader & { readonly modelType: "form" | "overview" } };
}

function readFormAndOverviewFixtures(): VersionedFixture[] {
	return listJsonFiles(fixtureRoot)
		.map(function readVersionedFixture(filePath): VersionedFixture | undefined {
			const model = readFixtureModel(filePath);

			if (model.header.modelType !== "form" && model.header.modelType !== "overview") {
				return undefined;
			}

			return {
				fixturePath: relative(fixtureRoot, filePath),
				model: model as VersionedFixture["model"]
			};
		})
		.filter(function isVersionedFixture(value): value is VersionedFixture {
			return value !== undefined;
		});
}

function listJsonFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap(function mapDirectoryEntry(entry): string[] {
		const entryPath = join(directory, entry.name);

		if (entry.isDirectory()) {
			return listJsonFiles(entryPath);
		}

		return entry.isFile() && extname(entry.name) === ".json" ? [entryPath] : [];
	});
}

function readFixtureModel(filePath: string): FixtureModel {
	const parsedFixture: unknown = JSON.parse(readFileSync(filePath, "utf8"));

	if (!isFixtureModel(parsedFixture)) {
		throw new Error(`Fixture ${filePath} does not contain header.modelVersion`);
	}

	return parsedFixture;
}

function isFixtureModel(value: unknown): value is FixtureModel {
	return isRecord(value) && isRecord(value.header) && typeof value.header.modelVersion === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

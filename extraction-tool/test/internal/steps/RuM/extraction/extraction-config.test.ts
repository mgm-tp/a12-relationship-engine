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

import { it, expect, describe } from "vitest";

import type { GenericModel, MigrationStepContext } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import {
	readConfigFlags,
	extractionIsMigrated
} from "../../../../../src/internal/steps/RuM/extraction/extraction-config.js";

function createMigratedFormModel(): GenericModel {
	return {
		header: {
			id: "form:test",
			modelType: "form",
			modelVersion: "28.4.0",
			modelReferences: [{ id: "rum:test", modelType: "relationship-ui" }],
			annotations: [{ name: "bindingConfiguration", value: "{}" }]
		},
		content: {}
	};
}

function createContext(userConfig: unknown): MigrationStepContext {
	return { userConfig } as unknown as MigrationStepContext;
}

describe("readConfigFlags", () => {
	it("recognizes the camelCase keepModels flag", () => {
		expect(readConfigFlags(createContext({ keepModels: true }))).toEqual({ keepModels: true });
	});

	it("recognizes the kebab-case keep-models flag", () => {
		expect(readConfigFlags(createContext({ "keep-models": true }))).toEqual({ keepModels: true });
	});

	it("ignores malformed config values", () => {
		expect(readConfigFlags(createContext({ keepModels: "true", "keep-models": 1 }))).toEqual({
			keepModels: false
		});
		expect(readConfigFlags(createContext("invalid"))).toEqual({ keepModels: false });
		expect(readConfigFlags(undefined)).toEqual({ keepModels: false });
	});
});

describe("extractionIsMigrated", () => {
	it("does not treat keepModels=true as migrated when binding annotation still exists", () => {
		const model = createMigratedFormModel();

		expect(extractionIsMigrated(model, createContext({ keepModels: true }))).toBe(false);
	});

	it("supports the raw CLI keep-models passthrough flag", () => {
		const model = createMigratedFormModel();

		expect(extractionIsMigrated(model, createContext({ "keep-models": true }))).toBe(false);
	});
});

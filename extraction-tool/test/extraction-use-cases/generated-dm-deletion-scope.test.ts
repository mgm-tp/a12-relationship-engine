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

import { vi } from "vitest";
import { it, expect, describe } from "vitest";

import type { GenericModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import { extractionTransform } from "../../src/internal/steps/RuM/extraction/index.js";
import { DOCUMENT_MODEL_VERSION } from "../../src/internal/steps/RuM/extraction/constants.js";
import { loadFixtureModel, createFixtureContext } from "../internal/test-support/fixture-context-factory.js";

import {
	FIXTURE_PATHS,
	runLocationExtraction,
	createLocationOnlyFormModel,
	LOCATION_GENERATED_DOCUMENT_ID,
	createGeneratedLocationDocument
} from "./location-dualpane-fixture.js";

describe("____generated deletion scope — referenced generated DM", () => {
	it("referenced Foo____generated appears in deletion tracking when keepModels=false", () => {
		// LocationLinks-overview references Location_address____generated as
		// document-model-for-overview — that DM is therefore "referenced".
		const result = runLocationExtraction(false);

		expect(result.deletedIds).toContain(LOCATION_GENERATED_DOCUMENT_ID);
	});

	it("referenced Foo____generated does NOT appear in deletion tracking when keepModels=true", () => {
		const result = runLocationExtraction(true);

		expect(result.deletedIds).not.toContain(LOCATION_GENERATED_DOCUMENT_ID);
	});
});

const BAR_GENERATED_ID = "Bar____generated";

function createUnreferencedGeneratedDoc(): GenericModel {
	return {
		header: {
			id: BAR_GENERATED_ID,
			modelType: "document",
			modelVersion: DOCUMENT_MODEL_VERSION
		}
	} as GenericModel;
}

function runExtractionWithUnreferencedGeneratedDoc(keepModels: boolean): readonly string[] {
	const fixtureModels = FIXTURE_PATHS.map(loadFixtureModel);
	const formModel = createLocationOnlyFormModel();
	const generatedDoc = createGeneratedLocationDocument();
	const barDoc = createUnreferencedGeneratedDoc();
	const harness = createFixtureContext({
		models: [...fixtureModels, formModel, generatedDoc, barDoc],
		config: { keepModels }
	});

	extractionTransform(formModel, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, harness.context);

	return harness.getDeletedIds();
}

describe("____generated deletion scope — unreferenced generated DM", () => {
	it("unreferenced Bar____generated does NOT appear in deletion tracking when keepModels=false", () => {
		const deletedIds = runExtractionWithUnreferencedGeneratedDoc(false);

		expect(deletedIds).not.toContain(BAR_GENERATED_ID);
	});

	it("unreferenced Bar____generated does NOT appear in deletion tracking when keepModels=true", () => {
		const deletedIds = runExtractionWithUnreferencedGeneratedDoc(true);

		expect(deletedIds).not.toContain(BAR_GENERATED_ID);
	});
});

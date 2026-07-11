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

import type { GenericModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import { extractionIsMigrated } from "../../../src/internal/steps/RuM/extraction/index.js";

import { loadFixtureModel, createFixtureContext } from "./fixture-context-factory.js";

describe("createFixtureContext", () => {
	it("creates context, tracks added models, and retrieves one by ID", () => {
		const addedModel = makeModel("AddedModel", "relationship-ui");
		const harness = createFixtureContext({ models: [makeModel("ExistingModel", "form")] });

		harness.context.addModel({ model: addedModel });

		expect(harness.getAddedModels()).toEqual([addedModel]);
		expect(harness.findAddedById("AddedModel")).toBe(addedModel);
		expect(harness.context.findModel("ExistingModel")?.path).toBe("ExistingModel.json");
	});

	it("respects keepModels config for production migration context reads", () => {
		const migratedForm = makeMigratedFormWithBindingConfiguration();
		const harness = createFixtureContext({ config: { keepModels: true } });

		expect(extractionIsMigrated(migratedForm, harness.context)).toBe(false);
		expect(harness.context.userConfig).toEqual({ keepModels: true });
	});

	it("omits keepModels from userConfig so production code follows keepModels false behavior", () => {
		const migratedForm = makeMigratedFormWithBindingConfiguration();
		const harness = createFixtureContext({ config: {} });

		expect(extractionIsMigrated(migratedForm, harness.context)).toBe(true);
		expect(harness.context.userConfig).toEqual({});
	});

	it("loads committed JSON fixtures from the shared fixture layout", () => {
		const loadedModel = loadFixtureModel("shared/form-models/BusinessPartner-form.json");
		const harness = createFixtureContext({ fixturePaths: ["shared/form-models/BusinessPartner-form.json"] });

		expect(modelIdOf(loadedModel)).toBe("BusinessPartner-form");
		expect(harness.context.findModel("BusinessPartner-form")?.path).toBe("BusinessPartner-form.json");
		expect(harness.context.resolveModel(harness.context.findModel("BusinessPartner-form")!)).toEqual(loadedModel);
	});

	it("loads representative products and scdm fixture scaffolds", () => {
		const harness = createFixtureContext({
			fixturePaths: [
				"products/ProductBrand/relationship.json",
				"products/ProductBrand/document-model.json",
				"products/ProductBrand/overview-available.json",
				"products/ProductBrand/overview-selected.json",
				"scdm/DetachedRepeat/form.json",
				"scdm/DetachedRepeat/relationship.json"
			]
		});

		expect(harness.context.findModel("ProductBrand")?.path).toBe("ProductBrand.json");
		expect(harness.context.findModel("ProductBrand_Product____generated")?.path).toBe(
			"ProductBrand_Product____generated.json"
		);
		expect(harness.context.findModel("DetachedRepeat-form")?.path).toBe("DetachedRepeat-form.json");
	});
});

function makeModel(id: string, modelType: string): GenericModel {
	return {
		header: {
			id,
			modelType,
			modelVersion: "1.0.0",
			modelReferences: []
		},
		content: {}
	};
}

function makeMigratedFormWithBindingConfiguration(): GenericModel {
	return {
		header: {
			id: "MigratedForm",
			modelType: "form",
			modelVersion: "1.0.0",
			modelReferences: [{ modelType: "relationship-ui", reference: "MigratedForm_RuM", purpose: "relationship-ui" }],
			annotations: [{ name: "bindingConfiguration", value: "[]" }]
		},
		content: {}
	};
}

function modelIdOf(model: GenericModel): string | undefined {
	return (model as { readonly header?: { readonly id?: string } }).header?.id;
}

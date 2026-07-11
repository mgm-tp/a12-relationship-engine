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

import type { ModelHeader, GenericModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import {
	FORM_MODEL_VERSION,
	DOCUMENT_MODEL_VERSION,
	OVERVIEW_MODEL_VERSION,
	RELATIONSHIP_MODEL_VERSION
} from "../../../src/internal/steps/RuM/extraction/constants.js";

import { loadFixtureModel, createFixtureContext } from "./fixture-context-factory.js";

const PRODUCT_FIXTURE_PATHS = [
	"products/ProductBrand/relationship.json",
	"products/ProductBrand/document-model.json",
	"products/ProductBrand/link-document-model.json",
	"products/ProductBrand/overview-available.json",
	"products/ProductBrand/overview-selected.json",
	"products/ProductBrand/overview-edit-selected.json",
	"products/ProductBrand/form.json",
	"products/ProductBundle/relationship.json",
	"products/ProductBundle/document-model.json",
	"products/ProductBundle/link-document-model.json",
	"products/ProductBundle/overview-selected.json",
	"products/ProductBundle/form.json",
	"products/CategoryCategory/relationship.json",
	"products/CategoryCategory/relationship-secondary.json",
	"products/CategoryCategory/document-model.json",
	"products/CategoryCategory/overview-available.json",
	"products/CategoryCategory/form.json"
] as const;

describe("products fixtures", () => {
	it("load through the fixture context factory with valid headers", () => {
		const harness = createFixtureContext({ fixturePaths: PRODUCT_FIXTURE_PATHS });
		const workspaceModels = harness.context.workspace?.models ?? [];

		expect(workspaceModels).toHaveLength(PRODUCT_FIXTURE_PATHS.length);
		expect(workspaceModels.map((model) => model.header.id)).toEqual([
			"ProductBrand",
			"ProductBrand_Product____generated",
			"ProductBrand_AdditionalFieldsModel",
			"ProductBrand_Product_AvailableItemsOverview",
			"ProductBrand_Product_SelectedItemsOverview",
			"ProductBrand_Product_SelectedItems_DualPane_OM",
			"Brand-form",
			"ProductBundle",
			"ProductBundle_Product_SelectedItemsOverview____generated",
			"ProductBundle_LinkModel",
			"ProductBundle_Product_SelectedItemsOverview",
			"Bundle-form",
			"CategoryCategory",
			"CategoryCategoryAlias",
			"Category_ChildCategory____generated",
			"Category_ChildCategory_AvailableItemsOverview",
			"Category-form"
		]);
	});

	it("use documented fixture model versions", () => {
		const versionsByType = new Map([
			["document", DOCUMENT_MODEL_VERSION],
			["form", FORM_MODEL_VERSION],
			["overview", OVERVIEW_MODEL_VERSION],
			["relationship", RELATIONSHIP_MODEL_VERSION]
		]);

		for (const fixturePath of PRODUCT_FIXTURE_PATHS) {
			const header = getHeader(loadFixtureModel(fixturePath));
			const expectedVersion = versionsByType.get(header.modelType);

			expect(header.modelVersion, fixturePath).toBe(expectedVersion);
		}
	});

	it("include relationship link-document fixtures referenced by product relationships", () => {
		expect(getHeader(loadFixtureModel("products/ProductBrand/link-document-model.json")).id).toBe(
			"ProductBrand_AdditionalFieldsModel"
		);
		expect(getHeader(loadFixtureModel("products/ProductBundle/link-document-model.json")).id).toBe(
			"ProductBundle_LinkModel"
		);
	});

	it("align binding element IDs with committed form host elements", () => {
		for (const fixturePath of [
			"products/ProductBrand/form.json",
			"products/ProductBundle/form.json",
			"products/CategoryCategory/form.json"
		]) {
			const form = loadFixtureModel(fixturePath);
			const elementIds = getBindingElementIds(form);
			const contentIds = collectIds((form as { readonly content?: unknown }).content);

			for (const elementId of elementIds) {
				expect(contentIds, `${fixturePath} missing host element ${elementId}`).toContain(elementId);
			}
		}
	});
});

function getHeader(model: GenericModel): ModelHeader {
	const header = (model as { readonly header?: unknown }).header;

	if (!isModelHeader(header)) {
		throw new Error("Product fixture model must have a valid header");
	}

	return header;
}

function getBindingElementIds(model: GenericModel): readonly string[] {
	const annotations =
		(model as { readonly header?: { readonly annotations?: readonly unknown[] } }).header?.annotations ?? [];
	const bindingAnnotation = annotations.find(isBindingConfigurationAnnotation);

	if (!bindingAnnotation) {
		throw new Error(`${getHeader(model).id} must include a bindingConfiguration annotation`);
	}

	return JSON.parse(bindingAnnotation.value).map((binding: { readonly elementId: string }) => binding.elementId);
}

function collectIds(value: unknown): readonly string[] {
	const ids: string[] = [];
	collectIdsInto(value, ids);

	return ids;
}

function collectIdsInto(value: unknown, ids: string[]): void {
	if (Array.isArray(value)) {
		for (const item of value) {
			collectIdsInto(item, ids);
		}
	}

	if (isRecord(value)) {
		if (typeof value.id === "string") {
			ids.push(value.id);
		}

		for (const nested of Object.values(value)) {
			collectIdsInto(nested, ids);
		}
	}
}

function isBindingConfigurationAnnotation(value: unknown): value is { readonly name: string; readonly value: string } {
	return isRecord(value) && value.name === "bindingConfiguration" && typeof value.value === "string";
}

function isModelHeader(value: unknown): value is ModelHeader {
	return (
		isRecord(value) &&
		typeof value.id === "string" &&
		typeof value.modelType === "string" &&
		typeof value.modelVersion === "string"
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

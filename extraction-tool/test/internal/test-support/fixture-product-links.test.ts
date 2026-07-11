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

import { loadFixtureModels } from "./fixture-context-factory.js";

const PRODUCT_BUNDLE_PATHS = [
	"products/ProductBundle/relationship.json",
	"products/ProductBundle/document-model.json",
	"products/ProductBundle/link-document-model.json"
] as const;

const PRODUCT_BRAND_PATHS = [
	"products/ProductBrand/relationship.json",
	"products/ProductBrand/document-model.json",
	"products/ProductBrand/link-document-model.json"
] as const;

describe("product link document fixtures", () => {
	it("load link documents referenced by LINK relationship fixtures", () => {
		expect(loadableLinkDocumentIds(PRODUCT_BUNDLE_PATHS)).toContain("ProductBundle_LinkModel");
		expect(loadableLinkDocumentIds(PRODUCT_BRAND_PATHS)).toContain("ProductBrand_AdditionalFieldsModel");
	});
});

function loadableLinkDocumentIds(fixturePaths: readonly string[]): readonly string[] {
	const models = loadFixtureModels(fixturePaths);
	const fixtureIds = new Set(models.map(getModelId));
	const relationshipModel = models.find(hasLinkDocumentModel);
	const linkDocumentModel = relationshipModel?.content.linkDocumentModel;

	return typeof linkDocumentModel === "string" && fixtureIds.has(linkDocumentModel) ? [linkDocumentModel] : [];
}

function getModelId(model: GenericModel): string {
	const id = (model as { readonly header?: { readonly id?: unknown } }).header?.id;

	if (typeof id !== "string") {
		throw new Error("Fixture model must contain header.id");
	}

	return id;
}

function hasLinkDocumentModel(
	model: GenericModel
): model is GenericModel & { readonly content: { readonly linkDocumentModel: unknown } } {
	const content = (model as { readonly content?: unknown }).content;

	return typeof content === "object" && content !== null && "linkDocumentModel" in content;
}

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

import type { QueryModel } from "@com.mgmtp.a12.querymodel/querymodel-core";

import type {
	QueryStrategy,
	TypedGeneratedDocAnalysis
} from "../../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/types.js";
import {
	getLinkQueryModelId,
	resolveQueryStrategy,
	getCandidateQueryModelId,
	generateCandidateQueryModel,
	generateLinkOverviewQueryModel
} from "../../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/query-model-generator.js";

function createAnalysis(overrides?: Partial<TypedGeneratedDocAnalysis>): TypedGeneratedDocAnalysis {
	return {
		targetDocumentModelId: "Address-document",
		linkDocumentModelId: undefined,
		targetGroupPrefix: "I4_",
		relationshipGroupPrefix: undefined,
		...overrides
	};
}

function expectCanonicalQueryRoot(result: QueryModel, targetDocumentModel: string, relationshipName: string): void {
	expect(result.header.modelType).toBe("query");
	expect(result.header.modelVersion).toBe("0.1.0");
	expect(result.header.annotations).toEqual([]);
	expect(result.header.modelReferences).toEqual([
		{
			purpose: "document-model-for-query",
			modelType: "document",
			alias: "DM",
			reference: targetDocumentModel
		},
		{
			purpose: "relationship-model-for-query",
			modelType: "relationship",
			alias: "RM",
			reference: relationshipName
		}
	]);
	expect(result.content.targetDocumentModel).toBe(targetDocumentModel);
	expect(result.content.projectionName).toBe("document");
	expect(result.content.paging).toEqual({ pageNumber: 0, pageSize: 50 });
	expect(result.content.links).toHaveLength(1);
	expect(result.content.links![0].relationshipModel).toBe(relationshipName);
	expect("constraints" in result.content).toBe(false);
	expect("entityModelId" in result.content).toBe(false);
	expect("pageSize" in result.content).toBe(false);
	expect("strategy" in result.content).toBe(false);
}

describe("resolveQueryStrategy", () => {
	it("should return HAS strategy when duplicatesAllowed is false", () => {
		const result = resolveQueryStrategy(false, "Address-document", "Claim-document");
		expect(result.kind).toBe("has");

		if (result.kind === "has") {
			expect(result.targetDocumentModelId).toBe("Address-document");
			expect(result.sourceDocumentModelId).toBe("Claim-document");
		}
	});

	it("should return EXCLUDE strategy when duplicatesAllowed is true", () => {
		const result = resolveQueryStrategy(true, "BusinessPartner-document", "Contract-document");
		expect(result.kind).toBe("exclude");

		if (result.kind === "exclude") {
			expect(result.sourceDocumentModelId).toBe("Contract-document");
		}
	});
});

describe("generateLinkOverviewQueryModel", () => {
	it("should generate canonical query model with HAS constraint", () => {
		const analysis = createAnalysis({ targetDocumentModelId: "Address-document" });
		const strategy: QueryStrategy = {
			kind: "has",
			targetDocumentModelId: "Address-document",
			sourceDocumentModelId: "Claim-document"
		};

		const result = generateLinkOverviewQueryModel(
			analysis,
			strategy,
			"LocationLinks-overview",
			"Location",
			"claim",
			"address"
		);
		expect(result.header.id).toBe("LocationLinks-overview-query");
		expectCanonicalQueryRoot(result, "Address-document", "Location");
		expect(result.content.links![0].targetRole).toBe("claim");
		expect(result.content.links![0].constraint).toEqual({
			operator: "exact_match",
			field: "/__meta/docRef",
			value: "${Claim-document, [/__meta/docRef]}"
		});
		expect(result.content.constraint).toEqual({
			operator: "has",
			relationshipModel: "Location",
			targetRole: "claim",
			constraint: {
				operator: "exact_match",
				field: "/__meta/docRef",
				value: "${Claim-document, [/__meta/docRef]}"
			},
			maxDepth: 1
		});
	});

	// Rule Q-EXCLUDE master-parity: exclude-mode queries must target the SOURCE/FORM
	// document and use the ITEMS role as links[0].targetRole so OE's
	// display-document switching resolves columns against the correct document.
	// Previously this test asserted the inverted (broken) direction;
	// updated to match master evidence from runtime-current-vs-master-scdm.md.
	it("should generate master-parity query model with EXCLUDE constraint — CoInsurer-like fixture", () => {
		// CoInsurer: items=businessPartner, source=contract
		// analysis has targetDocumentModelId=BusinessPartner-document (items doc)
		// strategy.sourceDocumentModelId=Contract-document (source/form doc)
		const analysis = createAnalysis({ targetDocumentModelId: "BusinessPartner-document" });
		const strategy: QueryStrategy = {
			kind: "exclude",
			sourceDocumentModelId: "Contract-document"
		};

		const result = generateLinkOverviewQueryModel(
			analysis,
			strategy,
			"CoInsurerLinks-overview",
			"CoInsurer",
			"contract", // sourceRole
			"businessPartner" // itemsRole
		);
		expect(result.header.id).toBe("CoInsurerLinks-overview-query");
		// Rule Q-EXCLUDE: header + content must reference CONTRACT (source doc), not BP
		expectCanonicalQueryRoot(result, "Contract-document", "CoInsurer");
		// exclude flag present
		expect(result.content.exclude).toBe(true);
		// outer constraint: exact_match against source doc
		expect(result.content.constraint).toEqual({
			operator: "exact_match",
			field: "/__meta/docRef",
			value: "${Contract-document, [/__meta/docRef]}"
		});
		// links[0].targetRole = items role (businessPartner) — OE uses this to switch display doc
		expect(result.content.links![0].targetRole).toBe("businessPartner");
		// nested HAS constraint: targetRole = source role (contract) — unchanged
		expect(result.content.links![0].constraint).toEqual({
			operator: "has",
			relationshipModel: "CoInsurer",
			targetRole: "contract",
			constraint: {
				operator: "exact_match",
				field: "/__meta/docRef",
				value: "${Contract-document, [/__meta/docRef]}"
			},
			maxDepth: 1
		});
		// constraint object itself must not carry an 'exclude' property
		expect("exclude" in (result.content.constraint ?? {})).toBe(false);
	});

	// Rule Q-EXCLUDE: ProductBundle-like fixture (vanilla-relationships)
	// Product_Bundle_SelectedItemsOverview: items=Product, source=Bundle
	it("should generate master-parity query model with EXCLUDE constraint — ProductBundle-like fixture", () => {
		const analysis = createAnalysis({ targetDocumentModelId: "Product-document" });
		const strategy: QueryStrategy = {
			kind: "exclude",
			sourceDocumentModelId: "Bundle-document"
		};

		const result = generateLinkOverviewQueryModel(
			analysis,
			strategy,
			"Product_Bundle_SelectedItemsOverview",
			"ProductBundle",
			"Bundle", // sourceRole
			"Product" // itemsRole
		);
		// target = source (Bundle) document — master parity
		expectCanonicalQueryRoot(result, "Bundle-document", "ProductBundle");
		expect(result.content.exclude).toBe(true);
		// outer constraint exact_match against Bundle-document
		expect(result.content.constraint).toMatchObject({
			operator: "exact_match",
			value: "${Bundle-document, [/__meta/docRef]}"
		});
		// links[0].targetRole = Product (items role)
		expect(result.content.links![0].targetRole).toBe("Product");
		// nested HAS targetRole = Bundle (source role)
		expect(result.content.links![0].constraint).toMatchObject({
			operator: "has",
			targetRole: "Bundle"
		});
	});

	// Rule Q-EXCLUDE: Bundle_Product_SelectedItemsOverview: items=Bundle, source=Product
	it("should generate master-parity query model with EXCLUDE constraint — Bundle_Product-like fixture", () => {
		const analysis = createAnalysis({ targetDocumentModelId: "Bundle-document" });
		const strategy: QueryStrategy = {
			kind: "exclude",
			sourceDocumentModelId: "Product-document"
		};

		const result = generateLinkOverviewQueryModel(
			analysis,
			strategy,
			"Bundle_Product_SelectedItemsOverview",
			"ProductBundle",
			"Product", // sourceRole
			"Bundle" // itemsRole
		);
		// target = source (Product) document — master parity
		expectCanonicalQueryRoot(result, "Product-document", "ProductBundle");
		expect(result.content.exclude).toBe(true);
		expect(result.content.links![0].targetRole).toBe("Bundle");
		expect(result.content.links![0].constraint).toMatchObject({
			operator: "has",
			targetRole: "Product"
		});
	});

	// Rule Q-HAS regression: ProductBrand-like fixture (duplicatesAllowed=false / HAS mode)
	// generateLinkOverviewQueryModel must remain unchanged for HAS strategies.
	it("should generate unchanged HAS query model — ProductBrand-like regression", () => {
		// ProductBrand: items=Product, source=Brand, duplicatesAllowed=false → HAS
		const analysis = createAnalysis({ targetDocumentModelId: "Product-document" });
		const strategy: QueryStrategy = {
			kind: "has",
			targetDocumentModelId: "Product-document",
			sourceDocumentModelId: "Brand-document"
		};

		const result = generateLinkOverviewQueryModel(
			analysis,
			strategy,
			"Product_Brand_SelectedItemsOverview",
			"ProductBrand",
			"Brand", // sourceRole
			"Product" // itemsRole (not used in HAS mode)
		);
		// HAS: target = items (Product) document — unchanged
		expectCanonicalQueryRoot(result, "Product-document", "ProductBrand");
		expect(result.content.exclude).toBeUndefined();
		// links[0].targetRole = source role (Brand) — unchanged
		expect(result.content.links![0].targetRole).toBe("Brand");
		// outer constraint: HAS wrapping exact_match
		expect(result.content.constraint).toEqual({
			operator: "has",
			relationshipModel: "ProductBrand",
			targetRole: "Brand",
			constraint: {
				operator: "exact_match",
				field: "/__meta/docRef",
				value: "${Brand-document, [/__meta/docRef]}"
			},
			maxDepth: 1
		});
		// links[0].constraint: direct exact_match (HAS, not a nested has)
		expect(result.content.links![0].constraint).toEqual({
			operator: "exact_match",
			field: "/__meta/docRef",
			value: "${Brand-document, [/__meta/docRef]}"
		});
	});

	it("should copy source form roles annotations to generated link query headers", () => {
		const rolesAnnotations = [{ name: "roles", value: "admin" }];
		const analysis = createAnalysis({ targetDocumentModelId: "Address-document" });
		const strategy: QueryStrategy = {
			kind: "has",
			targetDocumentModelId: "Address-document",
			sourceDocumentModelId: "Claim-document"
		};

		const result = generateLinkOverviewQueryModel(
			analysis,
			strategy,
			"LocationLinks-overview",
			"Location",
			"claim",
			"address",
			rolesAnnotations
		);

		expect(result.header.annotations).toEqual(rolesAnnotations);
		expect(result.header.annotations?.[0]).toBe(rolesAnnotations[0]);
	});
});

describe("generateCandidateQueryModel", () => {
	it("should generate canonical available-items query model", () => {
		const analysis = createAnalysis({ targetDocumentModelId: "Address-document" });
		const strategy: QueryStrategy = {
			kind: "has",
			targetDocumentModelId: "Address-document",
			sourceDocumentModelId: "Claim-document"
		};

		const result = generateCandidateQueryModel(analysis, strategy, "Address-overview--Location", "Location", "claim");
		expect(result.header.id).toBe("Address-overview--Location-query");
		expectCanonicalQueryRoot(result, "Address-document", "Location");
		expect(result.content.constraint).toBeUndefined();
	});

	it("should copy source form roles annotations to generated candidate query headers", () => {
		const rolesAnnotations = [{ name: "roles", value: "editor" }];
		const analysis = createAnalysis({ targetDocumentModelId: "Address-document" });
		const strategy: QueryStrategy = {
			kind: "has",
			targetDocumentModelId: "Address-document",
			sourceDocumentModelId: "Claim-document"
		};

		const result = generateCandidateQueryModel(
			analysis,
			strategy,
			"Address-overview--Location",
			"Location",
			"claim",
			rolesAnnotations
		);

		expect(result.header.annotations).toEqual(rolesAnnotations);
		expect(result.header.annotations?.[0]).toBe(rolesAnnotations[0]);
	});

	it("uses exact_match link constraint for exclude-mode candidate queries", () => {
		const analysis = createAnalysis({ targetDocumentModelId: "BusinessPartner-document" });
		const strategy: QueryStrategy = {
			kind: "exclude",
			sourceDocumentModelId: "Contract-document"
		};

		const result = generateCandidateQueryModel(
			analysis,
			strategy,
			"BusinessPartner_AvailableItemsOverview--CoInsurer",
			"CoInsurer",
			"contract"
		);
		expect(result.content.constraint).toBeUndefined();
		expect(result.content.exclude).toBeUndefined();
		expect(result.content.links![0].constraint).toEqual({
			operator: "exact_match",
			field: "/__meta/docRef",
			value: "${Contract-document, [/__meta/docRef]}"
		});
	});
});

describe("getLinkQueryModelId", () => {
	it("should append -query suffix", () => {
		expect(getLinkQueryModelId("LocationLinks-overview")).toBe("LocationLinks-overview-query");
	});

	it("should work with clone IDs", () => {
		expect(getLinkQueryModelId("Address-overview--PostAddress")).toBe("Address-overview--PostAddress-query");
	});
});

describe("getCandidateQueryModelId", () => {
	it("should append -query suffix", () => {
		expect(getCandidateQueryModelId("Address-overview")).toBe("Address-overview-query");
	});
});

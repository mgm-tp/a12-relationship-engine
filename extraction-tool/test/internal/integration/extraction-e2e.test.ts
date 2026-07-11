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

import type { Annotation } from "@com.mgmtp.a12.base/base-model-api";

import { extractionIsMigrated } from "../../../src/internal/steps/RuM/extraction/index.js";
import { FORM_MODEL_VERSION } from "../../../src/internal/steps/RuM/extraction/constants.js";
import { getHeader } from "../../../src/internal/steps/RuM/extraction/model-accessors/header-accessors.js";
import { extractionModelAttributeAccessor } from "../../../src/internal/steps/RuM/extraction/model-attribute-accessor.js";
import {
	isFormModel,
	isQueryModel,
	isBindingModel,
	isOverviewModel,
	isDocumentModel,
	isRelationshipModel,
	hasBindingAnnotation
} from "../../../src/internal/steps/RuM/extraction/model-accessors/type-guards.js";

function makeModel(id: string, modelType: string, modelVersion = "1.0.0", annotations?: Annotation[]): object {
	return {
		header: {
			id,
			modelType,
			modelVersion,
			annotations: annotations ?? [],
			locales: [{ code: "en" }]
		}
	};
}

describe("E2E harness — extraction pipeline wiring", () => {
	describe("model-attribute-accessor", () => {
		it("isTargetModel returns true for form models with bindingConfiguration", () => {
			const model = makeModel("test-form", "form", FORM_MODEL_VERSION, [{ name: "bindingConfiguration", value: "[]" }]);
			expect(extractionModelAttributeAccessor.isTargetModel(model)).toBe(true);
		});

		it("isTargetModel returns false for non-form models", () => {
			const model = makeModel("test-overview", "overview", "1.0.0", [{ name: "bindingConfiguration", value: "[]" }]);
			expect(extractionModelAttributeAccessor.isTargetModel(model)).toBe(false);
		});

		it("isTargetModel returns false for form models without annotation", () => {
			const model = makeModel("test-form", "form", FORM_MODEL_VERSION);
			expect(extractionModelAttributeAccessor.isTargetModel(model)).toBe(false);
		});

		it("getVersion returns 1.0.0 for models with bindingConfiguration (synthetic versioning)", () => {
			const model = makeModel("test-form", "form", FORM_MODEL_VERSION, [{ name: "bindingConfiguration", value: "[]" }]);
			expect(extractionModelAttributeAccessor.getVersion(model)).toBe("1.0.0");
		});

		it("getVersion returns modelVersion for models without annotation", () => {
			const model = makeModel("test-form", "form", FORM_MODEL_VERSION);
			expect(extractionModelAttributeAccessor.getVersion(model)).toBe(FORM_MODEL_VERSION);
		});

		it("setVersion is a NO-OP (preserves form-engine version)", () => {
			const model = makeModel("test-form", "form", FORM_MODEL_VERSION);
			const result = extractionModelAttributeAccessor.setVersion(model, "2.0.0");
			expect(result).toBe(model);
		});
	});

	describe("idempotency — isMigrated", () => {
		it("returns false for models with annotation but no RuM refs", () => {
			const model = makeModel("test-form", "form", FORM_MODEL_VERSION, [{ name: "bindingConfiguration", value: "[]" }]);
			expect(extractionIsMigrated(model)).toBe(false);
		});

		it("can be called without context", () => {
			const model = makeModel("test-form", "form", FORM_MODEL_VERSION);
			expect(extractionIsMigrated(model)).toBe(false);
		});
	});

	describe("type guard integration", () => {
		it("all model type guards work together correctly", () => {
			const formModel = { ...makeModel("f", "form"), content: { screens: [] } };
			const overviewModel = makeModel("o", "overview");
			const relModel = makeModel("r", "relationship");
			const docModel = makeModel("d", "document");
			const queryModel = makeModel("q", "query");

			expect(isFormModel(formModel)).toBe(true);
			expect(isFormModel(overviewModel)).toBe(false);
			expect(isOverviewModel(overviewModel)).toBe(true);
			expect(isRelationshipModel(relModel)).toBe(true);
			expect(isDocumentModel(docModel)).toBe(true);
			expect(isQueryModel(queryModel)).toBe(true);
		});

		it("hasBindingAnnotation works with real form model headers", () => {
			const model = makeModel("test", "form", "1.0.0", [{ name: "bindingConfiguration", value: "[]" }]);
			const header = getHeader(model);
			expect(hasBindingAnnotation(header)).toBe(true);
		});
	});

	describe("isBindingModel deep validation", () => {
		it("validates a real binding model structure", () => {
			const binding = {
				type: "relationship",
				elementId: "detachedrepeat-53225",
				details: {
					name: "test-binding",
					metaInformation: { version: "1.0.0" },
					relationshipName: "CoInsurer",
					targetRole: "businessPartner",
					components: [
						{
							id: "unused",
							name: "TableList",
							props: {},
							models: [{ name: "SomeOverview", use: "link" }]
						}
					]
				}
			};
			expect(isBindingModel(binding)).toBe(true);
		});

		it("rejects null", () => {
			expect(isBindingModel(null)).toBe(false);
		});

		it("rejects missing components", () => {
			expect(
				isBindingModel({
					type: "relationship",
					elementId: "e1",
					details: {
						name: "b",
						metaInformation: { version: "1.0.0" },
						relationshipName: "R",
						targetRole: "T",
						components: []
					}
				})
			).toBe(false);
		});

		it("rejects wrong type", () => {
			expect(
				isBindingModel({
					type: "other",
					elementId: "e1",
					details: {
						name: "b",
						metaInformation: { version: "1.0.0" },
						relationshipName: "R",
						targetRole: "T",
						components: [{ name: "c" }]
					}
				})
			).toBe(false);
		});
	});
});

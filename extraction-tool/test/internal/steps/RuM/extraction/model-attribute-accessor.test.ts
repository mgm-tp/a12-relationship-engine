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

import { extractionModelAttributeAccessor } from "../../../../../src/internal/steps/RuM/extraction/model-attribute-accessor.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createFormModel(overrides?: Record<string, unknown>) {
	return {
		header: {
			id: "TestForm",
			modelType: "form",
			modelVersion: "1.0.0",
			...overrides
		}
	};
}

// ---------------------------------------------------------------------------
// isTargetModel — must be form with bindingConfiguration annotation
// ---------------------------------------------------------------------------

describe("isTargetModel", () => {
	it("should return true for a form model with bindingConfiguration annotation", () => {
		const model = createFormModel({
			annotations: [{ name: "bindingConfiguration", value: "{}" }]
		});
		expect(extractionModelAttributeAccessor.isTargetModel(model)).toBe(true);
	});

	it("should return false for a form model without annotations", () => {
		const model = createFormModel();
		expect(extractionModelAttributeAccessor.isTargetModel(model)).toBe(false);
	});

	it("should return false for a form model with non-binding annotation", () => {
		const model = createFormModel({
			annotations: [{ name: "roles", value: "test" }]
		});
		expect(extractionModelAttributeAccessor.isTargetModel(model)).toBe(false);
	});

	it("should return false for a non-form model with binding annotation", () => {
		const model = {
			header: {
				id: "OverviewModel",
				modelType: "overview",
				modelVersion: "1.0.0",
				annotations: [{ name: "bindingConfiguration", value: "{}" }]
			}
		};
		expect(extractionModelAttributeAccessor.isTargetModel(model)).toBe(false);
	});

	it("should return false for a model with no header", () => {
		expect(extractionModelAttributeAccessor.isTargetModel({})).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// isIgnoredModel — always returns false
// ---------------------------------------------------------------------------

describe("isIgnoredModel", () => {
	it("should return false for any model", () => {
		const isIgnored = extractionModelAttributeAccessor.isIgnoredModel;

		if (isIgnored) {
			expect(isIgnored({})).toBe(false);
			expect(isIgnored(createFormModel())).toBe(false);
		}
	});
});

// ---------------------------------------------------------------------------
// getId
// ---------------------------------------------------------------------------

describe("getId", () => {
	it("should return the model ID from header", () => {
		const model = createFormModel();
		expect(extractionModelAttributeAccessor.getId(model)).toBe("TestForm");
	});

	it("should return empty string for model without header", () => {
		expect(extractionModelAttributeAccessor.getId({})).toBe("");
	});

	it("should return empty string for model with header but no id", () => {
		const model = { header: { modelType: "form", modelVersion: "1.0.0" } };
		expect(extractionModelAttributeAccessor.getId(model)).toBe("");
	});
});

// ---------------------------------------------------------------------------
// getVersion — synthetic versioning logic
// ---------------------------------------------------------------------------

describe("getVersion", () => {
	it("should return '1.0.0' for models with bindingConfiguration annotation (synthetic version)", () => {
		const model = createFormModel({
			modelVersion: "2.0.0",
			annotations: [{ name: "bindingConfiguration", value: "{}" }]
		});
		// Even though modelVersion is "2.0.0", getVersion returns "1.0.0"
		// because hasBindingAnnotation takes priority
		expect(extractionModelAttributeAccessor.getVersion(model)).toBe("1.0.0");
	});

	it("should return modelVersion for models without binding annotation", () => {
		const model = createFormModel({ modelVersion: "3.0.0" });
		expect(extractionModelAttributeAccessor.getVersion(model)).toBe("3.0.0");
	});

	it("should return '1.0.0' as default when modelVersion is missing", () => {
		const model = createFormModel({ modelVersion: undefined });
		expect(extractionModelAttributeAccessor.getVersion(model)).toBe("1.0.0");
	});

	it("should return '1.0.0' for model without header", () => {
		expect(extractionModelAttributeAccessor.getVersion({})).toBe("1.0.0");
	});
});

// ---------------------------------------------------------------------------
// setVersion — currently a no-op
// ---------------------------------------------------------------------------

describe("setVersion", () => {
	it("should return the model unchanged", () => {
		const model = createFormModel({
			annotations: [{ name: "bindingConfiguration", value: "{}" }]
		});
		const result = extractionModelAttributeAccessor.setVersion(model, "2.0.0-alpha.2");
		expect(result).toBe(model);
		expect((result as Record<string, unknown>).header).toBe(model.header);
	});
});

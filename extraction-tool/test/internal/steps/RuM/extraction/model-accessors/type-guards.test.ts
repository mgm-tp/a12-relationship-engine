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

import {
	isFormModel,
	isQueryModel,
	isBindingModel,
	isOverviewModel,
	isDocumentModel,
	isRelationshipModel,
	hasBindingAnnotation,
	isValidComponentType,
	isRelationshipUiModel
} from "../../../../../../src/internal/steps/RuM/extraction/model-accessors/type-guards.js";

// ---------------------------------------------------------------------------
// Shared test model factory
// ---------------------------------------------------------------------------

function createModel(modelType: string) {
	return {
		header: { id: `test-${modelType}`, modelType, modelVersion: "1.0.0" }
	};
}

function createFormModel() {
	return {
		header: { id: "test-form", modelType: "form", modelVersion: "1.0.0" },
		content: {
			screens: []
		}
	};
}

// ---------------------------------------------------------------------------
// 1-6: Model type guards
// ---------------------------------------------------------------------------

describe("isFormModel", () => {
	it("should return true for a form model with screens", () => {
		expect(isFormModel(createFormModel())).toBe(true);
	});

	it("should return false for other modelTypes", () => {
		expect(isFormModel(createModel("overview"))).toBe(false);
		expect(isFormModel(createModel("document"))).toBe(false);
		expect(isFormModel(createModel("relationship"))).toBe(false);
	});

	it("should return false for form model without content.screens", () => {
		expect(isFormModel(createModel("form"))).toBe(false);
		expect(isFormModel({ header: { id: "test", modelType: "form", modelVersion: "1.0.0" }, content: {} })).toBe(false);
	});

	it("should return false for model without header", () => {
		expect(isFormModel({})).toBe(false);
	});

	it("should return false for model with header but no modelType", () => {
		expect(isFormModel({ header: { id: "test", modelVersion: "1.0.0" } })).toBe(false);
	});
});

describe("isOverviewModel", () => {
	it("should return true for modelType 'overview'", () => {
		expect(isOverviewModel(createModel("overview"))).toBe(true);
	});

	it("should return false for other modelTypes", () => {
		expect(isOverviewModel(createModel("form"))).toBe(false);
	});

	it("should return false for model without header", () => {
		expect(isOverviewModel({})).toBe(false);
	});
});

describe("isRelationshipUiModel", () => {
	it("should return true for modelType 'relationship-ui'", () => {
		expect(isRelationshipUiModel(createModel("relationship-ui"))).toBe(true);
	});

	it("should return false for other modelTypes", () => {
		expect(isRelationshipUiModel(createModel("relationship"))).toBe(false);
		expect(isRelationshipUiModel(createModel("form"))).toBe(false);
	});

	it("should return false for model without header", () => {
		expect(isRelationshipUiModel({})).toBe(false);
	});
});

describe("isRelationshipModel", () => {
	it("should return true for modelType 'relationship'", () => {
		expect(isRelationshipModel(createModel("relationship"))).toBe(true);
	});

	it("should return false for other modelTypes", () => {
		expect(isRelationshipModel(createModel("form"))).toBe(false);
		expect(isRelationshipModel(createModel("relationship-ui"))).toBe(false);
	});

	it("should return false for model without header", () => {
		expect(isRelationshipModel({})).toBe(false);
	});
});

describe("isDocumentModel", () => {
	it("should return true for modelType 'document'", () => {
		expect(isDocumentModel(createModel("document"))).toBe(true);
	});

	it("should return false for other modelTypes", () => {
		expect(isDocumentModel(createModel("form"))).toBe(false);
		expect(isDocumentModel(createModel("overview"))).toBe(false);
	});

	it("should return false for model without header", () => {
		expect(isDocumentModel({})).toBe(false);
	});
});

describe("isQueryModel", () => {
	it("should return true for modelType 'query'", () => {
		expect(isQueryModel(createModel("query"))).toBe(true);
	});

	it("should return false for other modelTypes", () => {
		expect(isQueryModel(createModel("form"))).toBe(false);
		expect(isQueryModel(createModel("document"))).toBe(false);
	});

	it("should return false for model without header", () => {
		expect(isQueryModel({})).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// 7: hasBindingAnnotation
// ---------------------------------------------------------------------------

describe("hasBindingAnnotation", () => {
	it("should return true when header has a bindingConfiguration annotation", () => {
		const header = {
			id: "test",
			modelType: "form",
			modelVersion: "1.0.0",
			annotations: [{ name: "bindingConfiguration", value: "{}" }]
		};
		expect(hasBindingAnnotation(header)).toBe(true);
	});

	it("should return false when header has no bindingConfiguration annotation", () => {
		const header = {
			id: "test",
			modelType: "form",
			modelVersion: "1.0.0",
			annotations: [{ name: "roles", value: "test" }]
		};
		expect(hasBindingAnnotation(header)).toBe(false);
	});

	it("should return false when header has no annotations", () => {
		const header = {
			id: "test",
			modelType: "form",
			modelVersion: "1.0.0"
		};
		expect(hasBindingAnnotation(header)).toBe(false);
	});

	it("should return false when header is undefined", () => {
		expect(hasBindingAnnotation(undefined)).toBe(false);
	});

	it("should return false when annotations are empty", () => {
		const header = {
			id: "test",
			modelType: "form",
			modelVersion: "1.0.0",
			annotations: []
		};
		expect(hasBindingAnnotation(header)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// 8: isValidComponentType
// ---------------------------------------------------------------------------

describe("isValidComponentType", () => {
	it("should return true for known component types", () => {
		expect(isValidComponentType("DualPaneSelection")).toBe(true);
		expect(isValidComponentType("TableList")).toBe(true);
		expect(isValidComponentType("DropDownSelection")).toBe(true);
	});

	it("should return false for unknown component types", () => {
		expect(isValidComponentType("SinglePaneSelection")).toBe(false);
		expect(isValidComponentType("triple-pane")).toBe(false);
		expect(isValidComponentType("")).toBe(false);
		expect(isValidComponentType("RadioButtonList")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// 9: isBindingModel
// ---------------------------------------------------------------------------

describe("isBindingModel", () => {
	const validBindingModel = {
		type: "relationship",
		elementId: "binding-1",
		details: {
			metaInformation: { version: "1.0.0" },
			name: "My Binding",
			relationshipName: "Person-Department",
			targetRole: "target",
			components: [
				{
					name: "DualPaneSelection",
					models: [{ name: "overview", use: "candidate" }]
				}
			]
		}
	};

	it("should return true for a valid binding model", () => {
		expect(isBindingModel(validBindingModel)).toBe(true);
	});

	it("should return false for null", () => {
		expect(isBindingModel(null)).toBe(false);
	});

	it("should return false for non-object values", () => {
		expect(isBindingModel("string")).toBe(false);
		expect(isBindingModel(42)).toBe(false);
		expect(isBindingModel(true)).toBe(false);
		expect(isBindingModel(undefined)).toBe(false);
	});

	it("should return false when type is not 'relationship'", () => {
		const model = { ...validBindingModel, type: "form" };
		expect(isBindingModel(model)).toBe(false);
	});

	it("should return false when elementId is not a string", () => {
		const model = { ...validBindingModel, elementId: 123 };
		expect(isBindingModel(model)).toBe(false);
	});

	it("should return false when elementId is empty string", () => {
		const model = { ...validBindingModel, elementId: "" };
		expect(isBindingModel(model)).toBe(false);
	});

	it("should return false when details is missing", () => {
		const model = { ...validBindingModel };
		delete (model as Record<string, unknown>).details;
		expect(isBindingModel(model)).toBe(false);
	});

	it("should return false when details is null", () => {
		const model = { ...validBindingModel, details: null };
		expect(isBindingModel(model)).toBe(false);
	});

	it("should return false when details.name is missing", () => {
		const model = { ...validBindingModel };
		(model as Record<string, unknown>).details = { ...validBindingModel.details };
		delete (model.details as Record<string, unknown>).name;
		expect(isBindingModel(model)).toBe(false);
	});

	it("should return false when details.relationshipName is empty", () => {
		const model = {
			...validBindingModel,
			details: { ...validBindingModel.details, relationshipName: "" }
		};
		expect(isBindingModel(model)).toBe(false);
	});

	it("should return false when details.targetRole is missing", () => {
		const model = {
			...validBindingModel,
			details: { ...validBindingModel.details }
		};
		delete (model.details as Record<string, unknown>).targetRole;
		expect(isBindingModel(model)).toBe(false);
	});

	it("should return false when metaInformation is missing", () => {
		const model = {
			...validBindingModel,
			details: { ...validBindingModel.details }
		};
		delete (model.details as Record<string, unknown>).metaInformation;
		expect(isBindingModel(model)).toBe(false);
	});

	it("should return false when metaInformation.version is not a string", () => {
		const model = {
			...validBindingModel,
			details: {
				...validBindingModel.details,
				metaInformation: { version: 123 }
			}
		};
		expect(isBindingModel(model)).toBe(false);
	});

	it("should return false when components is not an array", () => {
		const model = {
			...validBindingModel,
			details: { ...validBindingModel.details, components: "not-an-array" }
		};
		expect(isBindingModel(model)).toBe(false);
	});

	it("should return false when components is an empty array", () => {
		const model = {
			...validBindingModel,
			details: { ...validBindingModel.details, components: [] }
		};
		expect(isBindingModel(model)).toBe(false);
	});

	it("should return true for a model with valid modificationConfiguration", () => {
		const model = {
			...validBindingModel,
			details: {
				...validBindingModel.details,
				modificationConfiguration: {
					addButtonLabel: [{ locale: "en", text: "Add" }],
					extendParentActivityDescriptor: true
				}
			}
		};
		expect(isBindingModel(model)).toBe(true);
	});
});

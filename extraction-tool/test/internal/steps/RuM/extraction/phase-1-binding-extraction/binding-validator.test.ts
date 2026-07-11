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

import { isUiConfigurationBinding } from "../../../../../../src/internal/steps/RuM/extraction/phase-1-binding-extraction/binding-validator.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createValidBinding(overrides?: Record<string, unknown>): unknown {
	return {
		type: "relationship",
		elementId: "test-element",
		details: {
			name: "TestBinding",
			relationshipName: "TestRelationship",
			targetRole: "Target",
			metaInformation: { version: "1.0.0" },
			components: [
				{
					name: "DualPaneSelection",
					models: [
						{ name: "CandidateOverview", use: "candidate" },
						{ name: "SelectedOverview", use: "link" }
					]
				}
			],
			...overrides
		}
	};
}

// ---------------------------------------------------------------------------
// isUiConfigurationBinding
// ---------------------------------------------------------------------------

describe("isUiConfigurationBinding", () => {
	it("should return true for a valid binding", () => {
		const binding = createValidBinding();
		expect(isUiConfigurationBinding(binding)).toBe(true);
	});

	it("should return false for null", () => {
		expect(isUiConfigurationBinding(null)).toBe(false);
	});

	it("should return false for undefined", () => {
		expect(isUiConfigurationBinding(undefined)).toBe(false);
	});

	it("should return false for a non-object value", () => {
		expect(isUiConfigurationBinding("string")).toBe(false);
		expect(isUiConfigurationBinding(42)).toBe(false);
		expect(isUiConfigurationBinding(true)).toBe(false);
	});

	it("should return false when type is not 'relationship'", () => {
		const binding = createValidBinding();
		(binding as Record<string, unknown>).type = "form";
		expect(isUiConfigurationBinding(binding)).toBe(false);
	});

	it("should return false when elementId is missing", () => {
		const binding = createValidBinding();
		const b = binding as Record<string, unknown>;
		delete b.elementId;
		expect(isUiConfigurationBinding(binding)).toBe(false);
	});

	it("should return false when elementId is empty string", () => {
		const binding = createValidBinding();
		(binding as Record<string, unknown>).elementId = "";
		expect(isUiConfigurationBinding(binding)).toBe(false);
	});

	it("should return false when details is missing", () => {
		const binding = createValidBinding();
		const b = binding as Record<string, unknown>;
		delete b.details;
		expect(isUiConfigurationBinding(binding)).toBe(false);
	});

	it("should return false when details.name is missing", () => {
		const binding = createValidBinding();
		const details = (binding as Record<string, unknown>).details as Record<string, unknown>;
		delete details.name;
		expect(isUiConfigurationBinding(binding)).toBe(false);
	});

	it("should return false when details.relationshipName is missing", () => {
		const binding = createValidBinding();
		const details = (binding as Record<string, unknown>).details as Record<string, unknown>;
		delete details.relationshipName;
		expect(isUiConfigurationBinding(binding)).toBe(false);
	});

	it("should return false when details.targetRole is missing", () => {
		const binding = createValidBinding();
		const details = (binding as Record<string, unknown>).details as Record<string, unknown>;
		delete details.targetRole;
		expect(isUiConfigurationBinding(binding)).toBe(false);
	});

	it("should return false when details.metaInformation is missing", () => {
		const binding = createValidBinding();
		const details = (binding as Record<string, unknown>).details as Record<string, unknown>;
		delete details.metaInformation;
		expect(isUiConfigurationBinding(binding)).toBe(false);
	});

	it("should return false when details.metaInformation.version is not a string", () => {
		const binding = createValidBinding();
		const details = (binding as Record<string, unknown>).details as Record<string, unknown>;
		(details.metaInformation as Record<string, unknown>).version = 123;
		expect(isUiConfigurationBinding(binding)).toBe(false);
	});

	it("should return false when details.components is missing", () => {
		const binding = createValidBinding();
		const details = (binding as Record<string, unknown>).details as Record<string, unknown>;
		delete details.components;
		expect(isUiConfigurationBinding(binding)).toBe(false);
	});

	it("should return false when details.components is empty array", () => {
		const binding = createValidBinding();
		const details = (binding as Record<string, unknown>).details as Record<string, unknown>;
		details.components = [];
		expect(isUiConfigurationBinding(binding)).toBe(false);
	});

	it("should return false when a component entry is null", () => {
		const binding = createValidBinding();
		const details = (binding as Record<string, unknown>).details as Record<string, unknown>;
		details.components = [null];
		expect(isUiConfigurationBinding(binding)).toBe(false);
	});

	it("should return false when a component entry is not an object", () => {
		const binding = createValidBinding();
		const details = (binding as Record<string, unknown>).details as Record<string, unknown>;
		details.components = ["string"];
		expect(isUiConfigurationBinding(binding)).toBe(false);
	});

	it("should return false when a component has empty models array", () => {
		const binding = createValidBinding();
		const details = (binding as Record<string, unknown>).details as Record<string, unknown>;
		details.components = [{ name: "DualPaneSelection", models: [] }];
		expect(isUiConfigurationBinding(binding)).toBe(false);
	});

	it("should return false when a component is missing its name", () => {
		const binding = createValidBinding();
		const details = (binding as Record<string, unknown>).details as Record<string, unknown>;
		details.components = [{ models: [{ name: "TestModel", use: "candidate" }] }];
		expect(isUiConfigurationBinding(binding)).toBe(false);
	});

	it("should return false when a component is missing models", () => {
		const binding = createValidBinding();
		const details = (binding as Record<string, unknown>).details as Record<string, unknown>;
		details.components = [{ name: "DualPaneSelection" }];
		expect(isUiConfigurationBinding(binding)).toBe(false);
	});

	it("should return true for a valid binding with modificationConfiguration", () => {
		const binding = createValidBinding({
			modificationConfiguration: {
				addButtonLabel: [{ locale: "en", text: "Add" }],
				editButtonLabel: [{ locale: "en", text: "Edit" }]
			}
		});
		expect(isUiConfigurationBinding(binding)).toBe(true);
	});
});

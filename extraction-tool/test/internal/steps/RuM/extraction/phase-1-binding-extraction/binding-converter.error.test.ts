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

import type { BindingModel } from "../../../../../../src/internal/steps/binding/binding-model.js";
import type { PipelineContext } from "../../../../../../src/internal/steps/RuM/extraction/types.js";
import { extractBindingModels } from "../../../../../../src/internal/steps/RuM/extraction/phase-1-binding-extraction/index.js";
import { convertLegacyBinding } from "../../../../../../src/internal/steps/RuM/extraction/phase-1-binding-extraction/binding-converter.js";
import { BindingConversionError } from "../../../../../../src/internal/steps/RuM/extraction/phase-1-binding-extraction/binding-conversion-error.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createContext(overrides?: Record<string, unknown>): PipelineContext {
	return {
		formModel: {
			header: {
				id: "TestForm",
				modelType: "form",
				modelVersion: "1.0.0",
				modelReferences: [{ reference: "Overview", modelType: "overview", purpose: "overview" }],
				annotations: [],
				...(overrides?.header as Record<string, unknown> | undefined)
			},
			content: {
				screens: [],
				...(overrides?.content as Record<string, unknown> | undefined)
			}
		},
		formModelId: "TestForm",
		bindings: [],
		migrations: {
			pageSizeMigrations: [],
			rowActionMigrations: [],
			rowActivationMigrations: [],
			overviewLabelMigrations: []
		},
		keepModels: false,
		rolesAnnotations: []
	};
}

function createBrokenBinding(overrides?: Record<string, unknown>): BindingModel {
	return {
		type: "relationship",
		elementId: "bad-element",
		details: {
			name: "BadBinding",
			relationshipName: "BadRelationship",
			targetRole: "Target",
			metaInformation: { version: "1.0.0" },
			components: [{ name: "UnknownComponent", id: "bad", models: [{ name: "Overview", use: "candidate" }] }],
			...(overrides as Record<string, unknown> | undefined)
		}
	} as unknown as BindingModel;
}

function makeFormModel(bindingEntries: object[]): GenericModel {
	return {
		header: {
			id: "TestForm",
			modelType: "form",
			modelVersion: "1.0.0",
			modelReferences: [{ reference: "Overview", modelType: "overview", purpose: "overview" }],
			annotations: [{ name: "bindingConfiguration", value: JSON.stringify(bindingEntries) }]
		}
	} as unknown as GenericModel;
}

// ---------------------------------------------------------------------------
// binding conversion failure behavior
// ---------------------------------------------------------------------------

describe("binding conversion error propagation", () => {
	it("should throw BindingConversionError from convertLegacyBinding with metadata and cause", () => {
		const badBinding = createBrokenBinding();

		expect(() => convertLegacyBinding(badBinding, createContext())).toThrow(BindingConversionError);

		try {
			convertLegacyBinding(badBinding, createContext());
		} catch (error) {
			if (!(error instanceof BindingConversionError)) {
				throw error;
			}

			expect(error.formModelId).toBe("TestForm");
			expect(error.bindingElementId).toBe("bad-element");
			expect(error.relationshipName).toBe("BadRelationship");
			expect(error.cause).toBeInstanceOf(Error);
			expect(error.name).toBe("BindingConversionError");
		}
	});

	it("should propagate BindingConversionError out of extractBindingModels", () => {
		const formModel = makeFormModel([createBrokenBinding()]);
		const context = createContext();

		expect(() => extractBindingModels(formModel, context)).toThrow(BindingConversionError);

		try {
			extractBindingModels(formModel, context);
		} catch (error) {
			if (!(error instanceof BindingConversionError)) {
				throw error;
			}

			expect(error.formModelId).toBe("TestForm");
			expect(error.bindingElementId).toBe("bad-element");
			expect(error.relationshipName).toBe("BadRelationship");
			expect(error.cause).toBeInstanceOf(Error);
		}
	});
});

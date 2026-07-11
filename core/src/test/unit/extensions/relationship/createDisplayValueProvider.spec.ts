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

import { vi, test, expect, describe } from "vitest";

import type { ModelPath } from "@com.mgmtp.a12.base/base-model-api";

import { getMockModels } from "../../../mocks/relationships/mocks.js";
import { DE_LOCALIZER_CTX, US_LOCALIZER_CTX } from "../../../utils/localization.js";
import { createDisplayValueProvider } from "../../../../internal/relationship/ui/components/adapter/SingleSelection.js";

vi.mock("@com.mgmtp.a12.formengine/formengine-core", async (importOriginal) => {
	return {
		// eslint-disable-next-line @typescript-eslint/consistent-type-imports
		...(await importOriginal<typeof import("@com.mgmtp.a12.formengine/formengine-core")>()),
		defaultValueParser: (path: ModelPath, value: string) => value
	};
});

describe("com.mgmtp.a12.relationshipengine-core.lib.extensions.relationship.ui.components.adapter", () => {
	describe("createDisplayValueProvider", () => {
		describe("Reference Column", () => {
			describe("Plain value", () => {
				test("Returns the corresponding value from the document", () => {
					const mockModels = getMockModels({ id: "1", elementRef: "stringField", width: 1 });

					const labelProvider = createDisplayValueProvider(
						mockModels,
						US_LOCALIZER_CTX.localizer,
						US_LOCALIZER_CTX.conversion
					);

					const label = labelProvider({ g1: { stringField: "Test" } });

					expect(label).to.equal("Test");
				});
			});

			describe("Formattable value", () => {
				test("Returns the formatted result", () => {
					const mockModels = getMockModels({ id: "1", elementRef: "numberField", width: 1 });

					const labelProvider = createDisplayValueProvider(mockModels, US_LOCALIZER_CTX.localizer, {
						formatValue: () => "formattedValue",
						parseValue: () => ({ value: "parsedValue" })
					});

					const label = labelProvider({ g1: { numberField: 1 } });

					expect(label).to.equal("formattedValue");
				});
			});

			describe("Localizable value", () => {
				test("Returns a correctly localized value from the document", () => {
					const mockModels = getMockModels({ id: "1", elementRef: "enumField", width: 1 });

					[US_LOCALIZER_CTX, DE_LOCALIZER_CTX].forEach((ctx) => {
						const labelProvider = createDisplayValueProvider(mockModels, ctx.localizer, ctx.conversion);

						const label = labelProvider({ g1: { enumField: "v1" } });

						expect(label).to.equal(`Label.${ctx.locale.language}`);
					});
				});
			});
		});

		describe("Expression Column", () => {
			describe("Formattable value", () => {
				test("Returns the expression result containing the formatted value", () => {
					const mockModels = getMockModels({
						id: "1",
						name: "1",
						expression: 'kontext(g1) { "Expression: " [numberField] }',
						width: 1
					});

					const labelProvider = createDisplayValueProvider(mockModels, US_LOCALIZER_CTX.localizer, {
						formatValue: () => "formattedValue",
						parseValue: () => ({ value: "parsedValue" })
					});

					const label = labelProvider({ g1: { numberField: 1 } });

					expect(label).to.equal("Expression: formattedValue");
				});
			});

			describe("Localizable value", () => {
				test("Returns the expression result containing the localized value from the document", () => {
					const mockModels = getMockModels({
						id: "1",
						name: "1",
						expression: 'kontext(g1) { "Expression: " [enumField] }',
						width: 1
					});

					[US_LOCALIZER_CTX, DE_LOCALIZER_CTX].forEach((ctx) => {
						const labelProvider = createDisplayValueProvider(mockModels, ctx.localizer, {
							formatValue: (_path, value) => `${value}`,
							parseValue: () => ({ value: "parsedValue" })
						});

						const label = labelProvider({ g1: { enumField: "v1" } });

						expect(label).to.equal(`Expression: Label.${ctx.locale.language}`);
					});
				});
			});
		});
	});
});

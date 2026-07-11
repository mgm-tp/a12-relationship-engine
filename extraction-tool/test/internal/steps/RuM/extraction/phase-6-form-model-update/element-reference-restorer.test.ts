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

import type { FormModel } from "../../../../../../src/models/form-model.js";
import { restoreElementReferences } from "../../../../../../src/internal/steps/RuM/extraction/phase-6-form-model-update/element-reference-restorer.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createFormModel(screenElements: readonly FormModel.ScreenElement[]): FormModel {
	return {
		header: {
			id: "TestForm",
			modelType: "form",
			modelVersion: "1.0.0",
			annotations: [],
			modelReferences: []
		},
		content: {
			screens: [
				{
					id: "screen-1",
					name: "Screen 1",
					screenElements
				}
			],
			subHeaderBox: { id: "sub-header-box" },
			footerBox: { id: "footer-box" },
			fieldConfiguration: {},
			groupConfiguration: {},
			defaults: {}
		}
	};
}

function createCustomScreenElement(
	id: string,
	overrides: Readonly<Record<string, unknown>> = {}
): FormModel.CustomScreenElement & Readonly<Record<string, unknown>> {
	return {
		id,
		name: id,
		type: "CustomScreenElement",
		...overrides
	};
}

function createDetailScreen(id: string, screenElements: readonly FormModel.ScreenElement[] = []): FormModel.Screen {
	return {
		id,
		name: id,
		screenElements,
		annotations: []
	};
}

function createDetachedRepeat(
	id: string,
	detailScreen: FormModel.Screen,
	overrides: Partial<FormModel.DetachedRepeat> = {}
): FormModel.DetachedRepeat {
	return {
		id,
		name: id,
		type: "DetachedRepeat",
		groupRef: "group-1",
		detailScreen,
		annotations: [],
		...overrides
	};
}

function createSection(id: string, screenElements: readonly FormModel.ScreenElement[] = []): FormModel.Section {
	return {
		id,
		name: id,
		type: "Section",
		screenElements,
		annotations: []
	};
}

function createMultiColumnSection(
	id: string,
	screenElements: readonly FormModel.ScreenElement[] = []
): FormModel.MultiColumnSection {
	return {
		id,
		name: id,
		type: "MultiColumnSection",
		layout: { lg: "12" },
		screenElements,
		annotations: []
	};
}

function createMultilingualTitle(text: string): FormModel.MultilingualLabel {
	return {
		type: "Multilingual",
		multilingualText: {
			text: [
				{ locale: "en", text },
				{ locale: "de", text }
			]
		}
	};
}

function getFirstScreen(result: FormModel): FormModel.Screen {
	return result.content.screens[0];
}

// ---------------------------------------------------------------------------
// restoreElementReferences
// ---------------------------------------------------------------------------

describe("restoreElementReferences", () => {
	// -----------------------------------------------------------------------
	// CustomScreenElement
	// -----------------------------------------------------------------------

	it("should set reference on top-level CustomScreenElement", () => {
		const formModel = createFormModel([createCustomScreenElement("custom-screen")]);
		const bindingMap = new Map<string, string>([["custom-screen", "TestForm-binding-test_RuM"]]);

		const result = restoreElementReferences(formModel, bindingMap);
		const screenElements = getFirstScreen(result).screenElements;
		const customElem = screenElements[0] as unknown as Record<string, unknown>;

		expect(customElem.reference).toBe("TestForm-binding-test_RuM");
	});

	it("should preserve existing fields when setting CustomScreenElement reference", () => {
		const formModel = createFormModel([
			createCustomScreenElement("custom-screen", { record: { height: 400, width: "100%" } })
		]);
		const bindingMap = new Map<string, string>([["custom-screen", "TestForm-binding-test_RuM"]]);

		const result = restoreElementReferences(formModel, bindingMap);
		const screenElements = getFirstScreen(result).screenElements;
		const customElem = screenElements[0] as unknown as Record<string, unknown>;
		const record = customElem.record as unknown as Record<string, unknown>;

		expect(customElem.reference).toBe("TestForm-binding-test_RuM");
		expect(record.height).toBe(400);
		expect(record.width).toBe("100%");
	});

	// -----------------------------------------------------------------------
	// DetachedRepeat
	// -----------------------------------------------------------------------

	it("should add relationship UI reference annotation on DetachedRepeat", () => {
		const formModel = createFormModel([createDetachedRepeat("detached-repeat", createDetailScreen("det-screen"))]);
		const bindingMap = new Map<string, string>([["detached-repeat", "TestForm-binding-test_RuM"]]);

		const result = restoreElementReferences(formModel, bindingMap);
		const detachedElem = getFirstScreen(result).screenElements[0] as unknown as Record<string, unknown>;
		const annotations = detachedElem.annotations as unknown as ReadonlyArray<Record<string, unknown>>;
		const rumRef = annotations.find((a) => a.name === "a12-relationship-ui-model-reference");

		expect(rumRef).toBeDefined();
		expect(rumRef?.value).toBe("TestForm-binding-test_RuM");
	});

	it("should preserve existing annotations on DetachedRepeat", () => {
		const formModel = createFormModel([
			createDetachedRepeat("detached-repeat", createDetailScreen("det-screen"), {
				annotations: [{ name: "roles", value: "test-role" }]
			})
		]);
		const bindingMap = new Map<string, string>([["detached-repeat", "TestForm-binding-test_RuM"]]);

		const result = restoreElementReferences(formModel, bindingMap);
		const detachedElem = getFirstScreen(result).screenElements[0] as unknown as Record<string, unknown>;
		const annotations = detachedElem.annotations as unknown as ReadonlyArray<Record<string, unknown>>;

		expect(annotations).toHaveLength(2);
		expect(annotations[0].name).toBe("roles");
		expect(annotations[1]).toEqual({ name: "a12-relationship-ui-model-reference", value: "TestForm-binding-test_RuM" });
	});

	it("should retain stale DetachedRepeat relationship-ui annotation while updating canonical annotation", () => {
		const formModel = createFormModel([
			createDetachedRepeat("detached-repeat", createDetailScreen("det-screen"), {
				annotations: [
					{ name: "relationshipUiReference", value: "StaleRuM" },
					{ name: "roles", value: "test-role" },
					{ name: "a12-relationship-ui-model-reference", value: "AnotherRuM" }
				]
			})
		]);
		const bindingMap = new Map<string, string>([["detached-repeat", "NewRuM"]]);

		const result = restoreElementReferences(formModel, bindingMap);
		const detachedElem = getFirstScreen(result).screenElements[0] as unknown as Record<string, unknown>;
		const annotations = detachedElem.annotations as unknown as ReadonlyArray<Record<string, unknown>>;
		const rumRefs = annotations.filter((a) => a.name === "a12-relationship-ui-model-reference");
		const staleRefs = annotations.filter((a) => a.name === "relationshipUiReference");

		expect(rumRefs).toHaveLength(1);
		expect(staleRefs).toHaveLength(1);
		expect(staleRefs[0].value).toBe("StaleRuM");
		expect(rumRefs[0].value).toBe("NewRuM");
	});

	// -----------------------------------------------------------------------
	// Nested containers
	// -----------------------------------------------------------------------

	it("should restore CustomScreenElement reference in nested Section screenElements", () => {
		const formModel = createFormModel([
			createSection("outer-section", [createSection("inner-section", [createCustomScreenElement("nested-custom")])])
		]);
		const bindingMap = new Map<string, string>([["nested-custom", "TestForm-binding-test_RuM"]]);

		const result = restoreElementReferences(formModel, bindingMap);
		const outerSection = getFirstScreen(result).screenElements[0] as unknown as Record<string, unknown>;
		const innerSection = (outerSection.screenElements as readonly Record<string, unknown>[])[0];
		const nestedCustom = (innerSection.screenElements as readonly Record<string, unknown>[])[0];

		expect((nestedCustom as unknown as Record<string, unknown>).reference).toBe("TestForm-binding-test_RuM");
	});

	it("should restore CustomScreenElement reference in nested MultiColumnSection screenElements", () => {
		const formModel = createFormModel([
			createMultiColumnSection("outer-column-section", [createCustomScreenElement("nested-custom")])
		]);
		const bindingMap = new Map<string, string>([["nested-custom", "TestForm-binding-test_RuM"]]);

		const result = restoreElementReferences(formModel, bindingMap);
		const outerSection = getFirstScreen(result).screenElements[0] as unknown as Record<string, unknown>;
		const nestedCustom = (outerSection.screenElements as readonly Record<string, unknown>[])[0];

		expect((nestedCustom as unknown as Record<string, unknown>).reference).toBe("TestForm-binding-test_RuM");
	});

	it("should restore CustomScreenElement reference in DetachedRepeat.detailScreen.screenElements", () => {
		const formModel = createFormModel([
			createDetachedRepeat(
				"detached-repeat",
				createDetailScreen("det-screen", [createCustomScreenElement("detail-custom")])
			)
		]);
		const bindingMap = new Map<string, string>([["detail-custom", "TestForm-binding-detail_RuM"]]);

		const result = restoreElementReferences(formModel, bindingMap);
		const detachedRepeat = getFirstScreen(result).screenElements[0] as unknown as Record<string, unknown>;
		const detailScreen = detachedRepeat.detailScreen as { readonly screenElements: readonly Record<string, unknown>[] };
		const detailCustom = detailScreen.screenElements[0] as unknown as Record<string, unknown>;

		expect(detailCustom.reference).toBe("TestForm-binding-detail_RuM");
	});

	// -----------------------------------------------------------------------
	// Legacy title cleanup
	// -----------------------------------------------------------------------

	describe("legacy title cleanup", () => {
		it("T1 should remove legacy multilingual title and set reference for CustomScreenElement", () => {
			const name = "CategoryCategory-UiConfig-1";
			const formModel = createFormModel([
				createCustomScreenElement(name, {
					name,
					title: createMultilingualTitle(name)
				})
			]);
			const bindingMap = new Map<string, string>([[name, "TestForm-binding-test_RuM"]]);

			const result = restoreElementReferences(formModel, bindingMap);
			const updated = getFirstScreen(result).screenElements[0] as unknown as Record<string, unknown>;

			expect(updated.reference).toBe("TestForm-binding-test_RuM");
			expect(updated.title).toBeUndefined();
		});

		it("T2 should remove legacy title even when CustomScreenElement reference is already set", () => {
			const name = "CategoryCategory-UiConfig-1";
			const formModel = createFormModel([
				createCustomScreenElement(name, {
					name,
					reference: "TestForm-binding-test_RuM",
					title: createMultilingualTitle(name)
				})
			]);
			const bindingMap = new Map<string, string>([[name, "TestForm-binding-test_RuM"]]);

			const result = restoreElementReferences(formModel, bindingMap);
			const updated = getFirstScreen(result).screenElements[0] as unknown as Record<string, unknown>;

			expect(updated.reference).toBe("TestForm-binding-test_RuM");
			expect(updated.title).toBeUndefined();
		});

		it("T3 should preserve authored multilingual title for CustomScreenElement", () => {
			const name = "LocationBinding";
			const title = {
				type: "Multilingual",
				multilingualText: {
					text: [
						{ locale: "en", text: "Location" },
						{ locale: "de", text: "Standort" }
					]
				}
			};
			const formModel = createFormModel([
				createCustomScreenElement("section-10404", {
					name,
					title
				})
			]);
			const bindingMap = new Map<string, string>([["section-10404", "TestForm-binding-test_RuM"]]);

			const result = restoreElementReferences(formModel, bindingMap);
			const updated = getFirstScreen(result).screenElements[0] as unknown as Record<string, unknown>;

			expect(updated.reference).toBe("TestForm-binding-test_RuM");
			expect(updated.title).toEqual(title);
		});

		it("T4 should keep missing title untouched for CustomScreenElement", () => {
			const formModel = createFormModel([createCustomScreenElement("custom-screen")]);
			const bindingMap = new Map<string, string>([["custom-screen", "TestForm-binding-test_RuM"]]);

			const result = restoreElementReferences(formModel, bindingMap);
			const updated = getFirstScreen(result).screenElements[0] as unknown as Record<string, unknown>;

			expect(updated.reference).toBe("TestForm-binding-test_RuM");
			expect(updated.title).toBeUndefined();
		});

		it("T5 should preserve ExpressionLabel title for CustomScreenElement", () => {
			const title: FormModel.ExpressionLabel = { type: "Expression", expressionText: "=1 + 1" };
			const formModel = createFormModel([createCustomScreenElement("custom-screen", { title })]);
			const bindingMap = new Map<string, string>([["custom-screen", "TestForm-binding-test_RuM"]]);

			const result = restoreElementReferences(formModel, bindingMap);
			const updated = getFirstScreen(result).screenElements[0] as unknown as Record<string, unknown>;

			expect(updated.reference).toBe("TestForm-binding-test_RuM");
			expect(updated.title).toEqual(title);
		});

		it("T6 should preserve multilingual title with divergent locale text for CustomScreenElement", () => {
			const title: FormModel.MultilingualLabel = {
				type: "Multilingual",
				multilingualText: {
					text: [
						{ locale: "en", text: "SomeLegacyBinding" },
						{ locale: "de", text: "Echte Bezeichnung" }
					]
				}
			};
			const formModel = createFormModel([
				createCustomScreenElement("some-id", {
					name: "SomeLegacyBinding",
					title
				})
			]);
			const bindingMap = new Map<string, string>([["some-id", "TestForm-binding-detail_RuM"]]);

			const result = restoreElementReferences(formModel, bindingMap);
			const updated = getFirstScreen(result).screenElements[0] as unknown as Record<string, unknown>;

			expect(updated.reference).toBe("TestForm-binding-detail_RuM");
			expect(updated.title).toEqual(title);
		});

		it("T7 should remove legacy title in nested CustomScreenElement", () => {
			const name = "SomeLegacyBinding";
			const formModel = createFormModel([
				createSection("outer", [
					createCustomScreenElement("nested", {
						name,
						title: createMultilingualTitle(name)
					})
				])
			]);
			const bindingMap = new Map<string, string>([["nested", "TestForm-binding-test_RuM"]]);

			const result = restoreElementReferences(formModel, bindingMap);
			const section = getFirstScreen(result).screenElements[0] as unknown as Record<string, unknown>;
			const nested = (section.screenElements as readonly Record<string, unknown>[])[0];

			expect(nested.reference).toBe("TestForm-binding-test_RuM");
			expect(nested.title).toBeUndefined();
		});

		it("T8 should remove legacy multilingual title and add annotation for DetachedRepeat", () => {
			const name = "SomeLegacyBinding";
			const formModel = createFormModel([
				createDetachedRepeat("detached-repeat", createDetailScreen("det-screen"), {
					name,
					title: createMultilingualTitle(name)
				})
			]);
			const bindingMap = new Map<string, string>([["detached-repeat", "TestForm-binding-detail_RuM"]]);

			const result = restoreElementReferences(formModel, bindingMap);
			const detached = getFirstScreen(result).screenElements[0] as unknown as Record<string, unknown>;
			const annotations = detached.annotations as ReadonlyArray<Record<string, unknown>>;
			const annotation = annotations.find((item) => item.name === "a12-relationship-ui-model-reference");

			expect(annotation?.value).toBe("TestForm-binding-detail_RuM");
			expect(detached.title).toBeUndefined();
		});

		it("T9 should remove legacy title when DetachedRepeat annotation already matches target", () => {
			const name = "SomeLegacyBinding";
			const rumRef = "TestForm-binding-detail_RuM";
			const formModel = createFormModel([
				createDetachedRepeat("detached-repeat", createDetailScreen("det-screen"), {
					name,
					title: createMultilingualTitle(name),
					annotations: [{ name: "a12-relationship-ui-model-reference", value: rumRef }]
				})
			]);
			const bindingMap = new Map<string, string>([["detached-repeat", rumRef]]);

			const result = restoreElementReferences(formModel, bindingMap);
			const detached = getFirstScreen(result).screenElements[0] as unknown as Record<string, unknown>;
			const annotations = detached.annotations as ReadonlyArray<Record<string, unknown>>;
			const annotation = annotations.find((item) => item.name === "a12-relationship-ui-model-reference");

			expect(annotation?.value).toBe(rumRef);
			expect(annotations).toHaveLength(1);
			expect(detached.title).toBeUndefined();
		});

		it("T9b should remove legacy title when DetachedRepeat annotation is stale", () => {
			const name = "SomeLegacyBinding";
			const formModel = createFormModel([
				createDetachedRepeat("detached-repeat", createDetailScreen("det-screen"), {
					name,
					title: createMultilingualTitle(name),
					annotations: [{ name: "a12-relationship-ui-model-reference", value: "StaleRuM" }]
				})
			]);
			const bindingMap = new Map<string, string>([["detached-repeat", "TestForm-binding-detail_RuM"]]);

			const result = restoreElementReferences(formModel, bindingMap);
			const detached = getFirstScreen(result).screenElements[0] as unknown as Record<string, unknown>;
			const annotations = detached.annotations as ReadonlyArray<Record<string, unknown>>;
			const annotation = annotations.find((item) => item.name === "a12-relationship-ui-model-reference");

			expect(annotation?.value).toBe("TestForm-binding-detail_RuM");
			expect(detached.title).toBeUndefined();
		});

		it("T10 should keep title absent when DetachedRepeat starts without title", () => {
			const formModel = createFormModel([createDetachedRepeat("detached-repeat", createDetailScreen("det-screen"))]);
			const bindingMap = new Map<string, string>([["detached-repeat", "TestForm-binding-detail_RuM"]]);

			const result = restoreElementReferences(formModel, bindingMap);
			const detached = getFirstScreen(result).screenElements[0] as unknown as Record<string, unknown>;
			const annotations = detached.annotations as ReadonlyArray<Record<string, unknown>>;
			const annotation = annotations.find((item) => item.name === "a12-relationship-ui-model-reference");

			expect(annotation?.value).toBe("TestForm-binding-detail_RuM");
			expect(detached.title).toBeUndefined();
		});

		it("T11 should preserve authored multilingual title for DetachedRepeat", () => {
			const title: FormModel.MultilingualLabel = {
				type: "Multilingual",
				multilingualText: {
					text: [
						{ locale: "en", text: "SomeLegacyBinding" },
						{ locale: "de", text: "Detached policy items" }
					]
				}
			};
			const formModel = createFormModel([
				createDetachedRepeat("detached-repeat", createDetailScreen("det-screen"), {
					name: "SomeLegacyBinding",
					title
				})
			]);
			const bindingMap = new Map<string, string>([["detached-repeat", "TestForm-binding-detail_RuM"]]);

			const result = restoreElementReferences(formModel, bindingMap);
			const detached = getFirstScreen(result).screenElements[0] as unknown as Record<string, unknown>;
			const annotations = detached.annotations as ReadonlyArray<Record<string, unknown>>;
			const annotation = annotations.find((item) => item.name === "a12-relationship-ui-model-reference");

			expect(annotation?.value).toBe("TestForm-binding-detail_RuM");
			expect(detached.title).toEqual(title);
		});
	});

	it("should handle multiple elements from a binding map", () => {
		const formModel = createFormModel([
			createCustomScreenElement("elem1", { record: {} }),
			createSection("container", [createCustomScreenElement("elem2")]),
			createDetachedRepeat("elem3", createDetailScreen("det-screen"))
		]);
		const bindingMap = new Map<string, string>([
			["elem1", "RuM1"],
			["elem2", "RuM2"],
			["elem3", "RuM3"]
		]);

		const result = restoreElementReferences(formModel, bindingMap);
		const [elem1, container, elem3] = getFirstScreen(result).screenElements;

		expect((elem1 as unknown as Record<string, unknown>).reference).toBe("RuM1");
		expect(
			((container as unknown as Record<string, unknown>).screenElements as readonly Record<string, unknown>[])[0]
				.reference
		).toBe("RuM2");
		expect(
			(
				(elem3 as unknown as Record<string, unknown>).annotations as unknown as ReadonlyArray<Record<string, unknown>>
			)[0]
		).toEqual({
			name: "a12-relationship-ui-model-reference",
			value: "RuM3"
		});
	});

	// -----------------------------------------------------------------------
	// Warnings / identity
	// -----------------------------------------------------------------------

	it("should log warning but not throw when elementId not found", () => {
		const formModel = createFormModel([createCustomScreenElement("existing-elem")]);
		const bindingMap = new Map<string, string>([["missing-elem", "RuM1"]]);

		const warnings: string[] = [];
		const logger = { warn: (msg: string) => warnings.push(msg) };

		expect(() => restoreElementReferences(formModel, bindingMap, logger)).not.toThrow();
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain("missing-elem");
	});

	it("should not warn when all elements are found", () => {
		const formModel = createFormModel([createCustomScreenElement("elem1")]);
		const bindingMap = new Map<string, string>([["elem1", "RuM1"]]);

		const warnings: string[] = [];
		const logger = { warn: (msg: string) => warnings.push(msg) };

		restoreElementReferences(formModel, bindingMap, logger);

		expect(warnings).toHaveLength(0);
	});

	it("should return same object when element not found (no logger)", () => {
		const formModel = createFormModel([createCustomScreenElement("existing-elem")]);
		const bindingMap = new Map<string, string>([["missing-elem", "RuM1"]]);

		const result = restoreElementReferences(formModel, bindingMap);

		expect(result).toBe(formModel);
	});

	it("should handle empty binding map", () => {
		const formModel = createFormModel([createCustomScreenElement("elem1")]);
		const bindingMap = new Map<string, string>();

		const result = restoreElementReferences(formModel, bindingMap);

		expect(result).toBe(formModel);
	});

	it("should return new object when modified", () => {
		const formModel = createFormModel([createCustomScreenElement("elem1")]);
		const bindingMap = new Map<string, string>([["elem1", "RuM1"]]);

		const result = restoreElementReferences(formModel, bindingMap);

		expect(result).not.toBe(formModel);
	});
});

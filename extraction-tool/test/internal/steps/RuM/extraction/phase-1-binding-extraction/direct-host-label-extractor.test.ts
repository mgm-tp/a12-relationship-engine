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

import type { FormModel } from "../../../../../../src/models/form-model.js";
import { extractDirectHostLabel } from "../../../../../../src/internal/steps/RuM/extraction/phase-1-binding-extraction/direct-host-label-extractor.js";

function createLeafElement(id: string, title?: FormModel.Label): FormModel.CustomScreenElement {
	return {
		id,
		name: id,
		type: "CustomScreenElement",
		title: title
	};
}

function createMultilingualTitle(text: string): FormModel.MultilingualLabel {
	return {
		type: "Multilingual",
		multilingualText: {
			text: [{ locale: "en", text }]
		}
	};
}

function createExpressionTitle(expressionText: string): FormModel.ExpressionLabel {
	return {
		type: "Expression",
		expressionText
	};
}

function createFormModel(screenElements: readonly FormModel.ScreenElement[]): GenericModel {
	return {
		header: {
			id: "TestForm",
			modelType: "form",
			modelVersion: "1.0.0",
			annotations: []
		},
		content: {
			screens: [
				{
					id: "screen-1",
					name: "screen-1",
					screenElements
				}
			]
		}
	} as unknown as GenericModel;
}

describe("extractDirectHostLabel", () => {
	it("returns the multilingual title for a direct screen element", () => {
		const formModel = createFormModel([createLeafElement("target", createMultilingualTitle("Host label"))]);

		expect(extractDirectHostLabel(formModel, "target")).toEqual([{ locale: "en", text: "Host label" }]);
	});

	it("returns undefined for an expression title", () => {
		const formModel = createFormModel([createLeafElement("target", createExpressionTitle("${hostLabel}"))]);

		expect(extractDirectHostLabel(formModel, "target")).toBeUndefined();
	});

	it("returns undefined when the element is not found", () => {
		const formModel = createFormModel([createLeafElement("other", createMultilingualTitle("Other"))]);

		expect(extractDirectHostLabel(formModel, "target")).toBeUndefined();
	});

	it("returns undefined for a non-form model", () => {
		const model = {
			header: {
				id: "TestOverview",
				modelType: "overview",
				modelVersion: "1.0.0"
			},
			content: {
				screens: []
			}
		} as unknown as GenericModel;

		expect(extractDirectHostLabel(model, "target")).toBeUndefined();
	});

	it("finds a nested element inside Section.screenElements", () => {
		const formModel = createFormModel([
			{
				id: "section-1",
				name: "section-1",
				type: "Section",
				screenElements: [createLeafElement("target", createMultilingualTitle("Section label"))]
			}
		]);

		expect(extractDirectHostLabel(formModel, "target")).toEqual([{ locale: "en", text: "Section label" }]);
	});

	it("finds a nested element inside MultiColumnSection.screenElements", () => {
		const formModel = createFormModel([
			{
				id: "multicolumn-1",
				name: "multicolumn-1",
				type: "MultiColumnSection",
				layout: { lg: "6-6" },
				screenElements: [createLeafElement("target", createMultilingualTitle("Multi column label"))]
			}
		]);

		expect(extractDirectHostLabel(formModel, "target")).toEqual([{ locale: "en", text: "Multi column label" }]);
	});

	it("finds an element inside DetachedRepeat.detailScreen.screenElements", () => {
		const formModel = createFormModel([
			{
				id: "repeat-1",
				name: "repeat-1",
				type: "DetachedRepeat",
				groupRef: "group-1",
				detailScreen: {
					id: "detail-screen",
					name: "detail-screen",
					screenElements: [createLeafElement("target", createMultilingualTitle("Repeat label"))]
				}
			}
		]);

		expect(extractDirectHostLabel(formModel, "target")).toEqual([{ locale: "en", text: "Repeat label" }]);
	});

	it("returns undefined for an empty element id", () => {
		const formModel = createFormModel([createLeafElement("target", createMultilingualTitle("Host label"))]);

		expect(extractDirectHostLabel(formModel, "")).toBeUndefined();
	});

	it("finds an element inside deeply nested sections", () => {
		const formModel = createFormModel([
			{
				id: "section-root",
				name: "section-root",
				type: "Section",
				screenElements: [
					{
						id: "section-nested",
						name: "section-nested",
						type: "Section",
						screenElements: [createLeafElement("target", createMultilingualTitle("Deep label"))]
					}
				]
			}
		]);

		expect(extractDirectHostLabel(formModel, "target")).toEqual([{ locale: "en", text: "Deep label" }]);
	});
});

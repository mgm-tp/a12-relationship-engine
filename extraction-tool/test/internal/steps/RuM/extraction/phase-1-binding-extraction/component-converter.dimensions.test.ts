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

import type { ComponentConfiguration } from "../../../../../../src/internal/steps/binding/binding-model.js";
import type { ComponentKind, PipelineContext } from "../../../../../../src/internal/steps/RuM/extraction/types.js";
import { convertComponents } from "../../../../../../src/internal/steps/RuM/extraction/phase-1-binding-extraction/component-converter.js";

function makeLegacyComponent(name: string, overrides?: Record<string, unknown>): ComponentConfiguration {
	return {
		name,
		id: `test-${name.toLowerCase()}`,
		models: [{ name: "CandidateOverview", use: "candidate" }],
		...overrides
	} as ComponentConfiguration;
}

function createContext(): PipelineContext {
	return {
		formModel: {
			header: {
				id: "TestForm",
				modelType: "form",
				modelVersion: "1.0.0",
				modelReferences: [
					{ reference: "CandidateOverview", modelType: "overview", purpose: "overview" },
					{ reference: "SelectedOverview", modelType: "overview", purpose: "overview" },
					{ reference: "LinkForm", modelType: "form", purpose: "form" }
				],
				annotations: []
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

describe("convertComponents", () => {
	it("should preserve string height prop in output", () => {
		const inputHeight = "50vh";
		const comp = makeLegacyComponent("DualPaneSelection", {
			models: [{ name: "CandidateOverview", use: "candidate" }],
			props: { height: inputHeight }
		});
		const kind: ComponentKind = {
			kind: "DualPaneSelection",
			component: comp
		};
		const result = convertComponents(kind, createContext());

		expect(result.height).toBe(inputHeight);
	});

	it("should stringify numeric height prop in output", () => {
		const inputHeight = 250;
		const comp = makeLegacyComponent("TableList", {
			models: [{ name: "SelectedOverview", use: "link" }],
			props: { height: inputHeight }
		});
		const kind: ComponentKind = {
			kind: "TableList",
			component: comp
		};
		const result = convertComponents(kind, createContext());

		expect(result.height).toBe(String(inputHeight));
	});

	it("should not include height when prop is absent", () => {
		const comp = makeLegacyComponent("DualPaneSelection", {
			models: [{ name: "CandidateOverview", use: "candidate" }]
		});
		const kind: ComponentKind = {
			kind: "DualPaneSelection",
			component: comp
		};
		const result = convertComponents(kind, createContext());

		expect(result.height).toBeUndefined();
	});

	it("should extract dialog dimensions from TableList props into editConfiguration", () => {
		const comp = makeLegacyComponent("TableList", {
			models: [{ name: "SelectedOverview", use: "link" }],
			props: {
				editComponent: "1",
				editDialogWidth: "80%",
				editDialogMaxWidth: "1400px",
				editDialogMaxHeight: "90vh"
			}
		});
		const dualPane = makeLegacyComponent("DualPaneSelection", {
			models: [
				{ name: "CandidateOverview", use: "candidate" },
				{ name: "SelectedOverview", use: "link" }
			]
		});
		const kind: ComponentKind = {
			kind: "TableList",
			component: comp,
			dualPaneComponent: dualPane
		};
		const result = convertComponents(kind, createContext());

		expect(result.editConfiguration?.dialogWidth).toBe("80%");
		expect(result.editConfiguration?.dialogMaxWidth).toBe("1400px");
		expect(result.editConfiguration?.dialogMaxHeight).toBe("90vh");
	});

	it("should not include dialog dimensions in editConfiguration when props are absent", () => {
		const comp = makeLegacyComponent("TableList", {
			models: [{ name: "SelectedOverview", use: "link" }]
		});
		const dualPane = makeLegacyComponent("DualPaneSelection", {
			models: [
				{ name: "CandidateOverview", use: "candidate" },
				{ name: "SelectedOverview", use: "link" }
			]
		});
		const kind: ComponentKind = {
			kind: "TableList",
			component: comp,
			dualPaneComponent: dualPane
		};
		const result = convertComponents(kind, createContext());

		expect(result.editConfiguration?.dialogWidth).toBeUndefined();
		expect(result.editConfiguration?.dialogMaxWidth).toBeUndefined();
		expect(result.editConfiguration?.dialogMaxHeight).toBeUndefined();
	});

	it("should stringify nested DualPane numeric height in editConfiguration", () => {
		const inputHeight = 300;
		const comp = makeLegacyComponent("TableList", {
			models: [{ name: "SelectedOverview", use: "link" }],
			props: { editComponent: "1" }
		});
		const dualPane = makeLegacyComponent("DualPaneSelection", {
			models: [
				{ name: "CandidateOverview", use: "candidate" },
				{ name: "SelectedOverview", use: "link" }
			],
			props: { height: inputHeight }
		});
		const kind: ComponentKind = {
			kind: "TableList",
			component: comp,
			dualPaneComponent: dualPane
		};
		const result = convertComponents(kind, createContext());

		expect(result.editConfiguration?.height).toBe(String(inputHeight));
	});

	it("should preserve nested DualPane string height in editConfiguration", () => {
		const inputHeight = "50vh";
		const comp = makeLegacyComponent("TableList", {
			models: [{ name: "SelectedOverview", use: "link" }],
			props: { editComponent: "1" }
		});
		const dualPane = makeLegacyComponent("DualPaneSelection", {
			models: [
				{ name: "CandidateOverview", use: "candidate" },
				{ name: "SelectedOverview", use: "link" }
			],
			props: { height: inputHeight }
		});
		const kind: ComponentKind = {
			kind: "TableList",
			component: comp,
			dualPaneComponent: dualPane
		};
		const result = convertComponents(kind, createContext());

		expect(result.editConfiguration?.height).toBe(inputHeight);
	});

	it("should leave nested DualPane height undefined in editConfiguration when absent", () => {
		const comp = makeLegacyComponent("TableList", {
			models: [{ name: "SelectedOverview", use: "link" }],
			props: { editComponent: "1" }
		});
		const dualPane = makeLegacyComponent("DualPaneSelection", {
			models: [
				{ name: "CandidateOverview", use: "candidate" },
				{ name: "SelectedOverview", use: "link" }
			]
		});
		const kind: ComponentKind = {
			kind: "TableList",
			component: comp,
			dualPaneComponent: dualPane
		};
		const result = convertComponents(kind, createContext());

		expect(result.editConfiguration?.height).toBeUndefined();
	});

	it("should keep top-level TableList height separate from nested editConfiguration height", () => {
		const comp = makeLegacyComponent("TableList", {
			models: [{ name: "SelectedOverview", use: "link" }],
			props: { editComponent: "1", height: "40vh" }
		});
		const dualPane = makeLegacyComponent("DualPaneSelection", {
			models: [
				{ name: "CandidateOverview", use: "candidate" },
				{ name: "SelectedOverview", use: "link" }
			]
		});
		const kind: ComponentKind = {
			kind: "TableList",
			component: comp,
			dualPaneComponent: dualPane
		};
		const result = convertComponents(kind, createContext());

		expect(result.height).toBe("40vh");
		expect(result.editConfiguration?.height).toBeUndefined();
	});
});

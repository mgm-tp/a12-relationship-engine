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

import type { ComponentKind } from "../../../../../../src/internal/steps/RuM/extraction/types.js";
import type {
	ComponentConfiguration,
	ModificationConfiguration
} from "../../../../../../src/internal/steps/binding/binding-model.js";
import { buildButtonsForComponent } from "../../../../../../src/internal/steps/RuM/extraction/phase-1-binding-extraction/button-builder.js";

function makeComponent(name: string, overrides?: Record<string, unknown>): ComponentConfiguration {
	return {
		name,
		id: `test-${name.toLowerCase()}`,
		models: [{ name: "CandidateOverview", use: "candidate" }],
		...overrides
	} as ComponentConfiguration;
}

function makeComponentWithLink(name: string): ComponentConfiguration {
	return {
		name,
		id: `test-${name.toLowerCase()}`,
		models: [
			{ name: "CandidateOverview", use: "candidate" },
			{ name: "LinkForm", use: "link" }
		]
	};
}

describe("buildButtonsForComponent", () => {
	it("should return 4 buttons for TableList with dualPaneComponent", () => {
		const comp = makeComponent("TableList", {
			props: {
				buttonLabels: {
					edit: [{ locale: "en", text: "Edit" }],
					add: [{ locale: "en", text: "Add" }]
				}
			}
		});
		const kind: ComponentKind = {
			kind: "TableList",
			component: comp,
			dualPaneComponent: makeComponent("DualPaneSelection")
		};
		const buttons = buildButtonsForComponent(kind);

		expect(buttons).toHaveLength(4);
		expect(buttons[0].event).toBe("event_open_edit_modal");
		expect(buttons[0].label).toBeDefined();
		expect(buttons[1].event).toBe("event_add_document");
		expect(buttons[1].label).toBeDefined();
		expect(buttons[2].event).toBe("event_cancel_edit_modal");
		expect(buttons[2].destructive).toBe(true);
		expect(buttons[3].event).toBe("event_submit_edit_modal");
		expect(buttons[3].primary).toBe(true);
	});

	it("should fallback edit button label to editDialogTitle", () => {
		const comp = makeComponent("TableList", {
			props: {
				editDialogTitle: {
					label: [{ locale: "en", text: "Edit Item" }]
				}
			}
		});
		const kind: ComponentKind = {
			kind: "TableList",
			component: comp,
			dualPaneComponent: makeComponent("DualPaneSelection")
		};
		const buttons = buildButtonsForComponent(kind);

		expect(buttons).toHaveLength(4);
		expect(buttons[0].label).toBeDefined();
		expect(buttons[0].label?.[0].text).toBe("Edit Item");
	});

	it("should use bilingual default Edit label when no edit button labels are found", () => {
		const comp = makeComponent("TableList");
		const kind: ComponentKind = {
			kind: "TableList",
			component: comp,
			dualPaneComponent: makeComponent("DualPaneSelection")
		};
		const buttons = buildButtonsForComponent(kind);

		expect(buttons).toHaveLength(4);
		expect(buttons[0].label?.[0].text).toBe("Edit");
		expect(buttons[0].label).toHaveLength(2);
		expect(buttons[0].label?.[1].text).toBe("Bearbeiten");
	});

	it("should fallback add button label to modificationConfiguration.addButtonLabel (with dualPaneComponent)", () => {
		const comp = makeComponent("TableList");
		const kind: ComponentKind = {
			kind: "TableList",
			component: comp,
			dualPaneComponent: makeComponent("DualPaneSelection")
		};
		const modConfig: ModificationConfiguration = {
			addButtonLabel: [{ locale: "en", text: "Create New" }]
		};
		const buttons = buildButtonsForComponent(kind, modConfig);

		expect(buttons).toHaveLength(4);
		expect(buttons[1].label?.[0].text).toBe("Create New");
	});

	it("should fallback add button label to modificationConfiguration.addButtonLabel (without dualPaneComponent)", () => {
		const comp = makeComponent("TableList");
		const kind: ComponentKind = {
			kind: "TableList",
			component: comp
		};
		const modConfig: ModificationConfiguration = {
			addButtonLabel: [{ locale: "en", text: "Create New" }]
		};
		const buttons = buildButtonsForComponent(kind, modConfig);

		expect(buttons).toHaveLength(1);
		expect(buttons[0].label?.[0].text).toBe("Create New");
	});

	it("should use bilingual default Add label when no add button labels are found (with dualPaneComponent)", () => {
		const comp = makeComponent("TableList");
		const kind: ComponentKind = {
			kind: "TableList",
			component: comp,
			dualPaneComponent: makeComponent("DualPaneSelection")
		};
		const buttons = buildButtonsForComponent(kind);

		expect(buttons).toHaveLength(4);
		expect(buttons[1].label?.[0].text).toBe("Add");
	});

	it("should use bilingual default Add label when no add button labels are found (without dualPaneComponent)", () => {
		const comp = makeComponent("TableList");
		const kind: ComponentKind = {
			kind: "TableList",
			component: comp
		};
		const buttons = buildButtonsForComponent(kind);

		expect(buttons).toHaveLength(1);
		expect(buttons[0].label?.[0].text).toBe("Add");
	});

	it("should return only event_add_document for TableList without dualPaneComponent", () => {
		const comp = makeComponent("TableList");
		const kind: ComponentKind = {
			kind: "TableList",
			component: comp
		};
		const buttons = buildButtonsForComponent(kind);

		expect(buttons).toHaveLength(1);
		expect(buttons[0].event).toBe("event_add_document");
	});

	it("should return icon-only event_edit_link_document for DropDownSelection with resolved link form", () => {
		const comp = makeComponentWithLink("DropDownSelection");
		const kind: ComponentKind = {
			kind: "DropDownSelection",
			component: comp
		};
		const modConfig: ModificationConfiguration = {
			editButtonLabel: [
				{ locale: "en", text: "Edit Entry" },
				{ locale: "de", text: "Eintrag bearbeiten" }
			]
		};
		const buttons = buildButtonsForComponent(kind, modConfig, "LinkForm");

		expect(buttons).toEqual([
			{
				event: "event_edit_link_document",
				icon: { name: "description" },
				labelHidden: true,
				label: [
					{ locale: "en", text: "Edit Entry" },
					{ locale: "de", text: "Eintrag bearbeiten" }
				]
			}
		]);
	});

	it("should use generic bilingual hidden edit label for DropDownSelection with resolved link form", () => {
		const comp = makeComponentWithLink("DropDownSelection");
		const kind: ComponentKind = {
			kind: "DropDownSelection",
			component: comp
		};
		const buttons = buildButtonsForComponent(kind, undefined, "LinkForm");

		expect(buttons).toEqual([
			{
				event: "event_edit_link_document",
				icon: { name: "description" },
				labelHidden: true,
				label: [
					{ locale: "en", text: "Edit additional properties" },
					{ locale: "de", text: "Zusätzliche Eigenschaften bearbeiten" }
				]
			}
		]);
	});

	it("should ignore raw link models for DropDownSelection without resolved link form", () => {
		const comp = makeComponentWithLink("DropDownSelection");
		const kind: ComponentKind = {
			kind: "DropDownSelection",
			component: comp
		};
		const buttons = buildButtonsForComponent(kind);

		expect(buttons).toHaveLength(0);
	});

	it("should return empty array for DropDownSelection without link form", () => {
		const comp = makeComponent("DropDownSelection");
		const kind: ComponentKind = {
			kind: "DropDownSelection",
			component: comp
		};
		const buttons = buildButtonsForComponent(kind);

		expect(buttons).toHaveLength(0);
	});

	it("should emit icon-only event_add_document for DropDownSelection with addButtonLabel", () => {
		const comp = makeComponent("DropDownSelection");
		const kind: ComponentKind = {
			kind: "DropDownSelection",
			component: comp
		};
		const modConfig: ModificationConfiguration = {
			addButtonLabel: [
				{ locale: "en", text: "Add new Policy Holder" },
				{ locale: "de", text: "Neuen Policeninhaber hinzufügen" }
			]
		};
		const buttons = buildButtonsForComponent(kind, modConfig);

		expect(buttons).toEqual([
			{
				event: "event_add_document",
				icon: { name: "add" },
				labelHidden: true,
				label: [
					{ locale: "en", text: "Add new Policy Holder" },
					{ locale: "de", text: "Neuen Policeninhaber hinzufügen" }
				]
			}
		]);
	});

	it("should omit add button for DropDownSelection with empty addButtonLabel", () => {
		const comp = makeComponent("DropDownSelection");
		const kind: ComponentKind = {
			kind: "DropDownSelection",
			component: comp
		};
		const modConfig: ModificationConfiguration = {
			addButtonLabel: []
		};
		const buttons = buildButtonsForComponent(kind, modConfig);

		expect(buttons).toHaveLength(0);
	});

	it("should emit DropDown edit before add when both predicates match", () => {
		const comp = makeComponentWithLink("DropDownSelection");
		const kind: ComponentKind = {
			kind: "DropDownSelection",
			component: comp
		};
		const modConfig: ModificationConfiguration = {
			addButtonLabel: [{ locale: "en", text: "Add new" }]
		};
		const buttons = buildButtonsForComponent(kind, modConfig, "LinkForm");

		expect(buttons.map((button) => button.event)).toEqual(["event_edit_link_document", "event_add_document"]);
	});

	it("should return empty array for DualPaneSelection", () => {
		const comp = makeComponent("DualPaneSelection");
		const kind: ComponentKind = {
			kind: "DualPaneSelection",
			component: comp
		};
		const buttons = buildButtonsForComponent(kind);

		expect(buttons).toHaveLength(0);
	});
});

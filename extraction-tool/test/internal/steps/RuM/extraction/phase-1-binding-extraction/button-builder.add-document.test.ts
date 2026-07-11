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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// buildButtonsForComponent — event naming (Q66)
// ---------------------------------------------------------------------------

describe("buildButtonsForComponent", () => {
	it("should return empty array for DropDownSelection when no link form model", () => {
		const comp = makeComponent("DropDownSelection");
		const kind: ComponentKind = {
			kind: "DropDownSelection",
			component: comp
		};
		const buttons = buildButtonsForComponent(kind);

		expect(buttons).toHaveLength(0);
	});

	it("should emit native policy-holder event_add_document shape that replaced manual override 2", () => {
		const comp = makeComponent("DropDownSelection");
		const kind: ComponentKind = {
			kind: "DropDownSelection",
			component: comp
		};
		const modConfig: ModificationConfiguration = {
			extendParentActivityDescriptor: true,
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

	it("should emit event_edit_link_document for DropDownSelection with resolved link form model", () => {
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

	it("should emit event_edit_link_document for DropDownSelection with extendParentActivityDescriptor and link form", () => {
		const comp = makeComponentWithLink("DropDownSelection");
		const kind: ComponentKind = {
			kind: "DropDownSelection",
			component: comp
		};
		const modConfig: ModificationConfiguration = {
			extendParentActivityDescriptor: true,
			addButtonLabel: [{ locale: "en", text: "Add new Policy Holder" }]
		};
		const buttons = buildButtonsForComponent(kind, modConfig, "LinkForm");

		expect(buttons.map((button) => button.event)).toEqual(["event_edit_link_document", "event_add_document"]);
	});
});

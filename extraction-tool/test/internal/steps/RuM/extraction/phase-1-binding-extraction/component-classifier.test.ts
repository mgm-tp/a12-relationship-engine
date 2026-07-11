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
	classifyComponent,
	UnknownComponentTypeError
} from "../../../../../../src/internal/steps/RuM/extraction/phase-1-binding-extraction/component-classifier.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeComponent(name: string, overrides?: Record<string, unknown>) {
	return {
		name,
		id: `test-${name.toLowerCase()}`,
		models: [{ name: `${name}Model`, use: "candidate" }],
		...overrides
	};
}

function makeDualPane() {
	return makeComponent("DualPaneSelection", {
		models: [
			{ name: "CandidateOverview", use: "candidate" },
			{ name: "SelectedOverview", use: "link" }
		],
		candidatePageSize: 25
	});
}

function makeTableList() {
	return makeComponent("TableList", {
		models: [{ name: "LinkOverview", use: "link" }],
		linkPageSize: 10
	});
}

function makeDropDown() {
	return makeComponent("DropDownSelection", {
		models: [{ name: "CandidateOverview", use: "candidate" }],
		candidatePageSize: 50
	});
}

// ---------------------------------------------------------------------------
// classifyComponent
// ---------------------------------------------------------------------------

describe("classifyComponent", () => {
	it("should classify DropDownSelection when a DropDownSelection component is present", () => {
		const result = classifyComponent([makeDropDown()]);

		expect(result.kind).toBe("DropDownSelection");
	});

	it("should classify DropDownSelection and carry its candidatePageSize", () => {
		const result = classifyComponent([makeDropDown()]);

		if (result.kind === "DropDownSelection") {
			expect(result.candidatePageSize).toBe(50);
		}
	});

	it("should classify TableList when a TableList component is present", () => {
		const result = classifyComponent([makeTableList()]);

		expect(result.kind).toBe("TableList");
	});

	it("should classify TableList and carry its linkPageSize", () => {
		const result = classifyComponent([makeTableList()]);

		if (result.kind === "TableList") {
			expect(result.linkPageSize).toBe(10);
		}
	});

	it("should include nested dualPaneComponent when TableList array also has DualPaneSelection", () => {
		const dualPane = makeDualPane();
		const result = classifyComponent([makeTableList(), dualPane]);

		if (result.kind === "TableList") {
			expect(result.dualPaneComponent).toBeDefined();
			expect(result.dualPaneComponent?.name).toBe("DualPaneSelection");
		}
	});

	it("should classify DualPaneSelection when only DualPaneSelection is present", () => {
		const result = classifyComponent([makeDualPane()]);

		expect(result.kind).toBe("DualPaneSelection");
	});

	it("should classify DualPaneSelection and carry its candidatePageSize", () => {
		const result = classifyComponent([makeDualPane()]);

		if (result.kind === "DualPaneSelection") {
			expect(result.candidatePageSize).toBe(25);
		}
	});

	it("should throw UnknownComponentTypeError for unrecognized components", () => {
		const unknown = makeComponent("UnknownComponent");
		expect(() => classifyComponent([unknown])).toThrow(UnknownComponentTypeError);
	});

	it("should throw UnknownComponentTypeError for empty array", () => {
		expect(() => classifyComponent([])).toThrow(UnknownComponentTypeError);
	});

	it("should set error.rawComponents to the original components array", () => {
		const unknown = [makeComponent("UnknownComponent")];

		try {
			classifyComponent(unknown);
		} catch (e) {
			if (e instanceof UnknownComponentTypeError) {
				expect(e.rawComponents).toStrictEqual(unknown);
			}
		}
	});

	it("should prefer DropDownSelection over TableList when both are present", () => {
		const result = classifyComponent([makeTableList(), makeDropDown()]);
		expect(result.kind).toBe("DropDownSelection");
	});

	it("should prefer DropDownSelection over DualPaneSelection when both are present", () => {
		const result = classifyComponent([makeDualPane(), makeDropDown()]);
		expect(result.kind).toBe("DropDownSelection");
	});

	it("should carry the original component data in ComponentKind", () => {
		const dualPane = makeDualPane();
		const result = classifyComponent([dualPane]);

		if (result.kind === "DualPaneSelection") {
			expect(result.component).toBe(dualPane);
		}
	});

	it("should carry the original TableList component data", () => {
		const tableList = makeTableList();
		const result = classifyComponent([tableList, makeDualPane()]);

		if (result.kind === "TableList") {
			expect(result.component).toBe(tableList);
		}
	});
});

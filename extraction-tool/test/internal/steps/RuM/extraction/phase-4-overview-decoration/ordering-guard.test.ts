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

import type { DecorationStep } from "../../../../../../src/internal/steps/RuM/extraction/phase-4-overview-decoration/types.js";
import {
	DECORATION_STEP_ORDER,
	getDecorationStepOrder,
	enforceDecorationOrder,
	validateDecorationOrder
} from "../../../../../../src/internal/steps/RuM/extraction/phase-4-overview-decoration/ordering-guard.js";

// ---------------------------------------------------------------------------
// validateDecorationOrder
// ---------------------------------------------------------------------------

describe("validateDecorationOrder", () => {
	it("returns true for the required order", () => {
		expect(validateDecorationOrder(DECORATION_STEP_ORDER)).toBe(true);
	});

	it("returns true for overview labels before default labels", () => {
		expect(validateDecorationOrder(["overviewLabels", "defaultLabels"])).toBe(true);
	});

	it("returns true when label steps are absent", () => {
		expect(validateDecorationOrder(["pageSize", "rowActions", "rowActivation"])).toBe(true);
	});

	it("returns true for page size before labels", () => {
		expect(validateDecorationOrder(["pageSize", "overviewLabels", "defaultLabels"])).toBe(true);
	});

	it("returns true for overview labels alone", () => {
		expect(validateDecorationOrder(["overviewLabels"])).toBe(true);
	});

	it("returns true for default labels alone", () => {
		expect(validateDecorationOrder(["defaultLabels"])).toBe(true);
	});

	it("returns true with non-label steps between ordered labels", () => {
		expect(validateDecorationOrder(["overviewLabels", "rowActions", "defaultLabels"])).toBe(true);
	});

	it("returns false when default labels precede overview labels", () => {
		expect(validateDecorationOrder(["defaultLabels", "overviewLabels"])).toBe(false);
	});

	it("returns false when non-label steps separate reversed labels", () => {
		expect(validateDecorationOrder(["defaultLabels", "rowActivation", "overviewLabels"])).toBe(false);
	});

	it("returns false for reverse required order", () => {
		expect(
			validateDecorationOrder(["defaultLabels", "overviewLabels", "rowActivation", "rowActions", "pageSize"])
		).toBe(false);
	});

	it("returns true for empty array", () => {
		expect(validateDecorationOrder([])).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// enforceDecorationOrder
// ---------------------------------------------------------------------------

describe("enforceDecorationOrder", () => {
	it("should not throw for required order", () => {
		expect(() => enforceDecorationOrder(DECORATION_STEP_ORDER)).not.toThrow();
	});

	it("does not throw for valid partial label order", () => {
		expect(() => enforceDecorationOrder(["overviewLabels", "defaultLabels"])).not.toThrow();
	});

	it("does not throw when only non-label steps are present", () => {
		expect(() => enforceDecorationOrder(["pageSize", "rowActions", "rowActivation"])).not.toThrow();
	});

	it("throws for defaultLabels before overviewLabels", () => {
		expect(() => enforceDecorationOrder(["defaultLabels", "overviewLabels"])).toThrow(/ordering violation/i);
	});

	it("throws for reverse required order", () => {
		expect(() =>
			enforceDecorationOrder(["defaultLabels", "overviewLabels", "rowActivation", "rowActions", "pageSize"])
		).toThrow(/ordering violation/i);
	});

	it("should include step names in the error message", () => {
		try {
			enforceDecorationOrder(["defaultLabels", "overviewLabels"]);
		} catch (error: unknown) {
			const message = (error as Error).message;

			expect(message).toMatch(/defaultLabels/);
			expect(message).toMatch(/overviewLabels/);
		}
	});

	it("should include step order markers in the error message", () => {
		try {
			enforceDecorationOrder(["defaultLabels", "overviewLabels"]);
		} catch (error: unknown) {
			const message = (error as Error).message;

			expect(message).toMatch(/defaultLabels \(f\)/);
			expect(message).toMatch(/overviewLabels \(d\)/);
		}
	});
});

// ---------------------------------------------------------------------------
// getDecorationStepOrder
// ---------------------------------------------------------------------------

describe("getDecorationStepOrder", () => {
	it("should return the required order array", () => {
		expect(getDecorationStepOrder()).toBe(DECORATION_STEP_ORDER);
	});

	it("should include all decoration steps", () => {
		const order = getDecorationStepOrder();

		expect(order).toContain("pageSize");
		expect(order).toContain("rowActions");
		expect(order).toContain("rowActivation");
		expect(order).toContain("overviewLabels");
		expect(order).toContain("defaultLabels");
	});

	it("should have exactly 5 steps", () => {
		expect(getDecorationStepOrder()).toHaveLength(5);
	});

	it("should not include the retired label transfer step", () => {
		expect(getDecorationStepOrder()).not.toContain("labelTransfer");
	});

	it("should not include the retired conflict resolution step", () => {
		expect(getDecorationStepOrder()).not.toContain("conflictResolution");
	});
});

// ---------------------------------------------------------------------------
// helper assertions for typing completeness
// ---------------------------------------------------------------------------

describe("DecorationStep type coverage", () => {
	it("restricts the required sequence to known decoration steps", () => {
		const steps: DecorationStep[] = [...DECORATION_STEP_ORDER];

		expect(steps).toEqual(["pageSize", "rowActions", "rowActivation", "overviewLabels", "defaultLabels"]);
	});
});

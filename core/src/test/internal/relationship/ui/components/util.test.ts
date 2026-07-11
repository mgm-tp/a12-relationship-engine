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

import { normalizeCssLength } from "../../../../../internal/relationship/ui/components/util.js";

describe("normalizeCssLength", () => {
	it("appends px to a unitless integer", () => {
		expect(normalizeCssLength("600")).toBe("600px");
	});

	it("appends px to a unitless decimal", () => {
		expect(normalizeCssLength("12.5")).toBe("12.5px");
	});

	it("trims surrounding whitespace before appending px", () => {
		expect(normalizeCssLength("  600  ")).toBe("600px");
	});

	it("leaves percentage values unchanged", () => {
		expect(normalizeCssLength("50%")).toBe("50%");
	});

	it("leaves viewport units unchanged", () => {
		expect(normalizeCssLength("60vh")).toBe("60vh");
	});

	it("leaves pixel values unchanged", () => {
		expect(normalizeCssLength("200px")).toBe("200px");
	});

	it("leaves keywords unchanged", () => {
		expect(normalizeCssLength("auto")).toBe("auto");
	});
});

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

import { resolveDialogContainerStyle } from "../../../view/internal/components/dialog/utils.js";

describe("resolveDialogContainerStyle", () => {
	it("falls back to dialogWidth as maxWidth when dialogMaxWidth is absent", () => {
		const result = resolveDialogContainerStyle("900px");

		// Bug: currently returns undefined because dialogMaxWidth is undefined.
		// After the fix (dialogMaxWidth ?? dialogWidth), this should equal "900px".
		expect(result.maxWidth).toBe("900px");
		expect(result.width).toBe("900px");
	});

	it("uses dialogMaxWidth when both are provided", () => {
		const result = resolveDialogContainerStyle("900px", "1000px");

		expect(result.maxWidth).toBe("1000px");
		expect(result.width).toBe("900px");
	});

	it("leaves maxWidth undefined when neither prop is provided", () => {
		const result = resolveDialogContainerStyle();

		expect(result.maxWidth).toBeUndefined();
	});
});

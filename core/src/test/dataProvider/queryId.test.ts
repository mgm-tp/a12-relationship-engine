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

import { buildQueryId } from "../../client/internal/dataProvider/queryId.js";

describe("buildQueryId", () => {
	it("concatenates segments with underscores", () => {
		expect(buildQueryId("RelModel", "target", "dropdown")).toBe("RelModel_target_dropdown");
	});

	it("appends suffix when provided", () => {
		expect(buildQueryId("RelModel", "target", "dropdown", "selected")).toBe("RelModel_target_dropdown_selected");
	});

	it("sanitizes spaces and slashes to underscores", () => {
		expect(buildQueryId("Rel Model", "tar/get", "drop down")).toBe("Rel_Model_tar_get_drop_down");
	});

	it("preserves dots and dashes", () => {
		expect(buildQueryId("rel.model", "tar-get", "type")).toBe("rel.model_tar-get_type");
	});

	it("sanitizes suffix as well", () => {
		expect(buildQueryId("Rel", "role", "type", "suf fix")).toBe("Rel_role_type_suf_fix");
	});
});

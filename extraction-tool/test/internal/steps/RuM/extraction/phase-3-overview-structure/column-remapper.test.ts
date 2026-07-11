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

import type { OverviewModel } from "../../../../../../src/models/overview-model.js";
import {
	processAllColumns,
	remapColumnElementRef,
	replaceDocumentModelForOverviewRef
} from "../../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/column-remapper.js";

// ---------------------------------------------------------------------------
// remapColumnElementRef
// ---------------------------------------------------------------------------

describe("remapColumnElementRef", () => {
	it("should return original element ID for target classification", () => {
		const result = remapColumnElementRef({
			kind: "target",
			originalElementId: "field_dbbc9"
		});
		expect(result).toBe("field_dbbc9");
	});

	it("should return original element ID for relationship classification", () => {
		const result = remapColumnElementRef({
			kind: "relationship",
			originalElementId: "field_de37b",
			existsInLinkDoc: true
		});
		expect(result).toBe("field_de37b");
	});

	it("should return group ID for rootGroup classification", () => {
		const result = remapColumnElementRef({
			kind: "rootGroup",
			groupId: "G2"
		});
		expect(result).toBe("G2");
	});

	it("should return original elementRef for unmatched classification", () => {
		const result = remapColumnElementRef({
			kind: "unmatched",
			elementRef: "I6_field_unknown"
		});
		expect(result).toBe("I6_field_unknown");
	});
});

// ---------------------------------------------------------------------------
// processAllColumns
// ---------------------------------------------------------------------------

describe("processAllColumns", () => {
	const TARGET_PREFIX = "I4_";
	const RELATIONSHIP_PREFIX = "I5_";

	it("should remap target-prefixed columns correctly", () => {
		const columns = [{ id: "col-1", elementRef: "I4_field_dbbc9", sortable: true, width: 1 }];

		const result = processAllColumns(columns, TARGET_PREFIX, RELATIONSHIP_PREFIX);
		expect(result.remappedColumns).toHaveLength(1);
		expect(result.remappedColumns[0].elementRef).toBe("field_dbbc9");
		expect(result.warnings).toHaveLength(0);
	});

	it("should remap relationship-prefixed columns correctly", () => {
		const columns = [{ id: "col-1", elementRef: "I5_field_de37b", width: 1 }];

		const result = processAllColumns(columns, TARGET_PREFIX, RELATIONSHIP_PREFIX);
		expect(result.remappedColumns[0].elementRef).toBe("field_de37b");
	});

	it("should leave rootGroup columns unchanged", () => {
		const columns = [{ id: "col-1", elementRef: "G2", width: 1 }];

		const result = processAllColumns(columns, TARGET_PREFIX, undefined);
		expect(result.remappedColumns[0].elementRef).toBe("G2");
	});

	it("should produce warning for unmatched columns", () => {
		const columns = [{ id: "col-1", elementRef: "I6_field_unknown", width: 1 }];

		const result = processAllColumns(columns, TARGET_PREFIX, RELATIONSHIP_PREFIX);
		expect(result.remappedColumns).toHaveLength(1);
		expect(result.remappedColumns[0].elementRef).toBe("I6_field_unknown");
		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0]).toContain("col-1");
	});

	it("should preserve other column properties after remapping", () => {
		const columns = [
			{
				id: "col-1",
				elementRef: "I4_field_dbbc9",
				sortable: true,
				width: 1
			}
		];

		const result = processAllColumns(columns, TARGET_PREFIX, RELATIONSHIP_PREFIX);
		expect(result.remappedColumns[0].sortable).toBe(true);
		expect(result.remappedColumns[0].width).toBe(1);
	});

	it("should handle empty columns array", () => {
		const result = processAllColumns([] as OverviewModel.ReferenceColumn[], TARGET_PREFIX, undefined);
		expect(result.remappedColumns).toHaveLength(0);
		expect(result.warnings).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// replaceDocumentModelForOverviewRef
// ---------------------------------------------------------------------------

describe("replaceDocumentModelForOverviewRef", () => {
	it("should replace ____generated ref with actual document model ref", () => {
		const refs = [
			{
				purpose: "document-model-for-overview",
				modelType: "document" as const,
				reference: "Location_address____generated",
				alias: "DM"
			}
		];

		const result = replaceDocumentModelForOverviewRef(refs, "Address-document");
		expect(result).toHaveLength(1);
		expect(result[0].reference).toBe("Address-document");
	});

	it("should keep non-overview model refs unchanged", () => {
		const refs = [
			{
				purpose: "other" as const,
				modelType: "document" as const,
				reference: "SomeDoc",
				alias: "S"
			}
		];

		const result = replaceDocumentModelForOverviewRef(refs, "Address-document");
		expect(result).toHaveLength(2);
		expect(result[0].reference).toBe("SomeDoc");
		expect(result[1].reference).toBe("Address-document");
	});
});

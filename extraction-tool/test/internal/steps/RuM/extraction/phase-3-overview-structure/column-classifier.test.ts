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

import TestDMExistsCheck from "../../../../../__fixtures__/shared/document-models/TestDM-exists-check.json" with { type: "json" };
import {
	classifyColumn,
	resolveWrapperPrefix
} from "../../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/column-classifier.js";
import { elementExistsInReferencedModel } from "../../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/generated-doc-overview-helpers.js";

describe("classifyColumn", () => {
	const TARGET_PREFIX = "I4_";
	const RELATIONSHIP_PREFIX = "I5_";

	it("should classify target column by prefix match", () => {
		const result = classifyColumn("I4_field_dbbc9", TARGET_PREFIX, RELATIONSHIP_PREFIX);
		expect(result.kind).toBe("target");

		if (result.kind === "target") {
			expect(result.originalElementId).toBe("field_dbbc9");
		}
	});

	it("should classify relationship column by prefix match", () => {
		const result = classifyColumn("I5_field_de37b", TARGET_PREFIX, RELATIONSHIP_PREFIX);
		expect(result.kind).toBe("relationship");

		if (result.kind === "relationship") {
			expect(result.originalElementId).toBe("field_de37b");
		}
	});

	it("should classify unprefixed field reference as target", () => {
		const result = classifyColumn("field_2fc9a", TARGET_PREFIX, RELATIONSHIP_PREFIX);
		expect(result.kind).toBe("target");

		if (result.kind === "target") {
			expect(result.originalElementId).toBe("field_2fc9a");
		}
	});

	it("should classify rootGroup when elementRef is a root group ID", () => {
		const result = classifyColumn("G2", TARGET_PREFIX, RELATIONSHIP_PREFIX);
		expect(result.kind).toBe("rootGroup");

		if (result.kind === "rootGroup") {
			expect(result.groupId).toBe("G2");
		}
	});

	it("should classify unprefixed elementRef with underscore as target", () => {
		const result = classifyColumn("group_d1772", TARGET_PREFIX, undefined);
		expect(result.kind).toBe("target");

		if (result.kind === "target") {
			expect(result.originalElementId).toBe("group_d1772");
		}
	});

	it("should classify unmatched column when prefix doesn't match", () => {
		const result = classifyColumn("I6_field_unknown", TARGET_PREFIX, RELATIONSHIP_PREFIX);
		expect(result.kind).toBe("unmatched");

		if (result.kind === "unmatched") {
			expect(result.elementRef).toBe("I6_field_unknown");
		}
	});

	it("should handle empty elementRef as unmatched", () => {
		const result = classifyColumn("", TARGET_PREFIX, undefined);
		expect(result.kind).toBe("unmatched");
	});

	it("should handle undefined elementRef as unmatched", () => {
		const result = classifyColumn(undefined, TARGET_PREFIX, undefined);
		expect(result.kind).toBe("unmatched");
	});

	it("should classify target column when no relationship prefix exists", () => {
		const result = classifyColumn("I4_field_2fc9a", TARGET_PREFIX, undefined);
		expect(result.kind).toBe("target");

		if (result.kind === "target") {
			expect(result.originalElementId).toBe("field_2fc9a");
		}
	});
});

describe("resolveWrapperPrefix", () => {
	it("should resolve a bare wrapper ID", () => {
		expect(resolveWrapperPrefix("I4")).toBe("I4_");
	});

	it("should resolve a compound wrapper ID", () => {
		expect(resolveWrapperPrefix("I4_G7")).toBe("I4_");
	});

	it("should return empty string for empty input", () => {
		expect(resolveWrapperPrefix("")).toBe("");
	});

	it("should return empty string for undefined input", () => {
		expect(resolveWrapperPrefix(undefined)).toBe("");
	});
});

// fieldExistsInDocumentModel removed — actual DM traversal now uses kernel DocumentModel API

/** No-op resolveModel for models that have no external TDM references. */
const noOpResolveModel = (_id: string): unknown => undefined;

describe("elementExistsInReferencedModel", () => {
	it("returns true for a Field element id without usageType filter", () => {
		expect(elementExistsInReferencedModel(TestDMExistsCheck, "F1", undefined, noOpResolveModel)).toBe(true);
	});

	it("returns true for an attachment Group with matching usageType filter", () => {
		expect(elementExistsInReferencedModel(TestDMExistsCheck, "G_att", ["attachment"], noOpResolveModel)).toBe(true);
	});

	it("returns false for a Group element without usageType filter", () => {
		expect(elementExistsInReferencedModel(TestDMExistsCheck, "G_att", undefined, noOpResolveModel)).toBe(false);
	});

	it("returns false when element id does not exist", () => {
		expect(elementExistsInReferencedModel(TestDMExistsCheck, "nonexistent", undefined, noOpResolveModel)).toBe(false);
	});
});

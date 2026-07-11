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

import NestedDM from "../../../../../__fixtures__/shared/document-models/NestedDM.json" with { type: "json" };
import AddressDM from "../../../../../__fixtures__/shared/document-models/AddressDM.json" with { type: "json" };
import {
	formatFieldPath,
	buildFieldPathFromDocumentModel
} from "../../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/field-path-resolver.js";

/** No-op resolveModel for models that have no external TDM references. */
const noOpResolveModel = (_id: string): unknown => undefined;

describe("buildFieldPathFromDocumentModel", () => {
	it("should find field at root level", () => {
		const path = buildFieldPathFromDocumentModel("field_dbbc9", AddressDM, noOpResolveModel);

		expect(path).toBeDefined();
		expect(path).toHaveLength(2);
		expect(path![0].elementId).toBe("group_60e44");
		expect(path![1].elementId).toBe("field_dbbc9");
	});

	it("should find field nested within a group", () => {
		const path = buildFieldPathFromDocumentModel("field_138ef", AddressDM, noOpResolveModel);

		expect(path).toBeDefined();
		expect(path).toHaveLength(3);
		expect(path![0].elementId).toBe("group_60e44");
		expect(path![1].elementId).toBe("group_ecbda");
		expect(path![2].elementId).toBe("field_138ef");
	});

	it("should find root group by ID", () => {
		const path = buildFieldPathFromDocumentModel("group_60e44", AddressDM, noOpResolveModel);

		expect(path).toBeDefined();
		expect(path).toHaveLength(1);
		expect(path![0].elementId).toBe("group_60e44");
	});

	it("should return undefined for non-existent element", () => {
		const path = buildFieldPathFromDocumentModel("field_nonexistent", AddressDM, noOpResolveModel);

		expect(path).toBeUndefined();
	});

	it("should return undefined for empty rootGroups", () => {
		const emptyDm = {
			header: { id: "EmptyDM", modelType: "document", modelVersion: "1.0.0" },
			content: { modelRoot: { rootGroups: [] } }
		};
		const path = buildFieldPathFromDocumentModel("field_1", emptyDm, noOpResolveModel);
		expect(path).toBeUndefined();
	});

	it("should handle nested Group elements", () => {
		const path = buildFieldPathFromDocumentModel("field_abc", NestedDM, noOpResolveModel);
		expect(path).toBeDefined();
		expect(path).toHaveLength(4);
		expect(path!.map((s) => s.elementId)).toEqual(["G1", "G2", "G3", "field_abc"]);
	});
});

describe("formatFieldPath", () => {
	it("should format path segments with slash separator", () => {
		const path = [
			{ elementId: "group_60e44", name: "address" },
			{ elementId: "field_dbbc9", name: "country" }
		];

		expect(formatFieldPath(path)).toBe("group_60e44/field_dbbc9");
	});

	it("should return empty string for empty path", () => {
		expect(formatFieldPath([])).toBe("");
	});

	it("should return empty string for undefined path", () => {
		expect(formatFieldPath(undefined)).toBe("");
	});

	it("should handle single-segment path", () => {
		const path = [{ elementId: "field_abc" }];
		expect(formatFieldPath(path)).toBe("field_abc");
	});
});

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

import { ATTACHMENT_USAGE_TYPE } from "../../../../../../src/internal/steps/RuM/extraction/constants.js";
import DummyTDM from "../../../../../__fixtures__/shared/document-models/DummyTDM.json" with { type: "json" };
import TypeDefDM from "../../../../../__fixtures__/shared/document-models/TypeDefDM.json" with { type: "json" };
import TestDocumentLookup from "../../../../../__fixtures__/shared/document-models/TestDocument-lookup.json" with { type: "json" };
import {
	findElementById,
	getGroupUsageType,
	deserializeReferencedModel
} from "../../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/referenced-document-model-lookup.js";

const noOpResolveModel = (_id: string): unknown => undefined;

describe("deserializeReferencedModel", () => {
	it("round-trips a workspace DM JSON object into a DocumentModel", () => {
		const dm = deserializeReferencedModel(TestDocumentLookup, noOpResolveModel);
		expect(dm.content.modelRoot.type).toBe("Group");
	});

	it("succeeds when the DM has a TypeDefType field resolved via an external TDM", () => {
		const resolveModel = (id: string): unknown => (id === "DummyTDM" ? DummyTDM : undefined);
		expect(() => deserializeReferencedModel(TypeDefDM, resolveModel)).not.toThrow();
	});

	it("returns a DocumentModel with the TypeDefType field findable by id", () => {
		const resolveModel = (id: string): unknown => (id === "DummyTDM" ? DummyTDM : undefined);
		const dm = deserializeReferencedModel(TypeDefDM, resolveModel);
		const element = findElementById(dm, "field_typedef_01");
		expect(element?.id).toBe("field_typedef_01");
		expect(element?.name).toBe("location");
	});
});

describe("getGroupUsageType", () => {
	it("returns the usageType for an attachment Group element — casing must be lowercase 'attachment'", () => {
		const dm = deserializeReferencedModel(TestDocumentLookup, noOpResolveModel);
		const usageType = getGroupUsageType(dm, "G_attachment");
		expect(
			usageType,
			`Expected usageType to be 'attachment' (lowercase) but got '${usageType}' — casing mismatch`
		).toBe(ATTACHMENT_USAGE_TYPE);
	});
});

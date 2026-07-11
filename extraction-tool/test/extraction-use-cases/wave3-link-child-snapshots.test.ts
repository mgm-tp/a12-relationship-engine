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

/**
 * Wave 3 — query content and header modelReferences subtree snapshots.
 *
 * Covers Tasks 3.1 (query content) and 3.4 (header modelReferences) for LINK, CHILD,
 * candidate clone, and RuM model outputs. Each snapshot targets a single stable subtree
 * paired with a semantic assertion. Snapshot updates require a "why changed?" PR note.
 */

import { it, expect, describe } from "vitest";

import { record } from "./fixture-utils.js";
import { extractCoInsurerDualPane } from "./co-insurer-dualpane-fixture.js";
import {
	requireModel,
	runLocationExtraction,
	LOCATION_QUERY_MODEL_ID,
	LOCATION_EDIT_OVERVIEW_ID
} from "./location-dualpane-fixture.js";

// ---------------------------------------------------------------------------
// Task 3.1 — Query content snapshots
// ---------------------------------------------------------------------------

describe("Wave 3 — LINK/exclude selected query content snapshot", () => {
	it("LINK/exclude selected query content matches canonical LINK shape", () => {
		const { selectedQuery } = extractCoInsurerDualPane();

		const content = record(selectedQuery.content);

		expect(content.exclude).toBe(true);
		expect(content.targetDocumentModel).toBe("Contract-document");
		expect(content.links).toHaveLength(1);
		expect(content).toMatchInlineSnapshot(`
			{
			  "constraint": {
			    "field": "/__meta/docRef",
			    "operator": "exact_match",
			    "value": "\${Contract-document, [/__meta/docRef]}",
			  },
			  "exclude": true,
			  "links": [
			    {
			      "constraint": {
			        "constraint": {
			          "field": "/__meta/docRef",
			          "operator": "exact_match",
			          "value": "\${Contract-document, [/__meta/docRef]}",
			        },
			        "maxDepth": 1,
			        "operator": "has",
			        "relationshipModel": "CoInsurer",
			        "targetRole": "contract",
			      },
			      "maxDepth": 1,
			      "relationshipModel": "CoInsurer",
			      "targetRole": "businessPartner",
			    },
			  ],
			  "paging": {
			    "pageNumber": 0,
			    "pageSize": 50,
			  },
			  "projectionName": "document",
			  "targetDocumentModel": "Contract-document",
			}
		`);
	});
});

describe("Wave 3 — CHILD/has selected query content snapshot", () => {
	it("CHILD/has selected query content matches canonical CHILD shape", () => {
		const result = runLocationExtraction(true);
		const queryModel = requireModel(result.index.resolveRef(LOCATION_QUERY_MODEL_ID), LOCATION_QUERY_MODEL_ID);

		const content = record(queryModel.content);
		const constraint = record(content.constraint);

		expect(constraint.operator).toBe("has");
		expect(content.targetDocumentModel).toBe("Address-document");
		expect(content.links).toHaveLength(1);
		expect(content).toMatchInlineSnapshot(`
			{
			  "constraint": {
			    "constraint": {
			      "field": "/__meta/docRef",
			      "operator": "exact_match",
			      "value": "\${BusinessPartner-document, [/__meta/docRef]}",
			    },
			    "maxDepth": 1,
			    "operator": "has",
			    "relationshipModel": "Location",
			    "targetRole": "businessPartner",
			  },
			  "links": [
			    {
			      "constraint": {
			        "field": "/__meta/docRef",
			        "operator": "exact_match",
			        "value": "\${BusinessPartner-document, [/__meta/docRef]}",
			      },
			      "maxDepth": 1,
			      "relationshipModel": "Location",
			      "targetRole": "businessPartner",
			    },
			  ],
			  "paging": {
			    "pageNumber": 0,
			    "pageSize": 50,
			  },
			  "projectionName": "document",
			  "targetDocumentModel": "Address-document",
			}
		`);
	});
});

// ---------------------------------------------------------------------------
// Task 3.4 — Header modelReferences snapshots
// ---------------------------------------------------------------------------

describe("Wave 3 — -edit clone header modelReferences snapshots", () => {
	it("LINK -edit clone modelReferences includes only query-model-for-overview", () => {
		const refs = extractCoInsurerDualPane().selectedOverview.header.modelReferences;

		expect(refs).toHaveLength(1);
		expect(refs).toMatchInlineSnapshot(`
			[
			  {
			    "modelType": "query",
			    "purpose": "query-model-for-overview",
			    "reference": "CoInsurerLinks-overview-query",
			  },
			]
		`);
	});

	it("CHILD -edit clone modelReferences includes only query-model-for-overview", () => {
		const result = runLocationExtraction(true);
		const editOverview = requireModel(result.findAddedById(LOCATION_EDIT_OVERVIEW_ID), LOCATION_EDIT_OVERVIEW_ID);
		const refs = editOverview.header.modelReferences ?? [];

		expect(refs).toHaveLength(1);
		expect(refs).toMatchInlineSnapshot(`
			[
			  {
			    "modelType": "query",
			    "purpose": "query-model-for-overview",
			    "reference": "LocationLinks-overview-query",
			  },
			]
		`);
	});
});

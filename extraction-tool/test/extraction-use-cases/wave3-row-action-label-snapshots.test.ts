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
 * Wave 3 — row-action arrays, overview header labels, and candidate/RuM modelReferences snapshots.
 *
 * Covers Tasks 3.2 (row-action arrays), 3.3 (overview labels), and 3.4 (--RelationshipName
 * clone + candidate RuM modelReferences). LINK row-action arrays (3 entries, >30 lines) are stored
 * in the external `.snap` file via `toMatchSnapshot()`. CHILD and available-clone arrays are inline.
 */

import { it, expect, describe } from "vitest";

import { array, record, optionalRecord } from "./fixture-utils.js";
import { extractCoInsurerDualPane } from "./co-insurer-dualpane-fixture.js";
import { requireModel, runLocationExtraction, LOCATION_EDIT_OVERVIEW_ID } from "./location-dualpane-fixture.js";
import {
	CLONE_ALIAS_ID,
	getHeaderLabels,
	getCloneRowActions,
	getSortedModelReferences,
	runMultiRelCandidateExtraction
} from "./category-candidate-fixture.js";

// ---------------------------------------------------------------------------
// Task 3.2 — Row-action array snapshots
// ---------------------------------------------------------------------------

describe("Wave 3 — LINK selected/edit row-action group snapshot", () => {
	it("LINK row-action group has delete, restore, and edit-link actions (external snapshot)", () => {
		const rowActionGroup = optionalRecord(record(extractCoInsurerDualPane().selectedOverview.content).rowActionGroup);
		const actions = array(rowActionGroup?.actions ?? [], "row actions");

		expect(actions).toHaveLength(3);
		// 3-action array exceeds 30 lines inline — stored in external .snap file per Wave 3 rules
		expect(actions).toMatchSnapshot();
	});
});

describe("Wave 3 — CHILD selected row-action group snapshot", () => {
	it("CHILD row-action group has delete and restore actions", () => {
		const result = runLocationExtraction(true);
		const editOverview = requireModel(result.findAddedById(LOCATION_EDIT_OVERVIEW_ID), LOCATION_EDIT_OVERVIEW_ID);
		const rowActionGroup = optionalRecord(record(editOverview.content ?? {}).rowActionGroup);
		const actions = array(rowActionGroup?.actions ?? [], "row actions");

		expect(actions).toHaveLength(2);
		expect(actions).toMatchInlineSnapshot(`
			[
			  {
			    "event": "event_delete_link",
			    "icon": {
			      "name": "remove_circle",
			    },
			    "label": [
			      {
			        "locale": "en",
			        "text": "Remove",
			      },
			      {
			        "locale": "de",
			        "text": "Entfernen",
			      },
			    ],
			    "labelHidden": true,
			  },
			  {
			    "event": "event_restore_link",
			    "icon": {
			      "name": "add_circle",
			    },
			    "label": [
			      {
			        "locale": "en",
			        "text": "Restore",
			      },
			      {
			        "locale": "de",
			        "text": "Wiederherstellen",
			      },
			    ],
			    "labelHidden": true,
			  },
			]
		`);
	});
});

describe("Wave 3 — available clone row-action group snapshot", () => {
	it("available --RelationshipName clone row-action group has single add-link action", () => {
		const result = runMultiRelCandidateExtraction(true);
		const clone = requireModel(result.findAddedById(CLONE_ALIAS_ID), CLONE_ALIAS_ID);
		const actions = getCloneRowActions(clone);

		expect(actions).toHaveLength(1);
		expect(actions).toMatchInlineSnapshot(`
			[
			  {
			    "event": "event_add_link",
			    "icon": {
			      "name": "add",
			    },
			  },
			]
		`);
	});
});

// ---------------------------------------------------------------------------
// Task 3.3 — Overview header labels snapshot
// ---------------------------------------------------------------------------

describe("Wave 3 — overview header labels block snapshot", () => {
	it("available --RelationshipName clone header has EN and DE labels", () => {
		const result = runMultiRelCandidateExtraction(true);
		const clone = requireModel(result.findAddedById(CLONE_ALIAS_ID), CLONE_ALIAS_ID);
		const labels = getHeaderLabels(clone);

		expect(labels).toHaveLength(2);
		expect(labels).toMatchInlineSnapshot(`
			[
			  {
			    "locale": "en",
			    "text": "Available categories",
			  },
			  {
			    "locale": "de",
			    "text": "Verfügbare Kategorien",
			  },
			]
		`);
	});
});

// ---------------------------------------------------------------------------
// Task 3.4 — --RelationshipName and RuM header modelReferences snapshots
// ---------------------------------------------------------------------------

describe("Wave 3 — --RelationshipName clone header modelReferences snapshot", () => {
	it("--RelationshipName clone modelReferences includes query-model-for-overview", () => {
		const result = runMultiRelCandidateExtraction(true);
		const clone = requireModel(result.findAddedById(CLONE_ALIAS_ID), CLONE_ALIAS_ID);
		const refs = getSortedModelReferences(clone);

		expect(refs).toHaveLength(1);
		expect(refs).toMatchInlineSnapshot(`
			[
			  {
			    "modelType": "query",
			    "purpose": "query-model-for-overview",
			    "reference": "Category_ChildCategory_AvailableItemsOverview--CategoryCategoryAlias-query",
			  },
			]
		`);
	});
});

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

import { getRowActivation } from "./fixture-utils.js";
import {
	isRecord,
	requireModel,
	getRowActions,
	type FixtureModel,
	getRowActionEvents,
	loadTypedFixtureModel,
	runLocationExtraction,
	LOCATION_EDIT_OVERVIEW_ID
} from "./location-dualpane-fixture.js";

describe("DualPane CHILD keepModels row actions", () => {
	it("keepModels DualPane CHILD selected overview has delete and restore row actions", () => {
		const result = runLocationExtraction(true);
		const selectedOverview = requireModel(result.findAddedById(LOCATION_EDIT_OVERVIEW_ID), LOCATION_EDIT_OVERVIEW_ID);

		expect(getRowActionEvents(selectedOverview)).toEqual(["event_delete_link", "event_restore_link"]);
		expect(getRowActions(selectedOverview)).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ event: "event_delete_link", labelHidden: true }),
				expect.objectContaining({ event: "event_restore_link", labelHidden: true })
			])
		);
		expect(getRowActivation(selectedOverview)).toEqual({ type: "event", event: "event_delete_link" });
	});

	it("keepModels DualPane CHILD selected overview does NOT have edit-link action without linkDocumentModel", () => {
		const result = runLocationExtraction(true);
		const selectedOverview = requireModel(result.findAddedById(LOCATION_EDIT_OVERVIEW_ID), LOCATION_EDIT_OVERVIEW_ID);
		const relationship = loadTypedFixtureModel("shared/relationship-models/Location.json");

		expect(getRelationshipLinkDocumentModel(relationship)).toBeNull();
		expect(getRowActionEvents(selectedOverview)).not.toContain("event_edit_link_document");
	});

	it("DualPane row actions are present across all generated selected DualPane overviews", () => {
		const result = runLocationExtraction(true);
		const generatedSelectedOverviews = result.addedModels.filter(
			(model) => model.header.modelType === "overview" && model.header.id.endsWith("-edit")
		);

		expect(generatedSelectedOverviews.map((model) => model.header.id)).toEqual([LOCATION_EDIT_OVERVIEW_ID]);
		expect(generatedSelectedOverviews).toHaveLength(1);
		expect(generatedSelectedOverviews.every(hasDeleteAndRestoreActions)).toBe(true);
	});
});

function hasDeleteAndRestoreActions(model: FixtureModel): boolean {
	const events = getRowActionEvents(model);

	return events.includes("event_delete_link") && events.includes("event_restore_link");
}

function getRelationshipLinkDocumentModel(model: FixtureModel): unknown {
	return isRecord(model.content) ? model.content.linkDocumentModel : undefined;
}

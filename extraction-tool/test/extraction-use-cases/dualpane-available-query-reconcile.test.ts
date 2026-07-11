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

import { array, record, single, getRowActivation } from "./fixture-utils.js";
import {
	getComponent,
	requireModel,
	annotationsOf,
	parseBindings,
	modelReferencesOf,
	headerRefsWithPurpose
} from "./location-dualpane-fixture.js";
import {
	TEAM_FORM_ID,
	TEAM_AVAILABLE_QUERY_ID,
	TEAM_SELECTED_OVERVIEW_ID,
	TEAM_AVAILABLE_OVERVIEW_ID,
	runTeamsDualPaneExtraction,
	TEAM_SELECTED_GENERATED_DOCUMENT_ID
} from "./teams-dualpane-fixture.js";

describe("DualPane available overview reconciliation", () => {
	it("tree-engine-like fixture preserves the pre-extraction overview invariants", () => {
		const result = runTeamsDualPaneExtraction();
		const availableOverview = requireModel(
			result.workspaceModels.find((model) => model.header.id === TEAM_AVAILABLE_OVERVIEW_ID),
			TEAM_AVAILABLE_OVERVIEW_ID
		);
		const selectedOverview = requireModel(
			result.workspaceModels.find((model) => model.header.id === TEAM_SELECTED_OVERVIEW_ID),
			TEAM_SELECTED_OVERVIEW_ID
		);

		expect(headerRefsWithPurpose(availableOverview, "document-model-for-overview")).toEqual(["DomainPerson"]);
		expect(headerRefsWithPurpose(availableOverview, "query-model-for-overview")).toEqual([]);
		expect(headerRefsWithPurpose(selectedOverview, "document-model-for-overview")).toEqual([
			TEAM_SELECTED_GENERATED_DOCUMENT_ID
		]);
		expect(headerRefsWithPurpose(selectedOverview, "query-model-for-overview")).toEqual([]);
	});

	it("non-keepModels should reconcile candidate overview refs and RuM purposes", () => {
		const result = runTeamsDualPaneExtraction();
		const availableOverview = requireModel(
			result.findSurvivingById(TEAM_AVAILABLE_OVERVIEW_ID),
			TEAM_AVAILABLE_OVERVIEW_ID
		);
		const availableQuery = requireModel(result.findSurvivingById(TEAM_AVAILABLE_QUERY_ID), TEAM_AVAILABLE_QUERY_ID);
		const formModel = requireModel(
			result.workspaceModels.find((model) => model.header.id === TEAM_FORM_ID),
			TEAM_FORM_ID
		);
		const bindingAnnotation = annotationsOf(formModel).find((annotation) => annotation.name === "bindingConfiguration");
		const binding = single(parseBindings(bindingAnnotation?.value), "teams binding configuration");
		const bindingDetails = record(binding.details);
		const component = record(single(array(bindingDetails.components, "teams binding components"), "teams component"));
		const props = record(component.props);
		const inputHeight = props.height;
		const rumPurposes = modelReferencesOf(result.rumModel).map((reference) => reference.purpose);

		if (typeof inputHeight !== "number") {
			throw new Error(`Expected teams fixture height to be numeric, got ${typeof inputHeight}`);
		}

		expect(headerRefsWithPurpose(availableOverview, "query-model-for-overview")).toEqual([TEAM_AVAILABLE_QUERY_ID]);
		expect(headerRefsWithPurpose(availableOverview, "document-model-for-overview")).toEqual([]);
		expect(availableQuery.header.modelType).toBe("query");
		expect(getRowActivation(availableOverview)).toEqual({ type: "event", event: "event_add_link" });
		expect(rumPurposes).toEqual(["availableItems", "selectedItems", "link"]);
		expect(getComponent(result.rumModel).height).toBe(String(inputHeight));
	});
});

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

import { buildModelIndex, type IndexedModel } from "./model-index.js";
import { assertOverviewTopology, assertOverviewQueryReferences } from "./overview-topology-validator.js";

const QUERY_MODEL = makeModel("SelectedOverview-query", "query");
const SELECTED_EDIT_OVERVIEW = makeOverview("SelectedOverview-edit", "SelectedOverview-query", {
	rowActivation: { type: "event", event: "event_delete_link" }
});
const AVAILABLE_EDIT_OVERVIEW = makeOverview("AvailableOverview-edit", "SelectedOverview-query", {
	rowActivation: { type: "event", event: "event_add_link" }
});
const DIRECT_TABLE_OVERVIEW = makeOverview("SelectedOverview-tableList", "SelectedOverview-query", {
	rowActivation: { type: "non_interactive" }
});
const DIRECT_TABLE_CDM_OVERVIEW = makeOverview("SelectedOverview-tableList", "SelectedOverview-query");
const DUALPANE_SELECTED_OVERVIEW = makeOverview("SelectedOverview-edit", "SelectedOverview-query", {
	rowActivation: { type: "event", event: "event_delete_link" }
});
const DUALPANE_AVAILABLE_OVERVIEW = makeOverview("AvailableOverview", "SelectedOverview-query", {
	rowActivation: { type: "event", event: "event_add_link" }
});
const BASE_OVERVIEW = makeOverview("SelectedOverview", "SelectedOverview-query", {
	rowActivation: { type: "event", event: "event_delete_link" }
});

function makeModel(id: string, modelType: string): IndexedModel {
	return { header: { id, modelType }, path: `${id}.json` };
}

function makeOverview(
	id: string,
	queryId: string,
	options: {
		readonly actions?: readonly string[];
		readonly rowActivation?: { readonly type: string; readonly event?: string };
	} = {}
): IndexedModel {
	return {
		header: {
			id,
			modelType: "overview",
			modelReferences: [{ purpose: "query-model-for-overview", modelType: "query", reference: queryId }]
		},
		content: {
			rowActionGroup: { actions: (options.actions ?? []).map((event) => ({ event })) },
			...(options.rowActivation === undefined ? {} : { rowActivation: options.rowActivation })
		},
		path: `${id}.json`
	};
}

function makeRuMContent(component: object): object {
	return { component };
}

describe("overview topology validator", () => {
	it("valid DualPane keepModels topology passes", () => {
		const index = buildModelIndex([QUERY_MODEL, DUALPANE_SELECTED_OVERVIEW]);
		const rumContent = makeRuMContent({
			componentType: "DualPaneSelection",
			selectedItemsOverviewModel: "SelectedOverview-edit"
		});

		expect(() => assertOverviewQueryReferences(index)).not.toThrow();
		expect(() => assertOverviewTopology(rumContent, index, { keepModels: true })).not.toThrow();
	});

	it("wrong DualPane selected ref fails", () => {
		const index = buildModelIndex([QUERY_MODEL, BASE_OVERVIEW]);
		const rumContent = makeRuMContent({
			componentType: "DualPaneSelection",
			selectedItemsOverviewModel: "SelectedOverview"
		});

		expect(() => assertOverviewTopology(rumContent, index, { keepModels: true })).toThrow(/must end with -edit/);
	});

	it("missing DualPane keepModels selected ref fails", () => {
		const index = buildModelIndex([QUERY_MODEL, SELECTED_EDIT_OVERVIEW]);
		const rumContent = makeRuMContent({ componentType: "DualPaneSelection" });

		expect(() => assertOverviewTopology(rumContent, index, { keepModels: true })).toThrow(
			/DualPane selectedItemsOverviewModel ref must be present/
		);
	});

	it("valid TableList non-CDM direct and edit activations pass", () => {
		const index = buildModelIndex([QUERY_MODEL, DIRECT_TABLE_OVERVIEW, SELECTED_EDIT_OVERVIEW]);
		const rumContent = makeRuMContent({
			componentType: "TableList",
			selectedItemsOverviewModel: "SelectedOverview-tableList",
			editConfiguration: { selectedItemsOverviewModel: "SelectedOverview-edit" }
		});

		expect(() => assertOverviewTopology(rumContent, index, { keepModels: true })).not.toThrow();
	});

	it("valid TableList CDM direct undefined and edit delete activation pass", () => {
		const index = buildModelIndex([QUERY_MODEL, DIRECT_TABLE_CDM_OVERVIEW, SELECTED_EDIT_OVERVIEW]);
		const rumContent = makeRuMContent({
			componentType: "TableList",
			selectedItemsOverviewModel: "SelectedOverview-tableList",
			editConfiguration: { selectedItemsOverviewModel: "SelectedOverview-edit" }
		});

		expect(() => assertOverviewTopology(rumContent, index, { keepModels: true, isCdm: true })).not.toThrow();
	});

	it("wrong TableList direct non-CDM activation fails", () => {
		const wrongDirectOverview = makeOverview("SelectedOverview-tableList", "SelectedOverview-query", {
			rowActivation: { type: "event", event: "event_delete_link" }
		});
		const index = buildModelIndex([QUERY_MODEL, wrongDirectOverview, SELECTED_EDIT_OVERVIEW]);
		const rumContent = makeRuMContent({
			componentType: "TableList",
			selectedItemsOverviewModel: "SelectedOverview-tableList",
			editConfiguration: { selectedItemsOverviewModel: "SelectedOverview-edit" }
		});

		expect(() => assertOverviewTopology(rumContent, index, { keepModels: true })).toThrow(
			/rowActivation must equal \{ type: "non_interactive" \}/
		);
	});

	it("wrong or missing TableList edit selected activation fails", () => {
		const missingEditActivationOverview = makeOverview("SelectedOverview-edit", "SelectedOverview-query");
		const index = buildModelIndex([QUERY_MODEL, DIRECT_TABLE_OVERVIEW, missingEditActivationOverview]);
		const rumContent = makeRuMContent({
			componentType: "TableList",
			selectedItemsOverviewModel: "SelectedOverview-tableList",
			editConfiguration: { selectedItemsOverviewModel: "SelectedOverview-edit" }
		});

		expect(() => assertOverviewTopology(rumContent, index, { keepModels: true })).toThrow(
			/rowActivation must equal \{ type: "event", event: "event_delete_link" \}, but was missing/
		);
	});

	it("edit row actions on direct TableList overview fail", () => {
		const directOverview = makeOverview("SelectedOverview-tableList", "SelectedOverview-query", {
			actions: ["event_delete_link"],
			rowActivation: { type: "non_interactive" }
		});
		const index = buildModelIndex([QUERY_MODEL, directOverview, SELECTED_EDIT_OVERVIEW]);
		const rumContent = makeRuMContent({
			componentType: "TableList",
			selectedItemsOverviewModel: "SelectedOverview-tableList",
			editConfiguration: { selectedItemsOverviewModel: "SelectedOverview-edit" }
		});

		expect(() => assertOverviewTopology(rumContent, index, { keepModels: true })).toThrow(
			/direct selected overview SelectedOverview-tableList carries edit row action/
		);
	});

	it("valid DualPane selected and available event activations pass", () => {
		const index = buildModelIndex([QUERY_MODEL, DUALPANE_SELECTED_OVERVIEW, DUALPANE_AVAILABLE_OVERVIEW]);
		const rumContent = makeRuMContent({
			componentType: "DualPaneSelection",
			selectedItemsOverviewModel: "SelectedOverview-edit",
			availableItemsOverviewModel: "AvailableOverview"
		});

		expect(() => assertOverviewTopology(rumContent, index, { keepModels: true })).not.toThrow();
	});

	it("valid TableList available edit activation passes when present", () => {
		const index = buildModelIndex([
			QUERY_MODEL,
			DIRECT_TABLE_OVERVIEW,
			SELECTED_EDIT_OVERVIEW,
			AVAILABLE_EDIT_OVERVIEW
		]);
		const rumContent = makeRuMContent({
			componentType: "TableList",
			selectedItemsOverviewModel: "SelectedOverview-tableList",
			editConfiguration: {
				selectedItemsOverviewModel: "SelectedOverview-edit",
				availableItemsOverviewModel: "AvailableOverview-edit"
			}
		});

		expect(() => assertOverviewTopology(rumContent, index, { keepModels: true })).not.toThrow();
	});

	it("missing TableList direct selected ref fails", () => {
		const index = buildModelIndex([QUERY_MODEL, DIRECT_TABLE_OVERVIEW, SELECTED_EDIT_OVERVIEW]);
		const rumContent = makeRuMContent({
			componentType: "TableList",
			editConfiguration: { selectedItemsOverviewModel: "SelectedOverview-edit" }
		});

		expect(() => assertOverviewTopology(rumContent, index, { keepModels: true })).toThrow(
			/TableList direct selectedItemsOverviewModel ref must be present/
		);
	});

	it("missing TableList edit selected ref fails", () => {
		const index = buildModelIndex([QUERY_MODEL, DIRECT_TABLE_OVERVIEW, SELECTED_EDIT_OVERVIEW]);
		const rumContent = makeRuMContent({
			componentType: "TableList",
			selectedItemsOverviewModel: "SelectedOverview-tableList"
		});

		expect(() => assertOverviewTopology(rumContent, index, { keepModels: true })).toThrow(
			/TableList editConfiguration\.selectedItemsOverviewModel ref must be present/
		);
	});

	it("DropDown with overview output fails", () => {
		const index = buildModelIndex([QUERY_MODEL]);
		const rumContent = makeRuMContent({
			componentType: "DropDownSelection",
			selectedItemsOverviewModel: "SelectedOverview"
		});

		expect(() => assertOverviewTopology(rumContent, index, { keepModels: false })).toThrow(
			/DropDown must not produce overview refs/
		);
	});

	it("unknown component type fails", () => {
		const index = buildModelIndex([QUERY_MODEL]);
		const rumContent = makeRuMContent({ componentType: "UnsupportedSelection" });

		expect(() => assertOverviewTopology(rumContent, index, { keepModels: false })).toThrow(
			/unsupported componentType UnsupportedSelection/
		);
	});
});

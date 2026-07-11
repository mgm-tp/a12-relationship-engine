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

import { OverviewModel } from "../../../../../../src/models/overview-model.js";
import {
	reconcileSubHeaderSlots,
	stripInteractiveAffordances,
	normalizeFilterConfiguration
} from "../../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/interactive-stripper.js";

function createColumn(sortable: boolean): OverviewModel.ReferenceColumn {
	return {
		id: sortable ? "sortable-column" : "plain-column",
		width: 1,
		elementRef: "field_name",
		sortable
	};
}

function createConfiguration(overrides: Partial<OverviewModel.Configuration> = {}): OverviewModel.Configuration {
	return {
		enableFilter: true,
		...overrides
	};
}

const SEARCH: OverviewModel.Element = { type: OverviewModel.ElementType.SEARCH };
const FILTER: OverviewModel.Element = { type: OverviewModel.ElementType.FILTER };
const MULTI_SELECTION: OverviewModel.Element = { type: OverviewModel.ElementType.MULTI_SELECTION };

describe("reconcileSubHeaderSlots", () => {
	it("returns undefined when subHeaderBox is undefined", () => {
		const result = reconcileSubHeaderSlots(undefined, { enableFilter: true });

		expect(result).toBeUndefined();
	});

	it("returns subHeaderBox unchanged when configuration is undefined", () => {
		const subHeaderBox: OverviewModel.SubHeaderBox = { leftSlot: [SEARCH], rightSlot: [FILTER] };

		const result = reconcileSubHeaderSlots(subHeaderBox, undefined);

		expect(result).toBe(subHeaderBox);
	});

	it("returns subHeaderBox unchanged when both flags are not false", () => {
		const subHeaderBox: OverviewModel.SubHeaderBox = { leftSlot: [SEARCH], rightSlot: [FILTER] };
		const configuration: OverviewModel.Configuration = { enableFilter: true, showFullTextSearch: true };

		const result = reconcileSubHeaderSlots(subHeaderBox, configuration);

		expect(result).toBe(subHeaderBox);
	});

	it("returns subHeaderBox unchanged when flags are false but no matching slot elements exist", () => {
		const subHeaderBox: OverviewModel.SubHeaderBox = { leftSlot: [MULTI_SELECTION], rightSlot: [] };
		const configuration: OverviewModel.Configuration = { enableFilter: false, showFullTextSearch: false };

		const result = reconcileSubHeaderSlots(subHeaderBox, configuration);

		expect(result).toBe(subHeaderBox);
	});

	it("strips search only when showFullTextSearch is false, preserving filter", () => {
		const subHeaderBox: OverviewModel.SubHeaderBox = { rightSlot: [SEARCH, FILTER, MULTI_SELECTION] };
		const configuration: OverviewModel.Configuration = { enableFilter: true, showFullTextSearch: false };

		const result = reconcileSubHeaderSlots(subHeaderBox, configuration);

		expect(result).toEqual({ rightSlot: [FILTER, MULTI_SELECTION] });
	});

	it("strips filter only when enableFilter is false, preserving search", () => {
		const subHeaderBox: OverviewModel.SubHeaderBox = { rightSlot: [SEARCH, FILTER, MULTI_SELECTION] };
		const configuration: OverviewModel.Configuration = { enableFilter: false, showFullTextSearch: true };

		const result = reconcileSubHeaderSlots(subHeaderBox, configuration);

		expect(result).toEqual({ rightSlot: [SEARCH, MULTI_SELECTION] });
	});

	it("strips both search and filter when both flags are false", () => {
		const subHeaderBox: OverviewModel.SubHeaderBox = { rightSlot: [SEARCH, FILTER, MULTI_SELECTION] };
		const configuration: OverviewModel.Configuration = { enableFilter: false, showFullTextSearch: false };

		const result = reconcileSubHeaderSlots(subHeaderBox, configuration);

		expect(result).toEqual({ rightSlot: [MULTI_SELECTION] });
	});

	it("strips from leftSlot while preserving rightSlot when only leftSlot contains disabled types", () => {
		const subHeaderBox: OverviewModel.SubHeaderBox = {
			leftSlot: [SEARCH, MULTI_SELECTION],
			rightSlot: [MULTI_SELECTION]
		};
		const configuration: OverviewModel.Configuration = { enableFilter: true, showFullTextSearch: false };

		const result = reconcileSubHeaderSlots(subHeaderBox, configuration);

		expect(result).toEqual({ leftSlot: [MULTI_SELECTION], rightSlot: [MULTI_SELECTION] });
		expect(result?.rightSlot).toBe(subHeaderBox.rightSlot);
	});
});

describe("normalizeFilterConfiguration", () => {
	it("returns configuration unchanged when filterConfiguration is undefined", () => {
		const configuration = createConfiguration({ pagingSize: 10 });

		const result = normalizeFilterConfiguration(configuration);

		expect(result).toBe(configuration);
	});

	it("returns configuration unchanged when filterMode is ALL_COLUMNS", () => {
		const configuration = createConfiguration({
			filterConfiguration: {
				showFilterButton: true,
				showFilterBar: false,
				filterMode: OverviewModel.FilterMode.ALL_COLUMNS
			}
		});

		const result = normalizeFilterConfiguration(configuration);

		expect(result).toBe(configuration);
	});

	it("returns configuration unchanged when filterMode is ALL or ALL_WITH_META", () => {
		const configAll = createConfiguration({
			filterConfiguration: {
				showFilterButton: false,
				showFilterBar: true,
				filterMode: OverviewModel.FilterMode.ALL
			}
		});
		const configAllWithMeta = createConfiguration({
			filterConfiguration: {
				showFilterButton: false,
				showFilterBar: true,
				filterMode: OverviewModel.FilterMode.ALL_WITH_META
			}
		});

		expect(normalizeFilterConfiguration(configAll)).toBe(configAll);
		expect(normalizeFilterConfiguration(configAllWithMeta)).toBe(configAllWithMeta);
	});

	it("converts CUSTOM_LIST with fields to ALL_COLUMNS dropping fields, preserving showFilterButton and showFilterBar", () => {
		const configuration = createConfiguration({
			filterConfiguration: {
				showFilterButton: true,
				showFilterBar: false,
				filterMode: OverviewModel.FilterMode.CUSTOM_LIST,
				fields: [{ fieldId: "field_abc" }]
			}
		});

		const result = normalizeFilterConfiguration(configuration);

		expect(result.filterConfiguration).toEqual({
			showFilterButton: true,
			showFilterBar: false,
			filterMode: OverviewModel.FilterMode.ALL_COLUMNS
		});
		expect((result.filterConfiguration as { fields?: unknown })?.fields).toBeUndefined();
		expect((result.filterConfiguration as { sectionData?: unknown })?.sectionData).toBeUndefined();
		expect(
			(result.filterConfiguration as { enumeratedStringFilter?: unknown })?.enumeratedStringFilter
		).toBeUndefined();
	});

	it("converts CUSTOM_LIST with fields, sectionData, and enumeratedStringFilter — drops all three", () => {
		const configuration = createConfiguration({
			filterConfiguration: {
				showFilterButton: false,
				showFilterBar: true,
				filterMode: OverviewModel.FilterMode.CUSTOM_LIST,
				fields: [{ fieldId: "field_x" }],
				sectionData: [
					{ id: "section-1", label: [{ locale: "en", text: "Section" }], fields: [{ fieldId: "field_x" }] }
				],
				enumeratedStringFilter: { fields: [{ fieldId: "field_x" }], pagingSize: 10 }
			}
		});

		const result = normalizeFilterConfiguration(configuration);

		expect(result.filterConfiguration?.filterMode).toBe(OverviewModel.FilterMode.ALL_COLUMNS);
		expect(Object.keys(result.filterConfiguration ?? {})).toEqual(["showFilterButton", "showFilterBar", "filterMode"]);
	});

	it("preserves unrelated Configuration props when converting CUSTOM_LIST", () => {
		const configuration = createConfiguration({
			pagingSize: 25,
			enableFilter: true,
			showFullTextSearch: true,
			filterConfiguration: {
				showFilterButton: true,
				showFilterBar: true,
				filterMode: OverviewModel.FilterMode.CUSTOM_LIST,
				fields: [{ fieldId: "field_y" }]
			}
		});

		const result = normalizeFilterConfiguration(configuration);

		expect(result.pagingSize).toBe(25);
		expect(result.enableFilter).toBe(true);
		expect(result.showFullTextSearch).toBe(true);
		expect(result.filterConfiguration?.filterMode).toBe(OverviewModel.FilterMode.ALL_COLUMNS);
	});
});

describe("stripInteractiveAffordances", () => {
	it("sets columns sortable to false", () => {
		const result = stripInteractiveAffordances([createColumn(true), createColumn(false)]);

		expect(result.columns.map((column) => column.sortable)).toEqual([false, false]);
	});

	it("removes search and filter elements from the subHeaderBox", () => {
		const subHeaderBox: OverviewModel.SubHeaderBox = {
			leftSlot: [{ type: OverviewModel.ElementType.SEARCH }, { type: OverviewModel.ElementType.MULTI_SELECTION }],
			rightSlot: [{ type: OverviewModel.ElementType.FILTER }]
		};

		const result = stripInteractiveAffordances([createColumn(false)], subHeaderBox);

		expect(result.subHeaderBox).toEqual({
			leftSlot: [{ type: OverviewModel.ElementType.MULTI_SELECTION }],
			rightSlot: []
		});
	});

	it("strips search and filter configuration props", () => {
		const configuration = createConfiguration({
			enableFilter: true,
			showFullTextSearch: true,
			filterConfiguration: {
				showFilterButton: true,
				showFilterBar: true,
				filterMode: OverviewModel.FilterMode.ALL
			},
			newFilterConfiguration: {
				filterGroups: [],
				filterSelector: {
					viewMode: "overlay",
					searchBar: { enabled: true, value: true },
					showSetFiltersOnly: { enabled: true, value: false }
				},
				invert: {
					enabled: true,
					value: false
				},
				joinOperator: {
					enabled: true,
					value: "and"
				}
			}
		});

		const result = stripInteractiveAffordances([createColumn(false)], undefined, undefined, configuration);

		expect(result.configuration).toEqual({
			enableFilter: false,
			showFullTextSearch: false,
			filterConfiguration: undefined,
			newFilterConfiguration: undefined
		});
	});

	it("keeps already stripped configuration unchanged", () => {
		const configuration = createConfiguration({
			enableFilter: false,
			showFullTextSearch: false
		});

		const result = stripInteractiveAffordances([createColumn(false)], undefined, undefined, configuration);

		expect(result.configuration).toBe(configuration);
	});

	it("preserves unrelated configuration props", () => {
		const configuration = createConfiguration({
			pagingSize: 25,
			showFullTextSearch: true,
			enableColumnsResize: true,
			rowHeight: 3
		});

		const result = stripInteractiveAffordances([createColumn(false)], undefined, undefined, configuration);

		expect(result.configuration).toEqual({
			enableFilter: false,
			pagingSize: 25,
			showFullTextSearch: false,
			enableColumnsResize: true,
			rowHeight: 3,
			filterConfiguration: undefined,
			newFilterConfiguration: undefined,
			initialSorting: undefined
		});
	});

	it("clears initialSorting from configuration when duplicatesAllowed strips sorting", () => {
		const configuration = createConfiguration({
			initialSorting: [{ idref: "field_name" }, { idref: "field_other" }]
		});

		const result = stripInteractiveAffordances([createColumn(true)], undefined, undefined, configuration);

		expect(result.columns[0].sortable).toBe(false);
		expect(result.configuration?.initialSorting).toBeUndefined();
	});

	it("returns undefined configuration when none is provided", () => {
		const result = stripInteractiveAffordances([createColumn(false)], undefined, undefined, undefined);

		expect(result.configuration).toBeUndefined();
	});
});

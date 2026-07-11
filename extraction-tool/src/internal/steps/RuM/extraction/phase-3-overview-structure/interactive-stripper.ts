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

import { OverviewModel } from "../../../../../models/overview-model.js";

/**
 * Converts a `CUSTOM_LIST` filterConfiguration to `ALL_COLUMNS`
 */
export function normalizeFilterConfiguration(configuration: OverviewModel.Configuration): OverviewModel.Configuration {
	const { filterConfiguration } = configuration;

	if (filterConfiguration === undefined || filterConfiguration.filterMode !== OverviewModel.FilterMode.CUSTOM_LIST) {
		return configuration;
	}

	const normalizedFilterConfiguration: OverviewModel.FilterConfiguration = {
		showFilterButton: filterConfiguration.showFilterButton,
		showFilterBar: filterConfiguration.showFilterBar,
		filterMode: OverviewModel.FilterMode.ALL_COLUMNS
	};

	return {
		...configuration,
		filterConfiguration: normalizedFilterConfiguration
	};
}

/**
 * Slot-level interactive affordance types stripped from subHeaderBox/footerBox.
 */
const INTERACTIVE_SLOT_TYPES = ["search", "filter"];

/**
 * Strips interactive affordances when duplicatesAllowed=true.
 */
export function stripInteractiveAffordances(
	columns: ReadonlyArray<OverviewModel.ReferenceColumn | OverviewModel.LinkColumn.Reference>,
	subHeaderBox?: OverviewModel.SubHeaderBox,
	footerBox?: OverviewModel.FooterBox,
	configuration?: OverviewModel.Configuration
): {
	readonly columns: ReadonlyArray<OverviewModel.ReferenceColumn | OverviewModel.LinkColumn.Reference>;
	readonly subHeaderBox?: OverviewModel.SubHeaderBox;
	readonly footerBox?: OverviewModel.FooterBox;
	readonly configuration?: OverviewModel.Configuration;
} {
	const updatedColumns = columns.map(stripColumnInteractive);
	const updatedSubHeaderBox = subHeaderBox !== undefined ? stripSubHeaderBoxInteractive(subHeaderBox) : undefined;
	const updatedFooterBox = footerBox !== undefined ? stripFooterBoxInteractive(footerBox) : undefined;
	const updatedConfiguration = configuration !== undefined ? stripConfigurationInteractive(configuration) : undefined;

	return {
		columns: updatedColumns,
		subHeaderBox: updatedSubHeaderBox,
		footerBox: updatedFooterBox,
		configuration: updatedConfiguration
	};
}

/**
 * Strips column-level interactive affordances from a single column.
 */
function stripColumnInteractive(
	column: OverviewModel.ReferenceColumn | OverviewModel.LinkColumn.Reference
): OverviewModel.ReferenceColumn | OverviewModel.LinkColumn.Reference {
	if (column.sortable === undefined || column.sortable === false) {
		return column;
	}

	return { ...column, sortable: false };
}

/**
 * Strips interactive slot elements (search, filter) from a SubHeaderBox.
 */
function stripSubHeaderBoxInteractive(box: OverviewModel.SubHeaderBox): OverviewModel.SubHeaderBox {
	const filterNonInteractive = (
		slot: ReadonlyArray<OverviewModel.Element> | undefined
	): ReadonlyArray<OverviewModel.Element> | undefined => {
		if (!slot || slot.length === 0) {
			return slot;
		}

		const filtered = slot.filter((el) => !INTERACTIVE_SLOT_TYPES.includes(el.type));

		return filtered.length === slot.length ? slot : filtered;
	};

	const leftSlot = filterNonInteractive(box.leftSlot);
	const rightSlot = filterNonInteractive(box.rightSlot);

	if (leftSlot === box.leftSlot && rightSlot === box.rightSlot) {
		return box;
	}

	return { leftSlot, rightSlot };
}

/**
 * Footer boxes do not contain search/filter affordances.
 */
function stripFooterBoxInteractive(box: OverviewModel.FooterBox): OverviewModel.FooterBox {
	return box;
}

/**
 * Strips search/filter config flags.
 */
function stripConfigurationInteractive(configuration: OverviewModel.Configuration): OverviewModel.Configuration {
	if (
		configuration.enableFilter === false &&
		configuration.showFullTextSearch === false &&
		configuration.filterConfiguration === undefined &&
		configuration.newFilterConfiguration === undefined &&
		configuration.initialSorting === undefined
	) {
		return configuration;
	}

	return {
		...configuration,
		enableFilter: false,
		showFullTextSearch: false,
		filterConfiguration: undefined,
		newFilterConfiguration: undefined,
		initialSorting: undefined
	};
}

/**
 * Collects the set of slot element types that are disabled by the configuration flags.
 */
function collectDisabledSlotTypes(
	configuration: OverviewModel.Configuration | undefined
): ReadonlySet<OverviewModel.ElementType> {
	const disabled = new Set<OverviewModel.ElementType>();

	if (configuration === undefined) {
		return disabled;
	}

	if (configuration.showFullTextSearch === false) {
		disabled.add(OverviewModel.ElementType.SEARCH);
	}

	if (configuration.enableFilter === false) {
		disabled.add(OverviewModel.ElementType.FILTER);
	}

	return disabled;
}

function filterSlotByDisabledTypes(
	slot: ReadonlyArray<OverviewModel.Element> | undefined,
	disabledTypes: ReadonlySet<OverviewModel.ElementType>
): ReadonlyArray<OverviewModel.Element> | undefined {
	if (slot === undefined || slot.length === 0) {
		return slot;
	}

	const filtered = slot.filter((el) => !disabledTypes.has(el.type));

	return filtered.length === slot.length ? slot : filtered;
}

/**
 * Reconciles SubHeaderBox slots against the configuration's interactive flags.
 */
export function reconcileSubHeaderSlots(
	subHeaderBox: OverviewModel.SubHeaderBox | undefined,
	configuration: OverviewModel.Configuration | undefined
): OverviewModel.SubHeaderBox | undefined {
	if (subHeaderBox === undefined) {
		return undefined;
	}

	const disabledTypes = collectDisabledSlotTypes(configuration);

	if (disabledTypes.size === 0) {
		return subHeaderBox;
	}

	const leftSlot = filterSlotByDisabledTypes(subHeaderBox.leftSlot, disabledTypes);
	const rightSlot = filterSlotByDisabledTypes(subHeaderBox.rightSlot, disabledTypes);

	if (leftSlot === subHeaderBox.leftSlot && rightSlot === subHeaderBox.rightSlot) {
		return subHeaderBox;
	}

	return { leftSlot, rightSlot };
}

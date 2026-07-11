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

import { Icon, type DropDownItem } from "@com.mgmtp.a12.widgets/widgets-core";

import type { DropdownSelectors } from "../../../../store/index.js";

const selectedIcon = <Icon iconTheme="filled">check</Icon>;
/**
 * Converts a store-level DropDownItem to an AutocompleteDropDownItem for the widget.
 * Pass `selectedGraphic` (JSX from the caller) to display a check icon on the selected item.
 * @internal
 */
export function toAutocompleteItem(item: DropdownSelectors.DropDownItem, selected?: boolean): DropDownItem {
	return {
		label: item.label.trim().length === 0 ? "- NO LABEL -" : item.label,
		value: item.docRef || "",
		graphic: selected ? selectedIcon : undefined,
		selected
	};
}

/**
 * Builds the full list of autocomplete candidates from available items,
 * placing the selected item on top if it is not present in available.
 * @internal
 */
export function buildAutocompleteCandidates(
	available: ReadonlyArray<DropdownSelectors.DropDownItem>,
	selected: DropDownItem | undefined
): DropDownItem[] {
	const result: DropDownItem[] = [];

	for (const item of available) {
		const isSelected = selected?.value === item.docRef;
		result.push(toAutocompleteItem(item, isSelected));
	}

	// Place the selected on top if not found in availableItems
	if (selected && !result.find((item) => selected.value === item.value)) {
		result.unshift(selected);
	}

	return result;
}

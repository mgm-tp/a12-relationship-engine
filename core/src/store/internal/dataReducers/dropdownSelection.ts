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

import type { Activity } from "@com.mgmtp.a12.client/client-core";

import type { RelationshipEngineActions } from "../actions.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";

/**
 * Handles setDropdownData action - updates dropdown data holder with fetched data.
 */
export function handleSetDropdownData(
	dataHolders: Activity.DataHolder[],
	action: ReturnType<typeof RelationshipEngineActions.Commands.setDropdownData>
): Activity.DataHolder[] {
	const { instanceId, availableItems, availableItemsFullCount, selectedItem, links } = action.payload;

	return updateDropdownHolder(dataHolders, instanceId, (dataHolder) => ({
		...dataHolder,
		data: {
			availableItems,
			availableItemsFullCount,
			// Preserve existing selectedItem when the payload doesn't provide one.
			// The saga loads only available items — selectedItem is set by the data provider during init.
			selectedItem: selectedItem ?? dataHolder.data?.selectedItem,
			links: links ?? dataHolder.data?.links ?? []
		},
		slices: {
			...dataHolder.slices,
			isLoading: false
		}
	}));
}

/**
 * Handles setDropdownLoading action - updates loading state.
 */
export function handleSetDropdownLoading(
	dataHolders: Activity.DataHolder[],
	action: ReturnType<typeof RelationshipEngineActions.Commands.setDropdownLoading>
): Activity.DataHolder[] {
	const { instanceId, isLoading } = action.payload;

	return updateDropdownHolder(dataHolders, instanceId, (holder) => ({
		...holder,
		slices: {
			...holder.slices,
			isLoading
		}
	}));
}

/**
 * Handles setDropdownSearchState action - updates search/pagination state.
 */
export function handleSetDropdownSearchState(
	dataHolders: Activity.DataHolder[],
	action: ReturnType<typeof RelationshipEngineActions.Commands.setDropdownSearchState>
): Activity.DataHolder[] {
	const { instanceId, searchText, pageNumber } = action.payload;

	return updateDropdownHolder(dataHolders, instanceId, (holder) => ({
		...holder,
		slices: {
			...holder.slices,
			searchText: searchText !== undefined ? searchText : holder.slices.searchText,
			pageNumber: pageNumber !== undefined ? pageNumber : holder.slices.pageNumber
		}
	}));
}

/**
 * Finds or creates a dropdown data holder for the given instance.
 */
function findOrCreateDropdownHolder(
	dataHolders: Activity.DataHolder[],
	instanceId: string,
	initialSlices: Partial<RelationshipEngineDataHolder.DropdownSelectionDataHolder["slices"]>
): RelationshipEngineDataHolder.DropdownSelectionDataHolder {
	const existing = dataHolders.find(
		(dh): dh is RelationshipEngineDataHolder.DropdownSelectionDataHolder =>
			RelationshipEngineDataHolder.DropdownSelectionDataHolder.isInstance(dh) && dh.descriptor.instanceId === instanceId
	);

	if (existing) {
		return existing;
	}

	return {
		descriptor: RelationshipEngineDataHolder.DropdownSelectionDataHolder.createDescriptor(instanceId),
		data: {
			availableItems: [],
			availableItemsFullCount: 0,
			selectedItem: undefined,
			links: []
		},
		slices: {
			uiConfiguration: initialSlices.uiConfiguration ?? ({} as any),
			availableItemsQueryModel: initialSlices.availableItemsQueryModel ?? "",
			selectedItemQueryModel: initialSlices.selectedItemQueryModel ?? "",
			elementRef: initialSlices.elementRef ?? "id",
			sourceEntity: initialSlices.sourceEntity ?? { docRef: null, role: "" },
			searchText: undefined,
			pageNumber: 0,
			isLoading: false
		},
		dirty: false,
		loadingState: "missing",
		savingState: "not_saved"
	};
}

/**
 * Updates a dropdown data holder in the data holders array.
 */
function updateDropdownHolder(
	dataHolders: Activity.DataHolder[],
	instanceId: string,
	update: (
		holder: RelationshipEngineDataHolder.DropdownSelectionDataHolder
	) => RelationshipEngineDataHolder.DropdownSelectionDataHolder,
	initialSlices: Partial<RelationshipEngineDataHolder.DropdownSelectionDataHolder["slices"]> = {}
): Activity.DataHolder[] {
	const existingIndex = dataHolders.findIndex(
		(dh) =>
			RelationshipEngineDataHolder.DropdownSelectionDataHolder.isInstance(dh) && dh.descriptor.instanceId === instanceId
	);

	if (existingIndex >= 0) {
		const existing = dataHolders[existingIndex] as RelationshipEngineDataHolder.DropdownSelectionDataHolder;
		const updated = update(existing);

		return [...dataHolders.slice(0, existingIndex), updated, ...dataHolders.slice(existingIndex + 1)];
	}

	// Create new holder and apply update
	const newHolder = findOrCreateDropdownHolder(dataHolders, instanceId, initialSlices);

	return [...dataHolders, update(newHolder)];
}

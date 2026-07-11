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

import React from "react";
import { useSelector, useDispatch } from "react-redux";

import { ActivitySelectors } from "@com.mgmtp.a12.client/client-core";

import { ModelSelectors } from "../../../../store/index.js";
import { DropdownSelectors } from "../../../../store/index.js";
import { ChangelogSelectors } from "../../../../store/index.js";
import { serializeInstanceId } from "../../../../store/index.js";
import { DocumentGraphSelectors } from "../../../../store/index.js";
import type { RelationshipUiModel } from "../../../../models/index.js";
import { RelationshipEngineActions } from "../../../../store/index.js";

export type DropDownItem = DropdownSelectors.DropDownItem;

/**
 * Configuration for the useDropDownSelectionData hook.
 */
export interface UseDropDownSelectionDataConfig {
	activityId: string;
	uiModel: RelationshipUiModel;
	sourceDocRef?: string;
}

/**
 * Result from the useDropDownSelectionData hook.
 */
export interface UseDropDownSelectionDataResult {
	availableItems: ReadonlyArray<DropDownItem>;
	selectedItem: DropDownItem | undefined;
	availableItemsFullCount: number;
	isLoading: boolean;
	searchText: string | undefined;
	onSearch: (text?: string) => void;
	onLoadMore: () => void;
	onSelect: (item: DropDownItem | undefined) => void;
	/** Requests opening a child activity to add a new target document. */
	onAddDocument: () => void;
	/** Whether a link form model is available for editing link documents. */
	hasLinkForm: boolean;
	/** Opens the link form for editing the currently selected link's document. */
	onEditLinkDocument: () => void;
}

/**
 * Custom hook for managing dropdown selection data.
 *
 * This hook is intentionally thin — it reads state from selectors and dispatches events.
 * Business logic (changelog management, form activity creation, single-selection enforcement)
 * is handled by middlewares: onDropdownItemSelected, onSingleSelectionLinkAdded.
 */
export function useDropDownSelectionData(config: UseDropDownSelectionDataConfig): UseDropDownSelectionDataResult {
	const { activityId, uiModel, sourceDocRef: propSourceDocRef } = config;
	const { component, relationshipName, targetRole } = uiModel.content;
	const { availableItemsQueryModel } = component;

	const dispatch = useDispatch();

	const instanceId = React.useMemo(
		() => serializeInstanceId(uiModel.header.id, "DropDownSelection"),
		[uiModel.header.id]
	);

	// Resolve sourceDocRef: prop value > document graph rootDocRef > activity instance ID
	const rootDocRef = useSelector(DocumentGraphSelectors.rootDocRef(activityId));
	const activityInstanceDocRef = useSelector(
		ActivitySelectors.activityPropById(activityId, (activity) => activity?.descriptor.instance)
	);
	const sourceDocRef = propSourceDocRef ?? rootDocRef ?? activityInstanceDocRef;

	const queryModelName = availableItemsQueryModel ?? "";

	// Read dropdown state from the Redux store via narrower selectors
	const availableItems = useSelector(DropdownSelectors.availableItems(activityId, instanceId, queryModelName));
	const selectedItem = useSelector(DropdownSelectors.selectedItem(activityId, instanceId, queryModelName));
	const { availableItemsFullCount, isLoading, searchText, pageNumber } = useSelector(
		DropdownSelectors.meta(activityId, instanceId)
	);

	// Changelog-aware selection
	const changelogParams = React.useMemo(
		() => ({ relationshipModel: relationshipName, targetRole, sourceDocRef }),
		[relationshipName, targetRole, sourceDocRef]
	);
	const effectiveTargetDocRef = useSelector(
		ChangelogSelectors.selectedTarget(activityId, changelogParams, selectedItem?.docRef)
	);

	// Link form availability (for Edit button visibility)
	const linkFormModels = useSelector(ModelSelectors.linkFormModelByName(component.linkFormModel));
	const hasLinkForm = linkFormModels !== undefined;

	// --- Event dispatchers (no business logic — handled by middlewares) ---

	// Available items are lazy-loaded: the data provider loads only the selected item during init.
	// Available items are fetched when the user opens/searches the dropdown via onSearch.

	const onSearch = React.useCallback(
		(text?: string) => {
			dispatch(
				RelationshipEngineActions.Events.loadDropdownData({
					activityId,
					instanceId,
					searchText: text,
					pageNumber: 0
				})
			);
		},
		[activityId, instanceId, dispatch]
	);

	const onLoadMore = React.useCallback(() => {
		dispatch(
			RelationshipEngineActions.Events.loadDropdownData({
				activityId,
				instanceId,
				searchText,
				pageNumber: (pageNumber ?? 0) + 1
			})
		);
	}, [activityId, instanceId, searchText, pageNumber, dispatch]);

	const onSelect = React.useCallback(
		(item: DropDownItem | undefined) => {
			dispatch(
				RelationshipEngineActions.Events.dropdownItemSelected({
					activityId,
					instanceId,
					selectedDocRef: item?.docRef
				})
			);
		},
		[activityId, instanceId, dispatch]
	);

	const onAddDocument = React.useCallback(() => {
		dispatch(
			RelationshipEngineActions.Events.addDocumentRequested({
				activityId,
				instanceId
			})
		);
	}, [activityId, instanceId, dispatch]);

	const onEditLinkDocument = React.useCallback(() => {
		if (!effectiveTargetDocRef) {
			return;
		}

		dispatch(
			RelationshipEngineActions.Events.editLinkDocumentRequested({
				activityId,
				instanceId,
				targetDocRef: effectiveTargetDocRef
			})
		);
	}, [activityId, instanceId, effectiveTargetDocRef, dispatch]);

	return {
		availableItems,
		selectedItem,
		availableItemsFullCount,
		isLoading,
		searchText,
		onSearch,
		onLoadMore,
		onSelect,
		onAddDocument,
		hasLinkForm,
		onEditLinkDocument
	};
}

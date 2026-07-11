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

import React, { useContext } from "react";
import { useSelector } from "react-redux";

import { LocalizerContext } from "@com.mgmtp.a12.utils/utils-localization-react";
import { Link, addPrefix, type DropDownItem } from "@com.mgmtp.a12.widgets/widgets-core";

import { ChangelogSelectors } from "../../../../store/index.js";
import type { DropdownSelectors } from "../../../../store/index.js";
import type { RelationshipUiModel } from "../../../../models/index.js";
import { RelationshipEngineEvents } from "../../../../models/index.js";
import { RESOURCE_KEYS, createLocalizable } from "../../languages/index.js";
import { useRelationshipEngineContext } from "../../context/RelationshipEngineContext.js";

import { useResolveDropdownLabel } from "./useResolveDropdownLabel.js";
import { useMinSearchableTokenSize } from "./minSearchableTokenSize.js";
import { useDropDownSelectionData } from "./useDropDownSelectionData.js";
import { toAutocompleteItem, buildAutocompleteCandidates } from "./autocompleteItem.js";

export namespace DropDown {
	export interface Props {
		uiModel: RelationshipUiModel;
		activityId: string;
		/**
		 * The source document reference for filtering selected items.
		 */
		sourceDocRef?: string;
		/**
		 * Whether the component is disabled.
		 */
		disabled?: boolean;
		/**
		 * Whether the component is readonly.
		 */
		readonly?: boolean;
	}
}

/**
 * DropDown component backed by QueryModel data.
 */
export function DropDown(props: DropDown.Props) {
	const { activityId, uiModel, sourceDocRef, disabled } = props;
	const { content } = uiModel;
	const component = content.component;

	const label = useResolveDropdownLabel(uiModel, activityId);
	const { localizer } = useContext(LocalizerContext);
	const Autocomplete = useRelationshipEngineContext((ctx) => ctx.widgetMap.Autocomplete);
	const Button = useRelationshipEngineContext((ctx) => ctx.componentMap.Button);
	const minSearchableTokenSize = useMinSearchableTokenSize();

	const {
		availableItems,
		selectedItem,
		availableItemsFullCount,
		isLoading,
		onSearch,
		onLoadMore,
		onSelect,
		onAddDocument,
		hasLinkForm,
		onEditLinkDocument
	} = useDropDownSelectionData({ activityId, uiModel, sourceDocRef });

	const lifecycle = useSelector(
		ChangelogSelectors.lifecycleStates(activityId, {
			relationshipModel: content.relationshipName,
			targetRole: content.targetRole,
			sourceDocRef
		})
	);
	const isInherited = selectedItem?.docRef !== undefined && lifecycle.inherited.includes(selectedItem.docRef);
	const readonly = props.readonly || isInherited;

	const selectedDropDownItem = React.useMemo((): DropDownItem | undefined => {
		if (!selectedItem) {
			return undefined;
		}

		return toAutocompleteItem(selectedItem, true);
	}, [selectedItem]);

	const handleValueChange = React.useCallback(
		(dropDownItem: DropDownItem) => {
			if (dropDownItem.id === "" && dropDownItem.label === "") {
				onSelect(undefined);
			} else if (dropDownItem.value) {
				const item: DropdownSelectors.DropDownItem = {
					label: dropDownItem.label,
					docRef: dropDownItem.value
				};
				onSelect(item);
			}
		},
		[onSelect]
	);

	const [currentSearchText, setCurrentSearchText] = React.useState<string>("");
	const belowMinSearchLength = React.useMemo(() => {
		return (
			minSearchableTokenSize !== undefined &&
			currentSearchText.length > 0 &&
			currentSearchText.length < minSearchableTokenSize
		);
	}, [currentSearchText, minSearchableTokenSize]);

	const autocompleteItems = React.useMemo(
		() => (belowMinSearchLength ? [] : buildAutocompleteCandidates(availableItems, selectedDropDownItem)),
		[availableItems, belowMinSearchLength, selectedDropDownItem]
	);

	const handleSearch = React.useCallback(
		(text?: string) => {
			if (text === "") {
				onSearch(text);
			} else if (minSearchableTokenSize === undefined || (text?.length && text.length >= minSearchableTokenSize)) {
				onSearch(text);
			}

			setCurrentSearchText(text ?? "");
		},
		[onSearch, minSearchableTokenSize]
	);

	const hintTemplate = React.useMemo(() => {
		if (belowMinSearchLength) {
			return localizer(
				createLocalizable(RESOURCE_KEYS.relationshipengine.dropdown["min-search-length"], {
					count: { type: "plain", value: String(minSearchableTokenSize) }
				})
			);
		}

		return localizer(
			createLocalizable(RESOURCE_KEYS.relationshipengine.dropdown["result-count"], {
				resultCount: { type: "plain", value: "{count}" },
				totalCount: { type: "plain", value: String(availableItemsFullCount) }
			})
		);
	}, [availableItemsFullCount, belowMinSearchLength, localizer, minSearchableTokenSize]);

	const loadingLabel = React.useMemo(
		() => localizer(createLocalizable(RESOURCE_KEYS.relationshipengine.dropdown["loading"])),
		[localizer]
	);

	const addDocButton = (component.buttons ?? []).find((b) => b.event === RelationshipEngineEvents.ADD_DOCUMENT);
	const editLinkButton = (component.buttons ?? []).find((b) => b.event === RelationshipEngineEvents.EDIT_LINK_DOCUMENT);
	const showEditLinkDocumentButton = editLinkButton !== undefined && hasLinkForm && selectedItem !== undefined;

	const { autocompleteKey, onDropdownClose } = useWorkaroundToRemainAutocompleteInputValue();

	return (
		<div className={addPrefix("-u-padding-b-base")}>
			<Autocomplete
				key={autocompleteKey}
				label={label}
				value={selectedDropDownItem}
				disabled={disabled}
				readonly={readonly}
				items={autocompleteItems}
				loading={isLoading}
				loadingLabel={loadingLabel}
				hintTemplate={hintTemplate ?? ""}
				onValueChange={handleValueChange}
				onSearch={handleSearch}
				onDropdownClose={onDropdownClose}
				suffixes={
					addDocButton || showEditLinkDocumentButton ? (
						<>
							{addDocButton && (
								<Button buttonElement={addDocButton} onClick={onAddDocument} disabled={disabled || isInherited} />
							)}
							{showEditLinkDocumentButton && (
								<Button
									buttonElement={editLinkButton}
									onClick={onEditLinkDocument}
									disabled={disabled || isInherited}
								/>
							)}
						</>
					) : undefined
				}
				dropdownFooter={
					autocompleteItems.length < availableItemsFullCount && !belowMinSearchLength ? (
						<Link onClick={onLoadMore}>Load More</Link>
					) : null
				}
			/>
		</div>
	);
}

/** Keeps autocomplete input synced with store selection; handles link-form cancellation resets. */
function useWorkaroundToRemainAutocompleteInputValue() {
	const [unRemountKey, setUnMountKey] = React.useState(0);

	return {
		autocompleteKey: unRemountKey,
		onDropdownClose: () => setUnMountKey((prev) => prev + 1)
	};
}

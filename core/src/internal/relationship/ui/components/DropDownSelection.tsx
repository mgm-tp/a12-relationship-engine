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
 * @packageDocumentation
 * @module relationship
 */

import React, { Component } from "react";

import { LocalizerContext } from "@com.mgmtp.a12.utils/utils-localization-react/lib/main/index.js";
import { Button, type DropDownItem, Icon, Autocomplete, Link } from "@com.mgmtp.a12.widgets/widgets-core";

import {
	descriptorEditLink,
	descriptorLoading,
	descriptorMinSearchLength,
	descriptorResultCount
} from "../../localization.js";

import { type SingleSelectionItem, type SingleSelectionProps } from "./api.js";
import FormEngineModal from "./FormEngineModal.js";
import { ProgressIndicator } from "./ProgressIndicator.js";

interface SingleSelectionDropDownItem extends DropDownItem {
	readonly item: SingleSelectionItem;
}

function isSingleSelectionDropDownItem(dropDownItem: DropDownItem): dropDownItem is SingleSelectionDropDownItem {
	return (dropDownItem as SingleSelectionDropDownItem).item !== undefined;
}

export type DropDownSelectionProps = SingleSelectionProps;

export interface DropDownSelectionState {
	debouncing: boolean;
	currentSearchText: string;
}

export class DropDownSelection extends Component<DropDownSelectionProps, DropDownSelectionState> {
	static contextType: React.Context<any> = LocalizerContext;
	declare context: React.ContextType<typeof LocalizerContext> | undefined;
	private lastSearchValue: string | undefined;

	constructor(props: SingleSelectionProps) {
		super(props);
		this.state = {
			debouncing: false,
			currentSearchText: ""
		};
	}

	private handleOnValueChange = (dropDownItem: DropDownItem) => {
		this.props.onSelectItem(isSingleSelectionDropDownItem(dropDownItem) ? dropDownItem.item : undefined);
	};

	private handleEditLink = () => {
		if (this.props.selectedItem.loadingState === "loaded" && this.props.selectedItem.data) {
			this.props.onEditItem(this.props.selectedItem.data);
		}
	};

	private debouncedOnSearch = debounce((searchText?: string) => {
		this.props.onSearchItem(searchText);
		this.setState({ debouncing: false });
	}, 500);

	private onSearch = (searchText?: string) => {
		if (this.lastSearchValue === searchText) {
			return;
		}

		const minSize = this.props.minSearchableTokenSize;
		const textLength = searchText?.length ?? 0;
		if (minSize !== undefined && textLength > 0 && textLength < minSize) {
			this.setState({ currentSearchText: searchText ?? "" });
			this.lastSearchValue = searchText;
			return;
		}

		this.setState({ debouncing: true, currentSearchText: searchText ?? "" });
		this.debouncedOnSearch(searchText);
		this.lastSearchValue = searchText;
	};

	private getSelectedItem() {
		return this.props.selectedItem.loadingState === "loaded" && this.props.selectedItem.data
			? convertSingleSelectionToDropDownItem(this.props.selectedItem.data, true)
			: undefined;
	}

	private getAutocompleteCandidates(selectedItem: SingleSelectionDropDownItem | undefined) {
		const result: SingleSelectionDropDownItem[] = [];

		for (const item of this.props.items.loadingState === "loaded" ? this.props.items.data : []) {
			const selected = selectedItem?.item.docRef === item.docRef;
			result.push(convertSingleSelectionToDropDownItem(item, selected));
		}

		// Place the selected on top if it is not found from the candidates, this helps in cases like: pagination, searching...
		if (selectedItem && !result.find((item) => selectedItem.value === item.value)) {
			result.unshift(selectedItem);
		}
		return result;
	}

	render(): React.ReactNode {
		const { label, disabled, readonly, itemsFullCount, minSearchableTokenSize } = this.props;
		const { currentSearchText } = this.state;

		const belowMinSearchLength =
			minSearchableTokenSize !== undefined &&
			currentSearchText.length > 0 &&
			currentSearchText.length < minSearchableTokenSize;

		const hintTemplate = belowMinSearchLength
			? this.context?.localizer(
					descriptorMinSearchLength({
						count: { type: "plain", value: String(minSearchableTokenSize) }
					})
				)
			: this.context?.localizer(
					descriptorResultCount({
						resultCount: { type: "plain", value: "{count}" },
						totalCount: { type: "plain", value: itemsFullCount }
					})
				);

		const selectedItem = this.getSelectedItem();
		const autocompleteItems = belowMinSearchLength ? [] : this.getAutocompleteCandidates(selectedItem);

		const editItem = this.props.editItem && convertSingleSelectionToDropDownItem(this.props.editItem);
		const hasMoreItems = !belowMinSearchLength && autocompleteItems.length < itemsFullCount;

		return (
			<div>
				<Autocomplete
					label={label}
					value={editItem || selectedItem}
					disabled={disabled}
					readonly={readonly}
					items={autocompleteItems}
					loading={this.props.items.loadingState === "loading" || this.state.debouncing}
					loadingLabel={this.context?.localizer(descriptorLoading())}
					hintTemplate={hintTemplate || ""}
					suffixes={
						this.props.editItemFormModels && selectedItem ? (
							<Button
								icon={<Icon>description</Icon>}
								title={this.context?.localizer(descriptorEditLink())}
								onClick={this.handleEditLink}
							/>
						) : undefined
					}
					onValueChange={this.handleOnValueChange}
					onSearch={this.onSearch}
					dropdownFooter={hasMoreItems ? <Link onClick={this.props.onLoadMore}>Load More</Link> : null}
				/>
				{this.props.editItemFormModels &&
					this.props.editItemFormModels.loadingState === "loaded" &&
					this.props.editItemDocumentJson && (
						<FormEngineModal
							{...this.props.editItemFormModels}
							readonly={readonly}
							document={this.props.editItemDocumentJson}
							onCancel={this.props.onCancelEditItemDocument}
							onSubmit={this.props.onSubmitEditItemDocument}
						/>
					)}
				{this.props.selectedItem.loadingState === "loading" && <ProgressIndicator variant="bright" />}
			</div>
		);
	}
}

function convertSingleSelectionToDropDownItem(
	item: SingleSelectionItem,
	selected?: boolean
): SingleSelectionDropDownItem {
	return {
		label: item.label.trim().length === 0 ? "- NO LABEL -" : item.label,
		value: item.docRef,
		graphic: selected ? selectedIcon : undefined,
		selected,
		item
	};
}

const selectedIcon = <Icon iconTheme="filled">check</Icon>;

/*
 * ===== BEGIN THIRD-PARTY SOURCE: ts-debounce (https://github.com/chodorowicz/ts-debounce),
 * https://github.com/chodorowicz/ts-debounce/blob/v4.0.0/src/index.ts
 * Licensed under the MIT License.
 * Copyright (c) 2017 Jakub Chodorowicz
 * Modified by mgm technology partners on 2023-12-12.
 */
function debounce<F extends (...args: any[]) => void>(
	func: F,
	waitMilliseconds = 50,
	options: { isImmediate: boolean } = { isImmediate: false }
): F {
	let timeoutId: number | undefined;

	return function (this: any, ...args: any[]) {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const context = this;

		const doLater = () => {
			timeoutId = undefined;
			if (!options.isImmediate) {
				func.apply(context, args);
			}
		};

		const shouldCallNow = options.isImmediate && timeoutId === undefined;

		if (timeoutId !== undefined) {
			clearTimeout(timeoutId);
		}

		timeoutId = window.setTimeout(doLater, waitMilliseconds);

		if (shouldCallNow) {
			func.apply(context, args);
		}
	} as any;
}
// ===== END THIRD-PARTY SOURCE =====

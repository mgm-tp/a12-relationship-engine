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

import type { LocalizedModelText } from "@com.mgmtp.a12.utils/utils-localization";

import type { ComponentConfiguration } from "../../../binding/binding-model.js";
import { isValidLocalizedModelText } from "../model-accessors/localization-helpers.js";

/** Localized label nested in an object: { label: LocalizedModelText } */
interface LabelWrapper {
	readonly label?: LocalizedModelText;
}

/**
 * buttonLabels prop shape for DualPane / TableList.
 */
interface ButtonLabels {
	readonly edit?: LocalizedModelText;
	readonly add?: LocalizedModelText;
}

type MutableButtonLabels = {
	-readonly [K in keyof ButtonLabels]?: ButtonLabels[K];
};

/**
 * The subset of props that the extraction pipeline reads from legacy
 * DualPaneSelection, TableList, and DropDownSelection components.
 *
 * All fields are optional — absent props are treated as undefined by each accessor.
 */
export interface LegacyComponentProps {
	readonly height?: number | string;
	readonly editDialogWidth?: string | number;
	readonly editDialogMaxWidth?: string | number;
	readonly editDialogMaxHeight?: string | number;
	readonly editDialogTitle?: LabelWrapper;
	readonly editDialogCancelButtonLabel?: LabelWrapper;
	readonly editDialogCloseButtonLabel?: LabelWrapper;
	readonly buttonLabels?: ButtonLabels;
	readonly availableItemsTable?: LabelWrapper;
	readonly selectedItemsTable?: LabelWrapper;
}

type MutableLegacyComponentProps = {
	-readonly [K in keyof LegacyComponentProps]?: LegacyComponentProps[K];
};

function isLabelWrapper(value: unknown): value is LabelWrapper {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return false;
	}

	const label = Reflect.get(value, "label");

	if (label === undefined) {
		return true;
	}

	return isValidLocalizedModelText(label);
}

function readButtonLabels(value: unknown): ButtonLabels | undefined {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return undefined;
	}

	const mutableLabels: MutableButtonLabels = {};
	const editLabel = Reflect.get(value, "edit");
	const addLabel = Reflect.get(value, "add");

	if (isValidLocalizedModelText(editLabel)) {
		mutableLabels.edit = editLabel;
	}

	if (isValidLocalizedModelText(addLabel)) {
		mutableLabels.add = addLabel;
	}

	return Object.keys(mutableLabels).length > 0 ? mutableLabels : undefined;
}

/**
 * Narrows the raw `props` bag to `LegacyComponentProps`.
 * Returns an empty object when `props` is undefined.
 *
 * SAFETY: raw legacy component props boundary — the stored JSON bag is dynamic,
 * and extraction intentionally reads only the named subset declared above.
 */
export function narrowComponentProps(props: ComponentConfiguration["props"]): LegacyComponentProps {
	if (!isLegacyComponentProps(props)) {
		return {};
	}

	const mutableProps: MutableLegacyComponentProps = {};

	if (typeof props.height === "number" || typeof props.height === "string") {
		mutableProps.height = props.height;
	}

	if (typeof props.editDialogWidth === "string" || typeof props.editDialogWidth === "number") {
		mutableProps.editDialogWidth = props.editDialogWidth;
	}

	if (typeof props.editDialogMaxWidth === "string" || typeof props.editDialogMaxWidth === "number") {
		mutableProps.editDialogMaxWidth = props.editDialogMaxWidth;
	}

	if (typeof props.editDialogMaxHeight === "string" || typeof props.editDialogMaxHeight === "number") {
		mutableProps.editDialogMaxHeight = props.editDialogMaxHeight;
	}

	if (isLabelWrapper(props.editDialogTitle)) {
		mutableProps.editDialogTitle = props.editDialogTitle;
	}

	if (isLabelWrapper(props.editDialogCancelButtonLabel)) {
		mutableProps.editDialogCancelButtonLabel = props.editDialogCancelButtonLabel;
	}

	if (isLabelWrapper(props.editDialogCloseButtonLabel)) {
		mutableProps.editDialogCloseButtonLabel = props.editDialogCloseButtonLabel;
	}

	const buttonLabels = readButtonLabels(props.buttonLabels);

	if (buttonLabels !== undefined) {
		mutableProps.buttonLabels = buttonLabels;
	}

	if (isLabelWrapper(props.availableItemsTable)) {
		mutableProps.availableItemsTable = props.availableItemsTable;
	}

	if (isLabelWrapper(props.selectedItemsTable)) {
		mutableProps.selectedItemsTable = props.selectedItemsTable;
	}

	return mutableProps;
}

export function isLegacyComponentProps(props: unknown): props is LegacyComponentProps {
	return props !== null && typeof props === "object" && !Array.isArray(props);
}

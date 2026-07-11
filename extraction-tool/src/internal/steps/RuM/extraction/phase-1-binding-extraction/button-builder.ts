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

import type { ComponentKind } from "../types.js";
import type { RelationshipUiModel } from "../../relationship-ui-model.js";
import type { ModificationConfiguration } from "../../../binding/binding-model.js";
import { isValidLocalizedModelText } from "../model-accessors/localization-helpers.js";
import {
	EventName,
	DEFAULT_OK_LABEL,
	DEFAULT_ADD_LABEL,
	DEFAULT_EDIT_LABEL,
	DEFAULT_CANCEL_LABEL,
	DEFAULT_DROPDOWN_EDIT_LABEL
} from "../constants.js";

import { narrowComponentProps, type LegacyComponentProps } from "./component-props.js";

/**
 * Builds button element arrays for each component type based on legacy binding configuration.
 *
 * | Component Type      | Buttons                                                                 |
 * |---------------------|-------------------------------------------------------------------------|
 * | `TableList`       	 | 4 buttons when `kind.dualPaneComponent` is present:                     |
 * |                   	 | event_open_edit_modal, event_add_document,                              |
 * |                   	 | event_cancel_edit_modal (destructive),                                  |
 * |                   	 | event_submit_edit_modal (primary);                                      |
 * |                   	 | 1 button (`event_add_document`) when `dualPaneComponent` is absent      |
 * | `DropDownSelection` | event_edit_link_document (if resolved link form exists),              |
 * |                     | event_add_document (if addButtonLabel exists)                         |
 * | `DualPaneSelection` | (none)                                                                |
 *
 * Edit button fallback chain (TableList): `buttonLabels.edit` → `editDialogTitle` → default
 * Add button fallback chain (TableList): `buttonLabels.add` → `addButtonLabel` → default
 * Cancel button label: `editDialogCancelButtonLabel.label` → `"Cancel"/"Abbrechen"`
 * OK button label: `editDialogCloseButtonLabel.label` → `"OK"/"OK"`
 * DropDown edit button: `modificationConfiguration.editButtonLabel` → generic additional-properties label
 * DropDown add button: `modificationConfiguration.addButtonLabel`
 */
export function buildButtonsForComponent(
	kind: ComponentKind,
	modificationConfiguration?: ModificationConfiguration,
	linkFormModel?: string
): readonly RelationshipUiModel.ButtonElement[] {
	const props = narrowComponentProps(kind.component.props);

	switch (kind.kind) {
		case "TableList": {
			const addLabel = resolveTableListAddLabel(props, modificationConfiguration?.addButtonLabel);

			if (kind.dualPaneComponent === undefined) {
				return [{ event: EventName.AddDocument, label: addLabel }];
			}

			const editLabel = resolveTableListEditLabel(props);
			const cancelLabel = isValidLocalizedModelText(props.editDialogCancelButtonLabel?.label)
				? props.editDialogCancelButtonLabel?.label
				: DEFAULT_CANCEL_LABEL;
			const okLabel = isValidLocalizedModelText(props.editDialogCloseButtonLabel?.label)
				? props.editDialogCloseButtonLabel?.label
				: DEFAULT_OK_LABEL;

			return [
				{ event: EventName.OpenEditModal, label: editLabel },
				{ event: EventName.AddDocument, label: addLabel },
				{ event: EventName.CancelEditModal, label: cancelLabel, destructive: true },
				{ event: EventName.SubmitEditModal, label: okLabel, primary: true }
			];
		}

		case "DropDownSelection": {
			const buttons: RelationshipUiModel.ButtonElement[] = [];

			if (linkFormModel !== undefined) {
				buttons.push({
					event: EventName.EditLinkDocument,
					icon: { name: "description" },
					labelHidden: true,
					label: modificationConfiguration?.editButtonLabel ?? DEFAULT_DROPDOWN_EDIT_LABEL
				});
			}

			if (hasNonEmptyLabel(modificationConfiguration?.addButtonLabel)) {
				buttons.push({
					event: EventName.AddDocument,
					icon: { name: "add" },
					labelHidden: true,
					label: modificationConfiguration.addButtonLabel
				});
			}

			return buttons;
		}

		case "DualPaneSelection":
		default:
			return [];
	}
}

/**
 * Resolves the add button label for a TableList component
 * using the fallback chain: buttonLabels.add → addButtonLabel → default.
 */
function resolveTableListAddLabel(
	props: LegacyComponentProps,
	addButtonLabel: LocalizedModelText | undefined
): LocalizedModelText {
	const fromButtonLabels = isValidLocalizedModelText(props.buttonLabels?.add) ? props.buttonLabels?.add : undefined;

	if (fromButtonLabels !== undefined) {
		return fromButtonLabels;
	}

	if (addButtonLabel !== undefined && addButtonLabel.length > 0) {
		return addButtonLabel;
	}

	return DEFAULT_ADD_LABEL;
}

/**
 * Resolves the edit button label for a TableList component
 * using the fallback chain: buttonLabels.edit → editDialogTitle → default.
 */
function resolveTableListEditLabel(props: LegacyComponentProps): LocalizedModelText {
	const fromButtonLabels = isValidLocalizedModelText(props.buttonLabels?.edit) ? props.buttonLabels?.edit : undefined;

	if (fromButtonLabels !== undefined) {
		return fromButtonLabels;
	}

	const fromEditDialog = isValidLocalizedModelText(props.editDialogTitle?.label)
		? props.editDialogTitle.label
		: undefined;

	if (fromEditDialog !== undefined) {
		return fromEditDialog;
	}

	return DEFAULT_EDIT_LABEL;
}

/**
 * Returns true when a localized label exists and contains visible text.
 */
function hasNonEmptyLabel(label: LocalizedModelText | undefined): label is LocalizedModelText {
	return label !== undefined && label.some((entry) => entry.text.trim().length > 0);
}

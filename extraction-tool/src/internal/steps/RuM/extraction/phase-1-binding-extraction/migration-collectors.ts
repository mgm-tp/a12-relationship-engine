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

import { isValidLocalizedModelText } from "../model-accessors/localization-helpers.js";
import type { ComponentKind, PageSizeMigration, OverviewLabelMigration, OverviewLabelCloneTarget } from "../types.js";

import { narrowComponentProps } from "./component-props.js";

/**
 * Labels extracted from the legacy component props for the edit dialog UI.
 */
export interface EditDialogLabels {
	/** Label for the edit dialog title. */
	readonly editDialogTitle?: LocalizedModelText;
	/** Label for the edit dialog cancel button. */
	readonly editDialogCancelButtonLabel?: LocalizedModelText;
	/** Label for the edit dialog close button. */
	readonly editDialogCloseButtonLabel?: LocalizedModelText;
}

/**
 * Collects page size migrations from a classified component.
 *
 * Reads the page size from the component ROOT (e.g. `comp.candidatePageSize`),
 * NOT from component props. Maps it to the relevant overview model ID based
 * on the component's `models[]` entries.
 *
 * | Component Type    | Page Size Source | Target Model               |
 * |-------------------|------------------|----------------------------|
 * | `DropDownSelection` | candidatePageSize | candidate model           |
 * | `DualPaneSelection` | candidatePageSize | candidate model           |
 * | `TableList`         | linkPageSize      | link model                |
 *
 * @param kind - The classified component kind.
 * @returns Array of page size migrations (empty if no page size is set).
 */
export function collectPageSizes(kind: ComponentKind): readonly PageSizeMigration[] {
	const result: PageSizeMigration[] = [];

	switch (kind.kind) {
		case "DropDownSelection":
		case "DualPaneSelection": {
			const pageSize = kind.candidatePageSize;

			if (pageSize !== undefined) {
				const overviewModelId = findModelNameForUse(kind.component.models, "candidate");

				if (overviewModelId !== undefined) {
					result.push({ overviewModelId, pageSize });
				}
			}

			break;
		}

		case "TableList": {
			const pageSize = kind.linkPageSize;

			if (pageSize !== undefined) {
				const overviewModelId = findModelNameForUse(kind.component.models, "link");

				if (overviewModelId !== undefined) {
					result.push({ overviewModelId, pageSize });
				}
			}

			break;
		}
	}

	return result;
}

/**
 * Finds the first model with the given `use` value in a component's
 * models array and returns its `name` (the model reference ID).
 */
function findModelNameForUse(
	models: readonly { readonly name: string; readonly use: string }[],
	use: string
): string | undefined {
	return models.find((m) => m.use === use)?.name;
}

/**
 * Collects overview label migrations from the legacy component props.
 *
 * Extracts and validates `availableItemsTable.label` and `selectedItemsTable.label`
 * directly from the component props, then associates each with the appropriate
 * overview model reference (candidate or link).
 *
 * @param kind - The classified component kind.
 * @returns Array of overview label migrations (empty if no table labels are set).
 */
export function collectOverviewLabelMigrations(kind: ComponentKind): readonly OverviewLabelMigration[] {
	const props = narrowComponentProps(kind.component.props);

	const result: OverviewLabelMigration[] = [];

	const availableItemsLabel = isValidLocalizedModelText(props.availableItemsTable?.label)
		? props.availableItemsTable.label
		: undefined;

	if (availableItemsLabel !== undefined) {
		const overviewModelId = findModelNameForUse(kind.component.models, "candidate");

		if (overviewModelId !== undefined) {
			result.push({
				overviewModelId,
				labels: availableItemsLabel,
				source: "pane-label",
				cloneTargets: new Set<OverviewLabelCloneTarget>(["base", "RelName"])
			});
		}
	}

	const selectedItemsLabel = isValidLocalizedModelText(props.selectedItemsTable?.label)
		? props.selectedItemsTable.label
		: undefined;

	if (selectedItemsLabel !== undefined && kind.kind === "DualPaneSelection") {
		const overviewModelId = findModelNameForUse(kind.component.models, "link");

		if (overviewModelId !== undefined) {
			result.push({
				overviewModelId,
				labels: selectedItemsLabel,
				source: "pane-label",
				cloneTargets: new Set<OverviewLabelCloneTarget>(["base", "edit"])
			});
		}
	}

	if (kind.kind === "TableList" && kind.dualPaneComponent?.props !== undefined) {
		const editDualPaneProps = narrowComponentProps(kind.dualPaneComponent.props);

		const editAvailableItemsLabel = isValidLocalizedModelText(editDualPaneProps.availableItemsTable?.label)
			? editDualPaneProps.availableItemsTable.label
			: undefined;

		if (editAvailableItemsLabel !== undefined) {
			const overviewModelId = findModelNameForUse(kind.component.models, "candidate");

			if (overviewModelId !== undefined) {
				result.push({
					overviewModelId,
					labels: editAvailableItemsLabel,
					source: "nested-edit-pane-label",
					cloneTargets: new Set(["edit-available"])
				});
			}
		}

		const editSelectedItemsLabel = isValidLocalizedModelText(editDualPaneProps.selectedItemsTable?.label)
			? editDualPaneProps.selectedItemsTable.label
			: undefined;

		if (editSelectedItemsLabel !== undefined) {
			const overviewModelId = findModelNameForUse(kind.component.models, "link");

			if (overviewModelId !== undefined) {
				result.push({
					overviewModelId,
					labels: editSelectedItemsLabel,
					source: "nested-edit-pane-label",
					cloneTargets: new Set(["edit"])
				});
			}
		}
	}

	return result;
}

/**
 * Collects edit dialog labels from the legacy component props.
 *
 * Extracts `editDialogTitle`, `editDialogCancelButtonLabel`, and
 * `editDialogCloseButtonLabel` from the component's props after validating
 * localized label shapes.
 *
 * @param kind - The classified component kind.
 * @returns An object with any found edit dialog labels.
 */
export function collectEditDialogLabels(kind: ComponentKind): EditDialogLabels {
	const props = narrowComponentProps(kind.component.props);

	const editDialogTitle = isValidLocalizedModelText(props.editDialogTitle?.label)
		? props.editDialogTitle.label
		: undefined;
	const editDialogCancelButtonLabel = isValidLocalizedModelText(props.editDialogCancelButtonLabel?.label)
		? props.editDialogCancelButtonLabel.label
		: undefined;
	const editDialogCloseButtonLabel = isValidLocalizedModelText(props.editDialogCloseButtonLabel?.label)
		? props.editDialogCloseButtonLabel.label
		: undefined;

	return {
		...(editDialogTitle !== undefined ? { editDialogTitle } : {}),
		...(editDialogCancelButtonLabel !== undefined ? { editDialogCancelButtonLabel } : {}),
		...(editDialogCloseButtonLabel !== undefined ? { editDialogCloseButtonLabel } : {})
	};
}

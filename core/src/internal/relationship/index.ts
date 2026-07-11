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
export { RESOURCE_KEYS as RELATIONSHIP_RESOURCE_KEYS } from "./languages/index.js";
export { RelationshipViews } from "./views.js";
export { RelationshipFactories } from "./factories.js";
export { RelationshipActions } from "./actions.js";
export { RelationshipReducers } from "./reducers.js";
export { RelationshipSelectors } from "./selectors.js";
export { Relationship } from "./relationship.js";
export type { WithComponentProvider, CreateRelationshipFormModelMapType } from "./ui/FormEngineCustomWidgets.js";
export {
	RelationshipFormModelMap,
	useIsBoundModelElement,
	createRelationshipFormModelMap
} from "./ui/FormEngineCustomWidgets.js";
export type { DualPaneSelectionProps } from "./ui/components/DualPaneSelection.js";
export { DualPaneSelection } from "./ui/components/DualPaneSelection.js";
export type { TableListProps, ModelableEditDialogProps, EditDialogButtonProps } from "./ui/components/TableList.js";
export { LinkTableTemplate as TableList } from "./ui/components/TableList.js";
export type { DropDownSelectionProps, DropDownSelectionState } from "./ui/components/DropDownSelection.js";
export { DropDownSelection } from "./ui/components/DropDownSelection.js";

export type {
	SingleSelectionProps,
	MultiSelectionProps,
	ListProps,
	LocalizationProps,
	EditDocumentProps,
	SingleSelectionItem,
	MultiSelectionItem,
	ListItem,
	Items,
	RelationshipDocument
} from "./ui/components/api.js";

export type { LocalizedLabelConfig } from "./ui/components/util.js";

export type { ProgressIndicatorContext } from "./ui/components/ProgressIndicatorContext.js";
export {
	ProgressIndicatorContextProvider,
	useProgressIndicatorContext
} from "./ui/components/ProgressIndicatorContext.js";

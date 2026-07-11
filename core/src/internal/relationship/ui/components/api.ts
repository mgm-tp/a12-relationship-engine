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
 *
 * Attention: All code in this file is experimental and subject to
 * breaking changes even in minor releases.
 */
import type { OverviewEngineApi, OverviewEngineState } from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import type { Relationship } from "../../relationship.js";

export interface EditDocumentProps<T> {
	readonly editItemDocumentJson?: object;
	readonly editItemFormModels?: Relationship.FormModels;
	onSubmitEditItemDocument(documentJson: object): void;
	onCancelEditItemDocument(): void;
	onEditItem(item: T): void;
}

export interface LocalizationProps {
	/**
	 * A relationship component can be used in different contexts.
	 * E.g. the same component can be referenced in multiple relationship UI configurations.
	 * To distinguish between these contexts when localizing the component, this prefix can be used.
	 * If used in a relationship configuration it could be "relationship/uiConfiguration/ProductBrand-Ui" in which
	 * "ProductBrand-Ui" is the name of the UI configuration.
	 */
	readonly localizableKeyPrefix: string;
}

/**
 * A container for loadable things.
 */
export type Items<T> =
	| {
			readonly loadingState: "loaded";
			readonly data: T;
	  }
	| {
			readonly loadingState: "missing" | "loading" | "error";
	  };

export interface ListItem {
	/** Document as json structure that belongs to the item. */
	readonly documentJson: RelationshipDocument;

	/**
	 * A previously removed or withdrawn assignment has been "revived"
	 * by adding a new item which is based on the same document.
	 */
	readonly reassigned: boolean;

	/** Type of mutation. */
	readonly mutation?: Relationship.LinkMutationState;

	/** Whether the item should be displayed in the current page */
	readonly visible?: boolean;

	/** The original id of the document */
	readonly originalId?: string;
}

export interface ListProps extends LocalizationProps {
	/** The list of items to display in the list */
	readonly items: Items<ListItem[]>;

	/** Overview models bundle that is used to interpret the items. */
	readonly itemModels: Relationship.OverviewModels;

	/** The label of the component. */
	readonly label?: string;

	/** Shall the component be displayed in a disabled mode? */
	readonly disabled?: boolean;

	/** Determines if the component is displayed in a readonly mode */
	readonly readonly?: boolean;

	/** Determines if the list rows should be interactive in a readonly mode */
	readonly rowsReadonlyInteractive?: boolean;

	/** The (optional) label of the add button */
	readonly addLabel?: string;

	/** Optional pagination options */
	readonly pagination?: OverviewEngineApi.Pagination;

	/**
	 * a map which maps an attachmentId to a big thumbnail url
	 */
	readonly thumbnails?: Record<string, string>;

	/** Optional handler for click on an item */
	onItemClick?(item: ListItem): void;

	/**
	 * Optional handler to add a new item - if given, an add button will be
	 * rendered,
	 */
	onAddItem?(): void;

	/** Optional callback for handling page number change */
	onPageChange?(pageNumber: number): void;
}

export interface SingleSelectionProps extends EditDocumentProps<SingleSelectionItem>, LocalizationProps {
	/** A partial set of all current visible items. */
	readonly items: Items<SingleSelectionItem[]>;

	/** Number of all available items. */
	readonly itemsFullCount: number;

	/** A set of all current visible items that are selected. */
	readonly selectedItem: Items<SingleSelectionItem | undefined>;

	/** Item which is currently modified by the user. */
	readonly editItem?: SingleSelectionItem;

	/** The label of the component. */
	readonly label?: string;

	/** Shall the component be displayed in a disabled mode? */
	readonly disabled?: boolean;

	/** Determines if the component is displayed in a readonly mode */
	readonly readonly?: boolean;

	/** Callback for handling item selection. It shall be triggered if a new item is selected. */
	onSelectItem(item?: SingleSelectionItem): void;

	/** Callback for handling full text search. */
	onSearchItem(searchText?: string): void;

	/** Callback for handling load more candidates */
	onLoadMore?(): void;

	/** Minimum number of characters required for a search to be executed. If set, a hint message is shown when the input is below this limit. */
	readonly minSearchableTokenSize?: number;
}

export interface SingleSelectionItem {
	/** The label of the item. */
	readonly label: string;
	/** The target docRef */
	readonly docRef?: string;
}

export interface MultiSelectionProps extends EditDocumentProps<MultiSelectionItem>, LocalizationProps {
	/** A set of all available items. */
	readonly availableItems: Items<MultiSelectionItem[]>;

	/** A set of assigned items. */
	readonly assignments: Items<MultiSelectionItem[]>;

	/** Overview models bundle that is used to interpret the assignments. */
	readonly assignmentModels: Relationship.OverviewModels;

	/** Overview models bundle that is used to interpret the available items. */
	readonly availableItemModels: Relationship.OverviewModels;

	/** Active filter options for the available items. */
	readonly availableItemsFilters: OverviewEngineApi.FilterMap;

	/** The label of the component. */
	readonly label?: string;

	/** Shall the component be displayed in a disabled mode? */
	readonly disabled?: boolean;

	/** Determines if the component is displayed in a readonly mode */
	readonly readonly?: boolean;

	/** The maximal number of items that can be assigned */
	readonly maxNumberOfAssignments?: number;

	/** Active pagination options for the available items. */
	readonly availableItemsPagination?: OverviewEngineApi.Pagination;

	/** Active pagination options for the linked items. */
	readonly assignedItemsPagination?: OverviewEngineApi.Pagination;

	/** Number of total assigned items */
	readonly assignedItemsFullCount?: number;

	/** Active sorting options for the available items. */
	readonly availableItemsSorting?: OverviewEngineState["sorting"];

	/**
	 * a map which maps an attachmentId to a big thumbnail url
	 */
	readonly thumbnails?: Record<string, string>;

	/** Callback for handling adding assignments. */
	onAddAssignment(item: MultiSelectionItem): void;

	/** Callback for handling adding existing assignments. */
	onAddExistingAssignment(item: MultiSelectionItem): void;

	/** Callback for handling removing existing assignments. */
	onRemoveExistingAssignment(item: MultiSelectionItem): void;

	/** Callback for handling change of the filter options. */
	onAvailableItemsFilterChanged(filters: OverviewEngineApi.FilterMap): void;

	onItemClick?(item: MultiSelectionItem): void;

	/** Callback for handling change of the pagination options. */
	onAvailableItemsPageChange?(page: number): void;

	/** Callback for handling change of the pagination options. */
	onAssignedItemsPageChange?(page: number): void;

	/** Callback for handling change of the sorting options. */
	onAvailableItemsSortingChange?(sorting: Relationship.SortClause): void;
}

export interface MultiSelectionItem {
	/** Document as json structure that belongs to the item. */
	readonly documentJson: RelationshipDocument;

	/** Whether this item is selectable. */
	readonly selectionAllowed: boolean;

	/**
	 * A previously removed or withdrawn assignment has been "revived"
	 * by adding a new item which is based on the same document.
	 */
	readonly reassigned: boolean;

	/** Type of mutation. */
	readonly mutation?: Relationship.LinkMutationState;

	/** Shall the item be displayed in the current page? */
	readonly visible?: boolean;
}

export interface RelationshipDocument {
	readonly id: string;
	/** @internal */
	readonly modelId: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly [key: string]: any | undefined;
}

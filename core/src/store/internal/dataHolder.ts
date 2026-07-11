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

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Activity } from "@com.mgmtp.a12.client/client-core";
import type { EntityInstancePath } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import type { Relationship, RelationshipModel } from "@com.mgmtp.a12.dataservices/dataservices-access";
import type {
	OverviewActivity,
	UiState as OverviewEngineUiState
} from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import type { RelationshipUiModel } from "../../models/index.js";

import type { Changelog, DocumentGraph } from "./state.js";

/** @internal */
export namespace RelationshipEngineDataHolder {
	export interface Document extends Record<string, any> {
		id: string;
		modelId: string;
	}

	export interface InstanceDataHolder extends Activity.DataHolder<OverviewActivity.Data.DocumentListData> {
		slices: Slices;
	}

	export interface SelectedItemsDataHolder extends InstanceDataHolder {
		descriptor: {
			type: "selected";
			feature: "relationship";
			instanceId: string;
		};
		slices: Slices & {
			/**
			 * Tracks the drafting document created for the most recently added DetachedRepeat row
			 * (CDM flow). Set by `onRepeatRowAddedSaga` when a new row is added via
			 * `FormEngineEvents.Repeat.addRow`. Used by `onDetachedRepeatTransactionMiddleware`
			 * to finalize the drafting document as a real link when the detached form is committed.
			 */
			draftingDocumentRow?: DraftingDocumentRow;
		};
	}

	export namespace SelectedItemsDataHolder {
		export function isInstance(dataHolder: Activity.DataHolder<any>): dataHolder is SelectedItemsDataHolder {
			return dataHolder.descriptor.type === "selected" && dataHolder.descriptor.feature === "relationship";
		}
	}

	export interface AvailableItemsDataHolder extends InstanceDataHolder {
		descriptor: {
			type: "available";
			feature: "relationship";
			instanceId: string;
		};
	}

	export namespace AvailableItemsDataHolder {
		export function isInstance(dataHolder: Activity.DataHolder<any>): dataHolder is AvailableItemsDataHolder {
			return dataHolder.descriptor.type === "available" && dataHolder.descriptor.feature === "relationship";
		}
	}

	export interface UiModelInstance {
		readonly uiModelId: string;
		readonly sourceDocId: string;
		readonly configuration: RelationshipUiModel.Content;
		readonly relationshipModel?: RelationshipModel;
		readonly formModelPath: string | null;
	}

	export interface Slices extends Record<string, any> {
		id: string;
		uiState?: OverviewEngineUiState;
		uiConfiguration: RelationshipUiModel.Content;
		sourceEntity: {
			docRef: string | null;
			role: string;
		};
		formModelPath: string | null;
	}

	export interface DraftingDocumentRow {
		readonly rowInstancePath: EntityInstancePath;
		readonly docRef: string;
		readonly documentModelName: string;
	}

	export namespace Slices {
		export function isInstance(slices?: Record<string, any>): slices is Slices {
			return !!slices && "id" in slices && "uiConfiguration" in slices;
		}
	}

	export interface ChangelogDataHolder extends Omit<Activity.DataHolder, "data"> {
		descriptor: {
			type: "changelog";
			feature: "relationship";
		};
		data: Changelog;
	}

	export namespace ChangelogDataHolder {
		export function isInstance(dataHolder: Activity.DataHolder<any>): dataHolder is ChangelogDataHolder {
			return dataHolder.descriptor.type === "changelog" && dataHolder.descriptor.feature === "relationship";
		}
	}

	export interface DocumentGraphDataHolder extends Activity.DataHolder<unknown> {
		descriptor: {
			type: "document_graph";
			feature: "relationship";
		};
		data: DocumentGraph;
		slices: DocumentGraphDataHolder.Slices;
	}

	export namespace DocumentGraphDataHolder {
		export function isDescriptorMatched(
			descriptor: Activity.DataHolderDescriptor
		): descriptor is DocumentGraphDataHolder["descriptor"] {
			return descriptor.type === "document_graph" && descriptor.feature === "relationship";
		}

		export function isInstance(dataHolder: Activity.DataHolder<any>): dataHolder is DocumentGraphDataHolder {
			return isDescriptorMatched(dataHolder.descriptor);
		}

		export interface Slices extends Record<string, any> {
			cdmName: string;
			rootDocRef: string;
			preProcessed?: boolean;
			initialDocumentGraph?: DocumentGraph;
		}
	}

	/**
	 * Data holder for dropdown selection component state.
	 * Contains selected item, available items list, and UI state like loading and search.
	 */
	export interface DropdownSelectionDataHolder extends Activity.DataHolder<DropdownSelectionDataHolder.Data> {
		descriptor: {
			type: "dropdown_selection";
			feature: "relationship";
			instanceId: string;
		};
		slices: DropdownSelectionDataHolder.Slices;
	}

	export namespace DropdownSelectionDataHolder {
		export interface Data {
			readonly selectedItem: DocumentItem | undefined;
			readonly availableItems: DocumentItem[];
			readonly availableItemsFullCount: number;
			readonly links: ReadonlyArray<DropdownLinkData>;
		}

		export interface DocumentItem {
			readonly docRef: string;
			readonly document: object;
			readonly documentModelName: string;
		}

		export interface DropdownLinkData {
			readonly linkRef: Relationship.LinkRef;
			/** The link document content (from type=LINK entry), if any. The docRef is available via `__meta.docRef`. */
			readonly linkDocument?: object;
		}

		export interface Slices extends Record<string, any> {
			readonly uiConfiguration: RelationshipUiModel.Content;
			readonly availableItemsQueryModel: string;
			readonly selectedItemQueryModel: string;
			readonly elementRef: string;
			readonly sourceEntity: {
				readonly docRef: string | null;
				readonly role: string;
			};
			readonly searchText: string | undefined;
			readonly pageNumber: number;
			readonly isLoading: boolean;
		}

		export function createDescriptor(instanceId: string): DropdownSelectionDataHolder["descriptor"] {
			return {
				type: "dropdown_selection",
				feature: "relationship",
				instanceId
			};
		}

		export function isInstance(dataHolder: Activity.DataHolder<any>): dataHolder is DropdownSelectionDataHolder {
			return dataHolder.descriptor.type === "dropdown_selection" && dataHolder.descriptor.feature === "relationship";
		}

		export function isDescriptorMatched(
			descriptor: Activity.DataHolderDescriptor
		): descriptor is DropdownSelectionDataHolder["descriptor"] {
			return descriptor.type === "dropdown_selection" && descriptor.feature === "relationship";
		}
	}
}

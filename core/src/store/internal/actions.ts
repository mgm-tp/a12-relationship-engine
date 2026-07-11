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
import type { ModelPath } from "@com.mgmtp.a12.base/base-model-api";
import type { EntityInstancePath } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import { actionCreatorFactory } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";
import type { Relationship as RelationshipApi } from "@com.mgmtp.a12.dataservices/dataservices-access";
import type { RelationshipModel, QueryJsonRpc2Response } from "@com.mgmtp.a12.dataservices/dataservices-access";

import type { RelationshipUiModel } from "../../models/index.js";

import type { Dialog, Changelog } from "./state.js";
import type { RelationshipEngineDataHolder } from "./dataHolder.js";

/** @internal */
export namespace RelationshipEngineActions {
	/**
	 * Command actions are handled by some reducer and may change the state.
	 * It’s a one-to-one connection between a producer (who sends the command)
	 * and a consumer (who takes and executes the command).
	 */
	export namespace Commands {
		const actionCreator = actionCreatorFactory("RelationshipEngine/Command");

		/**
		 * Command to create dataholders:
		 * - mutation dh
		 * - one dh per candidate instance
		 * - one dh per link instance
		 */
		export const initDataHolders = actionCreator<InitDataHoldersPayload>("INIT_DATA_HOLDERS");
		export interface UiModelInstance {
			readonly uiModelId: string;
			readonly sourceDocId: string;
			readonly configuration: RelationshipUiModel.Content;
			readonly relationshipModel?: RelationshipModel;
			readonly formModelPath: string | null;
		}

		export interface InitDataHoldersPayload {
			readonly activityId: string;
			readonly instances: UiModelInstance[];
			readonly isCdd?: boolean;
		}

		export const setDataHolders = actionCreator<SetDataHoldersPayload>("SET_DATA_HOLDERS");
		export interface SetDataHoldersPayload {
			readonly activityId: string;
			readonly dataHolders: UpdatedDataHolder[];
		}

		export interface UpdatedDataHolder<T = {}> extends Partial<Activity.DataHolder<T>> {
			readonly descriptor: Activity.DataHolderDescriptor;
			readonly thumbnails?: Record<string, string>;
		}

		export const setThumbnails = actionCreator<SetThumbnailsPayload>("SET_THUMBNAILS");
		export interface SetThumbnailsPayload {
			readonly activityId: string;
			readonly thumbnails: Record<string, string>;
		}

		export const setSourceEntities = actionCreator<SetSourceEntitiesPayload>("SET_SOURCE_ENTITIES");
		export interface SetSourceEntitiesPayload {
			readonly activityId: string;
			readonly updates: ReadonlyArray<{
				readonly descriptor: Activity.DataHolderDescriptor;
				readonly sourceEntity: RelationshipEngineDataHolder.Slices["sourceEntity"];
			}>;
		}

		/**
		 * Records that a new drafting document was created for a DetachedRepeat row.
		 * The data holder identified by {@link instanceId} stores the mapping so that
		 * subsequent field-value changes targeting the row can be attributed to the
		 * correct drafting document rather than the source document.
		 */
		export const trackDraftingDocumentRow =
			actionCreator<TrackDraftingDocumentRowPayload>("TRACK_DRAFTING_DOCUMENT_ROW");

		export interface TrackDraftingDocumentRowPayload {
			readonly activityId: string;
			readonly instanceId: string;
			readonly rowInstancePath: EntityInstancePath;
			readonly docRef: string;
			readonly documentModelName: string;
		}

		/**
		 * Clears the `draftingDocumentRow` from a `SelectedItemsDataHolder` after the
		 * DetachedRepeat form is either committed (finalized with a `linkAdded`) or
		 * cancelled (drafting document rolled back via checkpoint).
		 */
		export const clearDraftingDocumentRow =
			actionCreator<ClearDraftingDocumentRowPayload>("CLEAR_DRAFTING_DOCUMENT_ROW");

		export interface ClearDraftingDocumentRowPayload {
			readonly activityId: string;
			readonly instanceId: string;
		}

		export const addChangeLog = actionCreator<AddChangeLogPayload>("ADD_CHANGE_LOG");

		export interface AddChangeLogPayload {
			readonly activityId: string;
			readonly change: Changelog.Change;
		}

		export const addChangeLogs = actionCreator<AddChangeLogsPayload>("ADD_CHANGE_LOGS");

		export interface AddChangeLogsPayload {
			readonly activityId: string;
			readonly changes: Changelog.Change[];
		}

		export const removeChangeLog = actionCreator<RemoveChangeLogPayload>("REMOVE_CHANGE_LOG");

		export interface RemoveChangeLogPayload {
			readonly activityId: string;
			readonly index: number;
		}

		export const pushChangelogCheckpoint = actionCreator<PushChangelogCheckpointPayload>("PUSH_CHANGELOG_CHECKPOINT");

		export interface PushChangelogCheckpointPayload {
			readonly activityId: string;
			readonly checkpointId: string;
			readonly scope: Changelog.CheckpointScope;
			readonly createdAt: number;
		}

		export const resolveChangelogCheckpoint =
			actionCreator<ResolveChangelogCheckpointPayload>("RESOLVE_CHANGELOG_CHECKPOINT");

		export interface ResolveChangelogCheckpointPayload {
			readonly activityId: string;
			readonly checkpointId?: string;
			readonly scope: Changelog.CheckpointScope;
			readonly outcome: "commit" | "rollback";
		}

		// Seed child activity changelog with parent's existing changes
		export const seedChangelog = actionCreator<SeedChangelogPayload>("SEED_CHANGELOG");
		export interface SeedChangelogPayload {
			readonly activityId: string; // child activity id
			readonly changes: Changelog.Change[];
		}

		// Merge child activity changelog back into parent
		export const mergeChangelog = actionCreator<MergeChangelogPayload>("MERGE_CHANGELOG");
		export interface MergeChangelogPayload {
			readonly activityId: string;
			readonly childActivityId: string;
			readonly changes: Changelog.Change[];
		}

		// Fetch groupPath subtrees for CDM changelog apply (batched, one RPC call for all linkAdded entries)
		export const loadSubDocumentGraphs = actionCreator.async<
			LoadSubDocumentGraphs.Params,
			LoadSubDocumentGraphs.Result
		>("LOAD_SUB_DOCUMENT_GRAPHS");

		export namespace LoadSubDocumentGraphs {
			export interface Subtree {
				readonly relationshipName: string;
				readonly groupPath: ModelPath;
				/** rootDocRef of the CDM root document */
				readonly docRef: string;
				readonly cdmName: string;
			}

			export interface Params {
				readonly activityId: string;
				readonly subtrees: ReadonlyArray<Subtree>;
			}

			export interface SubtreeResult {
				readonly relationshipName: string;
				readonly projection: QueryJsonRpc2Response.DocumentGraphProjection;
				/** Resolved sub-document-graph fragment, ready to cache in the changelog. */
				readonly fragment: Changelog.SubDocumentGraphAdded;
			}

			export interface Result {
				readonly subtrees: ReadonlyArray<SubtreeResult>;
			}
		}

		// Set the dialog state for variant selection and other dialogs
		export const setDialogState = actionCreator<SetDialogStatePayload>("SET_DIALOG_STATE");
		export interface SetDialogStatePayload {
			readonly activityId: string;
			readonly state: Dialog;
		}

		// Dropdown selection commands
		export const setDropdownData = actionCreator<SetDropdownDataPayload>("SET_DROPDOWN_DATA");
		export interface SetDropdownDataPayload {
			readonly activityId: string;
			readonly instanceId: string;
			readonly availableItems: RelationshipEngineDataHolder.DropdownSelectionDataHolder.DocumentItem[];
			readonly availableItemsFullCount: number;
			readonly selectedItem?: RelationshipEngineDataHolder.DropdownSelectionDataHolder.DocumentItem;
			readonly links?: ReadonlyArray<RelationshipEngineDataHolder.DropdownSelectionDataHolder.DropdownLinkData>;
		}

		export const setDropdownLoading = actionCreator<SetDropdownLoadingPayload>("SET_DROPDOWN_LOADING");
		export interface SetDropdownLoadingPayload {
			readonly activityId: string;
			readonly instanceId: string;
			readonly isLoading: boolean;
		}

		export const setDropdownSearchState = actionCreator<SetDropdownSearchStatePayload>("SET_DROPDOWN_SEARCH_STATE");
		export interface SetDropdownSearchStatePayload {
			readonly activityId: string;
			readonly instanceId: string;
			readonly searchText?: string;
			readonly pageNumber?: number;
		}

		export const setPreProcessed = actionCreator<SetPreProcessedPayload>("SET_PRE_PROCESSED");
		export interface SetPreProcessedPayload {
			readonly activityId: string;
		}
	}

	/**
	 * Event actions will not lead to state changes, because no reducer is bound
	 * to it. It’s send by a producer which doesn’t know and doesn’t care about
	 * the consumers of the event.
	 */
	export namespace Events {
		const actionCreator = actionCreatorFactory("RelationshipEngine/Event");

		export const linkAdded = actionCreator<LinkAddedPayload>("LINK_ADDED");
		export interface LinkAddedPayload {
			readonly activityId: string;
			readonly linkRef: RelationshipApi.LinkRef;
			readonly linkDocument?: object;
			readonly groupPath?: ModelPath;
			readonly docRef: string;
			/** Snapshot of target document for exclude-mode drafting links. */
			readonly targetDocument?: object;
			/** Target document model id for exclude-mode drafting links. */
			readonly targetDocumentModelName?: string;
		}

		export const linkDeleted = actionCreator<LinkDeletedPayload>("LINK_DELETED");
		export interface LinkDeletedPayload {
			readonly activityId: string;
			readonly linkId: string; // existing link id to delete
			readonly linkRef: RelationshipApi.LinkRef; // needed to know entities when updating UI selectors
		}

		export const dialogConfirmed = actionCreator<DialogConfirmedPayload>("DIALOG_CONFIRMED");
		export interface DialogConfirmedPayload {
			readonly activityId: string;
			readonly selectedDocumentModelId: string;
		}

		export const dialogClosed = actionCreator<DialogClosedPayload>("DIALOG_CLOSED");
		export interface DialogClosedPayload {
			readonly activityId: string;
		}

		// Dropdown events - triggers data loading saga
		export const loadDropdownData = actionCreator<LoadDropdownDataPayload>("LOAD_DROPDOWN_DATA");
		export interface LoadDropdownDataPayload {
			readonly activityId: string;
			readonly instanceId: string;
			readonly searchText?: string;
			readonly pageNumber?: number;
		}
		// Dropdown selection events
		export const dropdownItemSelected = actionCreator<DropdownItemSelectedPayload>("DROPDOWN_ITEM_SELECTED");
		export interface DropdownItemSelectedPayload {
			readonly activityId: string;
			readonly instanceId: string;
			readonly selectedDocRef: string | undefined;
		}

		export const addDocumentRequested = actionCreator<AddDocumentRequestedPayload>("ADD_DOCUMENT_REQUESTED");
		export interface AddDocumentRequestedPayload {
			readonly activityId: string;
			readonly instanceId: string;
		}

		export const editLinkDocumentRequested =
			actionCreator<EditLinkDocumentRequestedPayload>("EDIT_LINK_DOCUMENT_REQUESTED");
		export interface EditLinkDocumentRequestedPayload {
			readonly activityId: string;
			readonly instanceId: string;
			readonly targetDocRef: string;
		}

		/**
		 * Fired when the user clicks a drafting row (a locally-created document not yet persisted in DS)
		 * in the link pane.
		 *
		 * Carries the same context as an OE `onRowClicked` event so `onLinkRowClickedMiddleware` can
		 * process it without needing to look up the document in DS data.
		 */
		export const onDraftingRowClicked = actionCreator<OnDraftingRowClickedPayload>("ON_DRAFTING_ROW_CLICKED");
		export interface OnDraftingRowClickedPayload {
			readonly activityId: string;
			readonly documentId: string;
			readonly linkId?: string;
			readonly dataHolderDescriptor: Activity.DataHolderDescriptor;
			readonly customEvent?: string;
		}

		/**
		 * Fired when the user clicks a drafting-link row (a link-added entry rendered
		 * as a local row via the exclude-mode drafting path). No middleware/saga handles
		 * this event — it is emitted purely as a signal for downstream/custom consumers.
		 */
		export const onDraftingLinkClicked = actionCreator<OnDraftingLinkClickedPayload>("ON_DRAFTING_LINK_CLICKED");
		export interface OnDraftingLinkClickedPayload {
			readonly activityId: string;
			readonly documentId: string;
			readonly linkId: string;
			readonly dataHolderDescriptor: Activity.DataHolderDescriptor;
			readonly customEvent?: string;
		}

		export const editModalCancelled = actionCreator<EditModalCancelledPayload>("EDIT_MODAL_CANCELLED");
		export interface EditModalCancelledPayload {
			readonly activityId: string;
			readonly checkpointId: string;
		}

		export const editModalConfirmed = actionCreator<EditModalConfirmedPayload>("EDIT_MODAL_CONFIRMED");
		export interface EditModalConfirmedPayload {
			readonly activityId: string;
			readonly checkpointId: string;
		}

		export const scdmComputation = actionCreator.async<ScdmComputation.Param, ScdmComputation.Result>(
			"SCDM_COMPUTATION"
		);
		export namespace ScdmComputation {
			export interface Param {
				readonly activityId: string;
			}
			export interface Result {}
		}
	}
}

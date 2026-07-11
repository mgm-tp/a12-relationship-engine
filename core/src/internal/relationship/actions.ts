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

import type { UnknownAction } from "redux";

import type { DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import { type Activity, ActivityActions } from "@com.mgmtp.a12.client/client-core";
import { type Action, actionCreatorFactory } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";
import type { OverviewModel, OverviewEngineApi } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import type {
	RelationshipModel,
	Relationship as RelationshipServerApi
} from "@com.mgmtp.a12.dataservices/dataservices-access";

import type { Relationship } from "./relationship.js";

/**
 * These actions are objects that send data about the relationship events and
 * commands to the Redux store.
 */
export namespace RelationshipActions {
	/**
	 * Command actions are handled by some reducer and may change the state.
	 * It’s a one-to-one connection between a producer (who sends the command)
	 * and a consumer (who takes and executes the command).
	 */
	export namespace Commands {
		const actionCreator = actionCreatorFactory("Relationships/Command");

		/**
		 * @internal
		 * Command to create dataholders:
		 * - mutation dh
		 * - one dh per candidate instance
		 * - one dh per link instance
		 */
		export function createInstanceDataholders(payload: CreateInstanceDataholdersPayload) {
			return ActivityActions.loadData(payload);
		}

		createInstanceDataholders.match = (action: UnknownAction): action is Action<CreateInstanceDataholdersPayload> => {
			return ActivityActions.loadData.match(action) && "instances" in action.payload;
		};

		/* @internal */
		export interface BindingInstance {
			readonly elementId: string;
			readonly sourceDocId: string;
			readonly details: Relationship.UiConfiguration;
			readonly relationshipModel?: RelationshipModel;
			readonly overviewModel?: OverviewModel;
			readonly documentModel?: DocumentModel;
		}

		/* @internal */
		export interface CreateInstanceDataholdersPayload {
			readonly activityId: string;
			readonly instances: BindingInstance[];
		}

		/*
		 * Command that signals that a document change (creation or update)
		 * plus potential link mutations was persisted on the server
		 * - Sets the updated document in the default dataholder if needed
		 * - Updates candidate/link dataholders with new server data
		 * - Resets the mutation dataholder
		 *
		 * @internal
		 */
		export const dataSaved = actionCreator<DataSavedPayload>("DATA_SAVED");

		/* @internal */
		export interface DataSavedPayload extends ActivityActions.ActivityActionPayload {
			/**
			 * When given, updates the data.document with it
			 */
			readonly documentId?: string;
			readonly documentModel: DocumentModel;
			readonly candidatePayloads?: SetCandidatesPayload[];
			readonly linkPayloads?: SetLinksPayload[];
			readonly setPagePayloads?: SetPagePayload[];
		}

		/**
		 * @internal
		 * Command to update a link of a given activity.
		 */
		export const modifyLink = actionCreator<ModifyLinkPayload>("MODIFY_LINK");

		/* @internal */
		export interface ModifyLinkPayload {
			readonly activityId: string;
			readonly link: Relationship.LinkWithDocument;
		}

		/**
		 * @internal
		 * Command to delete a link of a given activity.
		 */
		export const deleteLink = actionCreator<DeleteLinkPayload>("DELETE_LINK");

		/* @internal */
		export interface DeleteLinkPayload {
			readonly activityId: string;
			readonly instanceId: string;
			readonly link: Relationship.LinkWithDocument;
		}

		/**
		 * @internal
		 * Command to restore a link of a given activity.
		 */
		export const restoreLink = actionCreator<RestoreLinkPayload>("RESTORE_LINK");

		/* @internal */
		export interface RestoreLinkPayload {
			readonly activityId: string;
			readonly link: Relationship.LinkWithDocument;
		}

		/**
		 * @internal
		 * Command to relink a link of a given activity.
		 */
		export const relinkLink = actionCreator<RelinkPayload>("RELINK_LINK");

		/* @internal */
		export interface RelinkPayload {
			readonly activityId: string;
			readonly link: Relationship.LinkWithDocument;
		}

		/**
		 * @internal
		 * Command to add a candidate of a given activity.
		 */
		export const addLink = actionCreator<AddLinkPayload>("ADD_LINK");

		/* @internal */
		export interface AddLinkPayload {
			readonly activityId: string;
			readonly instanceId: string;
			readonly candidate: Relationship.Candidate;
		}

		/**
		 * @internal
		 * Command to set a link editable of a given activity and instance.
		 */
		export const setEditLink = actionCreator<SetEditLinkPayload>("SET_EDIT_LINK");

		/* @internal */
		export interface SetEditLinkPayload {
			readonly activityId: string;
			readonly instanceId: string;
			readonly link?: Relationship.LinkWithDocument;
		}

		/**
		 * Command to set candidates of a given activity and instance.
		 */
		export const setCandidates = actionCreator<SetCandidatesPayload>("SET_CANDIDATES");
		export interface SetCandidatesPayload extends SetPayloadBase {
			readonly candidates: RelationshipServerApi.Candidate[];
		}

		/**
		 * Command to set links of a given activity and instance.
		 */
		export const setLinks = actionCreator<SetLinksPayload>("SET_LINKS");
		export interface SetLinksPayload extends SetPayloadBase {
			readonly links: Relationship.LinkWithDocument[];
		}

		/**
		 * Shared interface payload for set candidates/links actions
		 */
		export interface SetPayloadBase {
			readonly activityId: string;
			readonly instanceId: string;
			/**
			 * The total number of candidates/links which may be not available on the client
			 */
			readonly fullCount: number;

			/**
			 * The index of the first item (candidate/link) of candidates/links field of this payload,
			 * in the list of all items in the server
			 */
			readonly offset: number;
			/**
			 * The number of items (candidate/link) of candidates/links field of this payload,
			 * and should be the same as the length of the list in the most cases.
			 */
			readonly limit: number;
		}

		/**
		 * @internal
		 * Command to update sorting of candidates of a given activity and instance.
		 */
		export const setSort = actionCreator<SetSortPayload>("SET_SORT");

		/* @internal */
		export interface SetSortPayload {
			readonly type: "candidate";
			readonly activityId: string;
			readonly instanceId: string;
			readonly sort?: Relationship.SortClause;
		}

		/**
		 * @internal
		 * Command to update filtering of candidates of a given activity and instance.
		 */
		export const setFilter = actionCreator<SetFilterPayload>("SET_FILTER");

		/* @internal */
		export interface SetFilterPayload {
			readonly type: "candidate";
			readonly activityId: string;
			readonly instanceId: string;
			readonly filter?: Relationship.FilterClause;
		}

		/**
		 * @internal
		 * Command to set the pagination and page clause of candidates/links of a given activity and instance.
		 */
		export const setPage = actionCreator<SetPagePayload>("SET_PAGE");

		/** @internal */
		export interface SetPagePayload {
			readonly type: "candidate" | "link";
			readonly activityId: string;
			readonly instanceId: string;
			readonly pageNumber: number;
			/**
			 * The demand index of the first item that need to be fetched
			 */
			readonly offset?: number;
			/**
			 * The total number of items that need to be fetched
			 */
			readonly limit?: number;
		}

		/**
		 * @internal
		 * Command to reset the mutations data holder to an older (backup) state.
		 */
		export const resetMutations = actionCreator<ResetMutationsPayload>("RESET_MUTATIONS");

		/** @internal */
		export interface ResetMutationsPayload {
			readonly activityId: string;
			readonly mutationsDataHolder: Activity.DataHolder<Relationship.Mutation[]>;
		}
	}

	/**
	 *
	 * @internal
	 * Event actions will not lead to state changes, because no reducer is bound
	 * to it. It’s send by a producer which doesn’t know and doesn’t care about
	 * the consumers of the event.
	 */
	export namespace Events {
		const actionCreator = actionCreatorFactory("Relationships/Event");

		/**
		 * @internal
		 * Indicates that a candidate was added to a given activity.
		 */
		export const linkAdded = actionCreator<LinkAddedPayload>("LINK_ADDED");

		/* @internal */
		export interface LinkAddedPayload {
			readonly activityId: string;
			readonly instanceId: string;
			readonly candidate: Relationship.Candidate;
		}

		/**
		 * @internal
		 * Indicates that a candidate should be added to a given activity.
		 */
		export const addLinkRequested = actionCreator<AddLinkRequestedPayLoad>("ADD_LINK_REQUESTED");

		/* @internal */
		export interface AddLinkRequestedPayLoad {
			readonly activityId: string;
			readonly instanceId: string;
			readonly candidate: RelationshipServerApi.Candidate;
		}

		/**
		 * @internal
		 * Indicates that the sorting of candidates of a given activity and instance changed.
		 */
		export const sortChanged = actionCreator<SortChangedPayload>("SORT_CHANGED");

		/* @internal */
		export interface SortChangedPayload {
			readonly type: "candidate";
			readonly activityId: string;
			readonly instanceId: string;
			readonly sort?: Relationship.SortClause;
		}

		/**
		 * @internal
		 *
		 * Indicates that the filtering of candidates of a given activity and instance changed.
		 */
		export const filterChanged = actionCreator<FilterChangedPayload>("FILTER_CHANGED");

		/** @internal */
		export interface FilterChangedPayload {
			readonly type: "candidate";
			readonly activityId: string;
			readonly instanceId: string;
			readonly fulltext?: string;
			readonly fieldFilters?: OverviewEngineApi.FilterMap;
		}

		/**
		 * @internal
		 * Indicates that the pagination of candidates of a given activity and instance changed.
		 */
		export const pageChanged = actionCreator<PageChangedPayload>("PAGE_CHANGED");

		/* @internal */
		export interface PageChangedPayload {
			readonly type: "candidate" | "link";
			readonly activityId: string;
			readonly instanceId: string;
			readonly pageNumber: number;
		}

		/**
		 * @internal
		 * Indicates that the pagination of candidates of a given activity and instance expanded/extended the limit.
		 */
		export const pageExpanded = actionCreator<PageExpandedPayload>("PAGE_EXPANDED");

		/** @internal */
		export interface PageExpandedPayload {
			readonly type: "candidate";
			readonly activityId: string;
			readonly instanceId: string;
		}
	}
}

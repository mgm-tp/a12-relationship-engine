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
 * @module cdm/cdd
 * @experimental
 */

import type { UnknownAction } from "redux";

import type { Change, ReadonlyObjectMap } from "@com.mgmtp.a12.formengine/formengine-core";
import type { DocumentModel, GroupInstance } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import { type Action, actionCreatorFactory } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";
import { ActivityActions, type ActivityActionWithModelsInScenePayload } from "@com.mgmtp.a12.client/client-core";
import type {
	ModelGraph,
	Relationship as RelationshipServerApi
} from "@com.mgmtp.a12.dataservices/dataservices-access";

import type { Relationship } from "../../../relationship/relationship.js";
import type {
	DocRef,
	ChangeLog,
	RelshPath,
	DgChangeLog,
	DeepReadonly,
	DocumentGraph
} from "../../../documentGraph/core/index.js";

const acf = actionCreatorFactory("cdd");

export function initAndLoadCandidates(
	payload: InitializeAndLoadCandidatesPayload
): ReturnType<typeof ActivityActions.loadData> {
	return ActivityActions.loadData(payload);
}

initAndLoadCandidates.match = (action: UnknownAction): action is Action<InitializeAndLoadCandidatesPayload> => {
	return ActivityActions.loadData.match(action) && "bindings" in action.payload && "modelGraph" in action.payload;
};

export interface InitializeAndLoadCandidatesPayload extends ActivityActionWithModelsInScenePayload {
	readonly modelGraph: ModelGraph;
	readonly bindings: Relationship.UiConfigurationBinding[];
}

export const merge = acf<MergePayload>("MERGE");

export interface MergePayload {
	cdm: DocumentModel;
	documentGraph: DeepReadonly<DocumentGraph>;
	changeLog?: ChangeLog<DeepReadonly<DocumentGraph>>;
	path: RelshPath;
	rootDoc: DocRef;
	activityId: string;
	selectedLinkId?: string;
}

export const setSubActivityData = acf<SetSubActivityDataPayload>("SET_SUB_ACTIVITY_DATA");

export interface SetSubActivityDataPayload extends ActivityActions.ActivityActionPayload {
	readonly cdm: DocumentModel;
	readonly rootDoc: DocRef;
	readonly documentGraph: DeepReadonly<DocumentGraph>;
	readonly changeLog: ChangeLog<DeepReadonly<DocumentGraph>>;
	readonly selectedLinkId?: string;
}

//#region ===== Link =====

export const addCddLink = acf<AddCddLinkPayload>("ADD_LINK");

export interface AddCddLinkPayload {
	readonly activityId: string;
	readonly targetRole: string;
	readonly linkDescriptor: RelationshipServerApi.LinkDescriptor;
	// this is only used in non-cdm forms
	readonly candidateDoc?: GroupInstance;
	readonly linkDoc?: GroupInstance;
	// this is only set in case of a create & link operation
	readonly targetDoc?: {
		documentModelName: string;
		document: GroupInstance;
	};
	readonly setDirty?: true;
}

export const removedCddLink = acf<RemoveCddLinkPayload>("REMOVE_LINK");

export interface RemoveCddLinkPayload {
	readonly activityId: string;
	readonly linkRef: RelationshipServerApi.LinkRef;
	readonly setDirty?: true;
}

export const replacedCddLink = acf<ReplaceCddLinkPayload>("REPLACE_LINK");

/**
 * Atomic replace in one reduction: computations never observe the
 * removed-but-not-yet-added intermediate state.
 */
export interface ReplaceCddLinkPayload extends AddCddLinkPayload {
	readonly removeLinkRef: RelationshipServerApi.LinkRef;
}

//#endregion

//#region ===== changeDocument =====

/**
 * Action to change the CDD (document perspective). The action currently
 * contains both the complete, changed document as well as a list of all
 * changes.
 *
 * For the prototype, the complete document is used to completely recreate the
 * data graph. For the productive release, the changes should be used to only
 * change individual documents and links in the data graph. However, this is a
 * lot more difficult and only partly solved in CDD Timo's prototype.
 */
export const changeCddDocument = acf<ChangeCddDocumentPayload>("CHANGE_DOCUMENT");

export interface ChangeCddDocumentPayload {
	activityId: string;
	document: object;
	modelGraph: ModelGraph;
	changes: ReadonlyObjectMap<Change>;
	preProcessed?: boolean;
}

//#endregion

/**
 * Action to save the changes in a CDM sub activity back into its parent
 * activity.
 */
export const saveSubActivity = acf<SaveSubActivityPayload>("SAVE_SUB_ACTIVITY");

export interface SaveSubActivityPayload {
	activityId: string;
	documentGraph: DeepReadonly<DocumentGraph>;
	changeLog: DgChangeLog;
	readonly setDirty?: true;
	thumbnailSlice?: Record<string, string>;
}

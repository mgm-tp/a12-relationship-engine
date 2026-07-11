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

import type { Model as ModelAPI } from "@com.mgmtp.a12.base/base-model-api";
import { THUMBNAIL_SLICE } from "@com.mgmtp.a12.client/client-core/a12internal";
import type { Action } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";
import { isOverviewModel } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import { Model, type Activity, ReferencedModel, type ModelTypeGuard } from "@com.mgmtp.a12.client/client-core";
import type {
	ModelGraph,
	Relationship as RelationshipServerApi
} from "@com.mgmtp.a12.dataservices/dataservices-access";

import { toCdd } from "../core/adapter/toCdd.js";
import { isRecord } from "../../../shared/utils.js";
import { assertObject } from "../../../shared/assertion.js";
import { extractRelshNameFromRelshPath } from "../core/index.js";
import { anyPending, updatePending } from "../core/impl/pending.js";
import { Relationship } from "../../../relationship/relationship.js";
import type { CddState, PartialCddState } from "../core/cddState.js";
import { otherEntity } from "../../commons/relationshipModelUtils.js";
import { removeLinkFromCdd } from "../../cddUtils/removeLinkFromCdd.js";
import { newCddState, reduceCddState } from "../core/impl/cddStateImpl.js";
import { getInitialCandidateSorts } from "../../../relationship/reducers.js";
import { DgActions, DgReducers } from "../../../documentGraph/redux/index.js";
import { TABLE_LIST, DEFAULT_PAGE_SIZE } from "../../../relationship/constants.js";
import type { DgSlice, DgChangeLogSlice } from "../../../documentGraph/core/index.js";
import { addLinksToCdd, type AddLinksToCddArgs } from "../../cddUtils/addLinksToCdd.js";
import { isSetDgCl, type DataHolderTuple } from "../../../documentGraph/redux/dhReducersImpl.js";

import type {
	MergePayload,
	AddCddLinkPayload,
	RemoveCddLinkPayload,
	SaveSubActivityPayload,
	SetSubActivityDataPayload,
	InitializeAndLoadCandidatesPayload
} from "./actions.js";

//#region ==== Slice types ====

/**
 * This shape structure of the dataholder only defines the properties relevant for CDD.
 * The dataholder **may contain many more properties**.
 */
export interface CddSlice {
	// The Cdd is outside of the DG because it is just a "view" on data,
	// there could even be multiple views
	readonly cddState: CddState;
}

type _DgClSlices_ = DgReducers.DgClDataHolderShape extends Activity.DataHolder<infer T> ? T : never;

/**
 * Structure of the SCDM data holder.
 *
 * It consists of a document graph, a changelog and a cached CDD.
 */
export type ScdmDataHolderShape = Activity.DataHolder<DgSlice & DgChangeLogSlice & CddSlice>;

/** @internal */
export function isSetCdd(data: unknown): data is CddSlice {
	return isRecord(data) && data.cddState !== undefined;
}

/** @internal */
export function isScdmDataHolderShape(data: unknown): data is _DgClSlices_ & CddSlice {
	return isRecord(data) && isSetDgCl(data) && isSetCdd(data);
}

/** @internal */
export function isScdmDataHolder(dh: Activity.DataHolder): dh is ScdmDataHolderShape {
	return isScdmDataHolderShape(dh.data);
}

//#endregion

//#region ==== Reducer functions ====

function resolveSourceEntity(
	binding: Relationship.UiConfigurationBinding,
	modelGraph: ModelGraph
): RelationshipServerApi.LinkEntitySpec {
	const { relationshipName, targetRole } = binding.details;

	const relationshipModel = modelGraph.relationshipModels.find((rm) => rm.header.id === relationshipName);
	assertObject(relationshipModel);

	const sourceEntity = otherEntity(relationshipModel, targetRole);
	assertObject(sourceEntity);

	return {
		// the docRef is optional and is only validated by the server if it is set
		role: sourceEntity.role
	} as unknown as RelationshipServerApi.LinkEntitySpec;
}

function isLoadedType<T extends ModelAPI>(
	typeGuard: ModelTypeGuard<T>,
	modelId?: string
): (value: ReferencedModel.Instance) => value is ReferencedModel.Loaded<T> {
	return (value): value is ReferencedModel.Loaded<T> =>
		ReferencedModel.isLoaded(value, typeGuard) && value.model.header.id === modelId;
}

function computeSortQuery(
	details: Relationship.UiConfiguration,
	modelsInScene: ReferencedModel.Instance[]
): Relationship.SortClause[] | undefined {
	const overviewModelId = details.components
		.find((component) => component.name !== TABLE_LIST)
		?.models.find((model) => model.use === "candidate")?.name;
	const overviewModel = modelsInScene.find(isLoadedType(isOverviewModel, overviewModelId))?.model;

	const documentModelId = overviewModel?.header.modelReferences?.find(
		({ modelType }) => modelType === "document"
	)?.reference;
	const documentModel = modelsInScene.find(isLoadedType(Model.isDocumentModel, documentModelId))?.model;

	if (overviewModel && documentModel) {
		return getInitialCandidateSorts(overviewModel, documentModel);
	}

	return undefined;
}

function createInitialDataHolderData(
	{ elementId, details }: Relationship.UiConfigurationBinding,
	sourceEntity: RelationshipServerApi.LinkEntitySpec,
	modelsInScene: ReferencedModel.Instance[]
): Relationship.CandidateInstance | undefined {
	const { components } = details;
	const candidateComponent = components.find((component) => component.models.some((item) => item.use === "candidate"));

	if (!candidateComponent) {
		return undefined;
	}

	const instanceId = candidateComponent.id === components[0].id ? elementId : `${elementId}_${candidateComponent.name}`;

	return {
		id: instanceId,
		uiConfiguration: details,
		sourceEntity,
		candidates: [],
		candidateQuery: {
			page: {},
			sorts: computeSortQuery(details, modelsInScene)
		},
		candidatePagination: {
			pageSize: candidateComponent.candidatePageSize ?? DEFAULT_PAGE_SIZE,
			pageNumber: 0,
			fullCount: 0,
			offset: 0,
			limit: 0
		}
	};
}

export function handleInitCandidates(
	dataHolders: Activity.DataHolder[] | undefined,
	action: Action<InitializeAndLoadCandidatesPayload>
): Activity.DataHolder[] {
	const { bindings, modelGraph, modelsInScene } = action.payload;

	const newDataHolders = bindings.flatMap((binding) => {
		const existingDH = dataHolders?.find(Relationship.CandidateDataHolder.isInstanceById(binding.elementId));

		if (existingDH === undefined) {
			const sourceEntity = resolveSourceEntity(binding, modelGraph);
			const candidate = createInitialDataHolderData(binding, sourceEntity, modelsInScene);

			if (!candidate || dataHolders?.find(Relationship.CandidateDataHolder.isInstanceById(candidate.id))) {
				return [];
			}

			return {
				descriptor: {
					type: "candidate",
					feature: "relationship",
					instanceId: candidate.id
				},
				data: candidate,
				dirty: false,
				busy: true,
				loadingState: "loading" as const,
				savingState: "not_saved" as const,
				slices: {}
			};
		} else {
			return [];
		}
	});

	return (dataHolders ?? []).concat(newDataHolders);
}

export function handleSetSubActivityData(
	dataholder: ScdmDataHolderShape,
	action: Action<SetSubActivityDataPayload>
): ScdmDataHolderShape {
	const { cdm, rootDoc, documentGraph, changeLog, selectedLinkId } = action.payload;

	const cdd = toCdd(documentGraph, rootDoc, cdm.content.modelRoot, selectedLinkId);

	return updateLoadingStateAndBusy({
		...dataholder,
		data: {
			documentGraph,
			changeLog,
			cddState: {
				cdm,
				pendingUsages: [],
				rootDocRef: rootDoc,
				cachedCdd: {
					cdd,
					snapshotChangeCounter: 0
				},
				selectedLinkId
			}
		}
	});
}

/** @internal */
export function handleMergeDg(dataHolder: ScdmDataHolderShape, action: Action<MergePayload>): ScdmDataHolderShape {
	const { cdm, documentGraph, changeLog, path, rootDoc, selectedLinkId } = action.payload;

	const activityId = action.payload.activityId;
	// Delegate to DocumentGraph handlers...
	let dhResult: ScdmDataHolderShape;

	if (path === "") {
		// If path is empty (= root), then set new DG and setup new CDD state
		const updatedCddState: PartialCddState = newCddState(rootDoc, cdm, selectedLinkId);
		const dgAction = DgActions.setDg({ activityId, documentGraph, changeLog });

		dhResult = dataHolderReducerExtension(
			{
				prev: dataHolder,
				next: DgReducers.handleSetDg()(dataHolder, dgAction)
			},
			dgAction,
			updatedCddState
		) as ScdmDataHolderShape;
	} else {
		// If path is deeper, then a SubCDD is loaded; that means we have to use merge DG.
		const prevCddState = dataHolder.data?.cddState ?? newCddState(rootDoc, cdm, selectedLinkId);
		const cddState = updatePending(
			prevCddState,
			{
				relshName: extractRelshNameFromRelshPath(path),
				targetDocRef: rootDoc
			},
			path,
			"loaded"
		);
		const updatedCddState: PartialCddState = { ...cddState, cdm, selectedLinkId: dataHolder.descriptor.selectedLinkId };
		const dgAction = DgActions.mergeDG({ activityId, documentGraph });

		dhResult = dataHolderReducerExtension(
			{
				prev: dataHolder,
				next: DgReducers.handleMergeDg()(dataHolder, dgAction)
			},
			dgAction,
			updatedCddState
		) as ScdmDataHolderShape;
	}

	return updateLoadingStateAndBusy(dhResult);
}

/** @internal */
export function updateLoadingStateAndBusy(dataholder: ScdmDataHolderShape): ScdmDataHolderShape {
	const isPending = dataholder.data?.cddState && anyPending(dataholder.data.cddState);

	return {
		...dataholder,
		loadingState: isPending ? "loading" : "loaded",
		busy: isPending
	};
}

/** @internal */
export function handleCddAddLinks(
	dataHolder: ScdmDataHolderShape,
	action: Action<AddCddLinkPayload>
): ScdmDataHolderShape {
	const data = dataHolder.data;

	if (data?.cddState === undefined) {
		return dataHolder;
	}

	const { linkDescriptor, linkDoc, candidateDoc, targetRole, targetDoc, setDirty } = action.payload;

	const addLinksArgs: AddLinksToCddArgs = {
		linkDescriptor,
		targetRole,
		linkDoc,
		targetDoc,
		candidateDoc
	};

	const updatedData = addLinksToCdd(data, addLinksArgs);

	const dhResult: ScdmDataHolderShape = {
		...dataHolder,
		data: {
			...dataHolder.data,
			...updatedData
		},
		dirty: setDirty ?? dataHolder.dirty
	};

	return updateLoadingStateAndBusy(dhResult);
}

/** @internal */
export function handleCddRemoveLinks(
	dataHolder: ScdmDataHolderShape,
	action: Action<RemoveCddLinkPayload>
): ScdmDataHolderShape {
	const data = dataHolder.data;

	if (data?.cddState === undefined) {
		return dataHolder;
	}

	const { linkRef, setDirty } = action.payload;

	const updatedData = removeLinkFromCdd(data, linkRef);

	const dhResult: ScdmDataHolderShape = {
		...dataHolder,
		data: {
			...dataHolder.data,
			...updatedData
		},
		dirty: setDirty ?? dataHolder.dirty
	};

	return updateLoadingStateAndBusy(dhResult);
}

export function handleSaveSubActivity(
	dataHolder: ScdmDataHolderShape,
	action: Action<SaveSubActivityPayload>
): ScdmDataHolderShape {
	const prevCddState = dataHolder.data?.cddState;
	const { activityId, documentGraph, changeLog, setDirty, thumbnailSlice } = action.payload;

	const dgAction = DgActions.setDg({ activityId, documentGraph, changeLog, setDirty });

	const newDh = dataHolderReducerExtension(
		{
			prev: dataHolder,
			next: DgReducers.handleSetDg()(dataHolder, dgAction)
		},
		dgAction,
		prevCddState
	);

	return thumbnailSlice
		? ({
				...newDh,
				slices: {
					...newDh.slices,
					[THUMBNAIL_SLICE]: {
						...newDh.slices[THUMBNAIL_SLICE],
						...thumbnailSlice
					}
				}
			} as ScdmDataHolderShape)
		: newDh;
}

//#endregion

//#region ==== Helper ====

export function dataHolderReducerExtension(
	{ prev, next }: DataHolderTuple,
	action?: UnknownAction,
	updatePartialCddState?: PartialCddState
): ScdmDataHolderShape {
	const dg = next.data?.documentGraph;

	if (dg === undefined) {
		return next as ScdmDataHolderShape;
	}

	const newChangeCounter = next.data?.changeLog?.changeCounter;
	const cddState = reduceCddState(
		dg,
		newChangeCounter,
		(prev as ScdmDataHolderShape).data?.cddState, // cddState should not be changed in `next`!
		updatePartialCddState
	);

	if (!next.data) {
		return next as ScdmDataHolderShape;
	}

	return {
		...next,
		data: {
			...next.data,
			cddState
		}
	};
}

//#endregion

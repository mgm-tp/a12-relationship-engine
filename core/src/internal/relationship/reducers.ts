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

import { type Activity, type ActivityReducers, NEW_INSTANCE_IDENTIFIER } from "@com.mgmtp.a12.client/client-core";
import {
	type ModelGraph,
	type Relationship as RelationshipServerApi
} from "@com.mgmtp.a12.dataservices/dataservices-access";
import { type DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";
import { OverviewEngineApi, OverviewModel } from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import { DocumentModelUtils } from "../shared/utils.js";

import { RelationshipActions } from "./actions.js";
import { DEFAULT_PAGE_SIZE } from "./constants.js";
import { handleAddLink } from "./reducers/addLink.js";
import { handleDataSaved } from "./reducers/dataSaved.js";
import { handleDeleteLink } from "./reducers/deleteLink.js";
import { handleModifyLink } from "./reducers/modifyLink.js";
import { handleRelinkLink } from "./reducers/relinkLink.js";
import { handleResetMutations } from "./reducers/resetMutations.js";
import { handleRestoreLink } from "./reducers/restoreLink.js";
import { handleSetCandidatePage } from "./reducers/setCandidatePage.js";
import { handleSetCandidates } from "./reducers/setCandidates.js";
import { handleSetEditLink } from "./reducers/setEditLink.js";
import { handleSetFilter } from "./reducers/setFilter.js";
import { handleSetLinkPage } from "./reducers/setLinkPage.js";
import { handleSetLinks } from "./reducers/setLinks.js";
import { handleSetSort } from "./reducers/setSort.js";
import { Relationship } from "./relationship.js";

/** @internal */
export interface RelationshipStore {
	readonly modelGraph?: ModelGraph;
}

/**
 * All relationship related reducers. They specify how the store changes in
 * response to actions.
 */
export namespace RelationshipReducers {
	/**
	 * Reduces activity related actions concerning data holders.
	 */
	export const dataReducers: ActivityReducers.DataReducer[] = [
		{
			reduce(dataHolders, action) {
				return RelationshipActions.Commands.addLink.match(action)
					? dataHolders?.map((dh) => (Relationship.MutationDataHolder.isInstance(dh) ? handleAddLink(dh, action) : dh))
					: dataHolders;
			}
		},
		{
			reduce(dataHolders, action) {
				return RelationshipActions.Commands.deleteLink.match(action)
					? dataHolders?.map((dh) =>
							Relationship.MutationDataHolder.isInstance(dh) ? handleDeleteLink(dh, action) : dh
						)
					: dataHolders;
			}
		},
		{
			reduce(dataHolders, action) {
				return RelationshipActions.Commands.restoreLink.match(action)
					? dataHolders?.map((dh) =>
							Relationship.MutationDataHolder.isInstance(dh) ? handleRestoreLink(dh, action) : dh
						)
					: dataHolders;
			}
		},
		{
			reduce(dataHolders, action) {
				return RelationshipActions.Commands.relinkLink.match(action)
					? dataHolders?.map((dh) =>
							Relationship.MutationDataHolder.isInstance(dh) ? handleRelinkLink(dh, action) : dh
						)
					: dataHolders;
			}
		},
		{
			reduce(dataHolders, action) {
				return RelationshipActions.Commands.setEditLink.match(action)
					? dataHolders?.map((dh) =>
							Relationship.LinkDataHolder.isInstanceById(action.payload.instanceId)(dh)
								? handleSetEditLink(dh, action)
								: dh
						)
					: dataHolders;
			}
		},
		{
			reduce(dataHolders, action) {
				return RelationshipActions.Commands.modifyLink.match(action)
					? dataHolders?.map((dh) =>
							Relationship.MutationDataHolder.isInstance(dh) ? handleModifyLink(dh, action) : dh
						)
					: dataHolders;
			}
		},
		{
			reduce(dataHolders, action) {
				return RelationshipActions.Commands.setLinks.match(action)
					? dataHolders?.map((dh) => {
							return Relationship.LinkDataHolder.isInstanceById(action.payload.instanceId)(dh)
								? handleSetLinks(dh, action.payload)
								: dh;
						})
					: dataHolders;
			}
		},
		{
			reduce(dataHolders, action) {
				return RelationshipActions.Commands.setCandidates.match(action)
					? dataHolders?.map((dh) =>
							Relationship.CandidateDataHolder.isInstanceById(action.payload.instanceId)(dh)
								? handleSetCandidates(dh, action.payload)
								: dh
						)
					: dataHolders;
			}
		},
		{
			reduce(dataHolders, action) {
				return RelationshipActions.Commands.setFilter.match(action)
					? dataHolders?.map((dh) =>
							Relationship.CandidateDataHolder.isInstanceById(action.payload.instanceId)(dh)
								? handleSetFilter(dh, action)
								: dh
						)
					: dataHolders;
			}
		},
		{
			reduce(dataHolders, action) {
				return RelationshipActions.Commands.setPage.match(action)
					? dataHolders?.map((dh) =>
							Relationship.CandidateDataHolder.isInstanceById(action.payload.instanceId)(dh) &&
							action.payload.type === "candidate"
								? handleSetCandidatePage(dh, action.payload)
								: Relationship.LinkDataHolder.isInstanceById(action.payload.instanceId)(dh) &&
									  action.payload.type === "link"
									? handleSetLinkPage(dh, action.payload)
									: dh
						)
					: dataHolders;
			}
		},
		{
			reduce(dataHolders, action) {
				return RelationshipActions.Commands.setSort.match(action)
					? dataHolders?.map((dh) =>
							Relationship.CandidateDataHolder.isInstanceById(action.payload.instanceId)(dh)
								? handleSetSort(dh, action)
								: dh
						)
					: dataHolders;
			}
		},
		{
			reduce(dataHolders, action) {
				return RelationshipActions.Commands.resetMutations.match(action)
					? dataHolders?.map((dh) =>
							Relationship.MutationDataHolder.isInstance(dh) ? handleResetMutations(dh, action) : dh
						)
					: dataHolders;
			}
		},

		{
			reduce(dataHolders, action, defaultDh) {
				return RelationshipActions.Commands.dataSaved.match(action) && dataHolders
					? handleDataSaved(dataHolders, action, defaultDh)
					: dataHolders;
			}
		},
		{
			reduce(dataHolders, action) {
				return RelationshipActions.Commands.createInstanceDataholders.match(action)
					? handleCreateDataholders(action.payload, dataHolders)
					: dataHolders;
			}
		}
	];
}

function handleCreateDataholders(
	{ instances }: RelationshipActions.Commands.CreateInstanceDataholdersPayload,
	dataHolders?: Activity.DataHolder[]
) {
	const mutationDH = {
		descriptor: { feature: "relationship", type: "mutation" },
		data: [],
		loadingState: "without" as const,
		dirty: false,
		savingState: "not_saved" as const,
		slices: {}
	};

	return [...(dataHolders ?? []), mutationDH, ...instances.flatMap(convertToDHs)];
}

type DataHolderItem =
	| Activity.DataHolder<Relationship.LinkInstance>
	| Activity.DataHolder<Relationship.CandidateInstance>;
function convertToDHs({
	elementId,
	sourceDocId,
	details,
	overviewModel,
	documentModel,
	relationshipModel
}: RelationshipActions.Commands.BindingInstance): DataHolderItem[] {
	if (relationshipModel === undefined) {
		throw new Error(`Unknown relationship model specified: ${details.relationshipName}`);
	}

	const sourceEntityCharacteristic = relationshipModel.content.entityCharacteristics.find(
		({ role }) => role !== details.targetRole
	);

	if (sourceEntityCharacteristic === undefined) {
		throw new Error(`Unknown source for specified target role: ${details.targetRole}`);
	}

	if (details.components.length === 0) {
		throw new Error(`No components specified in Relationship UI config "${details.name}"`);
	}

	const result: DataHolderItem[] = [];
	details.components.forEach((componentConfig, index) => {
		const sourceEntity: RelationshipServerApi.LinkEntitySpec = {
			docRef: sourceDocId === NEW_INSTANCE_IDENTIFIER ? null : sourceDocId,
			role: sourceEntityCharacteristic.role
		};

		const instanceId = index === 0 ? elementId : `${elementId}_${componentConfig.name}`;
		const baseInstance = {
			id: instanceId,
			uiConfiguration: details,
			sourceEntity
		};

		const linkInstance: Relationship.LinkInstance = {
			...baseInstance,
			links: [],
			linkQuery: { page: {} },
			linkPagination: {
				pageSize: componentConfig.linkPageSize ?? DEFAULT_PAGE_SIZE,
				pageNumber: 0,
				fullCount: 0,
				offset: 0,
				limit: 0
			},
			componentName: componentConfig.name
		};

		result.push(createInstanceDataHolder(linkInstance));

		if (componentConfig.models.some((item) => item.use === "candidate")) {
			const candidateInstance: Relationship.CandidateInstance = {
				...baseInstance,
				candidates: [],
				candidateQuery: {
					page: {},
					sorts: getInitialCandidateSorts(overviewModel, documentModel)
				},
				candidatePagination: {
					pageSize: componentConfig.candidatePageSize ?? DEFAULT_PAGE_SIZE,
					pageNumber: 0,
					fullCount: 0,
					offset: 0,
					limit: 0
				}
			};

			result.push(createInstanceDataHolder(candidateInstance));
		}
	});

	return result;
}

/**
 * Get initial sorting information from the candidates overview model
 * @internal
 */
export function getInitialCandidateSorts(
	overviewModel: OverviewModel | undefined,
	documentModel: DocumentModel | undefined
): Relationship.SortClause[] | undefined {
	if (!overviewModel || !documentModel) {
		return undefined;
	}

	return OverviewEngineApi.Sorting.getInitialValue(overviewModel)?.map(({ columnIndex, order }) => {
		const column = overviewModel.content.columns[columnIndex];

		if (!OverviewModel.ReferenceColumn.isAssignableFrom(column)) {
			throw new Error("Expect a reference column. Got: " + JSON.stringify(column));
		}

		return {
			path: DocumentModelUtils.getElementPathForId(column.elementRef, documentModel),
			order: order === "asc" ? "ASC" : "DESC"
		};
	});
}

function createInstanceDataHolder<I extends Relationship.CandidateInstance | Relationship.LinkInstance>(
	instance: I
): Activity.DataHolder<I> {
	return {
		descriptor: {
			type: "links" in instance ? "link" : "candidate",
			feature: "relationship",
			instanceId: instance.id
		},
		data: instance,
		dirty: false,
		busy: true,
		loadingState: "loading" as const,
		savingState: "not_saved" as const,
		slices: {}
	};
}

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
import type { Action } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";
import { isOverviewModel } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import { ReferencedModel, isActivityActionWithModelsInScenePayload } from "@com.mgmtp.a12.client/client-core";

import type { Changelog } from "../state.js";
import { serializeInstanceId } from "../utils/instanceId.js";
import { applyChange } from "../documentGraph/applyChange.js";
import type { RelationshipEngineActions } from "../actions.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";
import { nextDraftingLinkId } from "../utils/linkIdAndDocRef.js";
import { ParentLinkDescriptor } from "../parent-link-descriptor.js";

/** @internal */
export function handleInitDataHolders(
	dataHolders: Activity.DataHolder[],
	action: Action<RelationshipEngineActions.Commands.InitDataHoldersPayload>,
	defaultDataHolder?: Activity.DataHolder
) {
	if (!isActivityActionWithModelsInScenePayload(action.payload)) {
		return dataHolders;
	}

	const result: Activity.DataHolder[] = [...(dataHolders ?? [])];
	const { instances, isCdd, modelsInScene, modelGraph } = action.payload;
	const changelogDataHolder: RelationshipEngineDataHolder.ChangelogDataHolder = {
		descriptor: { feature: "relationship", type: "changelog" },
		data: { changes: [], checkpoints: [] },
		loadingState: "without",
		dirty: false,
		savingState: "not_saved",
		slices: {}
	};

	const activityDescriptor = defaultDataHolder?.descriptor;
	const targetDocRef = activityDescriptor?.instance;

	if (targetDocRef !== undefined && ParentLinkDescriptor.isAssignableFrom(activityDescriptor)) {
		const { parentInstance, parentRelationshipName, parentRelationshipRole, predecessor } = activityDescriptor;

		const relationshipModel = modelGraph.relationshipModels.find((m) => m.header.id === parentRelationshipName);
		const targetRole = relationshipModel?.content.entityCharacteristics.find(
			(ec) => ec.role !== parentRelationshipRole
		)?.role;

		if (relationshipModel && targetRole) {
			const linkId = nextDraftingLinkId(parentRelationshipName, changelogDataHolder.data);
			const linkAdded: Changelog.LinkAdded = {
				kind: "linkAdded",
				linkId,
				linkRef: {
					id: linkId,
					linkDescriptor: {
						relationshipModel: parentRelationshipName,
						entities: [
							{ role: parentRelationshipRole, docRef: parentInstance },
							{ role: targetRole, docRef: targetDocRef }
						],
						predecessorLinkRef: predecessor
					}
				},
				inherited: true
			};
			changelogDataHolder.data = {
				changes: [linkAdded],
				checkpoints: []
			};
		}
	}

	result.push(changelogDataHolder);

	if (isCdd) {
		const initialDg: RelationshipEngineDataHolder.DocumentGraphDataHolder["data"] = {
			documents: { byDocRef: {} },
			links: { byId: {}, linkIdsByDocId: {} },
			changelogIndex: 0
		};
		const dg =
			changelogDataHolder.data.changes.length > 0
				? changelogDataHolder.data.changes.reduce(
						(acc, change) => applyChange(acc, change, modelsInScene, modelGraph),
						initialDg
					)
				: initialDg;

		const documentGraphDataHolder: RelationshipEngineDataHolder.DocumentGraphDataHolder = {
			descriptor: { feature: "relationship", type: "document_graph" },
			data: dg,
			loadingState: "missing",
			dirty: false,
			savingState: "not_saved",
			// This property will directly be set after CDD is loaded, so it is safe to have a hard type casting here.
			slices: { preProcessed: false } as RelationshipEngineDataHolder.DocumentGraphDataHolder["slices"]
		};
		result.push(documentGraphDataHolder);
	}

	return [...result, ...instances.flatMap((instance) => convertToDataHolders(instance, modelsInScene))];
}

function convertToDataHolders(
	instance: RelationshipEngineActions.Commands.UiModelInstance,
	modelsInScene: ReferencedModel.Instance[]
): Activity.DataHolder[] {
	const { uiModelId, configuration, relationshipModel, formModelPath } = instance;

	if (relationshipModel === undefined) {
		throw new Error(`Unknown relationship model specified: ${configuration.relationshipName}`);
	}

	const sourceEntityCharacteristic = relationshipModel.content.entityCharacteristics.find(
		({ role }) => role !== configuration.targetRole
	);

	if (sourceEntityCharacteristic === undefined) {
		throw new Error(`Unknown source for specified target role: ${configuration.targetRole}`);
	}

	const componentConfig = configuration.component;

	if (!componentConfig) {
		throw new Error(`No component specified in Relationship UI config "${uiModelId}"`);
	}

	const result: Activity.DataHolder[] = [];
	const instanceId = serializeInstanceId(uiModelId, componentConfig.componentType);

	const buildOverviewSlices = (): RelationshipEngineDataHolder.Slices => {
		// It is possible to modify the initial uiState of the embedded Overview instance here.
		return {
			id: instanceId,
			uiConfiguration: configuration,
			sourceEntity: {
				docRef: null,
				role: sourceEntityCharacteristic.role
			},
			formModelPath
		};
	};

	// Create selected items data holder
	const linkModelInScene = modelsInScene.find(
		(m) => ReferencedModel.isLoaded(m) && m.model.header.id === componentConfig.selectedItemsOverviewModel
	) as ReferencedModel.Loaded | undefined;

	if (linkModelInScene && isOverviewModel(linkModelInScene.model)) {
		const selectedItemsDataHolder: RelationshipEngineDataHolder.SelectedItemsDataHolder = {
			descriptor: { type: "selected", feature: "relationship", instanceId },
			data: {} as RelationshipEngineDataHolder.SelectedItemsDataHolder["data"],
			dirty: false,
			busy: true,
			loadingState: "loading",
			savingState: "not_saved",
			slices: buildOverviewSlices()
		};
		result.push(selectedItemsDataHolder);
	}

	// Create available items data holder if availableItemsOverviewModel is specified
	// For TableList with editConfiguration, use the editConfiguration's availableItemsOverviewModel
	const availableItemsOverviewModel =
		componentConfig.availableItemsOverviewModel ?? componentConfig.editConfiguration?.availableItemsOverviewModel;

	if (availableItemsOverviewModel) {
		const availableModelInScene = modelsInScene.find(
			(m) => ReferencedModel.isLoaded(m) && m.model.header.id === availableItemsOverviewModel
		) as ReferencedModel.Loaded | undefined;

		if (availableModelInScene && isOverviewModel(availableModelInScene.model)) {
			const availableItemsDataHolder: RelationshipEngineDataHolder.AvailableItemsDataHolder = {
				descriptor: { type: "available", feature: "relationship", instanceId },
				data: {} as RelationshipEngineDataHolder.AvailableItemsDataHolder["data"],
				dirty: false,
				busy: true,
				loadingState: "loading",
				savingState: "not_saved",
				slices: buildOverviewSlices()
			};
			result.push(availableItemsDataHolder);
		}
	}

	// Create dropdown selection data holder if availableItemsQueryModel is specified
	if (componentConfig.componentType === "DropDownSelection" && componentConfig.availableItemsQueryModel) {
		const dropdownDataHolder: RelationshipEngineDataHolder.DropdownSelectionDataHolder = {
			descriptor: RelationshipEngineDataHolder.DropdownSelectionDataHolder.createDescriptor(instanceId),
			data: {
				availableItems: [],
				availableItemsFullCount: 0,
				selectedItem: undefined,
				links: []
			},
			slices: {
				id: instanceId,
				uiConfiguration: configuration,
				availableItemsQueryModel: componentConfig.availableItemsQueryModel,
				selectedItemQueryModel: componentConfig.selectedItemQueryModel ?? "",
				elementRef: componentConfig.elementRef ?? "id",
				sourceEntity: { docRef: null, role: sourceEntityCharacteristic.role },
				searchText: undefined,
				pageNumber: 0,
				isLoading: false
			},
			dirty: false,
			loadingState: "loading",
			savingState: "not_saved"
		};
		result.push(dropdownDataHolder);
	}

	return result;
}

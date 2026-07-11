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
import type { ModelGraph } from "@com.mgmtp.a12.dataservices/dataservices-access";
import {
	Model,
	type ReferencedModel,
	isActivityActionWithModelsInScenePayload
} from "@com.mgmtp.a12.client/client-core";

import { toCdd } from "../utils/toCdd.js";
import { applyChange } from "../documentGraph/applyChange.js";
import type { RelationshipEngineActions } from "../actions.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";

/** @internal */
export function handleAddChangelog(
	dataHolders: Activity.DataHolder[],
	action: Action<RelationshipEngineActions.Commands.AddChangeLogPayload>,
	defaultDataHolder: Activity.DataHolder
): Activity.DataHolder[] {
	if (!isActivityActionWithModelsInScenePayload(action.payload)) {
		return dataHolders;
	}

	const { change, modelsInScene, modelGraph } = action.payload;

	return applyChanges(dataHolders, [change], defaultDataHolder, modelsInScene, modelGraph);
}

/** @internal */
export function handleAddChangelogs(
	dataHolders: Activity.DataHolder[],
	action: Action<RelationshipEngineActions.Commands.AddChangeLogsPayload>,
	defaultDataHolder: Activity.DataHolder
): Activity.DataHolder[] {
	if (!isActivityActionWithModelsInScenePayload(action.payload)) {
		return dataHolders;
	}

	const { changes, modelsInScene, modelGraph } = action.payload;

	if (changes.length === 0) {
		return dataHolders;
	}

	return applyChanges(dataHolders, changes, defaultDataHolder, modelsInScene, modelGraph);
}

function applyChanges(
	dataHolders: Activity.DataHolder[],
	changes: RelationshipEngineActions.Commands.AddChangeLogsPayload["changes"],
	defaultDataHolder: Activity.DataHolder,
	modelsInScene: ReferencedModel.Instance[],
	modelGraph: ModelGraph
): Activity.DataHolder[] {
	const defaultDescriptor = defaultDataHolder.descriptor;

	return changes.reduce<Activity.DataHolder[]>((currentDataHolders, change) => {
		const isEphemeral = change.kind === "cdmRootComputed";

		const updatedDataHolders = currentDataHolders.map((dataHolder) => {
			if (RelationshipEngineDataHolder.ChangelogDataHolder.isInstance(dataHolder)) {
				return {
					...dataHolder,
					data: {
						changes: [...dataHolder.data.changes, change],
						checkpoints: dataHolder.data.checkpoints
					},
					dirty: isEphemeral ? dataHolder.dirty : true
				};
			}

			if (RelationshipEngineDataHolder.DocumentGraphDataHolder.isInstance(dataHolder)) {
				const documentGraph = applyChange(dataHolder.data, change, modelsInScene, modelGraph);

				return {
					...dataHolder,
					data: documentGraph,
					dirty: isEphemeral ? dataHolder.dirty : true
				};
			}

			return dataHolder;
		});

		const documentGraphDataHolder = updatedDataHolders.find(
			RelationshipEngineDataHolder.DocumentGraphDataHolder.isInstance
		);

		if (!documentGraphDataHolder) {
			return updatedDataHolders;
		}

		const cdmName = documentGraphDataHolder.slices.cdmName;
		const cdmModel = modelsInScene.find((r) => r.loadingState === "loaded" && r.model.header.id === cdmName);

		if (cdmModel?.loadingState !== "loaded" || !Model.isDocumentModel(cdmModel?.model)) {
			return updatedDataHolders;
		}

		const rootGroup = cdmModel.model.content.modelRoot;

		return updatedDataHolders.map((dataHolder) => {
			if (dataHolder.descriptor === defaultDescriptor) {
				const document = toCdd(documentGraphDataHolder.data, documentGraphDataHolder.slices.rootDocRef, rootGroup);

				return { ...dataHolder, data: { ...dataHolder.data, document } };
			}

			return dataHolder;
		});
	}, dataHolders);
}

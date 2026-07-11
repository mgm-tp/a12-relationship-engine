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

import type { Action } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";
import { Model, type Activity, isActivityActionWithModelsInScenePayload } from "@com.mgmtp.a12.client/client-core";

import { toCdd } from "../utils/toCdd.js";
import type { Changelog } from "../state.js";
import { applyChange } from "../documentGraph/applyChange.js";
import type { RelationshipEngineActions } from "../actions.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";

export function handlePushChangelogCheckpoint(
	dataHolders: Activity.DataHolder[],
	action: Action<RelationshipEngineActions.Commands.PushChangelogCheckpointPayload>
): Activity.DataHolder[] {
	const changelogHolder = dataHolders.find(RelationshipEngineDataHolder.ChangelogDataHolder.isInstance);

	if (!changelogHolder) {
		return dataHolders;
	}

	const checkpoint: Changelog.Checkpoint = {
		id: action.payload.checkpointId,
		scope: action.payload.scope,
		changeCount: changelogHolder.data.changes.length,
		createdAt: action.payload.createdAt
	};

	return dataHolders.map((dataHolder) => {
		if (!RelationshipEngineDataHolder.ChangelogDataHolder.isInstance(dataHolder)) {
			return dataHolder;
		}

		return {
			...dataHolder,
			data: {
				...dataHolder.data,
				checkpoints: [...dataHolder.data.checkpoints, checkpoint]
			}
		};
	});
}

/**
 * Synchronously resolves a changelog checkpoint (commit or rollback).
 *
 * - **commit**: pops the last matching checkpoint; no document graph changes.
 * - **rollback**: trims changes back to the checkpoint count, rebuilds the DocumentGraph
 *   by replaying the trimmed changelog, computes CDD if a CDM model is found.
 */
export function handleResolveChangelogCheckpoint(
	dataHolders: Activity.DataHolder[],
	action: Action<RelationshipEngineActions.Commands.ResolveChangelogCheckpointPayload>,
	defaultDataHolder?: Activity.DataHolder
): Activity.DataHolder[] {
	const { checkpointId, scope, outcome } = action.payload;

	const changelogDH = dataHolders.find(RelationshipEngineDataHolder.ChangelogDataHolder.isInstance);

	if (!changelogDH) {
		return dataHolders;
	}

	const checkpoints = changelogDH.data.checkpoints;
	const checkpoint = checkpoints[checkpoints.length - 1];

	if (
		checkpoints.length === 0 ||
		checkpoint.scope !== scope ||
		(checkpointId !== undefined && checkpoint.id !== checkpointId)
	) {
		return dataHolders;
	}

	const updatedCheckpoints = checkpoints.slice(0, -1) as Changelog.Checkpoint[];

	if (outcome === "commit") {
		return dataHolders.map((dataHolder) => {
			if (!RelationshipEngineDataHolder.ChangelogDataHolder.isInstance(dataHolder)) {
				return dataHolder;
			}

			return { ...dataHolder, data: { ...dataHolder.data, checkpoints: updatedCheckpoints } };
		});
	}

	// Rollback — need modelsInScene to replay changes through applyChange
	if (!isActivityActionWithModelsInScenePayload(action.payload)) {
		return dataHolders;
	}

	const { modelsInScene, modelGraph } = action.payload;

	const documentGraphDH = dataHolders.find(RelationshipEngineDataHolder.DocumentGraphDataHolder.isInstance);

	if (!documentGraphDH) {
		// Trim changes without DG rebuild
		return dataHolders.map((dataHolder) => {
			if (!RelationshipEngineDataHolder.ChangelogDataHolder.isInstance(dataHolder)) {
				return dataHolder;
			}

			return {
				...dataHolder,
				data: {
					...dataHolder.data,
					changes: changelogDH.data.changes.slice(0, checkpoint.changeCount),
					checkpoints: updatedCheckpoints
				}
			};
		});
	}

	const trimmedChanges = changelogDH.data.changes.slice(0, checkpoint.changeCount);
	const initialDG = documentGraphDH.slices.initialDocumentGraph ?? documentGraphDH.data;
	const finalDG = trimmedChanges.reduce((dg, change) => applyChange(dg, change, modelsInScene, modelGraph), initialDG);

	const updatedChangelogData: Changelog = {
		...changelogDH.data,
		changes: trimmedChanges,
		checkpoints: updatedCheckpoints
	};

	const hasRemainingChanges = trimmedChanges.some((change) => change.kind !== "cdmRootComputed");

	const cdmName = documentGraphDH.slices.cdmName;
	const cdmModelRef = modelsInScene.find((r) => r.loadingState === "loaded" && r.model.header.id === cdmName);

	if (cdmModelRef?.loadingState !== "loaded" || !Model.isDocumentModel(cdmModelRef.model)) {
		return dataHolders.map((dataHolder) => {
			if (RelationshipEngineDataHolder.ChangelogDataHolder.isInstance(dataHolder)) {
				return { ...dataHolder, data: updatedChangelogData, dirty: hasRemainingChanges };
			}

			return dataHolder;
		});
	}

	const cdd = toCdd(finalDG, documentGraphDH.slices.rootDocRef, cdmModelRef.model.content.modelRoot);

	return dataHolders.map((dataHolder) => {
		if (RelationshipEngineDataHolder.ChangelogDataHolder.isInstance(dataHolder)) {
			return { ...dataHolder, data: updatedChangelogData, dirty: hasRemainingChanges };
		}

		if (RelationshipEngineDataHolder.DocumentGraphDataHolder.isInstance(dataHolder)) {
			return { ...dataHolder, data: finalDG, dirty: hasRemainingChanges };
		}

		if (dataHolder === defaultDataHolder) {
			return { ...dataHolder, dirty: hasRemainingChanges, data: { ...dataHolder.data, document: cdd } };
		}

		return dataHolder;
	});
}

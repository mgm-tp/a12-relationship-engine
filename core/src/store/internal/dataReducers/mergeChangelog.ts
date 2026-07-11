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
import { applyChange } from "../documentGraph/applyChange.js";
import type { RelationshipEngineActions } from "../actions.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";

/**
 * Synchronously merges child activity changelog changes into the parent activity's state.
 *
 * Applies the given changes to the DocumentGraph, appends them to the changelog,
 * and recomputes the CDD if a CDM model is found in modelsInScene.
 *
 */
export function handleMergeChangelog(
	dataHolders: Activity.DataHolder[],
	action: Action<RelationshipEngineActions.Commands.MergeChangelogPayload>,
	defaultDataHolder?: Activity.DataHolder
): Activity.DataHolder[] {
	if (!isActivityActionWithModelsInScenePayload(action.payload)) {
		return dataHolders;
	}

	const { modelsInScene, modelGraph, changes } = action.payload;

	const documentGraphDH = dataHolders.find(RelationshipEngineDataHolder.DocumentGraphDataHolder.isInstance);
	const changelogDH = dataHolders.find(RelationshipEngineDataHolder.ChangelogDataHolder.isInstance);

	if (!documentGraphDH || !changelogDH) {
		return dataHolders;
	}

	const updatedChangelog = {
		...changelogDH.data,
		changes: [...changelogDH.data.changes, ...changes]
	};

	const finalDG = changes.reduce(
		(dg, change) => applyChange(dg, change, modelsInScene, modelGraph),
		documentGraphDH.data
	);

	// A child with only inherited entries is treated as not-dirty — no user changes to save.
	const dirty = updatedChangelog.changes.some(
		(change) => change.kind !== "cdmRootComputed" && change.kind !== "subDocumentGraphAdded" && !change.inherited
	);

	const cdmName = documentGraphDH.slices.cdmName;
	const cdmModelRef = modelsInScene.find((r) => r.loadingState === "loaded" && r.model.header.id === cdmName);

	if (cdmModelRef?.loadingState !== "loaded" || !Model.isDocumentModel(cdmModelRef.model)) {
		return dataHolders.map((dataHolder) => {
			if (RelationshipEngineDataHolder.ChangelogDataHolder.isInstance(dataHolder)) {
				return { ...dataHolder, data: updatedChangelog, dirty };
			}

			if (RelationshipEngineDataHolder.DocumentGraphDataHolder.isInstance(dataHolder)) {
				return { ...dataHolder, data: finalDG, dirty };
			}

			return dataHolder;
		});
	}

	const cdd = toCdd(finalDG, documentGraphDH.slices.rootDocRef, cdmModelRef.model.content.modelRoot);

	return dataHolders.map((dataHolder) => {
		if (RelationshipEngineDataHolder.ChangelogDataHolder.isInstance(dataHolder)) {
			return { ...dataHolder, data: updatedChangelog, dirty };
		}

		if (RelationshipEngineDataHolder.DocumentGraphDataHolder.isInstance(dataHolder)) {
			return { ...dataHolder, data: finalDG, dirty };
		}

		if (dataHolder === defaultDataHolder) {
			return { ...dataHolder, dirty, data: { ...dataHolder.data, document: cdd } };
		}

		return dataHolder;
	});
}

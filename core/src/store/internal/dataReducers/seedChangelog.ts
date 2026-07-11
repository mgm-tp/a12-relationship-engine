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
import { isActivityActionWithModelsInScenePayload } from "@com.mgmtp.a12.client/client-core";

import type { Changelog } from "../state.js";
import { applyChange } from "../documentGraph/applyChange.js";
import type { RelationshipEngineActions } from "../actions.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";

export function handleSeedChangelog(
	dataHolders: Activity.DataHolder[],
	action: Action<RelationshipEngineActions.Commands.SeedChangelogPayload>
): Activity.DataHolder[] {
	if (!isActivityActionWithModelsInScenePayload(action.payload)) {
		return dataHolders;
	}

	const { changes: rawChanges, modelsInScene, modelGraph } = action.payload;
	// Filter out cdmRootComputed entries — each activity must compute their own CDM root, independently.
	const changes = rawChanges
		.filter((c: Changelog.Change) => c.kind !== "cdmRootComputed")
		.map((c: Changelog.Change) => ({ ...c, inherited: true }) as Changelog.Change);

	return dataHolders.map((dh) => {
		if (RelationshipEngineDataHolder.ChangelogDataHolder.isInstance(dh)) {
			return {
				...dh,
				data: {
					changes: [...changes],
					checkpoints: []
				},
				dirty: false
			};
		}

		if (RelationshipEngineDataHolder.DocumentGraphDataHolder.isInstance(dh)) {
			// Apply all changes to DG but keep dirty false (baseline)
			let dg = dh.data;

			for (const change of changes) {
				dg = applyChange(dg, change, modelsInScene, modelGraph);
			}

			return {
				...dh,
				data: dg,
				dirty: false,
				slices: {
					...dh.slices,
					initialDocumentGraph: structuredClone(dg)
				}
			};
		}

		return dh;
	});
}

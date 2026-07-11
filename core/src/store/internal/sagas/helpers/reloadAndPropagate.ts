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

import type { SagaGenerator } from "typed-redux-saga";
import { put, take, race, select } from "typed-redux-saga";

import type { ModelPath } from "@com.mgmtp.a12.base/base-model-api";
import { type Activity, ActivityActions } from "@com.mgmtp.a12.client/client-core";

import { ModelSelectors } from "../../selectors/model.js";
import { RelationshipEngineActions } from "../../actions.js";
import { isDraftingDocRef } from "../../utils/linkIdAndDocRef.js";
import { SourceEntitySelectors } from "../../selectors/sourceEntity.js";

export interface ReloadAndPropagateOptions {
	readonly groupPath?: ModelPath;
	readonly docRef?: string;
	/**
	 * Required when `groupPath` is set — the relationship model name for sub-document-graph loading.
	 * Used to dispatch `loadSubDocumentGraphs.started` via `LoadSubDocumentGraphHandler`.
	 */
	readonly relationshipName?: string;
}

/**
 * Shared helper for the reload → SCDM computation → source entity propagation pipeline.
 *
 * Reloads the given data holders, runs SCDM computation (conditionally), and propagates
 * source entities. Used by linkLifecycleSaga and dropdown sagas to avoid duplicating
 * the pipeline.
 */
export function* reloadAndPropagate(
	activityId: string,
	affectedLinksDataHolders: Activity.DataHolder[],
	options: ReloadAndPropagateOptions
): SagaGenerator<void> {
	const { groupPath, docRef, relationshipName } = options;

	// Load link instance data holders
	if (affectedLinksDataHolders.length > 0) {
		yield* put(
			ActivityActions.loadData({
				activityId,
				dataHolderDescriptors: affectedLinksDataHolders.map((dh) => dh.descriptor)
			})
		);
		yield* take(
			(a: unknown) => RelationshipEngineActions.Commands.setDataHolders.match(a) && a.payload.activityId === activityId
		);
	}

	const isCdm = yield* select(ModelSelectors.isCdmActivity(activityId));

	if (isCdm) {
		const cdmName = (yield* select(ModelSelectors.rootDocumentModel(activityId)))?.documentModel.header.id;

		if (groupPath && relationshipName) {
			if (docRef && !isDraftingDocRef(docRef) && cdmName) {
				yield* put(
					RelationshipEngineActions.Commands.loadSubDocumentGraphs.started({
						activityId,
						subtrees: [{ relationshipName, groupPath, docRef, cdmName }]
					})
				);

				// Wait for LoadSubDocumentGraphHandler to dispatch done or failed
				yield* take(
					(a: unknown) =>
						(RelationshipEngineActions.Commands.loadSubDocumentGraphs.done.match(a) ||
							RelationshipEngineActions.Commands.loadSubDocumentGraphs.failed.match(a)) &&
						a.payload?.params?.activityId === activityId
				);
			}
		}

		yield* put(RelationshipEngineActions.Events.scdmComputation.started({ activityId }));

		const { failed } = yield* race({
			done: take(
				(a: unknown) =>
					RelationshipEngineActions.Events.scdmComputation.done.match(a) && a.payload.params.activityId === activityId
			),
			failed: take(
				(a: unknown) =>
					RelationshipEngineActions.Events.scdmComputation.failed.match(a) && a.payload.params.activityId === activityId
			)
		});

		if (failed) {
			// SCDM computation failed — pipeline continues gracefully
		}
	}

	const sourceEntityUpdates = yield* select(SourceEntitySelectors.updates(activityId));

	if (sourceEntityUpdates.length > 0) {
		yield* put(RelationshipEngineActions.Commands.setSourceEntities({ activityId, updates: sourceEntityUpdates }));
		yield* put(
			ActivityActions.loadData({
				activityId,
				dataHolderDescriptors: sourceEntityUpdates.map((u) => u.descriptor)
			})
		);
	}
}

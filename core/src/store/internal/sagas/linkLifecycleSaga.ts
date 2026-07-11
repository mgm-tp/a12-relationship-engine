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
import { put, call, select, takeEvery } from "typed-redux-saga";

import { ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import type { Action } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";

import { ModelSelectors } from "../selectors/model.js";
import { RelationshipEngineActions } from "../actions.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";

import { reloadAndPropagate } from "./helpers/reloadAndPropagate.js";
import { enforceSingleSelection } from "./helpers/enforceSingleSelection.js";

/**
 * Watches for Events.linkAdded and Events.linkDeleted, then orchestrates the
 * full pipeline: changelog write → single-selection enforcement → data holder
 * reload (async wait) → source entity propagation → SCDM computation.
 */
export function* linkLifecycleSaga(): SagaGenerator<void> {
	yield* takeEvery(RelationshipEngineActions.Events.linkAdded, handleLinkAdded);
	yield* takeEvery(RelationshipEngineActions.Events.linkDeleted, handleLinkDeleted);
}

function* handleLinkAdded(action: Action<RelationshipEngineActions.Events.LinkAddedPayload>): SagaGenerator<void> {
	const { activityId, linkRef, linkDocument, docRef, groupPath, targetDocument, targetDocumentModelName } =
		action.payload;

	yield* put(
		RelationshipEngineActions.Commands.addChangeLog({
			activityId,
			change: {
				kind: "linkAdded",
				linkId: linkRef.id,
				linkRef,
				linkDocument,
				targetDocument,
				targetDocumentModelName
			}
		})
	);

	yield* call(enforceSingleSelection, activityId, linkRef);

	const affectedLinksDataHolders = yield* select(
		ActivitySelectors.activityPropById(activityId, (a) =>
			a.dataHolders
				.filter(RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance)
				.filter((dh) => dh.slices.uiConfiguration.relationshipName === linkRef.linkDescriptor.relationshipModel)
		)
	);

	// In exclude mode, skip reloading SelectedItems data holders — drafting-link rows
	// provide immediate visual feedback without a server round-trip.
	const excludeMode = yield* select(ModelSelectors.isExcludeMode(activityId, linkRef.linkDescriptor.relationshipModel));
	const dataHoldersToReload = excludeMode ? [] : (affectedLinksDataHolders ?? []);

	yield* call(reloadAndPropagate, activityId, dataHoldersToReload, {
		groupPath,
		relationshipName: linkRef.linkDescriptor.relationshipModel,
		docRef
	});
}

function* handleLinkDeleted(action: Action<RelationshipEngineActions.Events.LinkDeletedPayload>): SagaGenerator<void> {
	const { activityId, linkId, linkRef } = action.payload;

	// Step 1: Record changelog entry
	yield* put(
		RelationshipEngineActions.Commands.addChangeLog({
			activityId,
			change: { kind: "linkDeleted", linkId, linkRef }
		})
	);

	// Steps 2-5: Reload affected data holders, run SCDM (CDM only), propagate source entities
	const affectedLinksDataHolders = yield* select(
		ActivitySelectors.activityPropById(activityId, (activity) =>
			activity.dataHolders
				.filter(RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance)
				.filter(
					(candidate) => candidate.slices.uiConfiguration.relationshipName === linkRef.linkDescriptor.relationshipModel
				)
		)
	);
	// In exclude mode, skip reloading SelectedItems data holders — drafting-link rows
	// provide immediate visual feedback without a server round-trip.
	const excludeMode = yield* select(ModelSelectors.isExcludeMode(activityId, linkRef.linkDescriptor.relationshipModel));
	const dataHoldersToReload = excludeMode ? [] : (affectedLinksDataHolders ?? []);

	yield* call(reloadAndPropagate, activityId, dataHoldersToReload, {});
}

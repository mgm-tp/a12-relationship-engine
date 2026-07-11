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

import type { Middleware } from "redux";

import { Commands } from "@com.mgmtp.a12.formengine/formengine-core";
import { ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import { FormEngineActions } from "@com.mgmtp.a12.formengine/formengine-core";

import { RelationshipEngineActions } from "../actions.js";
import { ChangelogSelectors } from "../selectors/changelog.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";

const DETACHED_REPEAT_SCOPE = "detachedRepeat" as const;

export const onDetachedRepeatTransactionMiddleware: Middleware = (store) => (next) => (action) => {
	const result = next(action);

	if (!FormEngineActions.command.match(action)) {
		return result;
	}

	const { activityId, engineEvent } = action.payload;
	const state = store.getState();
	const hasChangelog = Boolean(ChangelogSelectors.changelog(activityId)(state));

	if (!hasChangelog) {
		return result;
	}

	if (Commands.pushBackup.match(engineEvent)) {
		store.dispatch(
			RelationshipEngineActions.Commands.pushChangelogCheckpoint({
				activityId,
				checkpointId: createCheckpointId(),
				scope: DETACHED_REPEAT_SCOPE,
				createdAt: Date.now()
			})
		);

		return result;
	}

	if (Commands.dropBackup.match(engineEvent)) {
		const outcome = engineEvent.payload.trigger === "cancel" ? "rollback" : "commit";

		const pendingDataHolders = ActivitySelectors.activityPropById(activityId, (activity) =>
			activity.dataHolders
				.filter(RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance)
				.filter((dh) => !!dh.slices.draftingDocumentRow)
		)(state);

		if (outcome === "commit" && pendingDataHolders && pendingDataHolders.length > 0) {
			store.dispatch(RelationshipEngineActions.Events.scdmComputation.started({ activityId }));
		}

		for (const dataHolder of pendingDataHolders ?? []) {
			store.dispatch(
				RelationshipEngineActions.Commands.clearDraftingDocumentRow({
					activityId,
					instanceId: dataHolder.descriptor.instanceId
				})
			);
		}

		store.dispatch(
			RelationshipEngineActions.Commands.resolveChangelogCheckpoint({
				activityId,
				scope: DETACHED_REPEAT_SCOPE,
				outcome
			})
		);
	}

	return result;
};

function createCheckpointId(): string {
	return `detached-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

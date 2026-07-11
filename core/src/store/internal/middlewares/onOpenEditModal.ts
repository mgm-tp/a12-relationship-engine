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

import { OverviewEngineActions } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import { Events as OverviewEvents } from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import { Dialog } from "../state.js";
import { RelationshipEngineActions } from "../actions.js";
import { UiStateSelectors } from "../selectors/uiState.js";
import { RelationshipEngineEvents } from "../../../models/index.js";

const EDIT_MODAL_SCOPE = "editModal" as const;

/**
 * @internal
 */
export const onOpenEditModalMiddleware: Middleware = (store) => (next) => (action) => {
	const result = next(action);

	if (
		!OverviewEngineActions.event.match(action) ||
		!OverviewEvents.onEventButtonClicked.match(action.payload.engineAction)
	) {
		return result;
	}

	const { activityId, engineAction, dataHolderDescriptor } = action.payload;

	if (!dataHolderDescriptor || engineAction.payload.event !== RelationshipEngineEvents.OPEN_EDIT_MODAL) {
		return result;
	}

	const instanceId = dataHolderDescriptor.instanceId;

	if (!instanceId) {
		return result;
	}

	const state = store.getState();

	// Check if there's already an Edit dialog open for this instance (toggle behavior)
	const currentDialog = UiStateSelectors.dialog(activityId)(state);

	if (Dialog.Edit.isAssignableFrom(currentDialog) && currentDialog.instanceId === instanceId) {
		// Toggle close — commit the checkpoint before nulling dialog state
		store.dispatch(
			RelationshipEngineActions.Commands.resolveChangelogCheckpoint({
				activityId,
				checkpointId: currentDialog.checkpointId,
				scope: EDIT_MODAL_SCOPE,
				outcome: "commit"
			})
		);
		store.dispatch(
			RelationshipEngineActions.Commands.setDialogState({
				activityId,
				state: null
			})
		);
	} else {
		// Open the edit dialog — push a checkpoint so changes can be rolled back on cancel
		const checkpointId = createCheckpointId();
		store.dispatch(
			RelationshipEngineActions.Commands.pushChangelogCheckpoint({
				activityId,
				checkpointId,
				scope: EDIT_MODAL_SCOPE,
				createdAt: Date.now()
			})
		);
		store.dispatch(
			RelationshipEngineActions.Commands.setDialogState({
				activityId,
				state: {
					type: Dialog.Type.EDIT,
					activityId,
					instanceId,
					checkpointId
				}
			})
		);
	}

	return result;
};

function createCheckpointId(): string {
	return `editModal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

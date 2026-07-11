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

import { put, call, select, type SagaGenerator } from "typed-redux-saga";

import type { DataProvider } from "@com.mgmtp.a12.client/client-core";
import { ActivityActions, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";

import { RelationshipEngineActions } from "../../../../store/index.js";
import { SourceEntitySelectors, type SourceEntityUpdate } from "../../../../store/index.js";

export interface FinalizeOptions {
	parentActivityId?: string;
	instance?: string;
}

export function* finalizeSave(
	params: DataProvider.SaveConfig,
	activityId: string,
	options?: FinalizeOptions
): SagaGenerator<void> {
	const parentActivityId = options?.parentActivityId;
	const activityDescriptor = yield* select(ActivitySelectors.activityPropById(activityId, (a) => a.descriptor));

	const instance = options?.instance ?? activityDescriptor?.instance;

	if (!instance) {
		throw new Error(`Cannot identify "instance" from activity "${activityId}" during save`);
	}

	yield* put(params.details.saving.done({ instance }));
	yield* put(ActivityActions.setDirty({ activityId, dirty: false }));

	if (params.details.updateActivityData) {
		yield* put(RelationshipEngineActions.Commands.seedChangelog({ activityId, changes: [] }));

		// After save, the activity descriptor might have a new instance docRef,
		// Propagate the saved instance to all affected source entities before reloading.
		yield* call(propagateSourceEntities, activityId, instance);
		yield* put(ActivityActions.reloadData({ activityId }));
	}

	if (parentActivityId) {
		yield* put(ActivityActions.reloadData({ activityId: parentActivityId }));
	}
}

function* propagateSourceEntities(activityId: string, updatedDocRef: string): SagaGenerator<SourceEntityUpdate[]> {
	const updates = yield* select(SourceEntitySelectors.updates(activityId, { overrideDocRef: updatedDocRef }));

	if (updates.length === 0) {
		return updates;
	}

	yield* put(RelationshipEngineActions.Commands.setSourceEntities({ activityId, updates }));

	return updates;
}

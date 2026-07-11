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

/**
 * @packageDocumentation
 * @module cdm/cdd
 * @experimental
 */

import { Commands, FormEngineActions } from "@com.mgmtp.a12.formengine/formengine-core";
import { Activity, StoreFactories, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";

import { DgActions } from "../../../documentGraph/redux/index.js";
import { isSetDgCl } from "../../../documentGraph/redux/dhReducersImpl.js";

/**
 * Middleware to update the DG changelog based on FE actions.
 * - When entering a detached repeat, begin a new transaction
 * - When applying changes in a detached repeat, commit transaction
 * - When cancelling changes in a detached repeat, rollback transaction
 */
const cdmFormEngineChangeLogMiddleware = StoreFactories.createMiddleware((api, next, action) => {
	if (
		(FormEngineActions.event.match(action) || FormEngineActions.command.match(action)) &&
		isDgActivity(action.payload.activityId)(api.getState())
	) {
		const activityId = action.payload.activityId;

		if (Commands.pushBackup.match(action.payload.engineEvent)) {
			api.dispatch(
				DgActions.beginTransaction({
					activityId,
					id: "repeat"
				})
			);
		} else if (Commands.dropBackup.match(action.payload.engineEvent)) {
			api.dispatch(
				DgActions.endTransaction({
					activityId,
					outcome: action.payload.engineEvent.payload.trigger === "apply" ? "commit" : "rollback",
					setDirty: action.payload.engineEvent.payload.trigger === "apply" ? true : undefined
				})
			);
		}
	}

	return next(action);
});

const isDgActivity = (activityId: string) => (state: object) => {
	const activity = ActivitySelectors.activityById(activityId)(state);
	const dataHolder = Activity.findDefaultDataHolder(activity);

	return isSetDgCl(dataHolder?.data);
};

export default cdmFormEngineChangeLogMiddleware;

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
 * @module cdm/data-provider
 * @experimental
 */
import { type AnyAction, type MiddlewareAPI } from "redux";

import { ActivityActions, ActivitySelectors, StoreFactories } from "@com.mgmtp.a12.client/client-core";
import { Commands, FormEngineActions } from "@com.mgmtp.a12.formengine/formengine-core";

import { isParentCdmActivity, linkedActivities } from "./parent-activity.js";

/**
 * Middleware that disables the parent CDM activity when a sub activity is created
 * and enables it again as soon as the sub activity is closed due to commit or
 * cancel.
 *
 * This is done in order to avoid conflicts when writing back the data
 * from the sub to the parent CDM activity.
 */
export const disableHandlingMiddleware = StoreFactories.createMiddleware((api, next, action) => {
	handleDisable(action, api);
	return next(action);
});

function handleDisable(action: AnyAction, api: MiddlewareAPI) {
	if (ActivityActions.cancel.match(action) || ActivityActions.commit.done.match(action)) {
		const activityId = ActivityActions.cancel.match(action)
			? action.payload.activityId
			: action.payload.params.activityId;

		const { initiatingActivity, activity } = linkedActivities(activityId)(api.getState());

		if (!activity || !initiatingActivity) {
			return;
		}

		if (isParentCdmActivity(initiatingActivity)) {
			api.dispatch(
				FormEngineActions.command({
					activityId: initiatingActivity.id,
					engineEvent: Commands.setDisabled(false)
				})
			);
		}
	} else if (ActivityActions.push.match(action)) {
		const activity = action.payload.activity;

		const initiatingActivity = ActivitySelectors.activityById(activity?.initiatingActivityId ?? "")(api.getState());

		if (!activity || !initiatingActivity) {
			return;
		}

		if (isParentCdmActivity(initiatingActivity)) {
			api.dispatch(
				FormEngineActions.command({
					activityId: initiatingActivity.id,
					engineEvent: Commands.setDisabled(true)
				})
			);
		}
	}
}

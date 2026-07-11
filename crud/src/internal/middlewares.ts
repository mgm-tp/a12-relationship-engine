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

import { ActivityActions } from "@com.mgmtp.a12.client/client-core";
import { Events, FormEngineActions } from "@com.mgmtp.a12.formengine/formengine-core";

import { EventNames } from "./events.js";

const cancelEvent = new RegExp(`${EventNames.FORM_CANCEL}`);
const saveEvent = new RegExp(`^${EventNames.FORM_SAVE}$`);
const commitEvent = new RegExp(`(${EventNames.FORM_SUBMIT}|${EventNames.FORM_SUBMIT_SAVE})`);

/** @internal */
export const crudMiddlewareWithoutValidation: Middleware = (api) => (next) => (action) => {
	const result = next(action);

	if (!FormEngineActions.event.match(action) || !Events.eventButton.match(action.payload.engineEvent)) {
		return result;
	}

	const eventButton = action.payload.engineEvent.payload.name;

	if (saveEvent.test(eventButton)) {
		api.dispatch(ActivityActions.save.started({ activityId: action.payload.activityId }));
	} else if (commitEvent.test(eventButton)) {
		api.dispatch(
			ActivityActions.commit.started({
				activityId: action.payload.activityId
			})
		);
	} else if (cancelEvent.test(eventButton)) {
		api.dispatch(
			ActivityActions.cancelRequested({
				activityIds: [action.payload.activityId]
			})
		);
	}

	return result;
};

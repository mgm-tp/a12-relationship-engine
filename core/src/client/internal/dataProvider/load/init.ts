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
import { type Activity, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";

import { selectUiModelInstances } from "../utils.js";
import { ModelSelectors, RelationshipEngineActions } from "../../../../store/index.js";

/**
 * Ensures all relationship data holders are initialized and returns the refreshed list of holders.
 *
 * For non-CDM child activities whose parent holds an RE changelog, also dispatches
 * `seedChangelog` to populate the child's changelog with inherited parent changes.
 * (CDM child activities derive their changelog during document-graph loading in `document.ts`.)
 */
export function* initDataHolders(params: DataProvider.LoadConfig): SagaGenerator<Activity.DataHolder[]> {
	const uiModelInstances = yield* call(selectUiModelInstances, params.activityId);

	if (!uiModelInstances?.length) {
		throw new Error(`No relationship UI models found for activity ${params.activityId}`);
	}

	const isCdd = yield* select(ModelSelectors.isCdmActivity(params.activityId));
	yield* put(
		RelationshipEngineActions.Commands.initDataHolders({
			activityId: params.activityId,
			instances: uiModelInstances,
			isCdd
		})
	);
	const updatedDataHolders = yield* select(ActivitySelectors.activityPropById(params.activityId, (a) => a.dataHolders));

	if (!updatedDataHolders) {
		throw new Error(`Data holders were not set for activity ${params.activityId} after initialization.`);
	}

	return updatedDataHolders;
}

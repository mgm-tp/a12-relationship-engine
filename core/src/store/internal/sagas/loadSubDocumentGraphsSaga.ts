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

import { put, takeEvery, type SagaGenerator } from "typed-redux-saga";

import { ActivityActions } from "@com.mgmtp.a12.client/client-core";
import type { Action } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";

import { RelationshipEngineActions } from "../actions.js";
// eslint-disable-next-line no-restricted-imports
import type { LoadSubDocumentGraphPayload } from "../../../client/internal/dataProvider/load/LoadSubDocumentGraphHandler.js";

export function* loadSubDocumentGraphsSaga(): SagaGenerator<void> {
	yield* takeEvery(
		RelationshipEngineActions.Commands.loadSubDocumentGraphs.started,
		handleLoadSubDocumentGraphsStarted
	);
}

function* handleLoadSubDocumentGraphsStarted(
	action: Action<RelationshipEngineActions.Commands.LoadSubDocumentGraphs.Params>
): SagaGenerator<void> {
	const { activityId, subtrees } = action.payload;

	const subtreeBatchPayload: LoadSubDocumentGraphPayload = { subtreeFetches: subtrees };
	yield* put(
		ActivityActions.loadData({
			activityId,
			dataHolderDescriptors: [],
			...subtreeBatchPayload
		})
	);
}

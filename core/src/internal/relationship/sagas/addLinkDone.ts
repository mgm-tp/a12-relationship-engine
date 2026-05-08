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
 * @module relationship
 */
import { type SagaIterator } from "redux-saga";
import { call, type SagaGenerator, takeLatest } from "typed-redux-saga";
import { type Action } from "typescript-fsa";

import { type Activity } from "@com.mgmtp.a12.client/client-core";

import { assertObject } from "../../shared/assertion.js";

import { RelationshipActions } from "../actions.js";
import { DUAL_PANE_SELECTION, TABLE_LIST } from "../constants.js";
import { type Relationship } from "../relationship.js";

import { calculatePageClause, synchronizeRelevantDataHolders } from "./utils.js";

/** @internal */
export function* addLinkDoneSaga(): SagaIterator<void> {
	yield* takeLatest(RelationshipActions.Commands.addLink, handleAddLinkDone);
}

/**
 * This handler is needed for the situation:
 * When we jumped from the first to the third page of DualPane/TableList (so the second one does not loaded yet),
 * we added new link, then the link will be prepended to the list.
 * So we need to fetch the last link from the second page of DualPane/TableList.
 *
 * Initial state:
 * L0 |   | L6
 * L1 |   | L7
 * L2 |   | L8
 *          ^ we are in the 3rd page
 *
 * Add link X:
 * X  | L2 | L5   <-- we need to fetch this L5.
 * L0 |    | L6
 * L1 |    | L7
 *
 */
function* handleAddLinkDone({ payload }: Action<RelationshipActions.Commands.AddLinkPayload>) {
	const { activityId, instanceId } = payload;

	yield* call(
		synchronizeRelevantDataHolders,
		activityId,
		instanceId,
		[DUAL_PANE_SELECTION, TABLE_LIST],
		getSetPagePayload
	);
}

function* getSetPagePayload(
	activityId: string,
	dataHolder: Activity.DataHolder<Relationship.LinkInstance>
): SagaGenerator<RelationshipActions.Commands.SetPagePayload | undefined> {
	assertObject(dataHolder?.data);
	const instanceId = dataHolder.descriptor.instanceId as string;
	const overridePayload = { activityId, instanceId };

	const pageClause = yield* call(calculatePageClause, {
		...overridePayload,
		type: "link" as const
	});
	if (pageClause) {
		return {
			...overridePayload,
			...pageClause,
			type: "link",
			pageNumber: dataHolder.data.linkPagination.pageNumber
		};
	}

	return undefined;
}

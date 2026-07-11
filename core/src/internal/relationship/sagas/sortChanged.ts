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
import { all, put, call, select, takeEvery, type SagaGenerator } from "typed-redux-saga";

import type { Action } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";

import { RelationshipActions } from "../actions.js";
import type { Relationship } from "../relationship.js";
import { RelationshipSelectors } from "../selectors.js";

import { loadData } from "./utils.js";

/** @internal */
export function* sortChangedSaga(): SagaGenerator<void> {
	yield* takeEvery(RelationshipActions.Events.sortChanged, handleSortChanged);
}

function* handleSortChanged({ payload }: Action<RelationshipActions.Events.SortChangedPayload>) {
	const { instanceId, activityId, type, sort } = payload;

	const candidateDataHolder = yield* select(RelationshipSelectors.candidateDataHolder(activityId, instanceId));

	if (candidateDataHolder?.data === undefined) {
		throw new Error(`No instance with id ${instanceId} found.`);
	}

	const commandPayload: RelationshipActions.Commands.SetSortPayload = {
		...payload,
		sort:
			sort !== undefined
				? updateSorting(sort.path, sort.order, candidateDataHolder.data.candidateQuery.sorts?.[0])
				: undefined
	};

	yield* all([
		put(RelationshipActions.Commands.setSort(commandPayload)),
		put(
			RelationshipActions.Commands.setPage({
				instanceId,
				activityId,
				type,
				pageNumber: 0
			})
		)
	]);
	yield* call(loadData, activityId, [instanceId], "candidate" as const);
}

function updateSorting(
	path: string,
	preferredOrder: "ASC" | "DESC" = "ASC",
	previousSorting: Relationship.SortClause | undefined
): Relationship.SortClause | undefined {
	// No sorting or different column is sorted
	if (previousSorting === undefined || previousSorting.path !== path) {
		return {
			path,
			order: preferredOrder
		};
	}

	// Same column is sorted
	if (previousSorting.order === preferredOrder) {
		return {
			path,
			order: preferredOrder === "ASC" ? "DESC" : "ASC"
		};
	} else {
		return undefined;
	}
}

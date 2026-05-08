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
import { all, call, put, type SagaGenerator, select } from "typed-redux-saga";

import { type Activity, ActivityActions, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";

import { RelationshipActions } from "../actions.js";
import { PaginationUtils } from "../paginationUtils.js";
import { Relationship } from "../relationship.js";
import { RelationshipSelectors } from "../selectors.js";
import { AdapterLinkSelectors } from "../ui/components/adapter/adapterLinkSelectors.js";

/**
 * @internal
 *
 * Fetch necessary links from all relevant link data holders if needed.
 * It is useful for adding/deleting link action.
 *
 * @param activityId - the id of activity
 * @param triggerInstanceId - the id of relationship instance where the action comes
 * @param relevantComponentNames - the list of component names need to be fetched
 * @param pageClauseGetter - the callback for each data holder to know whether that data holder
 * need to be fetched or not.
 */
export function* synchronizeRelevantDataHolders(
	activityId: string,
	triggerInstanceId: string,
	relevantComponentNames: string[],
	pageClauseGetter: (
		activityId: string,
		dataHolder: Activity.DataHolder<Relationship.LinkInstance>
	) => SagaGenerator<RelationshipActions.Commands.SetPagePayload | undefined>
): SagaGenerator<void> {
	const relevantLinkDataHolders = yield* select(
		RelationshipSelectors.relevantLinkDataHolders,
		activityId,
		triggerInstanceId,
		relevantComponentNames
	);

	const setPagePayloads: RelationshipActions.Commands.SetPagePayload[] = [];

	for (const dataHolder of relevantLinkDataHolders) {
		const setPagePayload = yield* call(pageClauseGetter, activityId, dataHolder);
		if (setPagePayload) {
			setPagePayloads.push(setPagePayload);
		}
	}

	yield* all(setPagePayloads.map((payload) => put(RelationshipActions.Commands.setPage(payload))));

	const instanceIds = setPagePayloads.map(({ instanceId }) => instanceId);
	if (instanceIds.length) {
		yield* call(loadData, activityId, instanceIds, "link" as const);
	}
}

/** @internal */
export function* calculatePageClause(params: {
	activityId: string;
	instanceId: string;
	type: "candidate" | "link";
	pageNumber?: number;
	newLinksCount?: number;
	fullCount?: number;
}): SagaIterator<Required<Relationship.PageClause> | undefined> {
	const { activityId, instanceId, type } = params;

	let pagination: Relationship.Pagination | undefined;
	if (type === "candidate") {
		pagination = (yield* select(RelationshipSelectors.candidateDataHolder(activityId, instanceId)))?.data
			?.candidatePagination;
	} else if (type === "link") {
		pagination = (yield* select((state) => RelationshipSelectors.linkDataHolder(state, activityId, instanceId)))?.data
			?.linkPagination;
	} else {
		throw new Error(`Unknown type: ${type}`);
	}

	if (!pagination) {
		throw new Error("Pagination should not be undefined");
	}

	const newLinksCount =
		params.newLinksCount ?? (yield* select(AdapterLinkSelectors.mutatedLinksCount, activityId, instanceId, "added"));

	const fullCount = params?.fullCount ?? pagination.fullCount;
	const pageNumber = params?.pageNumber ?? pagination.pageNumber;

	return PaginationUtils.getQuery({ ...pagination, newLinksCount, fullCount, pageNumber }, pageNumber);
}

/** @internal */
export function* loadData(activityId: string, instanceIds: string[], type: "candidate" | "link"): SagaIterator<void> {
	const activity = yield* select(ActivitySelectors.activityById(activityId));

	const isTypedDH =
		type === "candidate" ? Relationship.CandidateDataHolder.isInstanceById : Relationship.LinkDataHolder.isInstanceById;

	const dataHolderDescriptors =
		activity?.dataHolders
			?.filter((dataHolder) => instanceIds.some((instanceId) => isTypedDH(instanceId)(dataHolder)))
			.map((dataHolder) => dataHolder.descriptor) ?? [];

	if (dataHolderDescriptors.length) {
		yield* put(ActivityActions.loadData({ activityId, dataHolderDescriptors }));
	}
}

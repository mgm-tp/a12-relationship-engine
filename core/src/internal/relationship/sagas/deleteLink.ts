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
import { call, type SagaGenerator, select, takeLatest } from "typed-redux-saga";
import { type Action } from "typescript-fsa";

import { type Activity } from "@com.mgmtp.a12.client/client-core";

import { assertObject } from "../../shared/assertion.js";

import { RelationshipActions } from "../actions.js";
import { TABLE_LIST } from "../constants.js";
import { type Relationship } from "../relationship.js";
import { AdapterLinkSelectors } from "../ui/components/adapter/adapterLinkSelectors.js";

import { synchronizeRelevantDataHolders } from "./utils.js";

/** @internal */
export function* deleteLinkSaga(): SagaIterator<void> {
	yield* takeLatest(RelationshipActions.Commands.deleteLink, handleDeleteLink);
}

/**
 * This handler is needed for two cases:
 * Case 1. When there is at least one more link below the deleted link, e.g:
 *
 * Initial state:
 * L0 |   | L6 |
 * L1 |   | L7 |
 * L2 |   | L8 |
 *          ^ we are in the 3rd page
 *
 * Delete link L7:
 * L0 |   | L6
 * L1 |   | L8
 * L2 |   | L9    <-- we need to fetch this L9
 *
 * Case 2. When the deleted link is the last link of the current page, e.g:
 *
 * Initial state:
 * L0 |   | L6 |
 * L1 |   |    |
 * L2 |   |    |
 *          ^ we are in the 3rd page
 *
 * Delete link L6:
 * L0 | L3 |
 * L1 | L4 |
 * L2 | L5 |
 *      ^ we need to jump to the previous page and fetch all missing links
 */

function* handleDeleteLink({ payload }: Action<RelationshipActions.Commands.DeleteLinkPayload>) {
	const { activityId, instanceId } = payload;

	yield* call(
		synchronizeRelevantDataHolders,
		activityId,
		instanceId,
		// since DualPane link tables still keep the deleted link, but change the icon/action
		[TABLE_LIST],
		getSetPagePayload
	);
}

function* getSetPagePayload(
	activityId: string,
	dataHolder: Activity.DataHolder<Relationship.LinkInstance>
): SagaGenerator<RelationshipActions.Commands.SetPagePayload | undefined> {
	assertObject(dataHolder?.data);
	const instanceId = dataHolder.descriptor.instanceId as string;

	let pageNumber = dataHolder.data.linkPagination.pageNumber;
	const removedLinksCount = yield* select(AdapterLinkSelectors.mutatedLinksCount, activityId, instanceId, "removed");

	const paginationResult = calculatePagination(
		activityId,
		instanceId,
		dataHolder.data.linkPagination,
		pageNumber,
		removedLinksCount
	);
	const pageClause = paginationResult?.pageClause;
	pageNumber = paginationResult?.pageNumber ?? pageNumber;

	if (pageClause) {
		return { activityId, instanceId, type: "link", pageNumber, ...pageClause };
	}

	return undefined;
}

function calculatePagination(
	activityId: string,
	instanceId: string,
	linkPagination: Relationship.Pagination,
	pageNumber: number,
	removedLinksCount: number
): { pageClause: Required<Relationship.PageClause>; pageNumber: number } | undefined {
	const { offset, limit, fullCount, pageSize } = linkPagination;

	// Case 1
	if (offset + limit < fullCount) {
		return { pageClause: { offset: offset + limit, limit: 1 }, pageNumber };
	}

	const remainFullCount = fullCount - removedLinksCount;
	const maxPageNumber = Math.floor(Math.max(remainFullCount - 1, 0) / pageSize);

	// Case 2
	if (pageNumber > maxPageNumber) {
		pageNumber = maxPageNumber;
		return {
			pageClause: {
				offset: Math.max(0, offset - pageSize),
				limit: Math.min(fullCount, pageSize)
			},
			pageNumber
		};
	}

	return undefined;
}

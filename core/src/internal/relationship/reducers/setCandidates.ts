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

import { type Activity } from "@com.mgmtp.a12.client/client-core";

import { type RelationshipActions } from "../actions.js";
import { PaginationUtils } from "../paginationUtils.js";
import { type Relationship } from "../relationship.js";

/** @internal */
export function handleSetCandidates(
	dataHolder: Activity.DataHolder<Relationship.CandidateInstance>,
	payload: RelationshipActions.Commands.SetCandidatesPayload
): Activity.DataHolder<Relationship.CandidateInstance> {
	const { candidates: payloadCandidates, activityId, instanceId, ...restPayload } = payload;
	const candidateInstance = dataHolder.data;
	if (!candidateInstance) {
		throw new Error(`dataholder with descriptor ${dataHolder.descriptor} has no data!`);
	}

	const { list: updatedCandidates, ...updatedPagination } = PaginationUtils.reducePaginationList(
		{ ...candidateInstance.candidatePagination, list: candidateInstance.candidates },
		{ ...restPayload, list: payloadCandidates }
	);

	const updatedCandidateInstance: Relationship.CandidateInstance = {
		...candidateInstance,
		candidateQuery: {
			...candidateInstance.candidateQuery,
			page: {
				...candidateInstance.candidateQuery.page,
				offset: undefined,
				limit: undefined
			}
		},
		candidatePagination: {
			...candidateInstance.candidatePagination,
			...updatedPagination
		},
		candidates: updatedCandidates
	};

	return {
		...dataHolder,
		data: updatedCandidateInstance,
		loadingState: "loaded",
		busy: false
	};
}

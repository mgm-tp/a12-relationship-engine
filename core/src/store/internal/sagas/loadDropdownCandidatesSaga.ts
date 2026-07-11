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

import { put, select, debounce, type SagaGenerator } from "typed-redux-saga";

import type { Action } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";
import { ActivityActions, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";

import { RelationshipEngineActions } from "../actions.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";

const DROPDOWN_DEBOUNCE_MS = 300;

export function* loadDropdownCandidatesSaga(): SagaGenerator<void> {
	yield* debounce(DROPDOWN_DEBOUNCE_MS, RelationshipEngineActions.Events.loadDropdownData, handleLoadDropdownData);
}

function* handleLoadDropdownData(
	action: Action<RelationshipEngineActions.Events.LoadDropdownDataPayload>
): SagaGenerator<void> {
	const { activityId, instanceId, searchText, pageNumber } = action.payload;

	yield* put(
		RelationshipEngineActions.Commands.setDropdownLoading({
			activityId,
			instanceId,
			isLoading: true
		})
	);

	yield* put(
		RelationshipEngineActions.Commands.setDropdownSearchState({
			activityId,
			instanceId,
			searchText,
			pageNumber
		})
	);

	const dropdownDataHolder = yield* select(
		ActivitySelectors.activityPropById(activityId, (activity) =>
			activity?.dataHolders.find(
				(dh) =>
					RelationshipEngineDataHolder.DropdownSelectionDataHolder.isInstance(dh) &&
					dh.descriptor.instanceId === instanceId
			)
		)
	);

	if (!dropdownDataHolder) {
		return;
	}

	const dropdownPayload: Record<string, string> = { dropdownLoadMode: "availableItems" };
	yield* put(
		ActivityActions.loadData({
			activityId,
			dataHolderDescriptors: [dropdownDataHolder.descriptor],
			...dropdownPayload
		})
	);
}

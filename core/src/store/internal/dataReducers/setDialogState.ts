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

import type { Activity } from "@com.mgmtp.a12.client/client-core";
import type { Action } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";

import type { RelationshipEngineActions } from "../actions.js";
import { type RelationshipEngineUiState, RelationshipEngineUiState as REUiState } from "../state.js";

/**
 * Gets the relationship engine UI state from a data holder's slices.
 */
function getRelationshipEngineUiState(
	dataHolder: Activity.DataHolder | undefined
): RelationshipEngineUiState | undefined {
	if (!dataHolder?.slices) {
		return undefined;
	}

	const sliceValue = dataHolder.slices[REUiState.SLICE_KEY];

	if (sliceValue && typeof sliceValue === "object" && "dialog" in sliceValue) {
		return sliceValue as RelationshipEngineUiState;
	}

	return undefined;
}

/**
 * Updates the relationship engine UI state in a data holder's slices.
 * Returns a new data holder with updated slices.
 */
function setRelationshipEngineUiState(
	dataHolder: Activity.DataHolder,
	uiState: RelationshipEngineUiState
): Activity.DataHolder {
	return {
		...dataHolder,
		slices: {
			...dataHolder.slices,
			[REUiState.SLICE_KEY]: uiState
		}
	};
}

/**
 * Handles the setDialogState command.
 * Updates the dialog state in the default data holder's relationshipEngineUiState slice.
 */
export function handleSetDialogState(
	dataHolders: Activity.DataHolder[],
	action: Action<RelationshipEngineActions.Commands.SetDialogStatePayload>,
	defaultDataHolder: Activity.DataHolder | undefined
): Activity.DataHolder[] {
	if (!defaultDataHolder) {
		return dataHolders;
	}

	const { state } = action.payload;

	return dataHolders.map((dh) => {
		if (dh !== defaultDataHolder) {
			return dh;
		}

		const currentUiState = getRelationshipEngineUiState(dh);

		return setRelationshipEngineUiState(dh, {
			...currentUiState,
			dialog: state
		});
	});
}

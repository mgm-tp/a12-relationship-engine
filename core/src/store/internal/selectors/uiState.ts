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

import type { Selector } from "@com.mgmtp.a12.client/client-core";
import { Activity, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";

import { type Dialog, type RelationshipEngineUiState, RelationshipEngineUiState as REUiState } from "../state.js";

import { createSelector } from "./selector.js";

/** @internal */
export namespace UiStateSelectors {
	/** Selects the relationship engine UI state from the default data holder's slices. */
	export function state(activityId: string): Selector<RelationshipEngineUiState | undefined> {
		return (reduxState) => stateReselect(reduxState, activityId);
	}

	const stateReselect = createSelector(
		[
			(reduxState: object, activityId: string) =>
				ActivitySelectors.activityPropById(activityId, Activity.findDefaultDataHolder)(reduxState)
		],
		(defaultDataHolder): RelationshipEngineUiState | undefined => fromDataHolder(defaultDataHolder)
	);

	/**
	 * Gets the relationship engine UI state directly from a data holder.
	 * @internal
	 */
	export function fromDataHolder(dataHolder: Activity.DataHolder | undefined): RelationshipEngineUiState | undefined {
		if (!dataHolder?.slices) {
			return undefined;
		}

		const sliceValue = dataHolder.slices[REUiState.SLICE_KEY];

		if (sliceValue && typeof sliceValue === "object" && "dialog" in sliceValue) {
			return sliceValue as RelationshipEngineUiState;
		}

		return undefined;
	}

	/** Selects the dialog state from the default data holder's UI state slice. */
	export function dialog(activityId: string): Selector<Dialog> {
		return (reduxState) => dialogReselect(reduxState, activityId);
	}

	const dialogReselect = createSelector(
		[(reduxState: object, activityId: string) => stateReselect(reduxState, activityId)],
		(reUiState): Dialog => reUiState?.dialog ?? null
	);

	/** Identifies a selected item via sub-activity resolution — the docRef and linkId of the currently selected row. */
	export interface SelectedItemRef {
		readonly docRef: string;
		readonly linkId: string;
	}

	/**
	 * Resolves the currently selected item reference from the (single) child activity of `activityId`,
	 * reading its descriptor's `instance` and `selectedLinkId`. A parent RE activity is expected to have
	 * at most one child activity at a time.
	 */
	export function selectedItem(activityId: string): Selector<SelectedItemRef | undefined> {
		return (state) => selectedItemReselect(state, activityId);
	}

	const selectedItemReselect = createSelector(
		[(state: object, activityId: string) => ActivitySelectors.childActivityWithInstance(activityId)(state)],
		(subActivity): SelectedItemRef | undefined => {
			if (!subActivity?.descriptor?.instance || !subActivity?.descriptor?.selectedLinkId) {
				return undefined;
			}

			return {
				docRef: subActivity.descriptor.instance,
				linkId: subActivity.descriptor.selectedLinkId
			};
		}
	);
}

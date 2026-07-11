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
import { ActivitySelectors } from "@com.mgmtp.a12.client/client-core";

import { createSelector } from "../selector.js";
import type { DocumentGraph } from "../../state.js";
import { RelationshipEngineDataHolder } from "../../dataHolder.js";

/** Selects the DocumentGraph data holder for a CDM activity, or undefined for non-CDM. */
export function documentGraph(activityId: string): Selector<DocumentGraph | undefined> {
	return (state) => documentGraphReselect(state, activityId);
}

export const documentGraphReselect = (state: object, activityId: string) =>
	ActivitySelectors.activityPropById(
		activityId,
		(a) => a.dataHolders.find(RelationshipEngineDataHolder.DocumentGraphDataHolder.isInstance)?.data
	)(state);

/** Selects the persisted root document reference for a CDM activity. */
export function rootDocRef(activityId: string): Selector<string | undefined> {
	return (state) => rootDocRefReselect(state, activityId);
}

export const rootDocRefReselect = (state: object, activityId: string) =>
	ActivitySelectors.activityPropById(
		activityId,
		(a) => a.dataHolders.find(RelationshipEngineDataHolder.DocumentGraphDataHolder.isInstance)?.slices.rootDocRef
	)(state);

/** Selects the live document object for a given docRef from the DocumentGraph. */
export function documentByRef(activityId: string, docRef: string): Selector<object | undefined> {
	return (state) => documentByRefReselect(state, activityId, docRef);
}

const documentByRefReselect = createSelector(
	[
		(state: object, activityId: string) => documentGraphReselect(state, activityId),
		(_state: object, _activityId: string, docRef: string) => docRef
	],
	(documentGraph, docRef): object | undefined => {
		if (!documentGraph) {
			return undefined;
		}

		if (documentGraph.documents.byDocRef[docRef]?.loadingState !== "loaded") {
			return undefined;
		}

		return documentGraph.documents.byDocRef[docRef].document;
	}
);

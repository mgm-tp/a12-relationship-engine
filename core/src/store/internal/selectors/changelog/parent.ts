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

import type { Changelog } from "../../state.js";
import { createSelector } from "../selector.js";
import type { DocumentGraph } from "../../state.js";
import { DocumentGraphSelectors } from "../documentGraph.js";

import { changelogReselect } from "./changelog.js";

/** Result of walking up the activity ancestor chain to find the nearest RE changelog. */
export interface ParentResult {
	readonly changelog: Changelog;
	readonly documentGraph?: DocumentGraph;
	readonly rootDocRef?: string;
}

/**
 * Selects the immediate parent activity's changelog, document graph, and root doc ref.
 *
 * Returns `undefined` if the immediate parent has no RE changelog.
 */
export function parent(docRef: string, activityId: string): Selector<ParentResult | undefined> {
	return (state) => parentReselect(state, docRef, activityId);
}

const parentReselect = createSelector(
	[
		(state: object, _docRef: string, activityId: string) =>
			ActivitySelectors.activityById(activityId)(state)?.initiatingActivityId,
		(state: object, _docRef: string, activityId: string) => {
			const parentId = ActivitySelectors.activityById(activityId)(state)?.initiatingActivityId;

			return parentId ? changelogReselect(state, parentId) : undefined;
		},
		(state: object, _docRef: string, activityId: string) => {
			const parentId = ActivitySelectors.activityById(activityId)(state)?.initiatingActivityId;

			return parentId ? (DocumentGraphSelectors.documentGraph(parentId)(state) ?? undefined) : undefined;
		},
		(state: object, _docRef: string, activityId: string) => {
			const parentId = ActivitySelectors.activityById(activityId)(state)?.initiatingActivityId;

			return parentId ? DocumentGraphSelectors.rootDocRef(parentId)(state) : undefined;
		}
	],
	(_parentId, changelog, documentGraph, rootDocRef): ParentResult | undefined => {
		if (!changelog) {
			return undefined;
		}

		return {
			changelog,
			documentGraph,
			rootDocRef: rootDocRef ?? undefined
		};
	}
);

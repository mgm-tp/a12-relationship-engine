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

import { applyChange } from "../documentGraph/applyChange.js";
import type { RelationshipEngineActions } from "../actions.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";

/**
 * Resets `loadingState` and `busy` on all RE data holders after the batched subtree fetch
 * triggered by `loadSubDocumentGraphs` completes.
 *
 * `ActivityActions.loadData` (dispatched by the orchestrator saga) sets every data holder to
 * `loadingState: "loading"`. Because `LoadSubDocumentGraphHandler` returns no
 * `UpdatedDataHolder[]`, the normal `setDataHolders` path never fires to transition them back.
 * This reducer fills that gap.
 */
export function handleLoadSubDocumentGraphsDone(
	dataHolders: Activity.DataHolder[],
	action: Action<ReturnType<typeof RelationshipEngineActions.Commands.loadSubDocumentGraphs.done>["payload"]>
): Activity.DataHolder[] {
	const fragments = action.payload.result.subtrees.map((s) => s.fragment);
	const withChangelog = fragments.length === 0 ? dataHolders : appendSubDocumentGraphEntries(dataHolders, fragments);

	return resetLoadingState(withChangelog, "loaded");
}

type Fragment = RelationshipEngineActions.Commands.LoadSubDocumentGraphs.Result["subtrees"][number]["fragment"];

function appendSubDocumentGraphEntries(
	dataHolders: Activity.DataHolder[],
	fragments: Fragment[]
): Activity.DataHolder[] {
	return dataHolders.map((dh) => {
		if (RelationshipEngineDataHolder.ChangelogDataHolder.isInstance(dh)) {
			return {
				...dh,
				data: {
					...dh.data,
					changes: [...dh.data.changes, ...fragments]
				}
			};
		}

		if (RelationshipEngineDataHolder.DocumentGraphDataHolder.isInstance(dh)) {
			let dg = dh.data;

			for (const fragment of fragments) {
				// subDocumentGraphAdded does not require modelsInScene or modelGraph
				dg = applyChange(dg, fragment, []);
			}

			return { ...dh, data: dg };
		}

		return dh;
	});
}

/**
 * Resets all currently-loading data holders to error state.
 * This resets broadly because `ActivityActions.loadData` itself marks all holders as "loading",
 * so a failure applies to the same scope — no concurrent sub-document graph loads are supported.
 */
export function handleLoadSubDocumentGraphsFailed(dataHolders: Activity.DataHolder[]): Activity.DataHolder[] {
	return resetLoadingState(dataHolders, "error");
}

function resetLoadingState(
	dataHolders: Activity.DataHolder[],
	targetState: Activity.DataHolder["loadingState"]
): Activity.DataHolder[] {
	let changed = false;
	const result = dataHolders.map((dh) => {
		if (dh.loadingState !== "loading") {
			return dh;
		}

		changed = true;

		return { ...dh, loadingState: targetState, busy: false };
	});

	return changed ? result : dataHolders;
}

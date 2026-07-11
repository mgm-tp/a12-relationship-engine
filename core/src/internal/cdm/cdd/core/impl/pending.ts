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
 * @module cdm/cdd
 * @experimental
 */

import type { QueryPath } from "../../../cdmCommons/queryPath.js";
import type { DocRef, RelshPath, LoadingState } from "../../../../documentGraph/core/index.js";
import type { PartialCddState, PendingRelshUsage, PendingCddRelshUsages } from "../cddState.js";

/**
 * @internal
 *
 * Add "missing" pending info for the given `relshPaths` paths for the given pending key `{relshName, targetDocRef}`.
 */
export function addMissingPaths(
	cddState: PartialCddState,
	key: PendingCddRelshUsages["key"],
	relshPaths: RelshPath[]
): PartialCddState {
	if (relshPaths.length === 0) {
		return cddState;
	}

	const draftPendingUsages = [...cddState.pendingUsages]; // shallow clone
	// Find entry for key (<relshName, targetDocRef> tuple)
	const idx = draftPendingUsages.findIndex(
		(usage) => usage.key.relshName === key.relshName && usage.key.targetDocRef === key.targetDocRef
	);

	const missingPaths: PendingRelshUsage[] = relshPaths.map((relshPath) => {
		return { relshPath, loadingState: "missing" };
	});

	if (idx >= 0) {
		// Don't overwrite path entries for a given relshPath with "missing" if it is existing
		// ==> "missing" DOES NOT overwrite "loading", "error", "missing" etc.
		const missingsPathsWithoutExisting = missingPaths.filter((path: PendingRelshUsage) =>
			draftPendingUsages[idx].relshUsages.every((p) => p.relshPath !== path.relshPath)
		);

		draftPendingUsages[idx] = {
			...draftPendingUsages[idx],
			relshUsages: [...draftPendingUsages[idx].relshUsages, ...missingsPathsWithoutExisting]
		};
	} else {
		draftPendingUsages.push({ key, relshUsages: missingPaths });
	}

	return {
		...cddState,
		pendingUsages: draftPendingUsages
	};
}

/**
 * @internal
 *
 * For `loadingState === "loaded" or "error"` remove `relshPath` path in "pending" array for entry
 * `{relshName, targetDocRef}` (if `"loaded"`), otherwise update the loadingState of the entry (if it exists!).
 * <br>If the entry does not exists, then nothing happens.
 * <p>
 * **Open Decision:**
 * Is it a good idea to remove LOADED and ERROR?
 * Maybe it is better to keep these entries, which allows to identify Sub-Cdd which were already
 * loaded (or tried to).
 * <br>==> But no, don't keep these entries, because this logic could be done in the DataProvider
 * (but also keep in mind the busy state might cause flickering!)
 */
export function updatePending(
	cddState: PartialCddState,
	key: PendingCddRelshUsages["key"],
	relshPath: RelshPath,
	loadingState: LoadingState
): PartialCddState {
	let pending = cddState.pendingUsages;
	// Find entry for key (<relshName, targetDocRef> tuple)
	const idx = pending.findIndex(
		(usage) => usage.key.relshName === key.relshName && usage.key.targetDocRef === key.targetDocRef
	);

	if (idx >= 0) {
		const usage = pending[idx];
		pending = [...pending.slice(0, idx), ...pending.slice(idx + 1)];
		const relshUsages: PendingRelshUsage[] = usage.relshUsages.reduce(
			(prev: PendingRelshUsage[], current: PendingRelshUsage) => {
				// Find the <relshPath> entry
				if (current.relshPath === relshPath) {
					// Remove entry if the new loadingState is "loaded", otherwise just update the entry
					return loadingState === "loaded" || loadingState === "error" ? prev : [...prev, { relshPath, loadingState }];
				} else {
					return [...prev, current];
				}
			},
			[]
		);

		if (relshUsages.length > 0) {
			pending = [...pending, { ...usage, relshUsages: relshUsages }];
		}
	}

	return {
		...cddState,
		pendingUsages: pending
	};
}

/** @internal */
export function collectMissingPaths(arg: PartialCddState | DocRef): QueryPath[] {
	// If cddState does not exist, then create a QueryPath for the root
	if (typeof arg === "string") {
		return [{ docRef: arg, path: "" }];
	}

	const paths: QueryPath[] = arg.pendingUsages.reduce(
		// Technical note: using nested reducers might be inefficient; but it's OK since only some entries are expected
		(collectedPaths: QueryPath[], usage: PendingCddRelshUsages) => {
			const r = usage.relshUsages.reduce((prev: QueryPath[], current: PendingRelshUsage) => {
				if (current.loadingState === "missing") {
					return [...prev, { docRef: usage.key.targetDocRef, path: current.relshPath }];
				} else {
					return prev;
				}
			}, []);

			return [...collectedPaths, ...r];
		},
		[]
	);

	return paths;
}

/** @internal */
export function anyPending(cddState: PartialCddState): boolean {
	return cddState.pendingUsages.length > 0;
}

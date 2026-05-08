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
 * @module documentGraph/core
 * @experimental
 */
import { type Change, type ChangeLog, type DocumentChange, type LinkChange, type Marker } from "./changeLog.js";

// These "reducer helpers" work in on the ChangeLogSlice structure of an Activity's DataHolder

/**
 * Puts the given `changes` into the `changeLog`. It uses internal compaction logic to prevent
 * the change log to grow too large.
 */
export function applyChanges<S>(changeLog: ChangeLog<S>, changes: Change<S>[]): ChangeLog<S> {
	if (changes.length === 0) {
		return changeLog;
	} else if (isChangeCollapsingAllowed()) {
		// Skip the first change of given changes, and apply same optimization on the rest of changes.
		// The change counter has to be increased anyway, otherwise the changes might not be propagated
		const updatedChangeLog = applyChanges(changeLog, changes.slice(1));
		return {
			...updatedChangeLog,
			changeCounter: updatedChangeLog.changeCounter + Math.max(changes.length - 1, 1)
		};
	} else {
		return {
			...changeLog,
			changes: [...changeLog.changes, ...changes],
			changeCounter: changeLog.changeCounter + changes.length
		};
	}

	// Internal optimization
	// Currently only checks if the new change and last logged change are both DocChanges on the same doc
	function isChangeCollapsingAllowed(): boolean {
		const len = changeLog.changes.length;
		const firstNewChange = changes[0];
		if (firstNewChange.kind === "docChanged" && len > 0) {
			const lastLoggedChange = changeLog.changes[len - 1];
			if (lastLoggedChange.kind === "docChanged" && lastLoggedChange.docRef === firstNewChange.docRef) {
				return true;
			}
		}
		return false;
	}
}

const INITIAL_CHANGE_NUMBER = 0;

export function newChangeLog<S>(): ChangeLog<S> {
	return {
		changes: [],
		changeCounter: INITIAL_CHANGE_NUMBER
	};
}

export function changeCounter<S>(changeLog: ChangeLog<S> | undefined): number {
	return changeLog?.changeCounter ?? INITIAL_CHANGE_NUMBER - 1;
}

export function isLinkRelatedChange<S>(change: Change<S>): change is LinkChange {
	return ["linkAdded", "linkDeleted", "linkDocChanged"].some((kind) => kind === change.kind);
}

export function isDocumentRelatedChange<S>(change: Change<S>): change is DocumentChange {
	return ["docChanged", "docAdded"].some((kind) => kind === change.kind);
}

/**
 * Remove the (last) marker with the given ID. If no such marker exists, the
 * state remains unchanged.
 */
export function clearMarker<S>(changeLog: ChangeLog<S>): ChangeLog<S> {
	const markerIndex = findMarkerIndex(changeLog.changes);
	if (markerIndex < 0) {
		return changeLog;
	}
	return {
		...changeLog,
		changes: changeLog.changes.filter((c, i) => i !== markerIndex)
	};
}

/**
 * Cut off all changes beginning with the marker with the given ID. If no such
 * marker exists, the state remains unchanged.
 */
export function trim<S>(changeLog: ChangeLog<S>): ChangeLog<S> {
	const markerIndex = findMarkerIndex(changeLog.changes);
	if (markerIndex < 0) {
		return changeLog;
	}
	return {
		...changeLog,
		changes: changeLog.changes.slice(0, markerIndex),
		changeCounter: changeLog.changeCounter + 1
	};
}

/**
 * Return the (last) index of the marker with the given ID. If no such marker
 * exists, return undefined.
 */
export function findMarker<S>(changeLog: ChangeLog<S>, id?: string): Marker<S> | undefined {
	const markerIndex = findMarkerIndex(changeLog.changes, id);
	if (markerIndex < 0) {
		return undefined;
	}
	return changeLog.changes[markerIndex] as Marker<S>;
}

/**
 * Find the last index of a marker, optionally with the given ID.
 *
 * Search all changes in reverse order. If an ID was given and matches the ID of
 * a marker => hit. If no ID was given => match any marker.
 */
function findMarkerIndex(changes: Change<unknown>[], id?: string): number {
	for (let i = changes.length - 1; i >= 0; i--) {
		const change = changes[i];
		const idMatch = change.kind === "marker" && id !== undefined && change.id === id;
		const typeMatch = change.kind === "marker" && id === undefined;
		if (idMatch || typeMatch) {
			return i;
		}
	}
	return -1;
}

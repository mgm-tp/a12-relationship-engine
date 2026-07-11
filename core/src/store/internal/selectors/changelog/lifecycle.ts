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
import type { Relationship } from "@com.mgmtp.a12.dataservices/dataservices-access";

import { ModelSelectors } from "../model.js";
import type { Changelog } from "../../state.js";
import { createSelector } from "../selector.js";

import { changelogReselect } from "./changelog.js";

/** Parameters identifying a link target within a relationship. */
export interface LinkTargetParams {
	readonly relationshipModel: string;
	readonly sourceDocRef?: string;
	readonly targetRole: string;
}

/** Aggregated counts of link lifecycle states for rendering indicator badges. */
export interface LinkIndicatorCounts {
	readonly addedCount: number;
	readonly removedAndWithdrawnCount: number;
}

/** Details of a single effectively added link entry. */
export interface AddedLinkDetail {
	readonly linkId: string;
	readonly linkRef: Relationship.LinkRef;
	readonly linkDocument: object | undefined;
}

/** Possible lifecycle states for a link or target doc reference. */
export type LifecycleState = "added" | "removed" | "withdrawn";

/** Partitioned arrays of target docRefs by their effective lifecycle state. */
export interface LifecycleSets {
	added: readonly string[];
	removed: readonly string[];
	withdrawn: readonly string[];
	/** Target docRefs whose effective (non-withdrawn) `linkAdded` carries `inherited: true`. */
	inherited: readonly string[];
}

/**
 * Derives lifecycle sets (added/removed/withdrawn/inherited) for link targets filtered by relationship model, source, and target role.
 *
 * Resolution path:
 * - RE changelog in the current activity;
 * - filters by `params.relationshipModel`;
 * - if `params.sourceDocRef` is set, only links involving that source are considered;
 * - target role (`params.targetRole`) is used to identify the target entity in the link descriptor.
 */
export function lifecycleStates(activityId: string, params: LinkTargetParams): Selector<LifecycleSets> {
	return (state) =>
		lifecycleStatesReselect(state, activityId, params.relationshipModel, params.sourceDocRef, params.targetRole);
}

export const lifecycleStatesReselect = createSelector(
	[
		(state: object, activityId: string) => changelogReselect(state, activityId),
		(_state: object, _activityId: string, relationshipModel: string) => relationshipModel,
		(_state: object, _activityId: string, _relationshipModel: string, sourceDocRef: string | undefined) => sourceDocRef,
		(
			_state: object,
			_activityId: string,
			_relationshipModel: string,
			_sourceDocRef: string | undefined,
			targetRole: string
		) => targetRole
	],
	(changelog, relationshipModel, sourceDocRef, targetRole): LifecycleSets => {
		const added = new Set<string>();
		const removed = new Set<string>();
		const withdrawn = new Set<string>();
		const inherited = new Set<string>();

		if (!changelog) {
			return { added: [], removed: [], withdrawn: [], inherited: [] };
		}

		const acc = new Map<string, LinkLifecycleAccumulator>();
		const lastLinkAddedInheritedByTarget = new Map<string, boolean>();

		for (const change of changelog.changes) {
			if (change.kind !== "linkAdded" && change.kind !== "linkDeleted") {
				continue;
			}

			const { linkDescriptor } = change.linkRef;

			if (linkDescriptor.relationshipModel !== relationshipModel) {
				continue;
			}

			const entities = linkDescriptor.entities;
			let targetDocRef: string | null | undefined;

			if (sourceDocRef) {
				if (!entities.some((e) => e.docRef === sourceDocRef)) {
					continue;
				}

				if (targetRole) {
					targetDocRef = entities.find((e) => e.role === targetRole)?.docRef;
				} else {
					targetDocRef = entities.find((e) => e.docRef !== sourceDocRef)?.docRef;
				}
			} else if (targetRole) {
				targetDocRef = entities.find((e) => e.role === targetRole)?.docRef;
			} else {
				targetDocRef = entities[1]?.docRef;
			}

			if (!targetDocRef) {
				continue;
			}

			const prev = acc.get(targetDocRef);
			const next = classifyNext(prev, change.kind);
			acc.set(targetDocRef, next);

			if (change.kind === "linkAdded") {
				lastLinkAddedInheritedByTarget.set(targetDocRef, change.inherited ?? false);
			}
		}

		for (const [target, { state }] of acc) {
			if (state === "added") {
				added.add(target);

				if (lastLinkAddedInheritedByTarget.get(target)) {
					inherited.add(target);
				}
			} else if (state === "withdrawn") {
				withdrawn.add(target);
			} else {
				removed.add(target);
			}
		}

		return {
			added: Array.from(added),
			removed: Array.from(removed),
			withdrawn: Array.from(withdrawn),
			inherited: Array.from(inherited)
		};
	}
);

/** @internal */
interface LinkLifecycleAccumulator {
	state: LifecycleState;
	addedCount: number;
	deletedCount: number;
}

function classifyNext(
	prev: LinkLifecycleAccumulator | undefined,
	changeKind: "linkAdded" | "linkDeleted"
): LinkLifecycleAccumulator {
	if (!prev) {
		return changeKind === "linkAdded"
			? { state: "added", addedCount: 1, deletedCount: 0 }
			: { state: "removed", addedCount: 0, deletedCount: 1 };
	}

	if (changeKind === "linkAdded") {
		const addedCount = prev.addedCount + 1;

		return { state: "added", addedCount, deletedCount: prev.deletedCount };
	}

	const deletedCount = prev.deletedCount + 1;

	if (prev.addedCount > 0) {
		return { state: "withdrawn", addedCount: prev.addedCount, deletedCount };
	}

	return { state: "removed", addedCount: prev.addedCount, deletedCount };
}

/**
 * Per-`linkId` lifecycle sets for exclude-mode row consumers.
 *
 * Like {@link lifecycleStates}, but the accumulator is keyed by `change.linkId`
 * instead of the target docRef. Each entry in the returned sets is a `linkId`,
 * preserving per-link granularity when multiple links share a target docRef
 * (only possible when the SelectedItemsOverview query model carries
 * `exclude: true`).
 *
 * Use this selector when the row consumer matches against a row's `linkId`
 * sidecar field (exclude mode). Use {@link lifecycleStates} when matching
 * against the row's plain `id` (docRef).
 */
export function lifecycleStatesByLink(activityId: string, params: LinkTargetParams): Selector<LifecycleSets> {
	return (state) =>
		lifecycleStatesByLinkReselect(state, activityId, params.relationshipModel, params.sourceDocRef, params.targetRole);
}

const lifecycleStatesByLinkReselect = createSelector(
	[
		(state: object, activityId: string) => changelogReselect(state, activityId),
		(_state: object, _activityId: string, relationshipModel: string) => relationshipModel,
		(_state: object, _activityId: string, _relationshipModel: string, sourceDocRef: string | undefined) => sourceDocRef,
		(
			_state: object,
			_activityId: string,
			_relationshipModel: string,
			_sourceDocRef: string | undefined,
			targetRole: string
		) => targetRole
	],
	(changelog, relationshipModel, sourceDocRef, targetRole): LifecycleSets => {
		const added = new Set<string>();
		const removed = new Set<string>();
		const withdrawn = new Set<string>();
		const inherited = new Set<string>();

		if (!changelog) {
			return { added: [], removed: [], withdrawn: [], inherited: [] };
		}

		const acc = new Map<string, LinkLifecycleAccumulator>();
		const lastLinkAddedInheritedByLinkId = new Map<string, boolean>();

		for (const change of changelog.changes) {
			if (change.kind !== "linkAdded" && change.kind !== "linkDeleted") {
				continue;
			}

			const { linkDescriptor } = change.linkRef;

			if (linkDescriptor.relationshipModel !== relationshipModel) {
				continue;
			}

			const entities = linkDescriptor.entities;

			if (sourceDocRef) {
				if (!entities.some((e) => e.docRef === sourceDocRef)) {
					continue;
				}

				if (targetRole) {
					const targetEntity = entities.find((e) => e.role === targetRole);

					if (!targetEntity?.docRef) {
						continue;
					}
				} else {
					const otherEntity = entities.find((e) => e.docRef !== sourceDocRef);

					if (!otherEntity?.docRef) {
						continue;
					}
				}
			} else if (targetRole) {
				const targetEntity = entities.find((e) => e.role === targetRole);

				if (!targetEntity?.docRef) {
					continue;
				}
			} else if (!entities[1]?.docRef) {
				continue;
			}

			const linkId = change.linkId;
			const prev = acc.get(linkId);
			const next = classifyNext(prev, change.kind);
			acc.set(linkId, next);

			if (change.kind === "linkAdded") {
				lastLinkAddedInheritedByLinkId.set(linkId, change.inherited ?? false);
			}
		}

		for (const [linkId, { state }] of acc) {
			if (state === "added") {
				added.add(linkId);

				if (lastLinkAddedInheritedByLinkId.get(linkId)) {
					inherited.add(linkId);
				}
			} else if (state === "withdrawn") {
				withdrawn.add(linkId);
			} else {
				removed.add(linkId);
			}
		}

		return {
			added: Array.from(added),
			removed: Array.from(removed),
			withdrawn: Array.from(withdrawn),
			inherited: Array.from(inherited)
		};
	}
);

/**
 * Returns added target docRefs, or `[]` when the overview is in exclude mode.
 */
export function selectingDocs(activityId: string, params: LinkTargetParams): Selector<string[] | undefined> {
	return (state) =>
		selectingDocsReselect(state, activityId, params.relationshipModel, params.sourceDocRef, params.targetRole);
}

const selectingDocsReselect = createSelector(
	[
		(state: object, activityId: string, relationshipModel: string) =>
			ModelSelectors.isExcludeMode(activityId, relationshipModel)(state),
		(
			state: object,
			activityId: string,
			relationshipModel: string,
			sourceDocRef: string | undefined,
			targetRole: string
		) => lifecycleStatesReselect(state, activityId, relationshipModel, sourceDocRef, targetRole)
	],
	(isExclude, lifecycle): string[] | undefined => {
		if (isExclude) {
			return [];
		}

		return lifecycle.added.slice();
	}
);

/**
 * Derives aggregated counts of added and removed/withdrawn link targets for indicator badges.
 */
export function indicatorCounts(activityId: string, params: LinkTargetParams): Selector<LinkIndicatorCounts> {
	return (state) =>
		indicatorCountsReselect(state, activityId, params.relationshipModel, params.sourceDocRef, params.targetRole);
}

const indicatorCountsReselect = createSelector(
	[
		(
			state: object,
			activityId: string,
			relationshipModel: string,
			sourceDocRef: string | undefined,
			targetRole: string
		) => lifecycleStatesReselect(state, activityId, relationshipModel, sourceDocRef, targetRole)
	],
	(lifecycle): LinkIndicatorCounts => ({
		addedCount: lifecycle.added.length,
		removedAndWithdrawnCount: lifecycle.removed.length + lifecycle.withdrawn.length
	})
);

/**
 * Returns the set of pending added target docRefs for the given relationship and params.
 */
export function pendingAdded(activityId: string, params: LinkTargetParams): Selector<readonly string[]> {
	return (state) =>
		pendingAddedReselect(state, activityId, params.relationshipModel, params.sourceDocRef, params.targetRole);
}

const pendingAddedReselect = createSelector(
	[
		(
			state: object,
			activityId: string,
			relationshipModel: string,
			sourceDocRef: string | undefined,
			targetRole: string
		) => lifecycleStatesReselect(state, activityId, relationshipModel, sourceDocRef, targetRole)
	],
	(lifecycle) => lifecycle.added
);

/**
 * Returns details (linkId, linkRef, linkDocument) for all net-added links matching the given relationship model.
 */
export function addedLinks(activityId: string, relationshipModel: string): Selector<AddedLinkDetail[]> {
	return (state) => addedLinksReselect(state, activityId, relationshipModel);
}

const addedLinksReselect = createSelector(
	[
		(state: object, activityId: string) => changelogReselect(state, activityId),
		(_state: object, _activityId: string, relationshipModel: string) => relationshipModel
	],
	(changelog, relationshipModel): AddedLinkDetail[] => {
		if (!changelog) {
			return [];
		}

		const addedById = new Map<string, Changelog.LinkAdded>();

		for (const change of changelog.changes) {
			if (change.kind === "linkAdded" && change.linkRef.linkDescriptor.relationshipModel === relationshipModel) {
				addedById.set(change.linkId, change);
			} else if (
				change.kind === "linkDeleted" &&
				change.linkRef.linkDescriptor.relationshipModel === relationshipModel
			) {
				addedById.delete(change.linkId);
			}
		}

		return Array.from(addedById.values()).map(toAddedLinkDetail);
	}
);

function toAddedLinkDetail(change: Changelog.LinkAdded): AddedLinkDetail {
	return {
		linkId: change.linkId,
		linkRef: change.linkRef,
		linkDocument: change.linkDocument
	};
}

/**
 * For single-selection relationships, returns the effective target docRef considering pending changelog changes.
 */
export function selectedTarget(
	activityId: string,
	params: LinkTargetParams,
	persistedTargetDocRef: string | undefined
): Selector<string | undefined> {
	return (state) =>
		selectedTargetReselect(
			state,
			activityId,
			params.relationshipModel,
			params.sourceDocRef,
			params.targetRole,
			persistedTargetDocRef
		);
}

const selectedTargetReselect = createSelector(
	[
		(
			state: object,
			activityId: string,
			relationshipModel: string,
			sourceDocRef: string | undefined,
			targetRole: string
		) => lifecycleStatesReselect(state, activityId, relationshipModel, sourceDocRef, targetRole),
		(
			_state: object,
			_activityId: string,
			_relationshipModel: string,
			_sourceDocRef: string | undefined,
			_targetRole: string,
			persistedTargetDocRef: string | undefined
		) => persistedTargetDocRef
	],
	(lifecycle, persistedTargetDocRef): string | undefined => {
		if (lifecycle.added.length > 0) {
			return lifecycle.added[lifecycle.added.length - 1];
		}

		if (
			persistedTargetDocRef &&
			(lifecycle.removed.includes(persistedTargetDocRef) || lifecycle.withdrawn.includes(persistedTargetDocRef))
		) {
			return undefined;
		}

		return persistedTargetDocRef;
	}
);

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

import { createSelector } from "../selector.js";

import { changelogReselect } from "./changelog.js";
import { type LinkTargetParams, lifecycleStatesReselect } from "./lifecycle.js";

/** A document that exists only in the changelog (docAdded) but not yet persisted in DS. */
export interface DraftingDocumentEntry {
	readonly docRef: string;
	readonly document: object;
	readonly documentModelName: string;
	/**
	 * Identifier of the `linkAdded` change that links this drafting document into the relationship,
	 * when one exists. Required by exclude-mode consumers that key rows by `linkId`.
	 */
	readonly linkId?: string;
}

/**
 * A link added in the changelog while the overview is in exclude mode, carrying a target document snapshot.
 */
export interface DraftingLinkEntry {
	readonly linkId: string;
	readonly targetDocRef: string;
	readonly targetDocument: object;
	readonly targetDocumentModelName: string;
}

/**
 * Returns locally created documents (docAdded) that are in the lifecycle.added set for the given params.
 *
 * NOTE: A `docAdded` with `inherited: true` is intentionally included — it represents a locally
 * visible document seeded from the parent that DS has not yet seen.
 */
export function draftingDocs(activityId: string, params: LinkTargetParams): Selector<readonly DraftingDocumentEntry[]> {
	return (state) =>
		draftingDocsReselect(state, activityId, params.relationshipModel, params.sourceDocRef, params.targetRole);
}

const draftingDocsReselect = createSelector(
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
		) => targetRole,
		(
			state: object,
			activityId: string,
			relationshipModel: string,
			sourceDocRef: string | undefined,
			targetRole: string
		) => lifecycleStatesReselect(state, activityId, relationshipModel, sourceDocRef, targetRole)
	],
	(changelog, relationshipModel, sourceDocRef, targetRole, lifecycle): readonly DraftingDocumentEntry[] => {
		if (!changelog) {
			return [];
		}

		const docAddedByRef = new Map<string, { document: object; documentModelName: string; linkId?: string }>();

		for (const change of changelog.changes) {
			if (change.kind === "docAdded") {
				docAddedByRef.set(change.docRef, { document: change.document, documentModelName: change.documentModelName });
			}
		}

		if (docAddedByRef.size === 0) {
			return [];
		}

		for (const change of changelog.changes) {
			if (change.kind !== "linkAdded") {
				continue;
			}

			const { linkDescriptor } = change.linkRef;

			if (linkDescriptor.relationshipModel !== relationshipModel) {
				continue;
			}

			if (sourceDocRef && !linkDescriptor.entities.some((e) => e.docRef === sourceDocRef)) {
				continue;
			}

			const targetEntity = targetRole
				? linkDescriptor.entities.find((e) => e.role === targetRole)
				: linkDescriptor.entities.find((e) => e.docRef !== sourceDocRef);
			const targetDocRef = targetEntity?.docRef;

			if (!targetDocRef) {
				continue;
			}

			const existing = docAddedByRef.get(targetDocRef);

			if (existing && existing.linkId === undefined) {
				existing.linkId = change.linkId;
			}
		}

		const entries: DraftingDocumentEntry[] = [];

		for (const docRef of lifecycle.added) {
			const added = docAddedByRef.get(docRef);

			if (added) {
				entries.push({
					docRef,
					document: added.document,
					documentModelName: added.documentModelName,
					linkId: added.linkId
				});
			}
		}

		return entries;
	}
);

/**
 * Returns `linkAdded` entries carrying a target document snapshot (created while in exclude mode),
 * excluding withdrawn entries and those already covered by a `docAdded`.
 */
export function draftingLinks(activityId: string, params: LinkTargetParams): Selector<readonly DraftingLinkEntry[]> {
	return (state) =>
		draftingLinksReselect(state, activityId, params.relationshipModel, params.sourceDocRef, params.targetRole);
}

const draftingLinksReselect = createSelector(
	[
		(state: object, activityId: string) => changelogReselect(state, activityId),
		(_state: object, _activityId: string, relationshipModel: string) => relationshipModel,
		(
			_state: object,
			_activityId: string,
			_relationshipModel: string,
			_sourceDocRef: string | undefined,
			targetRole: string
		) => targetRole
	],
	(changelog, relationshipModel, targetRole): readonly DraftingLinkEntry[] => {
		if (!changelog) {
			return [];
		}

		const deletedLinkIds = new Set<string>();
		const docAddedRefs = new Set<string>();

		for (const change of changelog.changes) {
			if (change.kind === "linkDeleted") {
				deletedLinkIds.add(change.linkId);
			}

			if (change.kind === "docAdded") {
				docAddedRefs.add(change.docRef);
			}
		}

		const entries: DraftingLinkEntry[] = [];

		for (const change of changelog.changes) {
			if (change.kind !== "linkAdded") {
				continue;
			}

			if (change.linkRef.linkDescriptor.relationshipModel !== relationshipModel) {
				continue;
			}

			if (!change.targetDocument || !change.targetDocumentModelName) {
				continue;
			}

			if (deletedLinkIds.has(change.linkId)) {
				continue;
			}

			const targetDocRef = change.linkRef.linkDescriptor.entities.find((e) => e.role === targetRole)?.docRef;

			if (!targetDocRef || docAddedRefs.has(targetDocRef)) {
				continue;
			}

			entries.push({
				linkId: change.linkId,
				targetDocRef,
				targetDocument: change.targetDocument,
				targetDocumentModelName: change.targetDocumentModelName
			});
		}

		return entries;
	}
);

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
import { DocumentGraph, type Changelog } from "../../state.js";
import { documentGraphReselect } from "../documentGraph/base.js";
import { isDraftingDocRef } from "../../utils/linkIdAndDocRef.js";
import { ParentLinkDescriptor } from "../../parent-link-descriptor.js";

import { changelogReselect } from "./changelog.js";

/**
 * Computes the net effective changes for the activity's changelog, collapsing redundant entries.
 *
 * NOTE: Does not filter by `inherited`; inherited entries are intentionally included so the
 * persist path can send injected links to DataServices.
 * NOTE: Memoization may not fire when link modifications are present, because
 * `foldModificationIntoAddition` spreads a new object even when values are unchanged.
 */
export function effectiveChanges(activityId: string): Selector<Changelog.Change[] | undefined> {
	return (state) => effectiveChangesReselect(state, activityId);
}

const effectiveChangesReselect = createSelector(
	[
		(state: object, activityId: string) => changelogReselect(state, activityId),
		(state: object, activityId: string) => documentGraphReselect(state, activityId),
		(state: object, activityId: string) => ActivitySelectors.activityPropById(activityId, (a) => a?.descriptor)(state)
	],
	(changelog, documentGraph, descriptor): Changelog.Change[] | undefined => {
		if (!changelog || !descriptor) {
			return undefined;
		}

		const documentAdditionByReferenceMap = new Map<string, DocumentAdditionEntry>();
		const documentUpdateByReferenceMap = new Map<string, DocumentUpdateEntry>();
		const linkAccumulatorByIdentifierMap = new Map<string, LinkChangeAccumulator>();

		changelog.changes.forEach((change, changeIndex) => {
			if (isRootDocumentChange(change)) {
				return;
			}

			switch (change.kind) {
				case "docAdded":
					recordDocumentAddition(change, changeIndex, documentAdditionByReferenceMap, documentUpdateByReferenceMap);
					break;
				case "docChanged":
					recordDocumentUpdate(change, changeIndex, documentAdditionByReferenceMap, documentUpdateByReferenceMap);
					break;
				case "linkAdded":
				case "linkDeleted":
				case "linkDocChanged":
					recordLinkChange(change, changeIndex, linkAccumulatorByIdentifierMap);
					break;
				default:
					break;
			}
		});

		const orderedChangeEntries: OrderedChangeEntry[] = [];
		appendDocumentAdditions(orderedChangeEntries, documentAdditionByReferenceMap);
		appendDocumentUpdates(orderedChangeEntries, documentUpdateByReferenceMap);
		appendLinkChanges(orderedChangeEntries, linkAccumulatorByIdentifierMap);

		appendFallbackChanges(orderedChangeEntries, documentGraph, descriptor);

		orderedChangeEntries.sort((left, right) => {
			const leftSourceDocRef = sourceDocRefOf(left.change);
			const rightSourceDocRef = sourceDocRefOf(right.change);

			if (leftSourceDocRef && rightSourceDocRef && leftSourceDocRef === rightSourceDocRef) {
				const priorityDiff = linkChangeSortPriority(left.change) - linkChangeSortPriority(right.change);

				if (priorityDiff !== 0) {
					return priorityDiff;
				}
			}

			return left.index - right.index;
		});

		return orderedChangeEntries.map((entry) => entry.change);
	}
);

interface DocumentAdditionEntry {
	readonly change: Changelog.DocAdded;
	readonly index: number;
}

interface DocumentUpdateEntry {
	change: Changelog.DocChanged;
	readonly firstIndex: number;
}

interface LinkChangeAccumulator {
	entries: Array<{
		readonly change: Changelog.LinkAdded | Changelog.LinkDeleted | Changelog.LinkDocChanged;
		readonly index: number;
	}>;
}

interface OrderedChangeEntry {
	readonly index: number;
	readonly change: Changelog.Change;
}

function isRootDocumentChange(change: Changelog.Change): boolean {
	if (change.kind === "cdmRootComputed") {
		return true;
	}

	if (change.kind === "docAdded" || change.kind === "docChanged") {
		return change.docRef === DocumentGraph.ROOT_DOC_REF;
	}

	return false;
}

/** Returns the source docRef for link changes, or undefined for non-link changes. */
function sourceDocRefOf(change: Changelog.Change): string | undefined {
	if (change.kind === "linkAdded" || change.kind === "linkDeleted" || change.kind === "linkDocChanged") {
		return change.linkRef.linkDescriptor.entities[0]?.docRef;
	}

	return undefined;
}

/**
 * Returns sort priority for link changes sharing the same source docRef.
 * Deletions (0) before modifications (1) before additions (2).
 */
function linkChangeSortPriority(change: Changelog.Change): number {
	if (change.kind === "linkDeleted") {
		return 0;
	}

	if (change.kind === "linkAdded") {
		return 2;
	}

	return 1;
}

function recordDocumentAddition(
	change: Changelog.DocAdded,
	changeIndex: number,
	documentAdditionByReferenceMap: Map<string, DocumentAdditionEntry>,
	documentUpdateByReferenceMap: Map<string, DocumentUpdateEntry>
): void {
	documentAdditionByReferenceMap.set(change.docRef, { change, index: changeIndex });
	documentUpdateByReferenceMap.delete(change.docRef);
}

function recordDocumentUpdate(
	change: Changelog.DocChanged,
	changeIndex: number,
	documentAdditionByReferenceMap: Map<string, DocumentAdditionEntry>,
	documentUpdateByReferenceMap: Map<string, DocumentUpdateEntry>
): void {
	if (documentAdditionByReferenceMap.has(change.docRef)) {
		return;
	}

	const existingEntry = documentUpdateByReferenceMap.get(change.docRef);

	if (existingEntry) {
		existingEntry.change = change;

		return;
	}

	documentUpdateByReferenceMap.set(change.docRef, { change, firstIndex: changeIndex });
}

function recordLinkChange(
	change: Changelog.LinkAdded | Changelog.LinkDeleted | Changelog.LinkDocChanged,
	changeIndex: number,
	linkAccumulatorByIdentifierMap: Map<string, LinkChangeAccumulator>
): void {
	const linkIdentifier = change.linkId;
	const existingAccumulator = linkAccumulatorByIdentifierMap.get(linkIdentifier);

	if (!existingAccumulator) {
		const freshAccumulator: LinkChangeAccumulator = { entries: [] };
		linkAccumulatorByIdentifierMap.set(linkIdentifier, freshAccumulator);
		applyLinkChangeToAccumulator(freshAccumulator, change, changeIndex);

		return;
	}

	applyLinkChangeToAccumulator(existingAccumulator, change, changeIndex);
}

function applyLinkChangeToAccumulator(
	accumulator: LinkChangeAccumulator,
	change: Changelog.LinkAdded | Changelog.LinkDeleted | Changelog.LinkDocChanged,
	changeIndex: number
): void {
	accumulator.entries.push({ change, index: changeIndex });
}

function appendDocumentAdditions(
	orderedChangeEntries: OrderedChangeEntry[],
	documentAdditionByReferenceMap: Map<string, DocumentAdditionEntry>
): void {
	for (const documentAdditionEntry of documentAdditionByReferenceMap.values()) {
		orderedChangeEntries.push({ index: documentAdditionEntry.index, change: documentAdditionEntry.change });
	}
}

function appendDocumentUpdates(
	orderedChangeEntries: OrderedChangeEntry[],
	documentUpdateByReferenceMap: Map<string, DocumentUpdateEntry>
): void {
	for (const documentUpdateEntry of documentUpdateByReferenceMap.values()) {
		orderedChangeEntries.push({ index: documentUpdateEntry.firstIndex, change: documentUpdateEntry.change });
	}
}

function appendLinkChanges(
	orderedChangeEntries: OrderedChangeEntry[],
	linkAccumulatorByIdentifierMap: Map<string, LinkChangeAccumulator>
): void {
	for (const linkChangeAccumulator of linkAccumulatorByIdentifierMap.values()) {
		const finalizedEntries = finalizeLinkChangeAccumulator(linkChangeAccumulator);

		for (const finalizedEntry of finalizedEntries) {
			orderedChangeEntries.push(finalizedEntry);
		}
	}
}

function appendFallbackChanges(
	entries: OrderedChangeEntry[],
	documentGraph: DocumentGraph | undefined,
	descriptor: { instance?: string; model?: string }
): void {
	if (entries.filter(({ change }) => change.kind === "docAdded" || change.kind === "docChanged").length > 0) {
		return;
	}

	if (documentGraph) {
		const byDocRef = documentGraph.documents.byDocRef ?? {};
		let index = 0;

		for (const [docRef, node] of Object.entries(byDocRef)) {
			if (isDraftingDocRef(docRef) && node.loadingState === "loaded") {
				entries.push({
					index: index++,
					change: {
						kind: "docAdded",
						docRef,
						document: node.document,
						documentModelName: node.documentModelName
					}
				});
			}
		}

		return;
	}

	const { instance, model } = descriptor;

	if (instance && model && isDraftingDocRef(instance)) {
		entries.push({
			index: 0,
			change: {
				kind: "docChanged",
				docRef: instance,
				document: {},
				documentModelName: model
			}
		});
	}
}

function finalizeLinkChangeAccumulator(accumulator: LinkChangeAccumulator): OrderedChangeEntry[] {
	const { entries } = accumulator;

	if (entries.length === 0) {
		return [];
	}

	// Process entries in changelog order to determine the effective state.
	// Track the latest "lifecycle" event (add or delete) and any modifications that follow it.
	let latestLifecycleEntry:
		| { readonly change: Changelog.LinkAdded | Changelog.LinkDeleted; readonly index: number }
		| undefined;
	let latestModificationAfterLifecycle:
		| { readonly change: Changelog.LinkDocChanged; readonly index: number }
		| undefined;
	// Track deletion that precedes the latest addition (for delete→re-add flows)
	let precedingDeletion: { readonly change: Changelog.LinkDeleted; readonly index: number } | undefined;

	for (const entry of entries) {
		switch (entry.change.kind) {
			case "linkAdded":
				if (latestLifecycleEntry?.change.kind === "linkDeleted") {
					precedingDeletion = latestLifecycleEntry as {
						readonly change: Changelog.LinkDeleted;
						readonly index: number;
					};
				}

				latestLifecycleEntry = entry as { readonly change: Changelog.LinkAdded; readonly index: number };
				latestModificationAfterLifecycle = undefined;
				break;
			case "linkDeleted":
				precedingDeletion = undefined;
				latestLifecycleEntry = entry as { readonly change: Changelog.LinkDeleted; readonly index: number };
				latestModificationAfterLifecycle = undefined;
				break;
			case "linkDocChanged":
				// Modification after a deletion is a no-op — the link no longer exists.
				if (latestLifecycleEntry?.change.kind !== "linkDeleted") {
					latestModificationAfterLifecycle = entry as {
						readonly change: Changelog.LinkDocChanged;
						readonly index: number;
					};
				}

				break;
			default:
				break;
		}
	}

	if (!latestLifecycleEntry && !latestModificationAfterLifecycle) {
		return [];
	}

	// Case: last effective event is a deletion
	if (latestLifecycleEntry?.change.kind === "linkDeleted") {
		// If there was an addition before this deletion (add→delete), they cancel out.
		if (precedingDeletion === undefined && entries.some((e) => e.change.kind === "linkAdded")) {
			return [];
		}

		return [{ index: latestLifecycleEntry.index, change: latestLifecycleEntry.change }];
	}

	// Case: last effective event is an addition (possibly preceded by a deletion)
	if (latestLifecycleEntry?.change.kind === "linkAdded") {
		const effectiveAddition = foldModificationIntoAddition(
			latestLifecycleEntry as { readonly change: Changelog.LinkAdded; readonly index: number },
			latestModificationAfterLifecycle
		);
		const additionEntry: OrderedChangeEntry = { index: latestLifecycleEntry.index, change: effectiveAddition };

		if (precedingDeletion) {
			return [{ index: precedingDeletion.index, change: precedingDeletion.change }, additionEntry];
		}

		return [additionEntry];
	}

	// Case: only modifications, no lifecycle event
	if (latestModificationAfterLifecycle) {
		return [{ index: latestModificationAfterLifecycle.index, change: latestModificationAfterLifecycle.change }];
	}

	return [];
}

function foldModificationIntoAddition(
	additionEntry: { readonly change: Changelog.LinkAdded; readonly index: number },
	modificationEntry?: { readonly change: Changelog.LinkDocChanged; readonly index: number }
): Changelog.LinkAdded {
	if (!modificationEntry || !modificationEntry.change.linkDocument) {
		return additionEntry.change;
	}

	return { ...additionEntry.change, linkDocument: modificationEntry.change.linkDocument };
}

/**
 * Returns raw changelog entries excluding root document changes and inherited entries (except the ParentLinkDescriptor injection).
 * Use for the merge case where the full sequence of changes matters.
 *
 * NOTE: Since entries are spread to strip `inherited`, the output array items are always new objects; result-equality memoization will not fire.
 */
export function mergeableChanges(activityId: string): Selector<Changelog.Change[]> {
	return (state) => mergeableChangesReselect(state, activityId);
}

const mergeableChangesReselect = createSelector(
	[
		(state: object, activityId: string) => changelogReselect(state, activityId),
		(state: object, activityId: string) =>
			ActivitySelectors.activityPropById(activityId, (activity) => activity?.descriptor)(state)
	],
	(changelog, activityDescriptor): Changelog.Change[] => {
		if (!changelog) {
			return [];
		}

		const parentLinkDescriptor = ParentLinkDescriptor.isAssignableFrom(activityDescriptor)
			? activityDescriptor
			: undefined;

		return changelog.changes
			.filter(
				(change) =>
					change.kind !== "cdmRootComputed" &&
					change.kind !== "subDocumentGraphAdded" &&
					(!change.inherited || isParentLinkInjection(change, parentLinkDescriptor)) &&
					!isRootDocumentChange(change)
			)
			.map((change) => ({ ...change, inherited: undefined }));
	}
);

function isParentLinkInjection(
	change: Changelog.Change,
	parentLinkDescriptor: ParentLinkDescriptor | undefined
): boolean {
	return (
		change.kind === "linkAdded" &&
		parentLinkDescriptor !== undefined &&
		change.linkRef.linkDescriptor.relationshipModel === parentLinkDescriptor.parentRelationshipName &&
		change.linkRef.linkDescriptor.entities.some(({ role, docRef }) => {
			return role === parentLinkDescriptor.parentRelationshipRole && docRef === parentLinkDescriptor.parentInstance;
		})
	);
}

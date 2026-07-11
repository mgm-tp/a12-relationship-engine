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

import { put, call, select, type SagaGenerator } from "typed-redux-saga";

import { ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import type { DataProvider } from "@com.mgmtp.a12.client/client-core";
import { FormEngineSelectors } from "@com.mgmtp.a12.formengine/formengine-core";

import type { Changelog } from "../../../../store/index.js";
import { ChangelogSelectors } from "../../../../store/index.js";
import { RelationshipEngineActions } from "../../../../store/index.js";
import { isDraftingDocRef, nextDraftingDocRef } from "../../../../store/index.js";
import { ModelSelectors, DocumentGraphSelectors } from "../../../../store/index.js";

import type { SaveState } from "./types.js";
import { finalizeSave } from "./finalizeSave.js";

/**
 * Handles the "merge" save case: the child activity's effective changes are merged
 * into the parent activity's changelog, then the child's changelog is cleared.
 *
 * For create flows (drafting `descriptor.instance`): a unique docRef is generated to replace the
 * drafting placeholder in the child's effective changes (avoiding collisions when multiple children
 * merge into the same parent). A fat `docAdded` replaces the original `docAdded` + `docChanged`
 * sequence. The inherited `linkAdded` from init carries the link — no synthesis is needed here.
 *
 * For edit flows: the full changelog sequence is forwarded (excluding root CDM document changes).
 */
export function* handleMergeSave(
	params: DataProvider.SaveConfig,
	saveState: Extract<SaveState, { kind: "merge" }>
): SagaGenerator<void> {
	const childChanges = yield* buildMergeChanges(saveState);

	yield* put(
		RelationshipEngineActions.Commands.mergeChangelog({
			activityId: saveState.parentActivityId,
			childActivityId: saveState.activityId,
			changes: childChanges
		})
	);
	yield* call(finalizeSave, params, saveState.activityId);
}

/**
 * Builds the changelog entries to merge from the child activity into the parent.
 *
 * For create flows (drafting `descriptor.instance`): selects the latest fully-populated document
 * and produces a single fat `docAdded` (replacing the original `docAdded` + `docChanged` sequence),
 * then remaps all drafting docRef occurrences to a unique drafting ref to avoid collisions when
 * multiple children merge into the same parent.
 * The inherited `linkAdded` injected at init already carries the correct link — no synthesis needed.
 *
 * For edit flows: the changes are forwarded unchanged.
 */
function* buildMergeChanges(saveState: Extract<SaveState, { kind: "merge" }>): SagaGenerator<Changelog.Change[]> {
	const activity = yield* select(ActivitySelectors.activityById(saveState.activityId));
	const descriptor = activity?.descriptor;

	if (!descriptor?.instance || !isDraftingDocRef(descriptor.instance)) {
		return saveState.changes;
	}

	const draftingDocRef = descriptor.instance;
	const documentModelName = descriptor.model;

	if (!documentModelName) {
		throw new Error(`Model descriptor is required for drafting docRef saves (activity ${saveState.activityId})`);
	}

	const parentChangelog = yield* select(ChangelogSelectors.changelog(saveState.parentActivityId));
	const uniqueDocRef = nextDraftingDocRef(documentModelName, parentChangelog);
	const latestDocument = yield* selectLatestDocument(saveState.activityId, draftingDocRef);
	const condensedChanges = buildCondensedChanges(saveState.changes, draftingDocRef, latestDocument, documentModelName);
	const withInstanceRemap = remapDocRefs(condensedChanges, draftingDocRef, uniqueDocRef);

	return withInstanceRemap;
}

/**
 * Selects the latest document for the new entity from the child activity's state.
 */
function* selectLatestDocument(activityId: string, draftingDocRef: string): SagaGenerator<object> {
	if (yield* select(ModelSelectors.isCdmActivity(activityId))) {
		const document = yield* select(DocumentGraphSelectors.documentByRef(activityId, draftingDocRef));

		if (!document) {
			throw new Error(
				`CDM document missing from DocumentGraph for docRef "${draftingDocRef}" (activity ${activityId})`
			);
		}

		return document;
	}

	const engineState = yield* select(FormEngineSelectors.engineState(activityId));
	const document = engineState?.data?.document;

	if (!document) {
		throw new Error(`No document in FormEngine state for activity ${activityId} — FormEngine invariant violation`);
	}

	return document;
}

/**
 * Produces the condensed changelog for the "create new" case: a single `docAdded` carrying
 * the fully-populated document (selected from state) replaces the original `docAdded` +
 * `docChanged` sequence. All non-document changes (link changes, etc.) are kept as-is.
 */
function buildCondensedChanges(
	changes: readonly Changelog.Change[],
	newDocRef: string,
	latestDocument: object | undefined,
	documentModelName: string
): Changelog.Change[] {
	const nonDocChanges = changes.filter(
		(change) => !((change.kind === "docAdded" || change.kind === "docChanged") && change.docRef === newDocRef)
	);

	const originalDocAdded = changes.find(
		(change): change is Changelog.DocAdded => change.kind === "docAdded" && change.docRef === newDocRef
	);

	if (originalDocAdded) {
		return [
			{ ...originalDocAdded, document: latestDocument ?? originalDocAdded.document, documentModelName },
			...nonDocChanges
		];
	}

	if (!latestDocument) {
		return [...changes];
	}

	const fatDocAdded: Changelog.DocAdded = {
		kind: "docAdded",
		docRef: newDocRef,
		document: latestDocument,
		documentModelName
	};

	return [fatDocAdded, ...nonDocChanges];
}

/**
 * Remaps all occurrences of `originalDocRef` to `newDocRefValue` in the given changelog changes.
 * This covers `docAdded.docRef`, `docChanged.docRef`, and link entity docRefs.
 */
function remapDocRefs(
	changes: readonly Changelog.Change[],
	originalDocRef: string,
	newDocRefValue: string
): Changelog.Change[] {
	return changes.map(remapSingleChange);

	function remapSingleChange(change: Changelog.Change): Changelog.Change {
		switch (change.kind) {
			case "docAdded":
				return change.docRef === originalDocRef ? { ...change, docRef: newDocRefValue } : change;
			case "docChanged":
				return change.docRef === originalDocRef ? { ...change, docRef: newDocRefValue } : change;
			case "linkAdded":
			case "linkDeleted":
			case "linkDocChanged":
				return remapLinkChangeDocRefs(change);
			case "cdmRootComputed":
			case "subDocumentGraphAdded":
				return change;
		}
	}

	function remapLinkChangeDocRefs<T extends { linkRef: Changelog.LinkAdded["linkRef"] }>(change: T): T {
		const entities = change.linkRef.linkDescriptor.entities;
		const needsRemap = entities.some((e) => e.docRef === originalDocRef);

		if (!needsRemap) {
			return change;
		}

		return {
			...change,
			linkRef: {
				...change.linkRef,
				linkDescriptor: {
					...change.linkRef.linkDescriptor,
					entities: entities.map((e) => (e.docRef === originalDocRef ? { ...e, docRef: newDocRefValue } : e))
				}
			}
		};
	}
}

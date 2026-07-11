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

import { delay, type SagaGenerator } from "typed-redux-saga";
import { put, take, select, takeEvery } from "typed-redux-saga";

import { ModelPath } from "@com.mgmtp.a12.base/base-model-api";
import { ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import type { Action, AnyAction } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";
import {
	type DocumentModel,
	DocumentServiceFactory,
	type EntityInstancePath
} from "@com.mgmtp.a12.kernel/kernel-md-facade";
import {
	Events,
	Commands,
	UiStateSelectors,
	FormEngineActions,
	FormEngineSelectors
} from "@com.mgmtp.a12.formengine/formengine-core";

import { ModelSelectors } from "../selectors/model.js";
import { RelationshipEngineActions } from "../actions.js";
import { ChangelogSelectors } from "../selectors/changelog.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";
import { DocumentGraphSelectors } from "../selectors/documentGraph.js";
import { nextDraftingDocRef, nextDraftingLinkId } from "../utils/linkIdAndDocRef.js";

export function* onRepeatRowAddedSaga(): SagaGenerator<void> {
	yield* takeEvery(
		(a: unknown) => FormEngineActions.event.match(a) && Events.Repeat.addRow.match(a.payload.engineEvent),
		handleRepeatRowAdded
	);
}

/**
 * Handles `FormEngineEvents.Repeat.addRow` for CDM activities with a DetachedRepeat.
 *
 * When a new row is added, FE dispatches a sequence of commands synchronously:
 * pushBackup → setDocument → changeRepeatInstanceStateEntry → pushScreen → changeScreenState.
 *
 * This saga waits for the `Commands.changeScreenState` command that has `focusedComponent` set —
 * the last action in the sequence, signalling that the new detached screen is fully ready.
 * At that point `currentScreenLocation().path` is the authoritative row path that FE
 * will use as data context for all subsequent `valueChange` events.
 *
 * Once the row path is known, the saga dispatches:
 * - `docAdded` — creates a drafting child document in the DocumentGraph
 * - `linkAdded` — immediately links the drafting document to the source to keep the DocumentGraph consistent
 * - `trackDraftingDocumentRow` — stores the rowPath→docRef mapping on the SelectedItemsDataHolder
 */
function* handleRepeatRowAdded(action: Action<FormEngineActions.FormEngineEventActions>): SagaGenerator<void> {
	if (!Events.Repeat.addRow.match(action.payload.engineEvent)) {
		return;
	}

	const { activityId, engineEvent } = action.payload;
	const { path, repeatFormModelPath } = engineEvent.payload;

	const state: object = yield* select();

	// Find the matching SelectedItemsDataHolder for this repeat group.
	const linkDataHolder = findLinkDataHolder(activityId, repeatFormModelPath, state);

	if (!linkDataHolder) {
		return;
	}

	// CDM-only: a DocumentGraph must exist.
	const documentGraph = DocumentGraphSelectors.documentGraph(activityId)(state);

	if (!documentGraph) {
		return;
	}

	// The root document model is the source (CDM root) document.
	const rootModelResult = ModelSelectors.rootDocumentModel(activityId)(state);

	if (!rootModelResult) {
		return;
	}

	// `path` ends with the CDM relationship group element (index: 0).
	const targetGroupElement = resolveGroupElement(rootModelResult.documentModel, path);

	if (!targetGroupElement || targetGroupElement.type !== "Group" || targetGroupElement.repeatability <= 1) {
		return;
	}

	// Read the target document model name directly from the CDM annotations on the group element.
	const targetDocumentModel = targetGroupElement.annotations?.find((a) => a.name === "cdm.targetDocumentModel")?.value;

	if (!targetDocumentModel) {
		return;
	}

	// Wait for the final `changeScreenState` command with `focusedComponent` set.
	// This is the last action FE dispatches in the addRow sequence — after pushScreen has
	// already set the new screen's path — so the new screen is fully ready when we proceed.
	yield* take(
		(a: AnyAction) =>
			FormEngineActions.command.match(a) &&
			a.payload.activityId === activityId &&
			Commands.changeScreenState.match(a.payload.engineEvent) &&
			a.payload.engineEvent.payload.focusedComponent !== undefined
	);

	// ensure FE has processed the screen change and updated currentScreenLocation
	// Need to find a better way to ensure this without an arbitrary delay
	yield* delay(1);

	// After changeScreenState is processed, the current screen IS the new detached row screen.
	// Its path is the authoritative rowInstancePath that FE uses in all subsequent valueChange events.
	const formEngineState = yield* select(FormEngineSelectors.engineState(activityId));

	if (!formEngineState) {
		return;
	}

	const rowInstancePath = UiStateSelectors.currentScreenLocation()(formEngineState).path;

	if (!rowInstancePath || rowInstancePath.length === 0) {
		return;
	}

	const changelog = yield* select(ChangelogSelectors.changelog(activityId));
	const draftingDocRef = nextDraftingDocRef(targetDocumentModel, changelog);
	const { relationshipName, targetRole } = linkDataHolder.slices.uiConfiguration;
	const { docRef: sourceDocRef, role: sourceRole } = linkDataHolder.slices.sourceEntity;

	yield* put(
		RelationshipEngineActions.Commands.addChangeLog({
			activityId,
			change: {
				kind: "docAdded",
				docRef: draftingDocRef,
				document: {},
				documentModelName: targetDocumentModel
			}
		})
	);

	if (sourceDocRef) {
		const linkId = nextDraftingLinkId(relationshipName, changelog ?? undefined);
		yield* put(
			RelationshipEngineActions.Commands.addChangeLog({
				activityId,
				change: {
					kind: "linkAdded",
					linkId,
					linkRef: {
						id: linkId,
						linkDescriptor: {
							relationshipModel: relationshipName,
							entities: [
								{ role: sourceRole, docRef: sourceDocRef },
								{ role: targetRole, docRef: draftingDocRef }
							]
						}
					}
				}
			})
		);
	}

	yield* put(
		RelationshipEngineActions.Commands.trackDraftingDocumentRow({
			activityId,
			instanceId: linkDataHolder.descriptor.instanceId,
			rowInstancePath,
			docRef: draftingDocRef,
			documentModelName: targetDocumentModel
		})
	);
}

function findLinkDataHolder(activityId: string, repeatFormModelPath: ModelPath, state: object) {
	const repeatFormModelPathString = ModelPath.toString(repeatFormModelPath);

	return ActivitySelectors.activityPropById(activityId, (activity) =>
		activity.dataHolders
			.filter(RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance)
			.find((dh) => dh.slices.formModelPath === repeatFormModelPathString)
	)(state);
}

function resolveGroupElement(documentModel: DocumentModel, entityInstancePath: EntityInstancePath) {
	const documentService = new DocumentServiceFactory().getDocumentModelSearchService(documentModel);
	const modelPath: ModelPath = entityInstancePath.map(({ elementName }) => ({ elementName }));

	return documentService.getByPath(modelPath);
}

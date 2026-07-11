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

import deepEqual from "fast-deep-equal";
import type { SagaGenerator } from "typed-redux-saga";
import { put, call, select, takeEvery } from "typed-redux-saga";

import { LoggerFactory } from "@com.mgmtp.a12.utils/utils-logging";
import type { Action } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";
import { Model, Activity, ModelSelectors, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import type {
	DocumentModel,
	GroupInstance,
	EntityInstancePath,
	FieldInstanceValue
} from "@com.mgmtp.a12.kernel/kernel-md-facade";
import {
	Change,
	DocumentPath,
	type FormModel,
	computeDocument,
	UiStateSelectors,
	type EngineStore,
	type ValueChanged,
	preProcessDocument,
	FormEngineSelectors,
	type ReadonlyObjectMap,
	Commands as FormEngineCommands
} from "@com.mgmtp.a12.formengine/formengine-core";

import { toCdd } from "../utils/toCdd.js";
import { RelationshipEngineActions } from "../actions.js";
import { DocumentUtils } from "../utils/documentUtils.js";
import { DocumentGraph, type Changelog } from "../state.js";
import { isDraftingDocRef } from "../utils/linkIdAndDocRef.js";
import { DOCUMENT_SERVICE } from "../utils/documentService.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";
import { DocumentGraphSelectors } from "../selectors/documentGraph.js";
import { ModelSelectors as REModelSelectors } from "../selectors/model.js";
import type { RelationshipEngineMiddlewareOptions } from "../middlewares/types.js";

const logger = LoggerFactory.getLogger("RelationshipEngine.cdm.computation");

export function* scdmComputationSaga(options?: RelationshipEngineMiddlewareOptions): SagaGenerator<void> {
	yield* takeEvery(RelationshipEngineActions.Commands.mergeChangelog, handleMergeChangelog);
	yield* takeEvery(RelationshipEngineActions.Commands.setDataHolders, handleSetDataHolders);

	yield* takeEvery(RelationshipEngineActions.Events.scdmComputation.started, (a) => {
		return handleScdmComputationStarted(a, options);
	});
}

function* handleMergeChangelog(
	action: Action<RelationshipEngineActions.Commands.MergeChangelogPayload>
): SagaGenerator<void> {
	const { activityId } = action.payload;
	yield* put(RelationshipEngineActions.Events.scdmComputation.started({ activityId }));
}

function* handleSetDataHolders(
	action: Action<RelationshipEngineActions.Commands.SetDataHoldersPayload>
): SagaGenerator<void> {
	if (hasDocumentGraphDataUpdate(action.payload)) {
		yield* put(RelationshipEngineActions.Events.scdmComputation.started({ activityId: action.payload.activityId }));
	}
}

function* handleScdmComputationStarted(
	action: Action<RelationshipEngineActions.Events.ScdmComputation.Param>,
	options?: RelationshipEngineMiddlewareOptions
): SagaGenerator<void> {
	const { activityId } = action.payload;
	const isCdm: boolean = yield* select(REModelSelectors.isCdmActivity(activityId));

	if (!isCdm) {
		logger.error(`Error during SCDM computation for activity ${activityId}, not a CDM activity`);
		yield* put(
			RelationshipEngineActions.Events.scdmComputation.failed({
				params: { activityId },
				error: new Error(`SCDM computation requested for non-CDM activity: ${activityId}`)
			})
		);

		return;
	}

	yield* call(runScdmComputation, activityId, options);
}

function hasDocumentGraphDataUpdate(payload: RelationshipEngineActions.Commands.SetDataHoldersPayload): boolean {
	return payload.dataHolders.some((update) => isDocumentGraphUpdate(update) && update.data !== undefined);
}

type Messages = ReadonlyObjectMap<EngineStore.Validation.Entry>;
const EMPTY_MESSAGES: Messages = {} as Messages;

function isDocumentGraphUpdate(update: RelationshipEngineActions.Commands.UpdatedDataHolder): boolean {
	return update.descriptor.feature === "relationship" && update.descriptor.type === "document_graph";
}

/** SCDM computation */

function* runScdmComputation(activityId: string, options?: RelationshipEngineMiddlewareOptions): SagaGenerator<void> {
	try {
		const activity = yield* select(ActivitySelectors.activityById(activityId));

		if (!activity) {
			logger.error(`Error during SCDM computation for activity ${activityId}: Activity not found`);
			yield* put(
				RelationshipEngineActions.Events.scdmComputation.failed({
					params: { activityId },
					error: new Error(`Activity not found: ${activityId}`)
				})
			);

			return;
		}

		const defaultDataHolder = Activity.findDefaultDataHolder(activity);

		if (!defaultDataHolder || defaultDataHolder.loadingState === "loading") {
			logger.error(`Error during SCDM computation for activity ${activityId}: Default data holder not ready`);
			yield* put(
				RelationshipEngineActions.Events.scdmComputation.failed({
					params: { activityId },
					error: new Error(`Default data holder not ready for activity: ${activityId}`)
				})
			);

			return;
		}

		const documentGraphDataHolder = activity.dataHolders?.find(
			RelationshipEngineDataHolder.DocumentGraphDataHolder.isInstance
		);

		if (
			!documentGraphDataHolder ||
			documentGraphDataHolder.loadingState !== "loaded" ||
			!documentGraphDataHolder.slices.rootDocRef
		) {
			logger.error(`Error during SCDM computation for activity ${activityId}: Document graph data holder not ready`);
			yield* put(
				RelationshipEngineActions.Events.scdmComputation.failed({
					params: { activityId },
					error: new Error(`Document graph data holder not ready for activity: ${activityId}`)
				})
			);

			return;
		}

		const cdmModel = yield* select(
			ModelSelectors.modelByName(documentGraphDataHolder.slices.cdmName, Model.isDocumentModel)
		);

		if (!cdmModel) {
			logger.error(`Error during SCDM computation for activity ${activityId}: CDM model not found`);
			yield* put(
				RelationshipEngineActions.Events.scdmComputation.failed({
					params: { activityId },
					error: new Error(`CDM model not found for activity: ${activityId}`)
				})
			);

			return;
		}

		const engineState = yield* select(FormEngineSelectors.engineState(activityId));

		const validatorProvider = engineState?.models?.validatorProvider;
		const formModel = engineState?.models?.formModel;
		const documentModel = engineState?.models?.documentModel;

		if (!validatorProvider || !formModel || !documentModel) {
			logger.error(`Error during SCDM computation for activity ${activityId}: models state not available`);
			yield* put(
				RelationshipEngineActions.Events.scdmComputation.failed({
					params: { activityId },
					error: new Error(`Engine models not available for activity: ${activityId}`)
				})
			);

			return;
		}

		const inputMessages = engineState ? UiStateSelectors.messages()(engineState) : EMPTY_MESSAGES;

		const documentGraph = documentGraphDataHolder.data;
		const documentGraphWithoutCddRoot = {
			...documentGraph,
			documents: {
				byDocRef: {
					...documentGraph.documents.byDocRef,
					[DocumentGraph.ROOT_DOC_REF]: {
						docRef: DocumentGraph.ROOT_DOC_REF,
						document: {},
						documentModelName: "cddDocument",
						loadingState: "loaded"
					} satisfies DocumentGraph.Document
				}
			}
		};
		let updatedDocument = toCdd(
			documentGraphWithoutCddRoot,
			documentGraphDataHolder.slices.rootDocRef,
			cdmModel.content.modelRoot
		) as GroupInstance;

		let computedMessages: Messages = EMPTY_MESSAGES;
		let computedChanges: ReadonlyObjectMap<Change> = {};
		const adaptedModels = {
			formModel: adaptFormModelForCdmDefault(formModel),
			documentModel,
			validatorProvider
		};

		const wasPreProcessed = documentGraphDataHolder.slices.preProcessed ?? false;
		const kernelOptions = engineState ? options?.kernelOptionsProvider?.(engineState) : undefined;

		if (!wasPreProcessed) {
			const computed = preProcessDocument({
				document: updatedDocument,
				models: adaptedModels,
				isNewInstance: isDraftingDocRef(defaultDataHolder.descriptor.instance ?? ""),
				kernelOptions
			});
			updatedDocument = computed.document;
			computedMessages = computed.messages ?? EMPTY_MESSAGES;
			computedChanges = computed.changes;
			yield* put(RelationshipEngineActions.Commands.setPreProcessed({ activityId }));
		} else {
			const computed = computeDocument({
				document: updatedDocument,
				validatorProvider,
				kernelOptions
			});
			updatedDocument = computed.document;
			computedMessages = computed.messages ?? EMPTY_MESSAGES;
			computedChanges = computed.changes;
		}

		const isFullPass = !wasPreProcessed;
		const changeEntries = Object.values(computedChanges ?? {}).filter(
			(change): change is Change => change !== undefined
		);

		const resolvedEntries: [ValueChanged, DocumentGraphSelectors.DocumentResult][] = [];

		for (const change of changeEntries) {
			if (!Change.isValueChanged(change)) {
				continue;
			}

			const docRefResult = yield* select(DocumentGraphSelectors.docRef(activityId, change.path));

			if (docRefResult) {
				resolvedEntries.push([change, docRefResult]);
			}
		}

		const computedChangeEntries = buildComputedChanges(resolvedEntries, updatedDocument, isFullPass, documentModel);

		if (computedChangeEntries.length === 1) {
			yield* put(
				RelationshipEngineActions.Commands.addChangeLog({
					activityId,
					change: computedChangeEntries[0]
				})
			);
		} else if (computedChangeEntries.length > 0) {
			yield* put(
				RelationshipEngineActions.Commands.addChangeLogs({
					activityId,
					changes: computedChangeEntries
				})
			);
		}

		const updatedMessages = updateMessages(inputMessages, computedChanges, computedMessages);

		if (!deepEqual(inputMessages, updatedMessages)) {
			yield* put(FormEngineCommands.setMessageState({ messages: updatedMessages }));
		}

		yield* put(RelationshipEngineActions.Events.scdmComputation.done({ params: { activityId }, result: {} }));
	} catch (error) {
		logger.error(`Error during SCDM computation for activity ${activityId}:`, error);
		yield* put(
			RelationshipEngineActions.Events.scdmComputation.failed({
				params: { activityId },
				error: error instanceof Error ? error : new Error(String(error))
			})
		);
	}
}

function buildComputedChanges(
	resolvedEntries: [ValueChanged, DocumentGraphSelectors.DocumentResult][],
	updatedDocument: GroupInstance,
	isFullPass: boolean,
	documentModel: DocumentModel
): Changelog.Change[] {
	if (resolvedEntries.length === 0) {
		return [];
	}

	const nonRootChanges: Changelog.DocChanged[] = [];
	const rootDocPatches: Array<{ path: EntityInstancePath; value: FieldInstanceValue }> = [];
	let rootDocumentModelName: string | undefined;

	for (const [change, docRefResult] of resolvedEntries) {
		const rawValue = DOCUMENT_SERVICE.getAssignedObject(updatedDocument, change.path);
		const value = rawValue as FieldInstanceValue;

		if (docRefResult.docRef === DocumentGraph.ROOT_DOC_REF) {
			rootDocPatches.push({ path: DocumentPath.fromString(docRefResult.targetInstancePath), value });
			rootDocumentModelName ??= documentModel.header.id;
		} else {
			nonRootChanges.push({
				kind: "docChanged",
				docRef: docRefResult.docRef,
				documentModelName: docRefResult.documentModelName,
				path: DocumentPath.fromString(docRefResult.targetInstancePath),
				value
			});
		}
	}

	const result: Changelog.Change[] = [...nonRootChanges];

	if (rootDocPatches.length > 0 && rootDocumentModelName) {
		const currentRootDocument = {};
		result.push(
			buildDocumentFromChangelogs(rootDocPatches, currentRootDocument, isFullPass, documentModel, rootDocumentModelName)
		);
	}

	return result;
}

function buildDocumentFromChangelogs(
	rootDocPatches: ReadonlyArray<{ readonly path: EntityInstancePath; readonly value: FieldInstanceValue }>,
	currentRootDocument: object | undefined,
	isFullPass: boolean,
	documentModel: DocumentModel,
	documentModelName: string
): Changelog.CdmRootComputed {
	const initialDocument: object = isFullPass ? {} : (currentRootDocument ?? {});

	const document = rootDocPatches.reduce<object>((accumulator, { path, value }) => {
		return DocumentUtils.setField(accumulator, path, value, documentModel);
	}, initialDocument);

	return { kind: "cdmRootComputed", document, documentModelName };
}

function updateMessages(originalMsgs: Messages, changes: ReadonlyObjectMap<Change>, newMsgs: Messages): Messages {
	const changedFields = Object.keys(changes ?? {});

	if (changedFields.length === 0 && Object.keys(newMsgs).length === 0) {
		return originalMsgs;
	}

	const filteredMsgs: Messages = Object.fromEntries(
		Object.entries(originalMsgs).filter(([key, entry]) => entry && !changedFields.includes(key)) as [
			string,
			EngineStore.Validation.Entry
		][]
	);

	return { ...filteredMsgs, ...newMsgs };
}

function adaptFormModelForCdmDefault(formModel: FormModel): FormModel {
	return {
		...formModel,
		content: {
			...formModel.content,
			openExistingDocumentPreProcessing: formModel.content.openExistingDocumentPreProcessing ?? "COMPUTATIONS"
		}
	};
}

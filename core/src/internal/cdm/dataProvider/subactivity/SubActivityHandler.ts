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
 * @module cdm/data-provider
 * @experimental
 */

import { call, put, type SagaGenerator, select } from "typed-redux-saga";

import { type Activity, type DataProvider, Model, ModelSelectors } from "@com.mgmtp.a12.client/client-core";
import { type ModelGraph } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { type FormModel } from "@com.mgmtp.a12.formengine/formengine-core";
import { type DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/index.js";
import { THUMBNAIL_SLICE } from "@com.mgmtp.a12.client/client-core/lib/core/activity/a12-internal/thumbnails/slice.js";

import { assertCondition, assertObject } from "../../../shared/assertion.js";
import {
	type Change,
	type DeepReadonly,
	type DgChangeLog,
	type DgDocument,
	type DocumentGraph
} from "../../../documentGraph/core/index.js";
import { applyChanges } from "../../../documentGraph/core/changeLog/changeLogImpl.js";
import { DgReducers } from "../../../documentGraph/redux/index.js";
import { CddActions, CddSelectors } from "../../cdd/redux/index.js";
import { isScdmDataHolder, isScdmDataHolderShape } from "../../cdd/redux/dhReducersImpl.js";
import { type CdmData } from "../../cddUtils/cdmData.js";
import { createInitialDgCl } from "../../cddUtils/createInitialDgCl.js";
import { filterCdmDataByRelevance } from "../../cddUtils/notRelevant/filterCdmDataByRelevance.js";
import { CDD_DOC_REF } from "../../cdmCommons/cddTechnical.js";
import { queryRootName } from "../../commons/modelUtils.js";
import { type RequestSelectorMap } from "../../../server-connectors/request-selector-map.js";

import { type CddDataHandler, type LoadType, type Models } from "../CddDataHandler.js";
import { load } from "../StandaloneActivityHandler.js";

/**
 * @internal
 *
 * Handles all load and save operations on CDM sub activities.
 *
 * There is no "create" functionality on sub activities since they are already
 * created with the DG and CL from their parent activity. That is why they only
 * need to be initialized with a CDD after creation.
 *
 * The loading is identical to standalone CDM activities.
 *
 * On save, all relevant data (DG and CL) is copied back into the parent CDM
 * activity.
 */
export class SubActivityHandler implements CddDataHandler {
	constructor(
		private readonly activity: Activity,
		private readonly initiatingActivity: Activity,
		private readonly modelsPromise: Promise<Models>,
		private readonly requestSelectorMap: RequestSelectorMap
	) {}

	*load(loadType: LoadType): SagaGenerator<void> {
		if ("create" === loadType) {
			yield* call(initializeCdd, this.activity, yield* call(() => this.modelsPromise));
		} else {
			yield* call(load, this.activity, this.modelsPromise, this.requestSelectorMap);
		}
	}

	*save(config: DataProvider.SaveConfig): SagaGenerator<void> {
		yield* saveToParent(config, this.initiatingActivity);
	}
}

/*
 * Initializes the default data holder of a CDM sub activity with a CDD.
 *
 * If the document model of the sub activity is not a CDM, but a "traditional"
 * document model, we still add a CDD slice in order to reuse all change
 * handling capabilities for CDDs:
 * - mapping of form engine events to CDD actions
 * - CDD action processing that updates the DG and CL
 * - form engine CDD state adapter
 *
 * Note: This is only a temporary solution until the Form Engine
 * (& client adapter) is migrated to work on DG-based activity data as well.
 * When this is done below solution should be replaced with the new approach.
 */
function* initializeCdd(activity: Activity, models: Models): SagaGenerator<void> {
	const { documentGraph: existingDocumentGraph, changeLog: existingChangeLog } = DgReducers.getDgAndClData(activity);
	const { documentModel, formModel } = models;

	const rootDocRef = activity.descriptor.instance;
	assertObject(rootDocRef);

	const rootDocumentModelName = activity.descriptor.model;
	assertObject(rootDocumentModelName, "Cannot create form activity without a model");

	const modelGraph = yield* select(ModelSelectors.modelGraph());
	const modelsInScene = yield* select(ModelSelectors.allModelsInScene(activity.id));
	const documentModelsInScene = modelsInScene.filter(Model.isDocumentModel);

	const wasEditedBefore = yield* call(wasSubActivityEditedBefore, rootDocRef, existingChangeLog);

	const selectedLinkId = activity.descriptor.selectedLinkId;

	const { documentGraph, changeLog } = yield* call(
		prepareDgCl,
		documentModel,
		formModel,
		rootDocumentModelName,
		rootDocRef,
		existingDocumentGraph,
		existingChangeLog,
		documentModelsInScene,
		modelGraph,
		wasEditedBefore
	);

	const queryRoot = yield* call(queryRootName, documentModel);
	if (queryRoot) {
		yield* put(
			CddActions.merge({
				cdm: documentModel,
				path: "",
				documentGraph,
				changeLog,
				rootDoc: rootDocRef,
				activityId: activity.id,
				selectedLinkId
			})
		);
	} else {
		const dgDocument = documentGraph.documents.byDocRef[rootDocRef];
		assertCondition(dgDocument.loadingState === "loaded");

		yield* put(
			CddActions.setSubActivityData({
				activityId: activity.id,
				documentGraph,
				changeLog,
				cdm: documentModel,
				rootDoc: rootDocRef,
				selectedLinkId
			})
		);
	}
}

function* saveToParent(config: DataProvider.SaveConfig, initiatingActivity: Activity): SagaGenerator<void> {
	const { dataHolders, details, activityId } = config;

	const scdmDataHolder = dataHolders.find(isScdmDataHolder);
	assertObject(scdmDataHolder, "Cannot save without a data holder that contains the cdd.");
	assertCondition(isScdmDataHolderShape(scdmDataHolder.data));

	const initiatingScdmDataHolder = initiatingActivity.dataHolders?.find(isScdmDataHolder);
	assertObject(initiatingScdmDataHolder, "Cannot save to non-scdm initiating activity.");
	assertCondition(isScdmDataHolderShape(initiatingScdmDataHolder.data));

	const initiatingCdm = initiatingScdmDataHolder.data.cddState.cdm;
	const documentGraph = yield* call(replaceCddDocument, scdmDataHolder.data.documentGraph, initiatingCdm);

	const documentModels = (yield* select(ModelSelectors.allModelsInScene(activityId))).filter(Model.isDocumentModel);
	const modelGraph = yield* select(ModelSelectors.modelGraph());
	const modelTuple = yield* select(CddSelectors.selectModelTuple, activityId);
	assertObject(modelTuple, "Expected a form and document model for the cdm child activity.");

	const cdmData: CdmData = {
		...scdmDataHolder.data,
		documentGraph: documentGraph
	};
	const filteredCdmData = filterCdmDataByRelevance(cdmData, modelTuple, documentModels, modelGraph);

	yield* put(
		CddActions.saveSubActivity({
			activityId: initiatingActivity.id,
			documentGraph: filteredCdmData.documentGraph,
			changeLog: filteredCdmData.changeLog,
			setDirty: true,
			thumbnailSlice: scdmDataHolder.slices[THUMBNAIL_SLICE]
		})
	);

	yield* put(details.saving.done({}));
}

/**
 * only exported for testing
 * @internal
 */
export function wasSubActivityEditedBefore(rootDocRef: string, changeLog: DgChangeLog): boolean {
	return isRootDocumentPersisted(rootDocRef) || subActivityDgInitialized(changeLog, rootDocRef);
}

function isRootDocumentPersisted(rootDocRef: string): boolean {
	return rootDocRef.includes("/");
}

function subActivityDgInitialized(changeLog: DgChangeLog, rootDocRef: string): boolean {
	return changeLog.changes.some((change) => change.kind === "marker" && change.id === rootDocRef);
}

function* prepareDgCl(
	cdm: DocumentModel,
	formModel: FormModel,
	rootDocumentModelName: string,
	rootDocRef: string,
	existingDocumentGraph: DeepReadonly<DocumentGraph>,
	existingChangeLog: DgChangeLog,
	documentModelsInScene: DocumentModel[],
	modelGraph: ModelGraph,
	wasEditedBefore: boolean
): SagaGenerator<{ documentGraph: DeepReadonly<DocumentGraph>; changeLog: DgChangeLog }> {
	const { documentGraph, changeLog: initialChangeLog } = wasEditedBefore
		? {
				documentGraph: yield* call(replaceCddDocument, existingDocumentGraph, cdm),
				changeLog: existingChangeLog
			}
		: yield* call(createInitialDgCl, {
				cdm,
				formModel,
				rootDocumentModelName,
				documentModelsInScene,
				modelGraph,
				rootDocRef,
				mergeParams: {
					existingDocumentGraph,
					existingChangeLog
				}
			});

	const changeLog = wasEditedBefore
		? initialChangeLog
		: yield* call(setMarkerAfterInitialization, initialChangeLog, rootDocRef, documentGraph);

	return { documentGraph, changeLog };
}

/**
 * only exported for testing
 * @internal
 */
export function setMarkerAfterInitialization(
	changeLog: DgChangeLog,
	docRef: string,
	documentGraph: DeepReadonly<DocumentGraph>
): DgChangeLog {
	const enterSubActivityChange: Change<DeepReadonly<DocumentGraph>>[] = [
		{
			kind: "marker",
			id: docRef,
			snapshot: documentGraph
		}
	];

	return applyChanges(changeLog, enterSubActivityChange);
}

/**
 * Replaces the cddDocument in the dg with an empty new one for the given cdm
 *
 * only exported for testing
 * @internal
 */
export function replaceCddDocument(dg: DeepReadonly<DocumentGraph>, cdm: DocumentModel): DeepReadonly<DocumentGraph> {
	const newCddDocument: DgDocument = {
		docRef: CDD_DOC_REF,
		document: {},
		documentModelName: cdm.header.id,
		loadingState: "loaded"
	};

	return {
		...dg,
		documents: {
			...dg.documents,
			byDocRef: {
				...dg.documents.byDocRef,
				[CDD_DOC_REF]: newCddDocument
			}
		}
	};
}

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

import { type Action } from "redux-saga";
import { call, put, type SagaGenerator, select } from "typed-redux-saga";

import { type Model as ModelAPI } from "@com.mgmtp.a12.base/base-model-api/lib/main/model/index.js";
import {
	Activity,
	ActivityActions,
	ActivitySelectors,
	NEW_INSTANCE_IDENTIFIER,
	type DataProvider,
	LocaleSelectors,
	Model,
	ModelSelectors
} from "@com.mgmtp.a12.client/client-core";
import {
	Dispatcher,
	AddDocumentJsonRpc2Response,
	type DocumentJsonRpc2Request,
	type JsonRpc2Request,
	type JsonRpc2Response
} from "@com.mgmtp.a12.dataservices/dataservices-access";
import { setThumbnails } from "@com.mgmtp.a12.client/client-core/lib/core/activity/a12-internal/thumbnails/action.js";
import { convertThumbnailResponse } from "@com.mgmtp.a12.client/client-core/lib/core/activity/a12-internal/thumbnails/slice.js";

import { assertObject } from "../../shared/assertion.js";
import { type RequestSelectorMap } from "../../server-connectors/request-selector-map.js";
import { RelationshipDataProviderSelectors } from "../../relationship/platform/relationshipDataProvider/selectors.js";
import { wrapIfServerError } from "../../relationship/platform/relationshipDataProvider/server/wrapIfServerError.js";

import { type DocumentGraphReferences, fromCdd } from "../cdd/core/adapter/fromCdd.js";
import { type DocumentWithMutationMetadata } from "../cdd/core/effectiveChanges/documentsWithMetaData.js";
import { type LinkWithMutationMetadataAndTime } from "../cdd/core/effectiveChanges/linksWithMetaData.js";
import { type EffectiveChangeList } from "../cdd/core/effectiveChanges/toEffectiveChanges.js";
import { CddActions, CddSelectors } from "../cdd/redux/index.js";
import { isScdmDataHolder, type ScdmDataHolderShape } from "../cdd/redux/dhReducersImpl.js";
import { createInitialDgCl } from "../cddUtils/createInitialDgCl.js";

import { type CddDataHandler, type LoadType, type Models } from "./CddDataHandler.js";
import { convertMutations, type ModelTypeGuard } from "./convertMutations.js";
import { convertToInternalRepresentation } from "./convertToInternalRepresentation.js";
import { type CDDQuery, loadDG } from "./loadDG.js";

/**
 * @internal
 *
 * Handles all load and save operations on standalone CDM activities.
 * I.e. activities that are based on a CDM and not a sub activity of another CDM
 * activity.
 */
export class StandaloneActivityHandler implements CddDataHandler {
	constructor(
		private readonly activity: Activity,
		private readonly modelsPromise: Promise<Models>,
		private readonly requestSelectorMap: RequestSelectorMap
	) {}

	*load(loadType: LoadType): SagaGenerator<void> {
		if ("create" === loadType) {
			yield* create(this.activity, yield* call(() => this.modelsPromise));
		} else {
			yield* load(this.activity, this.modelsPromise, this.requestSelectorMap);
		}
	}

	*save(config: DataProvider.SaveConfig): SagaGenerator<void> {
		yield* save(config, this.requestSelectorMap);
	}
}

/**
 * Creates a new cdd for the given activity by initializing a new DG and adding
 * a new & empty document to it.
 */
function* create(activity: Activity, models: Models): SagaGenerator<void> {
	const { documentModel, formModel } = models;
	const rootDocumentModelName = activity.descriptor.model;
	assertObject(rootDocumentModelName, "Cannot create from activity without a model");

	const modelGraph = yield* select(ModelSelectors.modelGraph());
	const modelsInScene = yield* select(ModelSelectors.allModelsInScene(activity.id));
	const documentModelsInScene = modelsInScene.filter(Model.isDocumentModel);

	const { documentGraph, changeLog } = yield* call(createInitialDgCl, {
		cdm: documentModel,
		formModel,
		rootDocumentModelName,
		documentModelsInScene,
		modelGraph,
		selectedLinkId: activity.descriptor.selectedLinkId
	});

	const rootDoc = NEW_INSTANCE_IDENTIFIER;

	yield* put(
		CddActions.merge({
			cdm: documentModel,
			path: "",
			documentGraph,
			changeLog,
			rootDoc,
			activityId: activity.id
		})
	);
}

/**
 * @internal
 *
 * (Re-)Loads all parts of the CDD that are denoted as missing by the pending
 * usages property of the CDD. For newly created CDM activities, the whole tree
 * of documents and links will be loaded.
 */
export function* load(
	activity: Activity,
	modelsPromise: Promise<Models>,
	requestSelectorMap: RequestSelectorMap
): SagaGenerator<void> {
	const missingPaths = yield* select(CddSelectors.missingPathSelector(activity.id));
	if (missingPaths.length === 0) {
		throw new Error(`Nothing to be loaded, since there is no missing path.`);
	}

	// wait for model loading to finish
	const { documentModel } = yield* call(() => modelsPromise);
	const cdmName = documentModel.header.id;

	for (const missingPath of missingPaths) {
		const cdmQuery: CDDQuery = { cdmName, queryRoot: missingPath, activityId: activity.id };

		const { documents, links, thumbnailResponse } = yield* call(loadDG, cdmQuery, requestSelectorMap);

		if (thumbnailResponse) {
			yield* put(
				setThumbnails({
					activityId: activity.id,
					thumbnails: convertThumbnailResponse(thumbnailResponse)
				})
			);
		}

		const documentGraph = yield* call(convertToInternalRepresentation, cdmName, documents, links);

		yield* put(
			CddActions.merge({
				cdm: documentModel,
				documentGraph,
				path: missingPath.path,
				rootDoc: missingPath.docRef,
				activityId: activity.id
			})
		);
	}
}

function* save(config: DataProvider.SaveConfig, requestSelectorMap: RequestSelectorMap): SagaGenerator<void> {
	const { activityId, dataHolders, details } = config;
	const activity = yield* select(ActivitySelectors.activityById(activityId));
	assertObject(activity, "Cannot save without any activity that holds data.");

	const scdmDataHolder = dataHolders.find(isScdmDataHolder);
	assertObject(scdmDataHolder, "Cannot save without a data holder that contains the cdd.");

	const effectiveChangeList = yield* select(CddSelectors.effectiveChanges(activityId));

	const filteredChanges = applyCddFilter(scdmDataHolder, effectiveChangeList);
	yield* call(persistChanges, activityId, filteredChanges, details.saving, requestSelectorMap);
}

function applyCddFilter(
	dataHolder: ScdmDataHolderShape,
	effectiveChangeList: EffectiveChangeList
): EffectiveChangeList {
	assertObject(dataHolder.data);
	const cddReferences = fromCdd(dataHolder.data.cddState);
	return toCddChanges(effectiveChangeList, cddReferences);
}

/**
 * @internal
 * note: only exported for testing
 *
 * based on the given change list and the content of the cdd (docRefs, linkIds)
 * keep
 * - all changes that remove a link or document
 * - all changes that refer to links or documents in the cdd
 */
export function toCddChanges(
	effectiveChangeList: EffectiveChangeList,
	cddReferences: DocumentGraphReferences
): EffectiveChangeList {
	const documents = effectiveChangeList.documents.filter(
		(doc) => isSubDocumentOfCdd(doc) || doc.mutation === "removed"
	);

	const links = effectiveChangeList.links.filter(
		(linkMutation) => isLinkInCdd(linkMutation) || linkMutation.mutationState === "removed"
	);

	return {
		documents,
		links
	};

	function isSubDocumentOfCdd(doc: DocumentWithMutationMetadata): unknown {
		return cddReferences.docRefs.some((docRef) => doc.document.docRef === docRef);
	}

	function isLinkInCdd(linkMutation: LinkWithMutationMetadataAndTime): unknown {
		return cddReferences.linkIds.some((linkId) => linkId === linkMutation.link.linkRef.id);
	}
}

function* persistChanges(
	activityId: string,
	changeList: EffectiveChangeList,
	saving: DataProvider.SaveDataActionPayload["saving"],
	requestSelectorMap: RequestSelectorMap
): SagaGenerator<void> {
	const state = yield* select();
	const modelGraph = yield* select(ModelSelectors.modelGraph());

	const modelProvider = <T extends ModelAPI = ModelAPI>(id: string, typeGuard: ModelTypeGuard<T>) => {
		return ModelSelectors.modelByName<T>(id, typeGuard)(state);
	};
	const linkDocumentModelProvider = (relationshipModelName: string) => {
		return RelationshipDataProviderSelectors.selectLinkDocumentModel(state, relationshipModelName);
	};

	try {
		const requests = convertMutations(
			changeList,
			modelGraph,
			modelProvider,
			linkDocumentModelProvider,
			activityId,
			state,
			requestSelectorMap
		);
		if (requests.length === 0) {
			// nothing to do - terminate early
			yield* put(saving.done({}));
			return;
		}

		const { language } = LocaleSelectors.locale()(state);
		const responses = yield* call(() => Dispatcher.rpc(language, requests));

		const activity = yield* select(ActivitySelectors.activityById(activityId));
		const defaultDH = Activity.findDefaultDataHolder(activity);

		const configToHandleNewRoot = getInstanceAndUpdatedActionForNewRootDocRef(
			defaultDH,
			requests,
			responses,
			activityId
		);

		// we need to store the relatedActivityId before we do the activity's commit
		const datasourceActivityId = defaultDH?.datasourceActivityId;
		const relatedActivityId = datasourceActivityId || activity?.initiatingActivityId;
		yield* put(saving.done({ instance: configToHandleNewRoot?.instance }));

		if (configToHandleNewRoot?.mergeAction) {
			const activity = yield* select(ActivitySelectors.activityById(activityId));
			if (activity) {
				yield* put(configToHandleNewRoot.mergeAction);
			}
		}
		if (relatedActivityId) {
			yield* put(ActivityActions.reloadData({ activityId: relatedActivityId }));
		}
	} catch (error) {
		const activityError = yield* call(wrapIfServerError, error);
		yield* put(saving.failed(activityError as {}));
	}
}

/*
 * Determines whether this cdm activity is based on a newly created root document.
 * If so, retrieves the new document ID from the server responses and updates the cddState with it.
 */
function getInstanceAndUpdatedActionForNewRootDocRef(
	defaultDH: Activity.DataHolder<{}> | undefined,
	requests: JsonRpc2Request[],
	responses: JsonRpc2Response[],
	activityId: string
): { mergeAction: Action; instance: string } | undefined {
	if (defaultDH?.data && isScdmDataHolder(defaultDH)) {
		const { cddState, documentGraph, changeLog } = defaultDH.data;

		if (cddState.rootDocRef === NEW_INSTANCE_IDENTIFIER) {
			const rootDoc = documentGraph.documents.byDocRef[cddState.rootDocRef];
			if (rootDoc.loadingState === "loaded") {
				const rootDocModel = rootDoc.documentModelName;
				const rootDocRequest = requests.find(
					(req) =>
						req.method === "ADD_DOCUMENT" &&
						(req as DocumentJsonRpc2Request.AddJsonRpc2Request).params.documentModelName === rootDocModel
				);

				if (rootDocRequest) {
					const rootDocResponse = responses.find((resp) => resp.id === rootDocRequest.id);
					if (rootDocResponse && AddDocumentJsonRpc2Response.isInstance(rootDocResponse)) {
						return {
							mergeAction: CddActions.merge({
								activityId,
								cdm: cddState.cdm,
								documentGraph,
								path: "",
								rootDoc: rootDocResponse.result.docRef,
								changeLog
							}),
							instance: rootDocResponse.result.docRef
						};
					}
				}
			}
		}
	}
	return undefined;
}

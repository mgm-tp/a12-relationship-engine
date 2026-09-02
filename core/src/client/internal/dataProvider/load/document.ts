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

import { call, select, type SagaGenerator } from "typed-redux-saga";

import { LocaleSelectors } from "@com.mgmtp.a12.client/client-core";
import type { DataProvider } from "@com.mgmtp.a12.client/client-core";
import { Dispatcher } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { type Activity, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import { convertThumbnailResponse } from "@com.mgmtp.a12.client/client-core/a12internal";
import { Model, ModelSelectors as ClientModelSelectors } from "@com.mgmtp.a12.client/client-core";

import { RequestBuilder } from "../../requestBuilder.js";
import { toDocumentGraph } from "../../toDocumentGraph.js";
import { DocumentProcessors } from "../../documentProcessor.js";
import type { RelationshipEngineActions } from "../../../../store/index.js";
import type { RelationshipEngineDataHolder } from "../../../../store/index.js";
import { toCdd, ModelSelectors, ChangelogSelectors } from "../../../../store/index.js";
import { DocumentGraph, type Changelog, isDraftingDocRef } from "../../../../store/index.js";
import {
	type RequestSelectorMap as RERequestSelectorMap,
	DefaultRequestSelectorMap as REDefaultRequestSelectorMap
} from "../../requestSelectorMap.js";

import { resolveSeedFromParent, resolveSeedChangesFromParent } from "./resolveSeedFromParent.js";

type QueryRequest = ReturnType<typeof RequestBuilder.query>;
type ThumbnailResponse = Parameters<typeof convertThumbnailResponse>[0];
type DocumentGraphProjection = Parameters<typeof toDocumentGraph>[1];

/**
 * Result of a document load operation — updates to apply and thumbnails collected from the server.
 * @internal
 */
export interface DocumentLoadResult {
	readonly updates: RelationshipEngineActions.Commands.UpdatedDataHolder[];
	readonly thumbnails: Record<string, string>;
}

export function* loadDocument(
	params: DataProvider.ProvideDataConfig,
	defaultDataHolder: Activity.DataHolder,
	requestSelectorMap: RERequestSelectorMap = REDefaultRequestSelectorMap
): SagaGenerator<DocumentLoadResult> {
	const docRef = ensureDescriptorValue(
		defaultDataHolder.descriptor.instance,
		"Default data holder requires an instance docRef"
	);
	const modelName = ensureDescriptorValue(
		defaultDataHolder.descriptor.model,
		"Default data holder requires a model name"
	);
	const documentModel = yield* select(ClientModelSelectors.modelByName(modelName, Model.isDocumentModel));

	if (!documentModel) {
		throw new Error(`Document model ${modelName} not found.`);
	}

	const initializedChangelog = yield* select(ChangelogSelectors.changelog(params.activityId));
	const seedChanges = yield* resolveSeedChangesFromParent(
		params.activityId,
		docRef,
		defaultDataHolder.descriptor.selectedLinkId
	);

	if (isDraftingDocRef(docRef)) {
		return {
			updates: [
				createDefaultDataHolderUpdate(defaultDataHolder, {
					...DocumentProcessors.postLoad({}, documentModel),
					id: docRef,
					modelId: modelName
				}),
				...(seedChanges ? [createChangelogDataHolder(initializedChangelog?.changes, seedChanges)] : [])
			],
			thumbnails: {}
		};
	}

	const request = yield* select(
		requestSelectorMap.queryDocument({
			activityId: params.activityId,
			id: "document",
			targetDocumentModel: modelName,
			constraint: { operator: "exact_match", field: "/__meta/docRef", value: docRef }
		})
	);
	const { documentResponse, thumbnailResponse } = yield* fetchDocumentArtifacts(request);
	const entry = pickFirstEntry(documentResponse, docRef, modelName);

	return {
		updates: [
			createDefaultDataHolderUpdate(defaultDataHolder, {
				...DocumentProcessors.postLoad(entry.document, documentModel),
				id: docRef,
				modelId: modelName
			}),
			...(seedChanges ? [createChangelogDataHolder(initializedChangelog?.changes, seedChanges)] : [])
		],
		thumbnails: convertThumbnailResponse(thumbnailResponse)
	};
}

export function* loadDocumentGraph(
	params: DataProvider.ProvideDataConfig,
	defaultDataHolder: Activity.DataHolder,
	requestSelectorMap: RERequestSelectorMap = REDefaultRequestSelectorMap
): SagaGenerator<DocumentLoadResult> {
	const docRef = ensureDescriptorValue(
		defaultDataHolder.descriptor.instance,
		"Default data holder requires an instance docRef"
	);
	const cdmName = (yield* select(ModelSelectors.rootDocumentModel(params.activityId)))?.documentModel.header.id;

	if (!cdmName) {
		throw new Error(`Default data holder does not have a CDM descriptor.`);
	}

	const initializedChangelog = yield* select(ChangelogSelectors.changelog(params.activityId));

	const seed = yield* resolveSeedFromParent(
		params.activityId,
		docRef,
		cdmName,
		defaultDataHolder.descriptor.selectedLinkId
	);

	if (seed?.documentGraph) {
		const cdmModel = yield* select(ClientModelSelectors.modelByName(cdmName, Model.isDocumentModel));

		if (!cdmModel) {
			throw new Error(`CDM model ${cdmName} not found.`);
		}

		const documentGraph = seed.documentGraph;

		return {
			updates: [
				createDefaultDataHolderUpdate(defaultDataHolder, toCdd(documentGraph, docRef, cdmModel.content.modelRoot)),
				createDocumentGraphDataHolder(docRef, cdmName, documentGraph),
				createChangelogDataHolder(initializedChangelog?.changes, seed.changes)
			],
			thumbnails: {}
		};
	}

	if (isDraftingDocRef(docRef)) {
		const cdmModel = yield* select(ClientModelSelectors.modelByName(cdmName, Model.isDocumentModel));

		if (!cdmModel) {
			throw new Error(`CDM model ${cdmName} not found.`);
		}

		const activityRootModel = yield* select(
			ActivitySelectors.activityPropById(params.activityId, (activity) => activity?.descriptor.model)
		);
		const rootDocumentModelName = activityRootModel ?? defaultDataHolder.descriptor.model;

		if (!rootDocumentModelName) {
			throw new Error(`Root document model not found for activity ${params.activityId}.`);
		}

		const documentGraph = createEmptyDocumentGraph(cdmName, rootDocumentModelName, docRef);

		return {
			updates: [
				createDefaultDataHolderUpdate(defaultDataHolder, toCdd(documentGraph, docRef, cdmModel.content.modelRoot)),
				createDocumentGraphDataHolder(docRef, cdmName, documentGraph)
			],
			thumbnails: {}
		};
	}

	const request = yield* select(
		requestSelectorMap.queryDocumentGraph({
			activityId: params.activityId,
			id: "document",
			targetDocumentModel: cdmName,
			paging: { pageNumber: 0, pageSize: 1 },
			constraint: { operator: "exact_match", field: "/__meta/docRef", value: docRef }
		})
	);
	const { documentResponse, thumbnailResponse } = yield* fetchDocumentArtifacts(request);
	const cdmModel = yield* select(ClientModelSelectors.modelByName(cdmName, Model.isDocumentModel));

	if (!cdmModel) {
		throw new Error(`CDM model ${cdmName} not found.`);
	}

	const documentGraph = yield* resolveDocumentGraph({
		activityId: params.activityId,
		cdmName,
		documentResponse: documentResponse as DocumentGraphProjection
	});

	return {
		updates: [
			createDefaultDataHolderUpdate(defaultDataHolder, toCdd(documentGraph, docRef, cdmModel.content.modelRoot)),
			createDocumentGraphDataHolder(docRef, cdmName, documentGraph)
		],
		thumbnails: convertThumbnailResponse(thumbnailResponse)
	};
}

function ensureDescriptorValue<T>(value: T | undefined, message: string): T {
	if (value === undefined || value === null || value === "") {
		throw new Error(message);
	}

	return value;
}

function* fetchDocumentArtifacts(request: QueryRequest): SagaGenerator<{
	documentResponse: unknown;
	thumbnailResponse: ThumbnailResponse;
}> {
	const { language } = yield* select(LocaleSelectors.locale());
	const [documentResponse, thumbnailResponse] = yield* call(() =>
		Dispatcher.rpc(language, [request, RequestBuilder.loadAllThumbnailURLs()])
	);

	return { documentResponse, thumbnailResponse: thumbnailResponse as ThumbnailResponse };
}

function pickFirstEntry(documentResponse: unknown, docRef: string, modelName: string) {
	const entries = (documentResponse as { result?: { entries?: unknown[] } }).result?.entries ?? [];
	const [entry] = entries as Array<{ document: object }>;

	if (!entry) {
		throw new Error(`No document found for docRef ${docRef} and model ${modelName}`);
	}

	return entry;
}

function createEmptyDocumentGraph(cdmName: string, rootDocumentModelName: string, rootDocRef: string): DocumentGraph {
	return {
		documents: {
			byDocRef: {
				[DocumentGraph.ROOT_DOC_REF]: {
					docRef: DocumentGraph.ROOT_DOC_REF,
					document: {},
					documentModelName: cdmName,
					loadingState: "loaded"
				},
				[rootDocRef]: {
					docRef: rootDocRef,
					document: {},
					documentModelName: rootDocumentModelName,
					loadingState: "loaded"
				}
			}
		},
		links: { byId: {}, linkIdsByDocId: {} },
		changelogIndex: 0
	};
}

function createDefaultDataHolderUpdate(
	dataHolder: Activity.DataHolder,
	loadedDocument: object
): RelationshipEngineActions.Commands.UpdatedDataHolder {
	return {
		...dataHolder,
		data: { document: loadedDocument }
	};
}

function createDocumentGraphDataHolder(
	rootDocRef: string,
	cdmName: string,
	documentGraph: DocumentGraph
): RelationshipEngineActions.Commands.UpdatedDataHolder {
	return {
		descriptor: { type: "document_graph", feature: "relationship" },
		loadingState: "loaded",
		data: documentGraph,
		slices: {
			rootDocRef,
			cdmName,
			preProcessed: false
		} satisfies RelationshipEngineDataHolder.DocumentGraphDataHolder.Slices
	};
}

function createChangelogDataHolder(
	initializedChanges: Changelog.Change[] | undefined,
	newChanges: Changelog.Change[]
): RelationshipEngineActions.Commands.UpdatedDataHolder {
	return {
		descriptor: { type: "changelog", feature: "relationship" },
		data: { changes: [...(initializedChanges ?? []), ...newChanges], checkpoints: [] }
	};
}

function* resolveDocumentGraph(params: {
	activityId: string;
	cdmName: string;
	documentResponse: DocumentGraphProjection;
}): SagaGenerator<DocumentGraph> {
	const { cdmName, documentResponse } = params;

	return yield* toDocumentGraph(cdmName, documentResponse);
}

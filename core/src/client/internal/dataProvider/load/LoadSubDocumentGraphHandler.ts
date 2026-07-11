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

import { put, type SagaGenerator } from "typed-redux-saga";

import type { DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import type { Activity, DataProvider } from "@com.mgmtp.a12.client/client-core";
import type { DocumentSpec, QueryJsonRpc2Response } from "@com.mgmtp.a12.dataservices/dataservices-access";

import type { DataProviderHandler } from "../types.js";
import type { Changelog, DocumentGraph } from "../../../../store/index.js";
import { documentsByRef, buildModelProvider, convertToDocumentGraphLinkList } from "../../toDocumentGraph.js";
import { type RelationshipEngineActions, RelationshipEngineActions as Actions } from "../../../../store/index.js";
import {
	type RequestSelectorMap as RERequestSelectorMap,
	DefaultRequestSelectorMap as REDefaultRequestSelectorMap
} from "../../requestSelectorMap.js";

import { fetchGroupPathProjections, type GroupPathRequestSpec } from "./groupPathRequest.js";

/**
 * Extra payload passed via `ActivityActions.loadData` to trigger subtree batch fetching.
 * Spread onto the loadData payload in `loadSubDocumentGraphsSaga` and extracted here via
 * `isLoadSubDocumentGraphPayload`.
 *
 * @internal
 */
export interface LoadSubDocumentGraphPayload {
	readonly subtreeFetches: ReadonlyArray<Actions.Commands.LoadSubDocumentGraphs.Subtree>;
}

/**
 * @internal
 */
export function isLoadSubDocumentGraphPayload(details: unknown): details is LoadSubDocumentGraphPayload {
	return (
		typeof details === "object" &&
		details !== null &&
		"subtreeFetches" in details &&
		Array.isArray((details as LoadSubDocumentGraphPayload).subtreeFetches)
	);
}

/**
 * Data provider handler that fetches CDM groupPath subtrees in a single batched RPC call.
 *
 * This handler is triggered via Phase 0 in `RelationshipEngineDataProvider.handleLoad` when
 * `params.details` carries a `LoadSubDocumentGraphPayload`. It makes ONE `Dispatcher.rpc` call
 * for all requested subtrees and directly dispatches `loadSubDocumentGraphs.done` or `.failed`.
 *
 * The calling saga waits for these result actions
 * via `take` rather than waiting for data holder updates, keeping the RPC in the data provider
 * layer and out of saga helpers.
 */
export class LoadSubDocumentGraphHandler implements DataProviderHandler {
	readonly name = "LoadSubDocumentGraphHandler";
	private readonly requestSelectorMap: RERequestSelectorMap;

	constructor(requestSelectorMap?: RERequestSelectorMap) {
		this.requestSelectorMap = requestSelectorMap ?? REDefaultRequestSelectorMap;
	}

	canHandle(dataHolders: Activity.DataHolder[]): DataProviderHandler.CanHandleResult {
		// This handler is triggered via params.details, never auto-triggered by data holders
		return { handled: [], remaining: dataHolders };
	}

	*handle(params: DataProvider.LoadConfig): SagaGenerator<RelationshipEngineActions.Commands.UpdatedDataHolder[]> {
		if (!isLoadSubDocumentGraphPayload(params.details) || params.details.subtreeFetches.length === 0) {
			return [];
		}

		const { subtreeFetches: subtrees } = params.details;

		try {
			const specs: GroupPathRequestSpec[] = subtrees.map((spec) => ({
				activityId: params.activityId,
				id: `subtree-${spec.relationshipName}`,
				cdmName: spec.cdmName,
				docRef: spec.docRef,
				groupPath: spec.groupPath
			}));

			const projections = yield* fetchGroupPathProjections(specs, this.requestSelectorMap);
			const modelProvider = yield* buildModelProvider();

			const results: Actions.Commands.LoadSubDocumentGraphs.SubtreeResult[] = subtrees.map((spec, idx) => {
				const projection = projections[idx];
				const fragment = resolveFragment(spec.relationshipName, projection, modelProvider);

				return { relationshipName: spec.relationshipName, projection, fragment };
			});

			yield* put(
				Actions.Commands.loadSubDocumentGraphs.done({
					params: { activityId: params.activityId, subtrees },
					result: { subtrees: results }
				})
			);
		} catch (e) {
			const error = e instanceof Error ? e : new Error("Unknown error during subtree batch fetch");
			yield* put(
				Actions.Commands.loadSubDocumentGraphs.failed({
					params: { activityId: params.activityId, subtrees },
					error
				})
			);
		}

		return [];
	}
}

function resolveFragment(
	relationshipModelName: string,
	projection: QueryJsonRpc2Response.DocumentGraphProjection,
	modelProvider: (id: string) => DocumentModel | undefined
): Changelog.SubDocumentGraphAdded {
	const docSpecs: DocumentSpec[] = [];

	for (const link of projection.result.links) {
		if (link.document && link.docRef && link.documentModelName) {
			docSpecs.push({ document: link.document, docRef: link.docRef, documentModelName: link.documentModelName });
		}
	}

	// @ts-expect-error DocumentEntry can not be undefined
	docSpecs.push(...projection.result.entries);

	const documents: Record<string, DocumentGraph.Document> = documentsByRef(undefined, docSpecs, modelProvider);
	const links: DocumentGraph.Link[] = convertToDocumentGraphLinkList(projection.result.links);

	return { kind: "subDocumentGraphAdded", relationshipModelName, documents, links };
}

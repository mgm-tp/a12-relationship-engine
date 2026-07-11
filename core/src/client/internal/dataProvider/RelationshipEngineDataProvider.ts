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

import type { DataProvider } from "@com.mgmtp.a12.client/client-core";
import { type Activity, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import { executeQueryPlan, type QueryExecutionPlan } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import { ActivityActions, ReferencedModel, extractModelsInScenePayload } from "@com.mgmtp.a12.client/client-core";

import { RelationshipEngineActions } from "../../../store/index.js";
import { RelationshipEngineDataHolder } from "../../../store/index.js";
import {
	type RequestSelectorMap as RERequestSelectorMap,
	DefaultRequestSelectorMap as REDefaultRequestSelectorMap
} from "../requestSelectorMap.js";

import { initDataHolders } from "./load/init.js";
import { SaveHandler } from "./save/SaveHandler.js";
import type { DataProviderHandler } from "./types.js";
import { waitUntilModelsAreResolved } from "./utils.js";
import { prepareOverviewDataHolders } from "./load/relationship.js";
import { DefaultDocumentHandler } from "./load/DefaultDocumentHandler.js";
import { OverviewEngineHandler } from "./overview/OverviewEngineHandler.js";
import { DropdownSelectionHandler } from "./load/DropdownSelectionHandler.js";
import { createOERelationshipRequestSelectorMap } from "./overview/OERequestSelectorMapFactory.js";
import { LoadSubDocumentGraphHandler, isLoadSubDocumentGraphPayload } from "./load/LoadSubDocumentGraphHandler.js";

/**
 * Orchestrates RE data loading: initializes holders, runs DefaultDocumentHandler first,
 * then OverviewEngine / DropdownSelection handlers, and dispatches a single setThumbnails.
 */
class RelationshipEngineDataProvider implements DataProvider {
	name = "RelationshipEngineDataProvider";

	private readonly defaultDocumentHandler: DefaultDocumentHandler;
	private readonly loadHandlers: DataProviderHandler[];
	private readonly saveHandler: SaveHandler;
	private readonly loadSubDocumentGraphHandler: LoadSubDocumentGraphHandler;

	constructor(options?: RelationshipEngineDataProviderOptions) {
		const rsm = options?.requestSelectorMap ?? REDefaultRequestSelectorMap;
		this.defaultDocumentHandler = new DefaultDocumentHandler(rsm);
		this.loadHandlers = [
			this.defaultDocumentHandler,
			new OverviewEngineHandler({ requestSelectorMap: createOERelationshipRequestSelectorMap(rsm) }),
			new DropdownSelectionHandler(rsm)
		];
		this.saveHandler = new SaveHandler(rsm);
		this.loadSubDocumentGraphHandler = new LoadSubDocumentGraphHandler(rsm);
	}

	canHandle(params: DataProvider.CanHandleConfig): boolean {
		const { action, activityId, activities } = params;

		// Special route: LoadSubDocumentGraphHandler is triggered when loadData carries subtreeFetches
		if (
			action !== undefined &&
			ActivityActions.loadData.match(action) &&
			isLoadSubDocumentGraphPayload(action.payload)
		) {
			return true;
		}

		const { modelsInScene } = extractModelsInScenePayload(action) ?? {};

		if (!modelsInScene) {
			return false;
		}

		const directFormModelExist = modelsInScene.some(
			(refModel) =>
				refModel.direct &&
				(ReferencedModel.isLoaded(refModel)
					? refModel.model.header.modelType
					: ReferencedModel.isNotLoaded(refModel)
						? refModel.model.modelType
						: undefined) === "form"
		);

		if (directFormModelExist) {
			const atLeastOneTransitiveUiModelExist = modelsInScene.some(
				(refModel) =>
					refModel.direct !== true &&
					(ReferencedModel.isLoaded(refModel)
						? refModel.model.header.modelType
						: ReferencedModel.isNotLoaded(refModel)
							? refModel.model.modelType
							: undefined) === "relationship-ui"
			);

			if (atLeastOneTransitiveUiModelExist) {
				return true;
			}

			const parentActivityId = activities[activityId]?.initiatingActivityId;

			// Except link form, always take over child activity handling regardless if it is a Relationship Engine activity or not.
			if (parentActivityId) {
				const activity = activities[activityId];
				const parentActivity = activities[parentActivityId];

				if (activity?.descriptor?.dynamicLinkForm === "true") {
					return false;
				}

				if (parentActivity?.dataHolders?.some(RelationshipEngineDataHolder.ChangelogDataHolder.isInstance)) {
					return true;
				}
			}
		}

		return false;
	}

	*provideData(params: DataProvider.ProvideDataConfig): SagaGenerator<void> {
		yield* call(waitUntilModelsAreResolved, params.activityId);

		if (params.operation === "save") {
			return yield* call([this.saveHandler, this.saveHandler.handle], params);
		}

		if (params.operation === "delete") {
			throw new Error("Delete operation is not supported.");
		}

		yield* call(this.handleLoad.bind(this), params);
	}

	private *handleLoad(params: DataProvider.LoadConfig): SagaGenerator<void> {
		// Phase 0: Changelog subtree batch fetch — triggered when loadData carries subtreeFetches.
		// The handler makes a single batched RPC call and dispatches loadSubDocumentGraphs.done/failed.
		if (isLoadSubDocumentGraphPayload(params.details)) {
			yield* call([this.loadSubDocumentGraphHandler, this.loadSubDocumentGraphHandler.handle], params);

			return;
		}

		const effectiveDataHolders = yield* call(resolveEffectiveDataHolders, params);

		// Phase 1: Load the default document / document-graph (needed before phase 2 link resolution).
		const { handled: documentDataHolders, remaining: afterDocument } =
			this.defaultDocumentHandler.canHandle(effectiveDataHolders);

		const documentUpdates: RelationshipEngineActions.Commands.UpdatedDataHolder[] = [];
		let documentThumbnails: Record<string, string> = {};

		if (documentDataHolders.length > 0) {
			const result = yield* call([this.defaultDocumentHandler, this.defaultDocumentHandler.handleWithThumbnails], {
				...params,
				dataHolders: documentDataHolders
			});
			documentUpdates.push(...result.updates);
			documentThumbnails = result.thumbnails;
		}

		// Dispatch immediately so link data is available for phase 2 source entity resolution.
		if (documentUpdates.length > 0) {
			yield* put(
				RelationshipEngineActions.Commands.setDataHolders({
					activityId: params.activityId,
					dataHolders: documentUpdates
				})
			);
		}

		// Phase 2: Resolve source entities using the now-populated document graph.
		const preparedDataHolders = yield* call(prepareOverviewDataHolders, params.activityId, afterDocument);

		// Phase 3: Run remaining handlers; collect planFor plans into one batched RPC call.
		const allUpdates: RelationshipEngineActions.Commands.UpdatedDataHolder[] = [];
		let remaining = preparedDataHolders;
		const queryPlans: QueryExecutionPlan[] = [];

		for (let i = 1; i < this.loadHandlers.length; i++) {
			const handler = this.loadHandlers[i];
			const { handled, remaining: rest } = handler.canHandle(remaining, params);

			if (handled.length > 0) {
				if (typeof handler.planFor === "function") {
					const handlerPlans = yield* call([handler, handler.planFor], { ...params, dataHolders: handled });
					queryPlans.push(...handlerPlans);
				} else {
					const updates = yield* call([handler, handler.handle], { ...params, dataHolders: handled });
					allUpdates.push(...updates);
				}
			}

			remaining = rest;
		}

		yield* call(applyQueryPlansAndDispatchThumbnails, params.activityId, queryPlans, allUpdates, documentThumbnails);
	}
}

/** Initializes data holders on first load; otherwise returns requested or stored holders. */
function* resolveEffectiveDataHolders(params: DataProvider.LoadConfig): SagaGenerator<Activity.DataHolder[]> {
	const storedDataHolders = yield* select(ActivitySelectors.activityPropById(params.activityId, (a) => a.dataHolders));
	const hasChangelogDataHolder = storedDataHolders?.some(RelationshipEngineDataHolder.ChangelogDataHolder.isInstance);

	if (!storedDataHolders || !hasChangelogDataHolder) {
		return yield* call(initDataHolders, params);
	}

	if (params.dataHolders && params.dataHolders.length > 0) {
		return params.dataHolders;
	}

	return storedDataHolders;
}

/** Executes query plans, extracts thumbnails, dispatches updates, and merges all thumbnails into a single setThumbnails dispatch. */
function* applyQueryPlansAndDispatchThumbnails(
	activityId: string,
	queryPlans: QueryExecutionPlan[],
	pendingUpdates: RelationshipEngineActions.Commands.UpdatedDataHolder[],
	documentThumbnails: Record<string, string>
): SagaGenerator<void> {
	const queryThumbnails: Record<string, string> = {};

	if (queryPlans.length > 0) {
		const planUpdates = yield* call(executeQueryPlan, activityId, queryPlans);

		for (const update of planUpdates) {
			if (update.thumbnails) {
				Object.assign(queryThumbnails, update.thumbnails);
			}
		}

		pendingUpdates.push(
			...planUpdates.map(function stripThumbnails({ thumbnails: _t, ...rest }) {
				return rest as RelationshipEngineActions.Commands.UpdatedDataHolder;
			})
		);
	}

	if (pendingUpdates.length > 0) {
		yield* put(RelationshipEngineActions.Commands.setDataHolders({ activityId, dataHolders: pendingUpdates }));
	}

	// Dispatch merged setThumbnails after setDataHolders so eligible holders exist in the store.
	const mergedThumbnails: Record<string, string> = { ...documentThumbnails, ...queryThumbnails };

	if (Object.keys(mergedThumbnails).length > 0) {
		yield* put(RelationshipEngineActions.Commands.setThumbnails({ activityId, thumbnails: mergedThumbnails }));
	}
}

/**
 * @experimental Be aware that the API might be changed even in a minor release.
 *
 * Options for creating a Relationship Engine data provider.
 */
export interface RelationshipEngineDataProviderOptions {
	/**
	 * Custom request selector map for customizing how RE builds server requests.
	 * @internal
	 **/
	readonly requestSelectorMap?: RERequestSelectorMap;
}

export const createRelationshipEngineDataProvider = (options?: RelationshipEngineDataProviderOptions): DataProvider => {
	return new RelationshipEngineDataProvider(options);
};

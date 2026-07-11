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

import { call, type SagaGenerator } from "typed-redux-saga";

import type { Activity, DataProvider } from "@com.mgmtp.a12.client/client-core";
import {
	executeQueryPlan,
	type QueryExecutionPlan,
	type DataProvidersConfig
} from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import type { DataProviderHandler } from "../types.js";
import { RelationshipEngineDataHolder } from "../../../../store/index.js";
import type { RelationshipEngineActions } from "../../../../store/index.js";

import { createOERelationshipRequestSelectorMap } from "./OERequestSelectorMapFactory.js";
import { createRelationshipOverviewDataProvider } from "./RelationshipOverviewDataProvider.js";

/**
 * Handler for overview engine data loading operations.
 * Uses the RelationshipOverviewDataProvider with configurable getModels function.
 *
 * Returns collected results instead of dispatching directly, so the orchestrator
 * can batch all handler results into a single dispatch.
 *
 * This handler uses the Overview Engine's RequestSelectorMap API to customize query building,
 * allowing placeholder replacement and selectingItems handling without a custom data loader.
 */
export class OverviewEngineHandler implements DataProviderHandler {
	readonly name = "OverviewEngineHandler";
	private readonly overviewDataProvider: ReturnType<typeof createRelationshipOverviewDataProvider>;

	constructor(config?: DataProvidersConfig) {
		const requestSelectorMap = config?.requestSelectorMap ?? createOERelationshipRequestSelectorMap();

		this.overviewDataProvider = createRelationshipOverviewDataProvider({
			...config,
			requestSelectorMap
		});
	}

	canHandle(dataHolders: Activity.DataHolder[]): DataProviderHandler.CanHandleResult {
		const handled: Activity.DataHolder[] = [];
		const remaining: Activity.DataHolder[] = [];

		for (const dataHolder of dataHolders) {
			if (
				RelationshipEngineDataHolder.AvailableItemsDataHolder.isInstance(dataHolder) ||
				RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance(dataHolder)
			) {
				handled.push(dataHolder);
			} else {
				remaining.push(dataHolder);
			}
		}

		return { handled, remaining };
	}

	*planFor(params: DataProvider.LoadConfig): SagaGenerator<QueryExecutionPlan[]> {
		return yield* call(
			[this.overviewDataProvider, this.overviewDataProvider.planForDataHolders],
			params,
			params.dataHolders
		);
	}

	*handle(params: DataProvider.LoadConfig): SagaGenerator<RelationshipEngineActions.Commands.UpdatedDataHolder[]> {
		const plans = yield* call([this, this.planFor], params);

		return yield* call(executeQueryPlan, params.activityId, plans);
	}
}

/**
 * Creates a new OverviewEngineHandler instance.
 * @param config - Optional configuration for the overview data provider
 */
export function createOverviewEngineHandler(config?: DataProvidersConfig): OverviewEngineHandler {
	return new OverviewEngineHandler(config);
}

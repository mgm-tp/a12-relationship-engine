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

import type { SagaGenerator } from "typed-redux-saga";

import type { Activity, DataProvider } from "@com.mgmtp.a12.client/client-core";
import type { DataProvidersConfig } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import type { ModelsState, QueryExecutionPlan } from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import type { RelationshipEngineActions } from "../../../store/index.js";

/**
 * Interface for data provider handlers that process specific types of data loading operations.
 * Each handler is responsible for a specific subset of data holders or loading scenarios.
 *
 * Handlers return their results as {@link RelationshipEngineActions.Commands.UpdatedDataHolder}
 * arrays instead of dispatching directly. The orchestrator collects all results and dispatches
 * a single batched `setDataHolders` action.
 */
export interface DataProviderHandler {
	/**
	 * Name of the handler for debugging and logging purposes.
	 */
	readonly name: string;

	/**
	 * Determines whether this handler can process the given data holders.
	 * @param dataHolders - The data holders to potentially process
	 * @param params - Optional load configuration parameters for handlers that need context
	 * @returns An object containing data holders this handler will process and those to pass to other handlers
	 */
	canHandle(dataHolders: Activity.DataHolder[], params?: DataProvider.LoadConfig): DataProviderHandler.CanHandleResult;

	/**
	 * Processes the data loading for the given data holders.
	 * Returns the updated data holders instead of dispatching; the orchestrator
	 * is responsible for batching all handler results into a single dispatch.
	 * @param params - The load configuration including data holders to process
	 * @returns Array of updated data holders with loaded data/slices
	 */
	handle(params: DataProvider.LoadConfig): SagaGenerator<RelationshipEngineActions.Commands.UpdatedDataHolder[]>;

	/**
	 * Optional method for handlers that support plan-based batching.
	 * When implemented, the orchestrator will collect plans from all such handlers
	 * and execute them in a single {@link executePlan} call instead of calling
	 * {@link handle} individually.
	 * @param params - The load configuration including data holders to process
	 * @returns Array of QueryExecutionPlan objects to be executed in a single batched RPC call
	 */
	readonly planFor?: (params: DataProvider.LoadConfig) => SagaGenerator<QueryExecutionPlan[]>;
}

export namespace DataProviderHandler {
	/**
	 * Result of the canHandle method indicating which data holders this handler will process.
	 */
	export interface CanHandleResult {
		/**
		 * Data holders that this handler will process.
		 */
		readonly handled: Activity.DataHolder[];

		/**
		 * Data holders that should be passed to other handlers.
		 */
		readonly remaining: Activity.DataHolder[];
	}
}

/**
 * Interface for save handler that process save operations for data holders.
 * Similar to DataProviderHandler but specialized for save operations.
 */
export interface SaveProviderHandler {
	/**
	 * Name of the handler for debugging and logging purposes.
	 */
	readonly name: string;

	/**
	 * Processes the save operation.
	 * The handler is responsible for persisting data and dispatching any post-save actions.
	 * @param params - The save configuration
	 */
	handle(params: DataProvider.SaveConfig): SagaGenerator<void>;
}

/**
 * Function type for resolving models state for a given data holder.
 * This allows customizing how models are retrieved for different data holder types.
 */
export type GetModelsFn = (activityId: string, dataHolder?: Activity.DataHolder) => SagaGenerator<ModelsState>;

/**
 * Configuration options for the RelationshipOverviewDataProvider.
 * Extends the standard OverviewEngine DataProvidersConfig with custom model resolution.
 *
 * Query customization (placeholder replacement, selectingItems handling) is done via
 * the Overview Engine's RequestSelectorMap API. Use the `requestSelectorMap` property
 * from the base DataProvidersConfig to provide a custom RequestSelectorMap.
 * If not provided, the handler uses createRelationshipRequestSelectorMap() by default.
 */
export interface RelationshipOverviewProviderConfig extends DataProvidersConfig {
	/**
	 * Custom function to resolve models state for a data holder.
	 * If not provided, falls back to the default OverviewEngineSelectors.modelsState behavior.
	 */
	readonly getModels?: GetModelsFn;
}

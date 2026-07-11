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

import type { Activity, DataProvider } from "@com.mgmtp.a12.client/client-core";
import type { ModelsState } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import {
	type QueryExecutionPlan,
	OverviewEngineFactories,
	OverviewEngineSelectors,
	OverviewEngineDataProvider
} from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import type { RelationshipOverviewProviderConfig } from "../types.js";
import { RelationshipEngineDataHolder } from "../../../../store/index.js";

/**
 * A custom OverviewEngineDataProvider that accepts a configurable getModels function.
 * This allows the Relationship Engine to provide its own model resolution logic
 * and dispatches data to the correct relationship engine data holders.
 */
export class RelationshipOverviewDataProvider extends OverviewEngineDataProvider {
	constructor(config: RelationshipOverviewProviderConfig = {}) {
		super(OverviewEngineFactories.dataLoader, config);
	}

	*planForDataHolders(
		config: DataProvider.LoadConfig,
		dataHolders: Iterable<Activity.DataHolder>
	): SagaGenerator<QueryExecutionPlan[]> {
		const plans: QueryExecutionPlan[] = [];

		for (const dataHolder of dataHolders) {
			plans.push(yield* call([this, this.createExecutionPlan], config, dataHolder));
		}

		return plans;
	}

	protected *getModels(activityId: string, dataHolder?: Activity.DataHolder): SagaGenerator<ModelsState> {
		if (!RelationshipEngineDataHolder.Slices.isInstance(dataHolder?.slices)) {
			throw new Error(`Invalid Relationship Engine data holder slices.`);
		}

		const { component } = dataHolder.slices.uiConfiguration;
		const isAvailableItems = RelationshipEngineDataHolder.AvailableItemsDataHolder.isInstance(dataHolder);
		const overviewModelName = isAvailableItems
			? (component?.availableItemsOverviewModel ?? component?.editConfiguration?.availableItemsOverviewModel)
			: component?.selectedItemsOverviewModel;

		if (!overviewModelName) {
			throw new Error(
				`Cannot resolve overview model name for data holder type: ${dataHolder.descriptor.type}, ` +
					`component: ${component?.componentType ?? "unknown"}`
			);
		}

		const modelsState = yield* select(OverviewEngineSelectors.modelsState(activityId, overviewModelName));

		if (!modelsState) {
			throw new Error(
				`ModelsState not resolved by OE selector for overviewModelName="${overviewModelName}", ` +
					`type: ${dataHolder.descriptor.type}, ` +
					`component: ${component?.componentType ?? "unknown"}`
			);
		}

		return modelsState;
	}
}

/**
 * Creates a RelationshipOverviewDataProvider with the given configuration.
 */
export function createRelationshipOverviewDataProvider(
	config?: RelationshipOverviewProviderConfig
): RelationshipOverviewDataProvider {
	return new RelationshipOverviewDataProvider(config);
}

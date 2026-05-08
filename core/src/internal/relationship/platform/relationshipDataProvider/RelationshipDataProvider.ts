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
 * @module relationship
 */
import deepEqual from "fast-deep-equal";
import { call, type SagaGenerator } from "typed-redux-saga";

import { type Activity, type DataProvider } from "@com.mgmtp.a12.client/client-core";

import { assertUnreachable } from "../../../shared/assertion.js";
import { DefaultRequestSelectorMap, type RequestSelectorMap } from "../../../server-connectors/request-selector-map.js";
import { Relationship as RelationshipClientApi } from "../../relationship.js";

import { deleteData } from "./delete.js";
import { loadData } from "./load.js";
import { saveData } from "./save.js";

function isRelevantDataHolder(dataHolder: Activity.DataHolder): boolean {
	return (
		RelationshipClientApi.LinkDataHolder.isInstance(dataHolder) ||
		RelationshipClientApi.CandidateDataHolder.isInstance(dataHolder)
	);
}

function isRelationshipActivity(activity: Activity): boolean {
	const dataHolders = activity.dataHolders ?? [];
	return (
		dataHolders.some((dh) => RelationshipClientApi.LinkDataHolder.isInstance(dh)) &&
		dataHolders.some((dh) => RelationshipClientApi.CandidateDataHolder.isInstance(dh))
	);
}

/**
 * Creates a {@link DataProvider} for relationships.
 */
export function createRelationshipDataProvider(options?: { requestSelectorMap?: RequestSelectorMap }): DataProvider {
	const requestSelectorMap = options?.requestSelectorMap ?? DefaultRequestSelectorMap;
	return {
		name: "RelationshipDataProvider",
		canHandle({ activityId, operation, dataHolder, activities }: DataProvider.CanHandleConfig): boolean {
			switch (operation) {
				case "load":
					return isRelevantDataHolder(dataHolder);
				case "save":
				case "delete": {
					const activity = activities[activityId];
					if (activity === undefined) {
						return false;
					}

					if (!isRelationshipActivity(activity)) {
						return false;
					}

					return isRelevantDataHolder(dataHolder) || deepEqual(dataHolder.descriptor, activity.descriptor);
				}
				default:
					return false;
			}
		},
		*provideData(config: DataProvider.ProvideDataConfig): SagaGenerator<void> {
			switch (config.operation) {
				case "load": {
					yield* call(loadData, config, requestSelectorMap);
					break;
				}
				case "save": {
					yield* call(saveData, config, requestSelectorMap);
					break;
				}
				case "delete": {
					yield* call(deleteData, config, requestSelectorMap);
					break;
				}
				default:
					assertUnreachable(config);
			}
		}
	};
}

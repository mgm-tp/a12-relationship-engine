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

import { Dispatcher, type DocumentSpec } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { Relationship, RelationshipFactories } from "@com.mgmtp.a12.relationshipengine/relationshipengine-core";
// eslint-disable-next-line no-restricted-imports
import { RequestBuilder } from "@com.mgmtp.a12.relationshipengine/relationshipengine-core/internal/server-connectors/requestBuilder.js";
import {
	Model,
	StoreSagas,
	type Activity,
	type Selector,
	ModelSelectors,
	ActivityActions,
	LocaleSelectors,
	ActivitySelectors,
	type DataProvider,
	NEW_INSTANCE_IDENTIFIER
} from "@com.mgmtp.a12.client/client-core";

const standaloneModuleSingleDocumentDataProvider: DataProvider = {
	name: "StandaloneSingleDocumentDataProvider",
	canHandle(config: DataProvider.CanHandleConfig): boolean {
		const { activityId, activities, dataHolder, operation } = config;
		const activity = activities[activityId];
		const descriptor = activity?.descriptor;

		return (
			isMatchedOperationAndDescriptor(operation, descriptor) &&
			!isRelationshipDataHolder(dataHolder) &&
			descriptor?.instance !== NEW_INSTANCE_IDENTIFIER
		);
	},
	*provideData(config: DataProvider.ProvideDataConfig): SagaGenerator<void> {
		const { activityId } = config;
		const activity = yield* select(ActivitySelectors.activityById(activityId));
		const instance = activity?.descriptor.instance;

		if (!instance) {
			throw new Error(`Instance must be set for activityId ${activityId}.`);
		}

		const request = RequestBuilder.query("LoadSingleDocumentForStandAloneRelationship", {
			targetDocumentModel: instance.split("/")[0],
			projectionName: "document",
			constraint: {
				operator: "exact_match",
				field: "/__meta/docRef",
				value: instance
			},
			paging: { pageNumber: 0, pageSize: 1 }
		});

		const { language } = yield* select(LocaleSelectors.locale());
		const [response] = yield* call(() => Dispatcher.rpc(language, [request]));

		if (!response.result.entries.length) {
			throw new Error(`No document entry found for docRef ${instance}`);
		}

		const { document: loadedDocument, docRef, documentModelName } = response.result.entries[0] as DocumentSpec;

		const document = { ...loadedDocument, id: docRef, modelId: documentModelName };

		yield* put(ActivityActions.setData({ activityId, data: { document } }));
	}
};

const standaloneModuleRelationshipDataProvider: DataProvider = {
	name: "StandaloneRelationshipDataProvider",
	canHandle(config: DataProvider.CanHandleConfig): boolean {
		const { activityId, activities, dataHolder, operation } = config;
		const activity = activities[activityId];
		const descriptor = activity?.descriptor;

		return isMatchedOperationAndDescriptor(operation, descriptor) && isRelationshipDataHolder(dataHolder);
	},
	*provideData(config: DataProvider.ProvideDataConfig): SagaGenerator<void> {
		const { activityId } = config;
		const modelsSelector: Selector<{ stateChanged: boolean; returnValue: object | null }> = (state) => {
			const models = ModelSelectors.modelInScene({ activityId, modelType: "overview" })(state);

			if (!models || Model.Error.isInstance(models)) {
				return { stateChanged: models !== undefined, returnValue: null };
			}

			return { stateChanged: true, returnValue: models };
		};

		// wait for overview models
		const models = yield* call(() => StoreSagas.waitForStateChange(modelsSelector));

		if (!models) {
			throw new Error(`Models not found ${activityId}.`);
		}

		const relationshipDataProvider = RelationshipFactories.createRelationshipDataProvider();

		return yield* call(relationshipDataProvider.provideData, config);
	}
};

function isRelationshipDataHolder(dataHolder: Activity.DataHolder): boolean {
	return Relationship.LinkDataHolder.isInstance(dataHolder) || Relationship.CandidateDataHolder.isInstance(dataHolder);
}

function isMatchedOperationAndDescriptor(
	operation: DataProvider.Operation,
	descriptor: Activity.Descriptor | undefined
) {
	return operation === "load" && descriptor?.feature === "Standalone" && !!descriptor?.instance;
}

export const standaloneDataProviders = [
	standaloneModuleSingleDocumentDataProvider,
	standaloneModuleRelationshipDataProvider
];

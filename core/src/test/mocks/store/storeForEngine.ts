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

import type { MockStore } from "redux-mock-store";

import type { Model as ModelAPI } from "@com.mgmtp.a12.base/base-model-api";
import type { ModelGraph } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { createUIState, type EngineStore, type FormActivity } from "@com.mgmtp.a12.formengine/formengine-core";
import { type Activity, type ApplicationModel, NEW_INSTANCE_IDENTIFIER } from "@com.mgmtp.a12.client/client-core";

import { createActivity, type DocumentListData } from "../../utils/activity.js";

import { createGeneralStore } from "./store.js";

export interface OverviewEngineConfiguration {
	readonly activity: {
		readonly id: string;
	};
	readonly models: ModelAPI[];
	readonly modelGraph?: Partial<ModelGraph>;
	readonly withOutDocuments?: boolean;
	readonly slices?: { [key: string]: {} };
}

export function createStoreForOverviewEngine({
	activity,
	models,
	modelGraph,
	withOutDocuments,
	slices
}: OverviewEngineConfiguration): MockStore<object> {
	const modelName = "CRUDOverviewModel";

	const defaultDataHolder = createDefaultOverviewDataHolder(modelName, withOutDocuments, slices);

	return createStoreForEngine(modelName, {
		activity: { ...activity, dataHolders: [defaultDataHolder] },
		models,
		modelGraph
	});
}

interface FormEngineConfiguration {
	readonly activity: {
		readonly id: string;
		readonly lock?: Activity.Lock;
		readonly error?: Activity.Error;
	};
	readonly models: ModelAPI[];
	readonly data?: FormActivity.Data.SingleDocumentData;
	readonly dirty?: boolean;
}

export function createStoreForFormEngine({
	activity,
	models,
	data,
	dirty
}: FormEngineConfiguration): MockStore<object> {
	const modelName = "CRUDFormModel";

	const defaultDataHolder = createDefaultFormDataHolder(
		modelName,
		data,
		activity.error,
		dirty,
		createUIState({
			screenLocation: [{ path: [], locationPath: [{ elementName: "Screen1" }] }]
		})
	);

	return createStoreForEngine(modelName, {
		activity: {
			...activity,
			descriptor: { instance: NEW_INSTANCE_IDENTIFIER },
			dataHolders: [defaultDataHolder]
		},
		models
	});
}

interface Configuration {
	readonly activity: Partial<Activity> & { readonly id: string };
	readonly models: ModelAPI[];
	readonly modelGraph?: Partial<ModelGraph>;
}

export function createStoreForEngine(
	modelName: string,
	{ activity: activityInformation, models, modelGraph }: Configuration
): MockStore<object> {
	return createGeneralStore({
		models,
		activities: [
			createActivity({
				...activityInformation,
				descriptor: { ...activityInformation.descriptor, model: modelName }
			})
		],
		modules: [createModule(modelName, models)],
		modelGraph
	});
}

export function createDefaultFormDataHolder(
	modelName: string,
	data?: FormActivity.Data.SingleDocumentData,
	error?: Activity.Error,
	dirty?: boolean,
	uiState?: EngineStore.UIState
): Activity.DataHolder<FormActivity.Data.SingleDocumentData> {
	return data
		? {
				descriptor: { instance: NEW_INSTANCE_IDENTIFIER, model: modelName },
				dirty: dirty || false,
				data,
				loadingState: "loaded",
				savingState: "not_saved",
				slices: { uiState },
				busy: false,
				error
			}
		: {
				descriptor: { instance: NEW_INSTANCE_IDENTIFIER, model: modelName },
				dirty: dirty || false,
				loadingState: "missing",
				savingState: "not_saved",
				slices: { uiState },
				busy: false,
				error
			};
}

function createDefaultOverviewDataHolder(
	modelName: string,
	withOutDocuments?: boolean,
	slices: {} = {}
): Activity.DataHolder<DocumentListData> {
	return {
		descriptor: { model: modelName },
		data: {
			totalDocumentsCount: withOutDocuments ? 0 : 2,
			documents: !withOutDocuments
				? [
						{ id: "1", modelId: "CRUD-document" },
						{ id: "2", modelId: "CRUD-document" }
					]
				: []
		},
		dirty: false,
		loadingState: "loaded",
		savingState: "not_saved",
		slices
	};
}

function createModule(modelName: string, models: ModelAPI[]): ApplicationModel.Module {
	return {
		name: "CRUDModule",
		menu: {
			name: "CRUD",
			label: [{ locale: "en", text: "CRUD" }],
			initialActivity: { descriptor: { model: modelName } }
		},
		flows: [
			{
				name: "CRUDFlow",
				scenes: [
					{
						name: "CRUDForm",
						matchConditions: [
							{ key: "model", mustEqual: modelName },
							{ key: "instance", isSet: true }
						],
						sceneChange: {
							onEnter: [
								{
									type: "VIEW_ADD",
									name: "CRUDForm",
									models: models
										.filter((model) => model.header.modelType === "form")
										.map((model) => ({
											modelType: "form",
											name: model.header.id
										}))
								}
							]
						}
					},
					{
						name: "CRUDOverview",
						matchConditions: [
							{ key: "model", mustEqual: modelName },
							{ key: "instance", isSet: false }
						],
						sceneChange: {
							onEnter: [
								{
									type: "VIEW_ADD",
									name: "CRUDOverview",
									models: models
										.filter((model) => model.header.modelType === "overview")
										.map((model) => ({
											modelType: "overview",
											name: model.header.id
										}))
								}
							]
						}
					}
				]
			}
		]
	};
}

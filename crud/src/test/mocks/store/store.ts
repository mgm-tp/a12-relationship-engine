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

import { type Middleware } from "redux";
import { legacy_configureStore as configureStore, type MockStore } from "redux-mock-store";

import { type Model as ModelAPI } from "@com.mgmtp.a12.base/base-model-api/lib/main/model/index.js";
import { type Activity, type ActivityMap, type ApplicationModel } from "@com.mgmtp.a12.client/client-core";
import { type ModelGraph } from "@com.mgmtp.a12.dataservices/dataservices-access";

import { setupActivityMap } from "../../utils/activity.js";
import { US_LOCALE } from "../../utils/localization.js";
import { type ModelMap } from "../../utils/models.js";

import { modelListToMap } from "../ModelsUtil.js";

export function createGeneralStore(
	options: {
		applicationModel?: ApplicationModel;
		initialActivity?: ApplicationModel.InitialActivity;
		models?: ModelAPI[];
		modelMap?: ModelMap;
		modelGraph?: Partial<ModelGraph>;
		activityMap?: ActivityMap;
		activities?: Activity[];
		modules?: ReadonlyArray<ApplicationModel.Module>;
		middlewares?: Middleware[];
	} = {}
): MockStore<object> {
	const activityMap = options.activityMap ?? setupActivityMap(options.activities || []);
	const store = configureStore<object>(options.middlewares)({
		activities: activityMap,
		models: {
			applicationModel:
				options.applicationModel || createApplicationModel(options.modules || [], options.initialActivity),
			models: options.modelMap ?? modelListToMap(options.models || []),
			modelGraph: createModelGraph(options.modelGraph)
		},
		locale: US_LOCALE,
		application: { busy: false }
	});

	return store;
}

/**
 * Returns an application model with two scenes - one for a form engine
 * and one for an overview-engine
 */
function createApplicationModel(
	modules: ReadonlyArray<ApplicationModel.Module>,
	initialActivity?: ApplicationModel.InitialActivity
): ApplicationModel {
	return {
		header: {
			id: "Minimal_Application_Model",
			modelType: "application",
			modelVersion: "1.0.0",
			locales: [{ code: "en" }]
		},
		content: {
			region: {
				name: "APP",
				layout: { name: "ApplicationFrame" },
				subRegions: []
			},
			defaultRegion: [],
			modules: [
				{
					name: moduleName,
					menu: {
						name: "form-engine-test",
						label: [{ locale: "en", text: "TestModel" }],
						initialActivity: { descriptor: { model: "TestModel" } }
					},
					flows: [
						{
							name: "CRUDFlow1",
							scenes: [
								{
									name: formSceneName,
									matchConditions: [
										{ key: "model", mustEqual: "TestModel" },
										{ key: "instance", isSet: true }
									]
								},
								{
									name: overviewSceneName,
									matchConditions: [
										{ key: "model", mustEqual: "TestModel" },
										{ key: "instance", isSet: false }
									]
								}
							]
						}
					]
				},
				...modules
			],
			initialActivity
		}
	};
}

export const modelName = "TestModel";
export const moduleName = "MyModule";
export const formSceneName = "MySceneForm";
export const overviewSceneName = "MySceneOverview";

function createModelGraph(modelGraph?: Partial<ModelGraph>): ModelGraph {
	return {
		documentModels: [],
		relationshipModels: [],
		composeDocumentModels: [],
		...modelGraph
	};
}

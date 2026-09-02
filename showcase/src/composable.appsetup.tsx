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

import "./config/dev.config.js";
import "./config/server-connector.js";

import React from "react";
import type { Store } from "redux";
import { Provider } from "react-redux";
import * as ReactDOM from "react-dom/client";

import { withCRUD } from "@com.mgmtp.a12.crud/crud-core";
import "@com.mgmtp.a12.widgets/widgets-core/styles/basic.css";
import { withFormEngine } from "@com.mgmtp.a12.formengine/formengine-core";
import { addDeepLinkingSagas } from "@com.mgmtp.a12.client/client-core/deepLinking";
import { withDirtyHandling } from "@com.mgmtp.a12.client/client-core/dirtyHandling";
import { withPlatformModelLoader } from "@com.mgmtp.a12.client/client-core/modelLoader";
import { withDataServicesConfiguration } from "@com.mgmtp.a12.client/client-core/dataServicesAdapter";
import { withOverviewEngine, OverviewEngineFactories } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import {
	createEmptyDocumentDataProvider,
	platformSingleDocumentDataProvider
} from "@com.mgmtp.a12.formengine/formengine-core";
import {
	withRelationshipEngine,
	RelationshipEngineFactories
} from "@com.mgmtp.a12.relationshipengine/relationshipengine-core";
import {
	withModel,
	addWrapper,
	ModelActions,
	addCustomSagas,
	combineFeatures,
	addDataHandlers,
	type DataHandler,
	withDynamicConfig,
	ModuleRegistryProvider,
	type A12ApplicationConfig,
	createA12ApplicationSetup,
	APPLICATION_MODEL_PLACEHOLDER
} from "@com.mgmtp.a12.client/client-core";

import { createModules } from "./modules/index.js";
import { ShowcaseContextProvider } from "./context.js";
import { createViewNGComponents } from "./viewNGComponents.js";
import { addChildCategorySaga } from "./saga/add-child-category.js";
import { handleErrorSaga } from "./views/showcaseOverview/handleErrorSaga.js";
import { selectRowReadonlySaga } from "./views/showcaseOverview/showcaseOverviewSagas.js";
import {
	withTheme,
	fetchModelGraph,
	withSizeDetector,
	withNotification,
	withReduxDevtool
} from "./config/composable/index.js";

createModules(createViewNGComponents("new")).forEach((module) =>
	ModuleRegistryProvider.getInstance().addModule(module)
);

const dataHandlers: DataHandler[] = [
	createEmptyDocumentDataProvider(),
	platformSingleDocumentDataProvider,
	...OverviewEngineFactories.createDataProviders()
];

const withShowcaseContext = <T extends A12ApplicationConfig>(cfg: T) =>
	addWrapper<T>(ShowcaseContextProvider, "outer")(cfg);

const initialConfig: A12ApplicationConfig = {
	config: { overridePlatformSagas: [], dataHandlers: [] },
	initialActions: ({ dispatch }: Store) => fetchModelGraph(dispatch),
	deepLinking: { config: { applyTriggers: [ModelActions.setModelGraph] } },
	formEngine: { sagas: RelationshipEngineFactories.createFormEngineSagaOptions() }
};

const { store, initialActions, Component } = createA12ApplicationSetup(
	combineFeatures(
		combineFeatures(addDataHandlers(...dataHandlers), addCustomSagas(selectRowReadonlySaga, handleErrorSaga)),

		combineFeatures(
			withModel(APPLICATION_MODEL_PLACEHOLDER), // not used, DynamicConfiguration provides the model
			withDynamicConfig(),
			withDataServicesConfiguration,
			withFormEngine,
			withOverviewEngine,
			withRelationshipEngine,
			withCRUD,
			withPlatformModelLoader
		),

		combineFeatures(
			withShowcaseContext,
			withTheme,
			withSizeDetector,
			withNotification,
			withReduxDevtool,
			withDirtyHandling,
			addDeepLinkingSagas,

			addCustomSagas(addChildCategorySaga)
		)
	)(initialConfig)
);

// ----- Mount Application -----
const mountPoint = document.createElement("div");
mountPoint.classList.add("base");
document.body.appendChild(mountPoint);

initialActions().then(() => {
	ReactDOM.createRoot(mountPoint).render(
		<React.StrictMode>
			<Provider store={store}>{Component}</Provider>
		</React.StrictMode>
	);
});

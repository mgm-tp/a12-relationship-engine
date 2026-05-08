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
import * as ReactDOM from "react-dom/client";
import type { Store } from "redux";
import { Provider } from "react-redux";
import "@com.mgmtp.a12.widgets/widgets-core/lib/theme/basic.css";

import {
	withModel,
	addCustomSagas,
	addWrapper,
	ModuleRegistryProvider,
	type A12ApplicationConfig,
	type Module,
	createA12ApplicationSetup,
	addView,
	addPlatformSagas,
	combineFeatures,
	type ApplicationSaga,
	addDataHandlers,
	addLayout,
	type ApplicationModel,
	ModelActions,
	type DataHandler
} from "@com.mgmtp.a12.client/client-core";
import { addDeepLinkingSagas } from "@com.mgmtp.a12.client/client-core/deepLinking";
import { withDirtyHandling } from "@com.mgmtp.a12.client/client-core/dirtyHandling";
import { CRUDViews, withCRUD } from "@com.mgmtp.a12.crud/crud-core";
import {
	createEmptyDocumentDataProvider,
	platformSingleDocumentDataProvider
} from "@com.mgmtp.a12.formengine/formengine-core";
import {
	createCddDataProvider,
	DefaultRequestSelectorMap,
	RelationshipFactories,
	type RequestSelectorMap,
	withRelationshipFormEngine
} from "@com.mgmtp.a12.relationshipengine/relationshipengine-core";
import { withOverviewEngine, OverviewEngineFactories } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import { withPlatformModelLoader } from "@com.mgmtp.a12.client/client-core/modelLoader";
import { withDataServicesConfiguration } from "@com.mgmtp.a12.client/client-core/dataServicesAdapter";

import model from "./appmodel.json" with { type: "json" };
import OverviewAppModel from "./overview-appmodel.json" with { type: "json" };
import { ShowcaseContextProvider } from "./context.js";
import { SampleAppModules } from "./modules/modules.js";
import { standaloneDataProviders } from "./modules/relationships/standalone/standaloneDataProviders.js";
import { handleErrorSaga } from "./views/showcaseOverview/handleErrorSaga.js";
import { selectRowReadonlySaga } from "./views/showcaseOverview/showcaseOverviewSagas.js";
import {
	fetchModelGraph,
	withTheme,
	withSizeDetector,
	withNotification,
	withReduxDevtool
} from "./config/composable/index.js";
import RelationshipUiOnly from "./modules/relationships/standalone/RelationshipUiOnly.js";
import { ApplicationFrameLayout } from "./views/application-frame-layout.js";
import { CustomRelationshipFormEngine } from "./modules/relationships/simpleCDM/CustomRelationshipFormEngine.js";

const applicationModules: Module[] = [{ id: "OverviewAppModel", model: () => OverviewAppModel as ApplicationModel }];

const reRequestSelectorMap: RequestSelectorMap = {
	...DefaultRequestSelectorMap,
	loadCandidates: (config) => (state) => {
		const request = DefaultRequestSelectorMap.loadCandidates(config)(state);
		return request;
	}
};

SampleAppModules.forEach((m) => ModuleRegistryProvider.getInstance().addModule(m));
const moduleDataLoaders = SampleAppModules.map((mod) => mod.dataLoaders || []).reduce(
	(prev, cur) => prev.concat(cur),
	[]
);

applicationModules.forEach((module) => ModuleRegistryProvider.getInstance().addModule(module));
const dataHandlers: DataHandler[] = [
	...moduleDataLoaders,
	...standaloneDataProviders,
	createCddDataProvider({ requestSelectorMap: reRequestSelectorMap }),
	createEmptyDocumentDataProvider(),
	RelationshipFactories.createRelationshipDataProvider({ requestSelectorMap: reRequestSelectorMap }),
	platformSingleDocumentDataProvider,
	...OverviewEngineFactories.createDataProviders()
];

const modulePlatformSagas = SampleAppModules.map((mod) => mod.applicationSagas || [])
	.reduce((prev, cur) => prev.concat(cur), [])
	.map((saga) => saga(applicationSagaConfig));
const applicationSagaConfig: ApplicationSaga.Configuration = { dataHandlers };

const withShowcaseContext = <T extends A12ApplicationConfig>(cfg: T) =>
	addWrapper<T>(ShowcaseContextProvider, "outer")(cfg);

const initialConfig: A12ApplicationConfig = {
	config: { overridePlatformSagas: [], dataHandlers: [] },
	initialActions: ({ dispatch }: Store) => fetchModelGraph(dispatch),
	deepLinking: { config: { applyTriggers: [ModelActions.setModelGraph] } },
	relationshipEngine: { requestSelectorMap: reRequestSelectorMap }
};

const { store, initialActions, Component } = createA12ApplicationSetup(
	combineFeatures(
		combineFeatures(
			addDataHandlers(...dataHandlers),
			addPlatformSagas(...modulePlatformSagas),
			addLayout("ApplicationFrame", { component: ApplicationFrameLayout }),
			addView("ShowcaseOverview", CRUDViews.OverviewEngineView),
			addView("RelationshipFormEngine", CRUDViews.FormEngineView),
			addView("RelationshipUiOnly", RelationshipUiOnly),
			addView("SortedRelationshipFormEngine", CustomRelationshipFormEngine),
			addCustomSagas(selectRowReadonlySaga, handleErrorSaga)
		),

		combineFeatures(
			withModel(model),
			withDataServicesConfiguration,
			withOverviewEngine,
			withRelationshipFormEngine,
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
			addDeepLinkingSagas
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

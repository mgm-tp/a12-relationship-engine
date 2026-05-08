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

import { compose, type Store, type Dispatch } from "redux";

import {
	ActivitySelectors,
	ApplicationActions,
	ApplicationFactories,
	type ApplicationSaga,
	type ApplicationSetup,
	type ComposeEnhancer,
	type Module,
	ModuleRegistryProvider,
	type DataHandler,
	type ApplicationModel,
	ModelActions,
	NotificationActions
} from "@com.mgmtp.a12.client/client-core";
import { DeepLinkingFactories } from "@com.mgmtp.a12.client/client-core/deepLinking";
import { DirtyHandlingFactories } from "@com.mgmtp.a12.client/client-core/dirtyHandling";
import { createPlatformServerModelLoader } from "@com.mgmtp.a12.client/client-core/modelLoader";
import { CRUDFactories } from "@com.mgmtp.a12.crud/crud-core";
import { ModelGraph } from "@com.mgmtp.a12.dataservices/dataservices-access";
import {
	createEmptyDocumentDataProvider,
	formEngineDataReducers,
	FormModelProcessor,
	platformAttachmentLoader,
	platformSingleDocumentDataProvider
} from "@com.mgmtp.a12.formengine/formengine-core";
import { OverviewEngineFactories } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import {
	cddDataHolderReducerExtension,
	cddReducers,
	cdmSagas,
	createCddDataProvider,
	createCdmMiddlewares,
	DefaultRequestSelectorMap,
	dgReducerFactory,
	RelationshipFactories,
	RelationshipReducers,
	type RequestSelectorMap
} from "@com.mgmtp.a12.relationshipengine/relationshipengine-core";
import { ConnectorLocator, RestServerConnector } from "@com.mgmtp.a12.utils/utils-connector/lib/main/index.js";

import model from "./appmodel.json" with { type: "json" };
import { CustomFormEngineSelectors } from "./modules/examples/dynamic-models/selector.js";
import { SampleAppModules } from "./modules/modules.js";
import { standaloneDataProviders } from "./modules/relationships/standalone/standaloneDataProviders.js";
import OverviewAppModel from "./overview-appmodel.json" with { type: "json" };
import { handleErrorSaga } from "./views/showcaseOverview/handleErrorSaga.js";
import { selectRowReadonlySaga } from "./views/showcaseOverview/showcaseOverviewSagas.js";

const applicationModules: Module[] = [{ id: "OverviewAppModel", model: () => OverviewAppModel as ApplicationModel }];

function getServerURL(): string {
	return window.location.pathname + "api";
}

const serverConnector = new RestServerConnector(getServerURL());
ConnectorLocator.createInstance(serverConnector);

let config: ApplicationSetup | undefined;

export function setup(): {
	store: Store;
	initialStoreActions(dispatch: Dispatch): Promise<void>;
} {
	SampleAppModules.forEach((m) => ModuleRegistryProvider.getInstance().addModule(m));
	const moduleDataLoaders = SampleAppModules.map((mod) => mod.dataLoaders || []).reduce(
		(prev, cur) => prev.concat(cur),
		[]
	);
	applicationModules.forEach((module) => ModuleRegistryProvider.getInstance().addModule(module));

	const reRequestSelectorMap: RequestSelectorMap = {
		...DefaultRequestSelectorMap,
		loadCandidates: (config) => (state) => {
			const request = DefaultRequestSelectorMap.loadCandidates(config)(state);
			return request;
		}
	};
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
	const applicationSagaConfig: ApplicationSaga.Configuration = {
		dataHandlers: dataHandlers
	};

	const dgReducers = dgReducerFactory(cddDataHolderReducerExtension);
	config = ApplicationFactories.createApplicationSetup({
		model,
		modelLoader: createPlatformServerModelLoader({ modelProcessors: [FormModelProcessor] }),
		dataHandlers: dataHandlers,
		overridePlatformSagas: [
			...OverviewEngineFactories.createApplicationSagas(),
			...modulePlatformSagas,
			...DirtyHandlingFactories.createSagas()
		],
		additionalMiddlewares: [
			CRUDFactories.createCRUDMiddleware(),
			...OverviewEngineFactories.createMiddlewares(),
			...createCdmMiddlewares({ engineStateSelector: CustomFormEngineSelectors.engineState })
		],
		customSagas: [
			...CRUDFactories.createSagas(),
			...RelationshipFactories.createSagas({ dataHandlers }),
			...DeepLinkingFactories.createSagas({
				applyTriggers: [ModelActions.setModelGraph]
			}),
			...cdmSagas({ attachmentLoader: platformAttachmentLoader }),
			selectRowReadonlySaga,
			handleErrorSaga
		],
		composeEnhancer: createComposeEnhancer(),
		dataReducers: [
			...RelationshipReducers.dataReducers,
			...OverviewEngineFactories.createDataReducers(),
			...formEngineDataReducers,
			...dgReducers,
			...cddReducers
		]
	});

	return { store: config.store, initialStoreActions };
}

function createComposeEnhancer(): ComposeEnhancer | undefined {
	return (...enhancers) => (enableReduxDevTools() ?? compose)(...enhancers);
}

async function initialStoreActions(dispatch: Dispatch): Promise<void> {
	try {
		const modelGraph = await serverConnector.fetchData(ModelGraph.build(true)).then((r) => r.json());
		dispatch(ModelActions.setModelGraph(modelGraph));
		dispatch(ApplicationActions.setBusy(false));
	} catch (e) {
		const error = e as Response;
		dispatch(
			NotificationActions.add({
				severity: "error",
				title: { key: "server.connection.failed" },
				message: { key: "any", defaults: { en: JSON.stringify(error.statusText, undefined, 2) } }
			})
		);
		throw error;
	}
}

declare let window: Window & {
	__REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: ComposeEnhancer;
};

/**
 * Trick to enable Redux DevTools with TS: see https://www.npmjs.com/package/redux-ts
 */
function enableReduxDevTools(): ComposeEnhancer | undefined {
	return typeof window !== "undefined" && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ !== undefined
		? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
		: undefined;
}

/*
 * Listen to the window.onbeforeunload event to trigger a dialog
 * if there are dirty or locked activities when the application gets closed.
 */
window.onbeforeunload = () => {
	if (!config) {
		throw new Error("Application is not setup yet.");
	}
	const dirtyActivities = ActivitySelectors.allDirtyOrLockedActivities()(config.store.getState());
	if (dirtyActivities.length > 0) {
		return "There are unsaved or locked activities.";
	}

	return undefined;
};

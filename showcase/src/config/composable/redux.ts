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

import { compose, type Dispatch } from "redux";

import { ModelGraph } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { ConnectorLocator, type RestServerConnector } from "@com.mgmtp.a12.utils/utils-connector";
import {
	ModelActions,
	ApplicationActions,
	NotificationActions,
	type ComposeEnhancer,
	type A12ApplicationConfig
} from "@com.mgmtp.a12.client/client-core";

export async function fetchModelGraph(dispatch: Dispatch): Promise<void> {
	try {
		const serverConnector = ConnectorLocator.getInstance().getServerConnector() as RestServerConnector;
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

export function createComposeEnhancer(): ComposeEnhancer | undefined {
	return (...enhancers) => (enableReduxDevTools() ?? compose)(...enhancers);
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

export const withReduxDevtool = <T extends A12ApplicationConfig>(cfg: T): T => ({
	...cfg,
	config: { ...cfg.config, composeEnhancer: createComposeEnhancer() }
});

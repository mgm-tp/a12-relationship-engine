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

import {
	addCustomSagas,
	setConfigured,
	combineFeatures,
	addAdditionalMiddlewares,
	type RequireFeatures,
	type A12ApplicationConfig,
	type ApplicationWithConfiguredFeature,
	addView,
	modifyView,
	type View
} from "@com.mgmtp.a12.client/client-core";
import type { OverviewEngineFactories } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import type { FormEngineViews } from "@com.mgmtp.a12.formengine/formengine-core";

import { CRUDFactories } from "./internal/factories.js";
import { CRUDViews } from "./internal/views.js";

/**
 * We use module augmentation to extend the A12ApplicationConfig type with CRUD options
 * This is applied once they import anything from this file
 */
declare module "@com.mgmtp.a12.client/client-core/lib/core/application/internal/factories/applicationConfig.js" {
	interface A12ApplicationConfig {
		readonly crud?: {
			readonly viewConfig?: {
				readonly overviewCRUD?: Omit<OverviewEngineFactories.ViewComponentProps, keyof View>;
				readonly formCRUD?: Omit<FormEngineViews.FormEngineProps, keyof View | "widgetMap" | "formModelMap">;
			};
		};
	}
}

/**
 * This describes that CRUD must not exist yet in the config.
 * @experimental
 */
export type ApplicationWithCRUDConfig = RequireFeatures<
	A12ApplicationConfig & { configured: { relationshipEngine: true; overviewEngine: true; formEngine: true } },
	{ crud?: never }
>;

/**
 * Adds CRUD middleware to the application config.
 * @experimental
 */
export const withCRUDMiddleware = <T extends ApplicationWithCRUDConfig>(cfg: T) =>
	addAdditionalMiddlewares<T>(CRUDFactories.createCRUDMiddleware())(cfg);

/**
 * Adds CRUD sagas to the application config.
 * @experimental
 */
export const withCRUDSagas = <T extends ApplicationWithCRUDConfig>(cfg: T) =>
	addCustomSagas<T>(...CRUDFactories.createSagas())(cfg);

/**
 * @experimental
 */
export const withOverviewCRUDView = <T extends ApplicationWithCRUDConfig>(cfg: T) =>
	addView<T>("OverviewCRUD", CRUDViews.OverviewEngineView)(cfg);

/**
 * @experimental
 */
export const withFormCRUDView = <T extends ApplicationWithCRUDConfig>(cfg: T) =>
	addView<T>("FormCRUD", CRUDViews.FormEngineView)(cfg);

/**
 * @experimental
 */
export const withConfiguredOverviewCRUD = <T extends ApplicationWithCRUDConfig>(cfg: T) =>
	modifyView<T>("OverviewCRUD", (Component) => {
		const crudConfig = cfg.crud?.viewConfig?.overviewCRUD ?? {};

		return (props) => <Component {...props} {...crudConfig} />;
	})(cfg);

/**
 * @experimental
 */
export const withConfiguredFormCRUD = <T extends ApplicationWithCRUDConfig>(cfg: T) =>
	modifyView<T>("FormCRUD", (Component) => {
		const crudConfig = cfg.crud?.viewConfig?.formCRUD ?? {};

		return (props) => <Component {...props} {...crudConfig} />;
	})(cfg);

/**
 * @experimental
 */
export const withCRUDViews = <T extends ApplicationWithCRUDConfig>(cfg: T) =>
	combineFeatures(withOverviewCRUDView, withFormCRUDView)(cfg);

/**
 * @experimental
 */
export const withConfiguredCRUDViews = <T extends ApplicationWithCRUDConfig>(cfg: T) =>
	combineFeatures(withConfiguredOverviewCRUD, withConfiguredFormCRUD)(cfg);

/**
 * Combined composable function that adds all CRUD features to the application config.
 * This includes middleware and sagas.
 *
 * @example
 * ```typescript
 * import { pipe } from "fp-ts/function";
 * import { withCRUD } from "@com.mgmtp.a12.crud/crud-core";
 *
 * const config = pipe(
 *   { config: {} } as A12ApplicationConfig,
 *
 *   // ...other features
 *   withOverviewEngine,
 *   withRelationshipFormEngine,
 *   withCRUD,
 *	 withPlatformModelLoader,
 * );
 * ```
 *
 * @experimental
 */
export const withCRUD = <T extends ApplicationWithCRUDConfig>(cfg: T): ApplicationWithConfiguredFeature<T, "crud"> =>
	setConfigured<T, "crud">("crud")(
		combineFeatures(withCRUDMiddleware, withCRUDSagas, withCRUDViews, withConfiguredCRUDViews)(cfg)
	);

// Re-export for convenience
export { CRUDFactories };
export { CRUDViews };

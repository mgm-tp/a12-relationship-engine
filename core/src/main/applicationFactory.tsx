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
 * @module relationship-engine/applicationFactory
 */

// we don't have a dependency on the modelLoader feature yet, but want to declare it to be future-proof
/// <reference types="@com.mgmtp.a12.client/client-core/lib/extensions/modelLoader/index.js" />

import {
	addDataHandlers,
	addDataReducers,
	addCustomSagas,
	addAdditionalMiddlewares,
	combineFeatures,
	type ApplicationWithConfiguredFeature,
	type A12ApplicationConfig,
	type RequireFeatures
} from "@com.mgmtp.a12.client/client-core";
import {
	withConfiguredFormEngine,
	withFormEngineDataHandlers,
	withFormEngineDataReducers,
	withFormEngineView,
	withFormModelSupport,
	type FormEngineSelectors
} from "@com.mgmtp.a12.formengine/formengine-core";

import { RelationshipFactories } from "../internal/relationship/factories.js";
import { RelationshipReducers } from "../internal/relationship/reducers.js";
import { createCdmMiddlewares, cdmSagas, createCddDataProvider } from "../internal/cdm/index.js";
import { cddReducers, cddDataHolderReducerExtension } from "../internal/cdm/cdd/redux/index.js";
import { dgReducerFactory } from "../internal/documentGraph/redux/index.js";
import {
	type RequestSelectorMap,
	DefaultRequestSelectorMap
} from "../internal/server-connectors/request-selector-map.js";
import { type CdmMiddlewareOptions } from "../internal/cdm/cdd/redux/middleware-options.js";
import { RelationshipViews } from "../internal/relationship/views.js";

/**
 * We use module augmentation to extend the A12ApplicationConfig type with more options
 * for users, this is applied once they import anything from this file.
 * We must use the "internal" path as TS does not support module augmentation for re-exported types.
 * See https://github.com/microsoft/TypeScript/issues/12607
 */
declare module "@com.mgmtp.a12.client/client-core/lib/core/application/internal/factories/applicationConfig.js" {
	interface A12ApplicationConfig {
		readonly relationshipEngine?: RelationshipEngineOptions;
	}
}
/**
 * Configuration options for the Relationship Engine.
 */ type RelationshipEngineOptions = {
	/** Custom request selector map for relationship and CDD data loading */
	readonly requestSelectorMap?: RequestSelectorMap;
	/** Form engine state selector for CDM middlewares */
	readonly engineStateSelector?: FormEngineSelectors.EngineStateSelector;
};

/**
 * Type representing configured relationship engine features.
 * Ensures mutual exclusivity with other engine configurations.
 */
type RelationshipEngineConfigured = {
	readonly relationshipEngine?: never;
	readonly formEngine?: never;
	readonly modelLoader?: never;
};

/**
 * Application configuration type with relationship engine features configured.
 */
export type ApplicationWithRelationshipEngineConfig = RequireFeatures<
	A12ApplicationConfig & { configured: { overviewEngine: true } },
	RelationshipEngineConfigured
>;

/**
 * Adds relationship data handlers (data providers) to the application.
 * Includes:
 * - Relationship data provider for loading links and candidates
 * - CDD data provider when CDM is enabled
 *
 * @param cfg - Application configuration object
 * @returns Enhanced application configuration with relationship engine data handlers
 * @experimental
 */
export const withRelationshipEngineDataHandlers = <T extends ApplicationWithRelationshipEngineConfig>(cfg: T) => {
	const requestSelectorMap = cfg.relationshipEngine?.requestSelectorMap ?? DefaultRequestSelectorMap;
	const handlers = [
		RelationshipFactories.createRelationshipDataProvider({ requestSelectorMap }),
		createCddDataProvider({ requestSelectorMap })
	];

	return addDataHandlers<T>(...handlers)(cfg);
};

/**
 * Adds relationship data reducers to the application.
 * Includes:
 * - Relationship reducers for managing link state
 * - Document Graph reducers when enabled
 * - CDD reducers when CDM is enabled
 *
 * @param cfg - Application configuration object
 * @returns Enhanced application configuration with relationship engine data reducers
 * @experimental
 */
export const withRelationshipEngineDataReducers = <T extends ApplicationWithRelationshipEngineConfig>(cfg: T) => {
	const reducers = [
		...RelationshipReducers.dataReducers,
		...dgReducerFactory(cddDataHolderReducerExtension),
		...cddReducers
	];

	return addDataReducers<T>(...reducers)(cfg);
};

/**
 * Adds relationship middlewares to the application.
 * Includes CDM middlewares for form engine integration when CDM is enabled.
 *
 * @param cfg - Application configuration object
 * @returns Enhanced application configuration with relationship engine middlewares
 * @experimental
 */
export const withRelationshipEngineMiddlewares = <T extends ApplicationWithRelationshipEngineConfig>(cfg: T) => {
	return addAdditionalMiddlewares<T>(
		...createCdmMiddlewares({
			nowProvider: cfg.formEngine?.middlewares?.nowProvider,
			engineStateSelector: cfg.relationshipEngine?.engineStateSelector
		})
	)(cfg);
};

/**
 * Adds relationship sagas to the application.
 * Includes:
 * - Relationship sagas for link management
 * - CDM sagas for form engine integration when CDM is enabled
 *
 * @param cfg - Application configuration object
 * @returns Enhanced application configuration with relationship engine sagas
 * @experimental
 */
export const withRelationshipEngineSagas = <T extends ApplicationWithRelationshipEngineConfig>(cfg: T) => {
	return addCustomSagas<T>(
		...RelationshipFactories.createSagas({ dataHandlers: cfg.config.dataHandlers ?? [] }),
		...cdmSagas(cfg.formEngine?.sagas)
	)(cfg);
};

/**
 * Main entry point - adds all Relationship Form Engine as well as the vanilla Form Engine features to an A12 application.
 * It is IMPORTANT that the withFormEngine should be excluded as both are incompatible with each other.
 *
 * This combines:
 * - Data handlers - {@link withRelationshipEngineDataHandlers}
 * - Form Engine features without its middlewares & sagas
 * - Data reducers - {@link withRelationshipEngineDataReducers}
 * - Middlewares - {@link withRelationshipEngineMiddlewares}
 * - Sagas - {@link withRelationshipEngineSagas}
 *
 * @param cfg - Application configuration object
 * @returns Enhanced application configuration with relationship form engine features
 *
 * @example
 * ```typescript
 * import { combineFeatures } from "@com.mgmtp.a12.client/client-core/lib/core/application/index.js";
 * import { withRelationshipFormEngine } from "@com.mgmtp.a12.relationshipengine/relationshipengine-core/lib/main/applicationFactory.js";
 *
 * const initialConfig = {
 *    config: {},
 *    relationshipEngine: {
 *      engineStateSelector: CustomFormEngineSelectors.engineState
 *    }
 * };
 *
 * const { store, initialActions, Component } = createA12ApplicationSetup(
 *   combineFeatures(
 *     // ...other features
 *     withOverviewEngine,
 *     withRelationshipFormEngine,
 *     withPlatformModelLoader,
 *   )(initialConfig)
 * );
 * ```
 *
 * @experimental
 */
export const withRelationshipFormEngine = <T extends ApplicationWithRelationshipEngineConfig>(
	cfg: T
): ApplicationWithConfiguredFeature<T, "formEngine" | "relationshipEngine"> => {
	const applyFormEngineFeatures = combineFeatures(
		withFormEngineDataHandlers,
		withFormEngineDataReducers,
		withFormEngineView,
		withConfiguredFormEngine,
		withFormModelSupport
	);

	const enhancedConfig = combineFeatures(
		withRelationshipEngineMiddlewares,
		withRelationshipEngineDataHandlers,
		//
		applyFormEngineFeatures,
		//
		withRelationshipEngineDataReducers,
		withRelationshipEngineSagas
	)(cfg);

	return {
		...enhancedConfig,
		configured: {
			...(enhancedConfig.configured ?? {}),
			formEngine: true,
			relationshipEngine: true
		}
	};
};

// Re-export for convenience
export { RelationshipFactories };
export { RelationshipReducers };
export { RelationshipViews };
export { DefaultRequestSelectorMap };
export type { RequestSelectorMap };
export type { CdmMiddlewareOptions };

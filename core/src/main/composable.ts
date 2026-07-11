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
 * @module relationship-engine/composable
 */

import {
	addCustomSagas,
	addDataReducers,
	combineFeatures,
	type RequireFeatures,
	addAdditionalMiddlewares,
	type A12ApplicationConfig,
	type ApplicationWithConfiguredFeature
} from "@com.mgmtp.a12.client/client-core";

import { RelationshipEngineFactories } from "./factories.js";

/**
 * Precondition type for the new `withRelationshipEngine` composable.
 *
 * Requires `formEngine` and `overviewEngine` to be configured first.
 * Prevents double-configuration of `relationshipEngine`.
 *
 * @experimental
 */
export type ApplicationWithNewREConfig = RequireFeatures<
	A12ApplicationConfig,
	{
		formEngine: true;
		overviewEngine: true;
		relationshipEngine?: never;
	}
>;

/**
 * Composable feature that adds Relationship Engine capabilities to an A12 application.
 *
 * Uses the new architecture (`core/src/store`, `core/src/client`, `core/src/view`) —
 * fully independent from the old CDM-based internal code.
 *
 * Unlike the legacy {@link withRelationshipFormEngine}, this composable is designed to
 * layer cleanly on top of `withFormEngine` and `withOverviewEngine` without conflicts.
 * The RE middlewares and sagas handle completely different concerns than FE/OE, so the
 * `combineFeatures` composition is additive.
 *
 * @remarks
 * **Attachment support**: Applications using CDM activities with attachments must pass
 * `RelationshipEngineFactories.createFormEngineSagaOptions()` via `initialConfig.formEngine.sagas`
 * before the composable chain runs. See the Getting Started guide for the full setup pattern.
 *
 * @example
 * ```typescript
 * const initialConfig: A12ApplicationConfig = {
 *   formEngine: { sagas: RelationshipEngineFactories.createFormEngineSagaOptions() }
 * };
 *
 * const { store, initialActions, Component } = createA12ApplicationSetup(
 *   combineFeatures(
 *     withFormEngine,
 *     withOverviewEngine,
 *     withRelationshipEngine,
 *   )(initialConfig)
 * );
 * ```
 *
 * @experimental
 */
export function withRelationshipEngine<T extends ApplicationWithNewREConfig>(
	cfg: T
): ApplicationWithConfiguredFeature<T, "relationshipEngine"> {
	const enhancedConfig = combineFeatures(
		(c: T) => ({
			...c,
			config: {
				...c.config,
				// Prepend to "win" Form Engine data providers
				dataHandlers: [...RelationshipEngineFactories.createDataProviders(), ...(c.config?.dataHandlers ?? [])]
			}
		}),
		(c: T) => addDataReducers<T>(...RelationshipEngineFactories.createDataReducers())(c),
		(c: T) => addAdditionalMiddlewares<T>(...RelationshipEngineFactories.createMiddlewares())(c),
		(c: T) =>
			addCustomSagas<T>(
				...RelationshipEngineFactories.createSagas(c.config.dataHandlers && { dataHandlers: c.config.dataHandlers })
			)(c)
	)(cfg);

	return {
		...enhancedConfig,
		configured: {
			...(enhancedConfig.configured ?? {}),
			relationshipEngine: true,
			newRelationshipEngine: true
		}
	} satisfies ApplicationWithConfiguredFeature<T, "relationshipEngine">;
}

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

import type { Middleware } from "redux";
import type { SagaGenerator } from "typed-redux-saga";

import type { DataProvider } from "@com.mgmtp.a12.client/client-core";
import type { ApplicationSaga } from "@com.mgmtp.a12.client/client-core";
import type { ActivityReducers } from "@com.mgmtp.a12.client/client-core";
import type { FormEngineSagaOptions } from "@com.mgmtp.a12.formengine/formengine-core";

import {
	type RelationshipEngineFormModelMap,
	createRelationshipEngineFormModelMap,
	type RelationshipEngineFormModelMapOptions
} from "../view/index.js";
import {
	createRelationshipEngineDataProvider,
	type RelationshipEngineDataProviderOptions,
	createRelationshipEngineDynamicLinkFormDataProvider
} from "../client/index.js";
import {
	createRelationshipEngineSagas,
	RelationshipEngineDataReducers,
	createRelationshipEngineMiddlewares,
	type RelationshipEngineMiddlewareOptions
} from "../store/index.js";

import {
	createRelationshipEngineFormEngineOptions,
	createRelationshipEngineDocumentDescriptorSelector
} from "./formEngineOptions.js";

/**
 * Configuration of factories for relationship engine components
 */
export namespace RelationshipEngineFactories {
	export function createSagas(
		config?: ApplicationSaga.Configuration,
		options?: RelationshipEngineMiddlewareOptions
	): (() => SagaGenerator<void>)[] {
		return [createRelationshipEngineSagas(options)];
	}

	export function createDataReducers(): ActivityReducers.DataReducer[] {
		return RelationshipEngineDataReducers;
	}

	export type MiddlewareOptions = RelationshipEngineMiddlewareOptions;
	export function createMiddlewares(options?: RelationshipEngineMiddlewareOptions): Middleware[] {
		return createRelationshipEngineMiddlewares(options);
	}

	export type DataProviderOptions = RelationshipEngineDataProviderOptions;

	export function createDataProviders(options?: DataProviderOptions): DataProvider[] {
		return [createRelationshipEngineDataProvider(options), createRelationshipEngineDynamicLinkFormDataProvider()];
	}

	export function createFormModelMap(options?: RelationshipEngineFormModelMapOptions): RelationshipEngineFormModelMap {
		return createRelationshipEngineFormModelMap(options);
	}

	/** Creates Form Engine saga options with the RE document descriptor selector pre-wired. */
	export function createFormEngineSagaOptions(options?: FormEngineSagaOptions): FormEngineSagaOptions {
		return createRelationshipEngineFormEngineOptions(options);
	}

	/** Returns a `documentDescriptorSelector` for use with Form Engine saga options, with an optional override. */
	export function createDocumentDescriptorSelector(
		override?: FormEngineSagaOptions["documentDescriptorSelector"]
	): FormEngineSagaOptions["documentDescriptorSelector"] {
		return createRelationshipEngineDocumentDescriptorSelector(override);
	}
}

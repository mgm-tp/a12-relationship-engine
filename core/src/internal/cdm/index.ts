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
 * @module cdm
 * @experimental
 */
import { type Middleware } from "redux";
import { type SagaIterator } from "redux-saga";

import {
	createEngineMiddlewares,
	type FormEngineSagaOptions,
	formEngineSagas
} from "@com.mgmtp.a12.formengine/formengine-core";

import { cddDocumentDescriptorSelector } from "./cdd/core/documentDescriptorSelector.js";
import { cddFormEngineMiddlewareAdapterFactory } from "./cdd/redux/cddMiddlewareAdapterFactory.js";
import cdmFormEngineChangeLogMiddleware from "./cdd/redux/cdm_fe_changelog.js";
import { type CdmMiddlewareOptions } from "./cdd/redux/middleware-options.js";
import { createScdmComputationMiddleware } from "./cdd/redux/scdm_computations.js";
import { queryRootName } from "./commons/modelUtils.js";
import { createCandidateDataHoldersSaga } from "./dataProvider/loadCandidates.js";
import loadDataMiddleware from "./dataProvider/loadDataMiddleware.js";
import { disableHandlingMiddleware } from "./dataProvider/subactivity/disable-handling-middleware.js";

export { createCddDataProvider } from "./dataProvider/cddDataProvider.js";
export { RESOURCE_KEYS as CDM_RESOURCE_KEYS } from "./languages/index.js";

/**
 * Everything in these modules is part of the experimental SCDM feature.
 */
export const EXPERIMENTAL = true;

export function cdmSagas(options?: FormEngineSagaOptions): (() => SagaIterator<void>)[] {
	return [
		createCandidateDataHoldersSaga,
		...formEngineSagas({
			...options,
			documentDescriptorSelector: options?.documentDescriptorSelector ?? cddDocumentDescriptorSelector
		})
	];
}

export function createCdmMiddlewares(options?: CdmMiddlewareOptions): Middleware[] {
	return [
		cddFormEngineMiddlewareAdapterFactory(createEngineMiddlewares(), options?.engineStateSelector),
		loadDataMiddleware,
		createScdmComputationMiddleware(options),
		cdmFormEngineChangeLogMiddleware,
		disableHandlingMiddleware
	];
}
export { queryRootName };

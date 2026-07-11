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
import { call, type SagaGenerator } from "typed-redux-saga";

import type { View } from "@com.mgmtp.a12.client/client-core";

import { crudMiddlewareWithoutValidation } from "./middlewares.js";
import { deleteRowSaga, selectRowSaga, createNewDocumentSaga } from "./sagas.js";
import { CRUDOverviewView as OverviewCRUD } from "./components/overview-engine.js";

export namespace CRUDFactories {
	/**
	 * Provides the application sagas necessary for the CRUD functionality.
	 */
	export function createSagas(): (() => SagaGenerator<void>)[] {
		return [
			function* (): SagaGenerator<void> {
				yield* call(createNewDocumentSaga);
			},
			function* (): SagaGenerator<void> {
				yield* call(selectRowSaga);
			},
			function* (): SagaGenerator<void> {
				yield* call(deleteRowSaga);
			}
		];
	}

	/**
	 * Provides the views (React components) to be used for the CRUD functionality.
	 */
	export function createCRUDRenderer(componentName: string): React.ComponentType<View> | undefined {
		return Views[componentName];
	}

	/**
	 * A middleware that provides the CRUD functionality for the Form Engine.
	 */
	export function createCRUDMiddleware(): Middleware {
		return crudMiddlewareWithoutValidation;
	}
}

const Views: { readonly [name: string]: React.ComponentType<View> } = {
	OverviewCRUD
};

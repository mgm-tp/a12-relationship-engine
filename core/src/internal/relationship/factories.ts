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
 * @module relationship
 */

import { type SagaIterator } from "redux-saga";

import { type ApplicationSaga, type DataProvider } from "@com.mgmtp.a12.client/client-core";

import { type RequestSelectorMap } from "../server-connectors/request-selector-map.js";

import * as RelationshipDataProvider from "./platform/relationshipDataProvider/RelationshipDataProvider.js";
import { addLinkSaga } from "./sagas/addLink.js";
import { addLinkDoneSaga } from "./sagas/addLinkDone.js";
import { addLinkRequestedSaga } from "./sagas/addLinkRequest.js";
import { deleteLinkSaga } from "./sagas/deleteLink.js";
import { filterChangedSaga } from "./sagas/filterChanged.js";
import { initializeDataHoldersSaga } from "./sagas/initializeDataHolders.js";
import { pageChangedSaga } from "./sagas/pageChanged.js";
import { pageExpandedSaga } from "./sagas/pageExpanded.js";
import { sortChangedSaga } from "./sagas/sortChanged.js";

/**
 * Configuration of factories for relationship components
 */
export namespace RelationshipFactories {
	/** Creates a list of necessary sagas for the relationship extension. */
	export function createSagas(config: ApplicationSaga.Configuration): (() => SagaIterator<void>)[] {
		return [
			addLinkSaga,
			addLinkRequestedSaga,
			addLinkDoneSaga,
			deleteLinkSaga,
			filterChangedSaga,
			pageChangedSaga,
			pageExpandedSaga,
			sortChangedSaga,
			() => initializeDataHoldersSaga(config)
		];
	}

	export function createRelationshipDataProvider(options?: { requestSelectorMap?: RequestSelectorMap }): DataProvider {
		return RelationshipDataProvider.createRelationshipDataProvider(options);
	}
}

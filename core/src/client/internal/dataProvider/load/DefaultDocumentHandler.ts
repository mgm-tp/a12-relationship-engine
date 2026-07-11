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

import { call, select, type SagaGenerator } from "typed-redux-saga";

import type { DataProvider } from "@com.mgmtp.a12.client/client-core";
import { Activity, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";

import type { DataProviderHandler } from "../types.js";
import type { RelationshipEngineActions } from "../../../../store/index.js";
import { ModelSelectors, RelationshipEngineDataHolder } from "../../../../store/index.js";
import {
	type RequestSelectorMap as RERequestSelectorMap,
	DefaultRequestSelectorMap as REDefaultRequestSelectorMap
} from "../../requestSelectorMap.js";

import { loadDocument, loadDocumentGraph, type DocumentLoadResult } from "./document.js";

/**
 * Handler for loading the default (document / documentGraph) data holder.
 *
 * This handler picks the "default" data holder from the activity and loads it:
 * - For CDD activities it calls `loadDocumentGraph`.
 * - For standard activities it calls `loadDocument`.
 *
 * The loaded data is dispatched via `RelationshipEngineActions.Commands.setDataHolders`.
 */
export class DefaultDocumentHandler implements DataProviderHandler {
	readonly name = "DefaultDocumentHandler";
	private readonly requestSelectorMap: RERequestSelectorMap;

	constructor(requestSelectorMap?: RERequestSelectorMap) {
		this.requestSelectorMap = requestSelectorMap ?? REDefaultRequestSelectorMap;
	}

	canHandle(dataHolders: Activity.DataHolder[]): DataProviderHandler.CanHandleResult {
		const handled: Activity.DataHolder[] = [];
		const remaining: Activity.DataHolder[] = [];

		for (const dataHolder of dataHolders) {
			if (this.isDefaultDataHolder(dataHolder)) {
				handled.push(dataHolder);
			} else {
				remaining.push(dataHolder);
			}
		}

		return { handled, remaining };
	}

	*handle(params: DataProvider.LoadConfig): SagaGenerator<RelationshipEngineActions.Commands.UpdatedDataHolder[]> {
		const result = yield* call(this.handleWithThumbnails.bind(this), params);

		return result.updates;
	}

	/**
	 * Loads the default data holder and returns updates alongside the collected thumbnail map.
	 * @internal
	 */
	*handleWithThumbnails(params: DataProvider.LoadConfig): SagaGenerator<DocumentLoadResult> {
		if (!params.dataHolders || params.dataHolders.length === 0) {
			return { updates: [], thumbnails: {} };
		}

		// Find the default data holder from the activity store (authoritative source)
		const existingDefaultDataHolder = yield* select(
			ActivitySelectors.activityPropById(params.activityId, Activity.findDefaultDataHolder)
		);

		// Find the matching holder in the provided data holders list
		const defaultDataHolder =
			existingDefaultDataHolder &&
			params.dataHolders.find(Activity.DataHolder.hasDescriptor(existingDefaultDataHolder.descriptor));

		if (!defaultDataHolder) {
			return { updates: [], thumbnails: {} };
		}

		return yield* call(this.loadDefaultDataHolder.bind(this), params, defaultDataHolder);
	}

	private *loadDefaultDataHolder(
		params: DataProvider.LoadConfig,
		defaultDataHolder: Activity.DataHolder
	): SagaGenerator<DocumentLoadResult> {
		const isCdm = yield* select(ModelSelectors.isCdmActivity(params.activityId));

		if (isCdm) {
			return yield* call(loadDocumentGraph, params, defaultDataHolder, this.requestSelectorMap);
		}

		return yield* call(loadDocument, params, defaultDataHolder, this.requestSelectorMap);
	}

	/**
	 * A data holder is the "default" holder when it is neither a relationship-engine
	 * specific holder (link, candidate, changelog, document_graph, dropdown_selection)
	 * nor an internal holder. It typically has no feature or has model/instance descriptors.
	 */
	private isDefaultDataHolder(dataHolder: Activity.DataHolder): boolean {
		return (
			!RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance(dataHolder) &&
			!RelationshipEngineDataHolder.AvailableItemsDataHolder.isInstance(dataHolder) &&
			!RelationshipEngineDataHolder.ChangelogDataHolder.isInstance(dataHolder) &&
			!RelationshipEngineDataHolder.DocumentGraphDataHolder.isInstance(dataHolder) &&
			!RelationshipEngineDataHolder.DropdownSelectionDataHolder.isInstance(dataHolder)
		);
	}
}

/**
 * Creates a new DefaultDocumentHandler instance.
 */
export function createDefaultDocumentHandler(): DefaultDocumentHandler {
	return new DefaultDocumentHandler();
}

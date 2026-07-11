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

import { put, call, select, type SagaGenerator } from "typed-redux-saga";

import { type Activity, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";

import { SourceEntitySelectors } from "../../../../store/index.js";
import { DocumentGraphSelectors } from "../../../../store/index.js";
import { RelationshipEngineActions } from "../../../../store/index.js";
import { RelationshipEngineDataHolder } from "../../../../store/index.js";
import type { SourceEntityHolder, SourceEntityUpdate } from "../../../../store/index.js";

/**
 * Pre-processes data holders by resolving source entity docRefs.
 *
 * For overview data holders (selected and available items) and dropdown selection data holders,
 * this function:
 * 1. Resolves the document graph snapshot (from store).
 * 2. Resolves the source entity docRef for each dataHolder using the document graph.
 * 3. Dispatches source entity updates to the store.
 * 4. Returns the full list of data holders with updated holders substituted.
 *
 * Non-overview / non-dropdown data holders are passed through unchanged.
 */
export function* prepareOverviewDataHolders(
	activityId: string,
	dataHolders: Activity.DataHolder[]
): SagaGenerator<Activity.DataHolder[]> {
	const overviewDataHolders = dataHolders.filter(isOverviewInstanceDataHolder);
	const dropdownDataHolders = dataHolders.filter(RelationshipEngineDataHolder.DropdownSelectionDataHolder.isInstance);

	if (overviewDataHolders.length === 0 && dropdownDataHolders.length === 0) {
		return dataHolders;
	}

	const rootDocRef = yield* select(DocumentGraphSelectors.rootDocRef(activityId));
	const activityInstanceDocRef = yield* select(
		ActivitySelectors.activityPropById(activityId, (activity) => activity?.descriptor.instance)
	);

	// Resolve source entities for all holders that have sourceEntity
	const allHolders: SourceEntityHolder[] = [...overviewDataHolders, ...dropdownDataHolders];

	const { preparedDataHolders: preparedHolders, sourceEntityUpdates } = yield* call(prepareSourceEntities, {
		activityId,
		dataHolders: allHolders,
		rootDocRef: rootDocRef ?? undefined,
		activityInstanceDocRef: activityInstanceDocRef ?? undefined
	});

	if (sourceEntityUpdates.length > 0) {
		yield* put(RelationshipEngineActions.Commands.setSourceEntities({ activityId, updates: sourceEntityUpdates }));
	}

	// Rebuild the full data holders list, substituting prepared holders
	const preparedMap = new Map(preparedHolders.map((h) => [descriptorKey(h.descriptor), h as Activity.DataHolder]));

	return dataHolders.map((dh) => {
		const key = descriptorKey(dh.descriptor);

		return preparedMap.get(key) ?? dh;
	});
}

function isOverviewInstanceDataHolder(
	dataHolder: Activity.DataHolder
): dataHolder is RelationshipEngineDataHolder.InstanceDataHolder {
	return (
		RelationshipEngineDataHolder.AvailableItemsDataHolder.isInstance(dataHolder) ||
		RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance(dataHolder)
	);
}

function descriptorKey(descriptor: Activity.DataHolderDescriptor): string {
	return JSON.stringify(descriptor);
}

interface PrepareSourceEntitiesParams {
	readonly activityId: string;
	readonly dataHolders: SourceEntityHolder[];
	readonly rootDocRef?: string;
	readonly activityInstanceDocRef?: string;
}

interface PrepareSourceEntitiesResult {
	readonly preparedDataHolders: SourceEntityHolder[];
	readonly sourceEntityUpdates: SourceEntityUpdate[];
}

function* prepareSourceEntities(params: PrepareSourceEntitiesParams): SagaGenerator<PrepareSourceEntitiesResult> {
	const { activityId, dataHolders, rootDocRef, activityInstanceDocRef } = params;

	const preparedDataHolders: SourceEntityHolder[] = [];
	const updates: SourceEntityUpdate[] = [];

	for (const dataHolder of dataHolders) {
		const fallbackDocRef = dataHolder.slices.sourceEntity.docRef ?? rootDocRef ?? activityInstanceDocRef ?? undefined;
		const resolvedDocRef = yield* select(SourceEntitySelectors.resolvedDocRef(activityId, dataHolder, fallbackDocRef));

		if (resolvedDocRef && dataHolder.slices.sourceEntity.docRef !== resolvedDocRef) {
			const updatedSourceEntity = { ...dataHolder.slices.sourceEntity, docRef: resolvedDocRef };
			const preparedHolder = {
				...dataHolder,
				slices: { ...dataHolder.slices, sourceEntity: updatedSourceEntity }
			} as SourceEntityHolder;
			preparedDataHolders.push(preparedHolder);
			updates.push({
				descriptor: dataHolder.descriptor,
				sourceEntity: updatedSourceEntity
			});
		} else {
			preparedDataHolders.push(dataHolder);
		}
	}

	return { preparedDataHolders, sourceEntityUpdates: updates };
}

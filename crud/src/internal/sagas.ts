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

import { put, call, select, takeLatest, type SagaGenerator } from "typed-redux-saga";

import { LoggerFactory } from "@com.mgmtp.a12.utils/utils-logging";
import type { Action } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";
import { OverviewActivity } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import {
	ActivitySagas,
	ModelSelectors,
	ActivityActions,
	ActivitySelectors,
	NEW_INSTANCE_IDENTIFIER
} from "@com.mgmtp.a12.client/client-core";

import { CRUDActions } from "./actions.js";
import { assertObject } from "./utils/assertion.js";

const logger = LoggerFactory.getLogger("extensions/crud");

/** @internal */
export function* createNewDocumentSaga(): SagaGenerator<void> {
	yield* takeLatest(CRUDActions.createNewDocument, createNewDocument);
}

/** @internal */
export function* selectRowSaga(): SagaGenerator<void> {
	yield* takeLatest(CRUDActions.selectRow, selectRow);
}

/** @internal */
export function* deleteRowSaga(): SagaGenerator<void> {
	yield* takeLatest(CRUDActions.deleteRow, deleteRow);
}

/** @internal */
export function* createNewDocument(action: Action<CRUDActions.CreateNewDocumentPayload>): SagaGenerator<void> {
	const activity = yield* select(ActivitySelectors.activityById(action.payload.activityId));

	if (activity === undefined) {
		throw new Error(`Activity [id: ${action.payload.activityId}] does not exist in the store anymore.`);
	}

	logger.info("create new document");

	const activityDescriptor = {
		...activity.descriptor,
		model: action.payload.model,
		instance: NEW_INSTANCE_IDENTIFIER
	};

	const createActivity = ActivityActions.create({
		activityDescriptor,
		initiatingActivityId: action.payload.activityId
	});

	yield* call(cancelDocumentActivityIfPresent, activity.id, createActivity);
}

function* selectRow(action: Action<CRUDActions.SelectRowPayload>): SagaGenerator<void> {
	const { instanceId, activityId } = action.payload;
	const activity = yield* select(ActivitySelectors.activityById(activityId));

	if (activity === undefined) {
		throw new Error(`Activity [id: ${activityId}] does not exist in the store anymore.`);
	}

	logger.info("open document");

	if (!OverviewActivity.Data.DocumentListData.isInstance(activity.dataHolders[0].data)) {
		throw new Error(`Activity [id: ${activityId}] does not contain a document list.`);
	}

	const documents = activity.dataHolders[0].data.documents;
	const modelId = documents?.find((item) => item?.id === instanceId)?.modelId;

	if (modelId === undefined) {
		throw new Error(`Cannot find modelId for document ${instanceId}, activity [id: ${activityId}]`);
	}

	const modelGraph = yield* select(ModelSelectors.modelGraph());

	const root = modelGraph.composeDocumentModels.find((cdm) => cdm.modelId === modelId)?.rootDocumentModelId;

	// when selecting rows from a CDM overview, model will always reference the CDM
	// in case the CDM has an abstract root, we need to identify the correct model
	const modelIdToUse = root ? extractModelFromInstance(instanceId) : modelId;

	const activityDescriptor = {
		...activity.descriptor,
		instance: instanceId,
		model: modelIdToUse
	};

	const createActivity = ActivityActions.create({
		activityDescriptor,
		initiatingActivityId: activityId
	});

	yield* call(cancelDocumentActivityIfPresent, activityId, createActivity);
}

function* deleteRow(action: Action<CRUDActions.DeleteRowPayload>): SagaGenerator<void> {
	const { activityId, instanceId } = action.payload;
	const activity = yield* select(ActivitySelectors.activityById(activityId));

	if (activity === undefined) {
		throw new Error(`Activity [id: ${activityId}] not found.`);
	}

	const activityWithInstance = yield* select(ActivitySelectors.childActivityWithInstance(activity.id));

	if (activityWithInstance?.descriptor.instance === instanceId) {
		logger.log("Cancel document before delete");

		yield* put(ActivityActions.cancelRequested({ activityIds: [activityWithInstance.id] }));

		const cancelled = yield* call(ActivitySagas.waitForResponseCancelRequested);

		if (!cancelled) {
			return;
		}
	}

	yield* put(ActivityActions.removeData({ instanceId, activityId }));
}

function* cancelDocumentActivityIfPresent(
	activityId: string,
	action: Action<ActivityActions.PushPayload>
): SagaGenerator<void> {
	const activity = yield* select(ActivitySelectors.activityById(activityId));
	assertObject(activity);

	const activityWithInstance = yield* select(ActivitySelectors.childActivityWithInstance(activity.id));

	if (activityWithInstance) {
		logger.log("cancel document");

		yield* put(
			ActivityActions.cancelRequested({
				activityIds: [activityWithInstance.id],
				replacementActivity: action.payload.activity
			})
		);

		const cancelled = yield* call(ActivitySagas.waitForResponseCancelRequested);

		if (!cancelled) {
			return;
		}
	} else {
		yield* put(action);
	}
}

function extractModelFromInstance(instanceId: string): string {
	return instanceId.split("/")[0];
}

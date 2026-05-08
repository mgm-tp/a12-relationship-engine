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
 * @module cdm/cdd
 * @experimental
 */
import { type Action } from "typescript-fsa";

import { isActivityActionWithModelsInScenePayload, Model } from "@com.mgmtp.a12.client/client-core";
import { type Change } from "@com.mgmtp.a12.formengine/formengine-core";

import { assertCondition } from "../../../../shared/assertion.js";
import { createPresentRelationshipsCache } from "../../../cddUtils/setValue.js";

import { type ChangeCddDocumentPayload } from "../actions.js";
import { type ScdmDataHolderShape, updateLoadingStateAndBusy } from "../dhReducersImpl.js";
import { newDocRef } from "../newDocRef.js";

import { type HandleArgs } from "./handleArgs.js";
import { handleGroupAdded } from "./handleGroupAdded.js";
import { handleGroupMoved } from "./handleGroupMoved.js";
import { handleGroupRemoved } from "./handleGroupRemoved.js";
import { handleValueChanged } from "./handleValueChanged.js";
import { preProcessChanges } from "./preProcessChanges.js";

/**
 * @internal
 *
 * Reducer "handler" for changes of the CDD from the FE.
 *
 * All changes that occur in SCDM except revert are processed in the given order.
 *
 * Revert is handled by the FE change log middleware.
 *
 * All other changes are ignored because they do not occur with SCDM.
 */
export function handleChangeCddDocument(
	dataHolder: ScdmDataHolderShape,
	action: Action<ChangeCddDocumentPayload>
): ScdmDataHolderShape {
	const cddState = dataHolder.data?.cddState;
	if (cddState === undefined) {
		return dataHolder;
	}

	assertCondition(isActivityActionWithModelsInScenePayload(action.payload));

	const { activityId, changes, document, modelGraph, modelsInScene, preProcessed } = action.payload;

	const documentModels = modelsInScene.flatMap((r) => (Model.isDocumentModel(r.model) ? r.model : []));

	let currentState = dataHolder;

	const cache = createPresentRelationshipsCache();
	const preProcessedChanges = preProcessChanges(changes, document);
	for (const change of preProcessedChanges) {
		const args: HandleArgs = {
			activityId,
			document,
			documentModels,
			modelGraph,
			change,
			newDocRef,
			cache
		};
		currentState = handleChange(currentState, args);
	}

	const dhResult = currentState;
	if (preProcessed && dhResult.data?.cddState && dhResult.data.cddState.preProcessed !== true) {
		return updateLoadingStateAndBusy({
			...dhResult,
			data: {
				...dhResult.data,
				cddState: { ...dhResult.data.cddState, preProcessed: true }
			}
		});
	}
	return updateLoadingStateAndBusy(dhResult);
}

function handleChange(state: ScdmDataHolderShape, args: HandleArgs): ScdmDataHolderShape {
	const handler = handlers[args.change.type] ?? IdentityHandler;
	return handler(state, args);
}

const IdentityHandler: ChangeHandler = (state) => state;

const handlers: { [key in Change["type"]]: ChangeHandler | undefined } = {
	GroupAdded: handleGroupAdded,
	GroupMoved: handleGroupMoved,
	GroupRemoved: handleGroupRemoved,
	ValueChanged: handleValueChanged,
	Revert: IdentityHandler
};

/**
 * @internal
 *
 * exported for only for testing!
 */
export type ChangeHandler = (state: ScdmDataHolderShape, args: HandleArgs) => ScdmDataHolderShape;

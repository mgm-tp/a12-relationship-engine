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
import deepEqual from "fast-deep-equal";
import { type AnyAction, type Middleware } from "redux";

import { Activity, ActivitySelectors, ModelSelectors, StoreFactories } from "@com.mgmtp.a12.client/client-core";
import {
	type Change,
	Commands,
	type EngineStore,
	UiStateSelectors,
	computeDocument,
	FormEngineSelectors,
	preProcessDocument,
	type FormModel,
	type ReadonlyObjectMap
} from "@com.mgmtp.a12.formengine/formengine-core";

import * as CddActions from "./actions.js";
import { cddStateAdapter } from "./cddMiddlewareAdapterFactory.js";
import { type ScdmDataHolderShape } from "./dhReducersImpl.js";
import { type CdmMiddlewareOptions } from "./middleware-options.js";
import { isNewDocRef } from "./newDocRef.js";

/**
 * Middleware to execute computations in the CDD _after_ the DG has changed.
 *
 * The middleware is created using a factory function which must receive
 * exactly the same options as the regular FE middlewares.
 *
 * The middleware listens to all changes that change the DG. Then, it retrieves
 * the CDD and runs the computations. Finally, it writes changed data back to
 * the DG and potential validation messages to the FE UI state.
 *
 * Note: This middleware is only a temporary workaround. It uses an internal
 * function of the FE to do the computations. The final solution should be
 * independent of the FE. But for that, computation and validation must be
 * implemented in the DG and the FE must use DG.
 */
export const createScdmComputationMiddleware = (middlewareOptions?: CdmMiddlewareOptions): Middleware =>
	StoreFactories.createMiddleware((api, next, action) => {
		const result = next(action);

		if (!isRelevantAction(action)) {
			return result;
		}

		const activityId = action.payload.activityId;
		const clientState = api.getState();

		const activity = ActivitySelectors.activityById(activityId)(clientState);
		const defaultDataHolder = Activity.findDefaultDataHolder(activity);
		const isLoadingData = defaultDataHolder?.loadingState === "loading";
		if (!defaultDataHolder || isLoadingData) {
			return result;
		}

		// using the cdm in the data holder to retrieve the validation code
		const cdm = (defaultDataHolder as ScdmDataHolderShape).data?.cddState.cdm;
		if (!cdm) {
			return result;
		}

		const cdd = (defaultDataHolder as ScdmDataHolderShape).data?.cddState.cachedCdd?.cdd;
		if (!cdd) {
			return result;
		}

		const cddState = cddStateAdapter(activityId)(clientState);

		const models = FormEngineSelectors.models(activityId)(cddState);
		const engineState = FormEngineSelectors.engineState(activityId)(cddState);
		const validatorProvider = models?.validatorProvider;

		const inputMsgs = engineState
			? UiStateSelectors.messages()(engineState)
			: ({} as ReadonlyObjectMap<EngineStore.Validation.Entry>);

		let updatedDocument = cdd as object;
		let messages: ReadonlyObjectMap<EngineStore.Validation.Entry> = {};
		let changes: ReadonlyObjectMap<Change> = {};

		let preProcessed = (defaultDataHolder as ScdmDataHolderShape).data?.cddState.preProcessed;

		if (models && validatorProvider) {
			if (!preProcessed) {
				const computed = preProcessDocument({
					document: cdd,
					models: { ...models, formModel: adaptFormModelForCdmDefault(models.formModel), validatorProvider },
					isNewInstance: isNewDocRef(defaultDataHolder.descriptor["instance"] ?? ""),
					now: engineState ? middlewareOptions?.nowProvider?.(engineState) : undefined
				});
				updatedDocument = computed.document;
				messages = computed.messages ?? {};
				changes = computed.changes;
				preProcessed = true;
			} else {
				const computed = computeDocument({
					document: cdd,
					validatorProvider,
					kernelConfiguration: {
						now: engineState ? middlewareOptions?.nowProvider?.(engineState) : undefined
					}
				});
				updatedDocument = computed.document;
				changes = computed.changes;
				messages = computed.messages ?? {};
			}
		}

		const updatedMsgs = updateMessages(inputMsgs, changes, messages);

		const modelGraph = ModelSelectors.modelGraph()(clientState);
		api.dispatch(
			CddActions.changeCddDocument({
				activityId,
				document: updatedDocument,
				modelGraph,
				changes,
				preProcessed
			})
		);

		if (!deepEqual(inputMsgs, updatedMsgs)) {
			api.dispatch(Commands.setMessageState({ messages: updatedMsgs }));
		}

		return result;
	});

function isRelevantAction(action: AnyAction): boolean {
	return (
		[CddActions.merge, CddActions.addCddLink, CddActions.saveSubActivity, CddActions.removedCddLink].some((a) =>
			a.match(action)
		) || isChangeCddDocActionWithGroupAdded(action)
	);
}

/**
 * Necessary to recompute after entering detail screen, e.g. to update computed
 * fields dependent on t_docRef fields for links that are created by initial
 * values within the added group.
 *
 * It is assumed that the computation only creates 'ValueChanged' changes,
 * otherwise we would get an endless loop.
 */
function isChangeCddDocActionWithGroupAdded(action: AnyAction): boolean {
	return (
		CddActions.changeCddDocument.match(action) &&
		Object.values(action.payload.changes).some((change) => change?.type === "GroupAdded")
	);
}

/*
 * updates the messages for the FE validation state:
 * - removes all entries for fields that were changed by the computation
 * - adds all validation messages that resulted from the validation during the computation
 */
function updateMessages(
	originalMsgs: ReadonlyObjectMap<EngineStore.Validation.Entry>,
	changes: ReadonlyObjectMap<Change>,
	newMsgs: ReadonlyObjectMap<EngineStore.Validation.Entry>
): ReadonlyObjectMap<EngineStore.Validation.Entry> {
	const changedFields = Object.keys(changes);

	if (changedFields.length === 0 && Object.keys(newMsgs).length === 0) {
		return originalMsgs;
	}

	const filteredMsgs: ReadonlyObjectMap<EngineStore.Validation.Entry> = Object.fromEntries(
		Object.entries(originalMsgs).filter(([key, entry]) => entry && !changedFields.includes(key)) as [
			string,
			EngineStore.Validation.Entry
		][]
	);

	return { ...filteredMsgs, ...newMsgs };
}

/**
 * Adapts the form model for CDM default behavior.
 * - CDM form is reusing function from form engine to pre-process the cdd document.
 * - The CDM default behavior is different from the form engine default behavior due to a fact, cdd document is constructed client-side only.
 * Therefore, if the function doesn't find a value for openExistingDocumentPreProcessing it will assume the form engine default to always evaluate computations.
 */
function adaptFormModelForCdmDefault(formModel: FormModel): FormModel {
	return {
		...formModel,
		content: {
			...formModel.content,
			openExistingDocumentPreProcessing: formModel.content.openExistingDocumentPreProcessing ?? "COMPUTATIONS"
		}
	};
}

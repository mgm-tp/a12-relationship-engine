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
 * @module cdm/data-provider
 * @experimental
 */
import { type SagaIterator } from "redux-saga";
import { call, fork, type SagaGenerator, select } from "typed-redux-saga";

import {
	Activity,
	ActivitySelectors,
	NEW_INSTANCE_IDENTIFIER,
	type DataProvider,
	extractModelsInScenePayload,
	Model,
	StoreSagas
} from "@com.mgmtp.a12.client/client-core";
import { isFormModel } from "@com.mgmtp.a12.formengine/formengine-core";

import { assertNotNullish, assertObject } from "../../shared/assertion.js";
import { InternalModelSelectors } from "../../shared/selectors.js";
import { DefaultRequestSelectorMap, type RequestSelectorMap } from "../../server-connectors/request-selector-map.js";

import { CddSelectors } from "../cdd/redux/index.js";

import { type CddDataHandler, type LoadType, type Models } from "./CddDataHandler.js";
import { isSetCddInActivity } from "./isCddActivity.js";
import { StandaloneActivityHandler } from "./StandaloneActivityHandler.js";
import { isParentCdmActivity } from "./subactivity/parent-activity.js";
import { SubActivityHandler } from "./subactivity/SubActivityHandler.js";

/**
 * Provides CDM activities with data loading and saving.
 *
 * Internally, standalone CDM activities and CDM sub activities have to be
 * differentiated since they require different approaches for loading & saving.
 * Deletion is not supported for CDM activities.
 *
 * Standalone CDM activities load data only from the back end and save it back
 * there as well.
 *
 * Sub activities are initialized with the document graph and change log of the
 * parent CDM activity and thus only need their CDD initialized after creation.
 *
 * Any further load operation on the sub activity is identical to standalone
 * CDM activities.
 *
 * Saving a sub activity means replacing the DG and CL in the parent activity
 * with the updated DG and CL of the sub activity.
 */
class CDDDataProvider implements DataProvider {
	constructor(private readonly options?: { requestSelectorMap?: RequestSelectorMap }) {}
	readonly name: string = "CDDDataProvider";

	canHandle(config: DataProvider.CanHandleConfig) {
		const { activityId, operation, dataHolder, activities } = config;
		const activity = activities[activityId];
		assertObject(activity, `Cannot handle DataHolder of undefined activity [id: ${activityId}]`);

		switch (operation) {
			case "load": {
				return Activity.DataHolder.hasDescriptor(activity.descriptor)(dataHolder) && shouldUseCdd(config);
			}
			case "save":
				return isSetCddInActivity(activity);
			case "delete":
			default:
				return false;
		}
	}

	*provideData(config: DataProvider.ProvideDataConfig): SagaIterator<void> {
		if (config.operation === "delete") {
			throw new Error("Delete is not supported on CDM activities.");
		}

		const activity = yield* select(ActivitySelectors.activityById(config.activityId));
		if (!activity) {
			throw new Error("Cannot handle data on non-existent activity.");
		}
		const initiatingActivity = yield* select(ActivitySelectors.activityById(activity.initiatingActivityId || ""));

		const activityType: ActivityType = isParentCdmActivity(initiatingActivity) ? "sub" : "standalone";
		const loadType = determineCase(activity, activityType);

		const modelsTask = yield* fork(resolveModels, config.activityId);
		const modelsPromise = modelsTask.toPromise().then(assertNotNullish);

		const handler = determineHandlerForCase(
			activityType,
			activity,
			initiatingActivity,
			modelsPromise,
			this.options?.requestSelectorMap ?? DefaultRequestSelectorMap
		);

		if (config.operation === "load") {
			yield* call([handler, "load"], loadType);
		} else if (config.operation === "save") {
			yield* call([handler, "save"], config);
		} else {
			throw new Error(`Method is not supported.`);
		}
	}
}

/**
 * @internal from 2.0.0
 * Use createCddDataProvider() instead of cddDataProvider
 */
export const cddDataProvider = new CDDDataProvider();

export function createCddDataProvider(options?: { requestSelectorMap?: RequestSelectorMap }): CDDDataProvider {
	return new CDDDataProvider(options);
}

type ActivityType = "standalone" | "sub";

/**
 * Determines whether a load or create operation should be performed
 *
 * If there is already a CDD, this data loader was already handling the activity
 * before. That's why it should then never be a create case because it may only
 * be executed at most once for any activity.
 *
 * For standalone activities, a "create" is required if the activities was
 * created for a new entity (NEW_INSTANCE_IDENTIFIER).
 *
 * For sub activities, a "create" is always executed once after the activity was
 * created in order to initialize the CDD.
 */
function determineCase(activity: Activity, activityType: ActivityType): LoadType {
	return isSetCddInActivity(activity) ||
		(activityType === "standalone" && activity.descriptor.instance !== NEW_INSTANCE_IDENTIFIER)
		? "load"
		: "create";
}

function determineHandlerForCase(
	activityType: ActivityType,
	activity: Activity,
	initiatingActivity: Activity | undefined,
	modelsPromise: Promise<Models>,
	requestSelectorMap: RequestSelectorMap
): CddDataHandler {
	if ("sub" === activityType) {
		assertObject(initiatingActivity);
		return new SubActivityHandler(activity, initiatingActivity, modelsPromise, requestSelectorMap);
	} else {
		return new StandaloneActivityHandler(activity, modelsPromise, requestSelectorMap);
	}
}

/**
 * This function finds the form and document model for this activity. The
 * document model is resolved via the form model (that has to reference a
 * document model).
 *
 * @internal
 */
export function* resolveModels(activityId: string): SagaGenerator<Models | undefined> {
	const modelsLoaded = InternalModelSelectors.uiModelAndDocumentModelLoadedByActivityId(
		activityId,
		{ modelType: "form" },
		isFormModel
	);
	const models = yield* call(() => StoreSagas.waitForStateChange(modelsLoaded));
	if (models === undefined || Model.Error.isInstance(models)) {
		throw new Error("Error during model loading for CDM activity.");
	}
	const { generatedCodeAccessor, ...documentModel } = models.documentAndValidationModel;
	return { documentModel, formModel: models.uiModel };
}

function shouldUseCdd({ activities, activityId, action }: DataProvider.CanHandleConfig): boolean {
	const payload = extractModelsInScenePayload(action);

	const { modelGraph, modelsInScene } = payload ?? {};
	if (!modelGraph || !modelsInScene) {
		return false;
	}

	const maybeCdmName = CddSelectors.cdmNameInternal(modelGraph, modelsInScene);
	return CddSelectors.isCddActivityInternal(activities, activityId, maybeCdmName);
}

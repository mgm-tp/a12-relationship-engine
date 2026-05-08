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
import { type Action, type Dispatch, type Middleware, type MiddlewareAPI } from "redux";

import {
	Activity,
	ActivityActions,
	ActivitySelectors,
	ModelSelectors,
	type Selector
} from "@com.mgmtp.a12.client/client-core";
import {
	Commands,
	type EngineState,
	getAllCommandActions,
	getAllEventActions,
	FormEngineActions,
	FormEngineSelectors
} from "@com.mgmtp.a12.formengine/formengine-core";

import { assertObject } from "../../../shared/assertion.js";
import { toChangeMap } from "../../commons/utils.js";

import * as CddActions from "./actions.js";
import { CddSelectors } from "./selectors.js";

/**
 * @internal
 *
 * Variant of engineMiddlewareAdapter with support for CDD.
 */
export function cddFormEngineMiddlewareAdapterFactory(
	engineMiddlewares: Middleware<{}, EngineState>[],
	engineStateSelector: FormEngineSelectors.EngineStateSelector = FormEngineSelectors.engineState
): Middleware<{}, object> {
	return (api) => (next) => (action) => {
		const result = next(action);

		if (!FormEngineActions.event.match(action) && !FormEngineActions.command.match(action)) {
			return result;
		}
		const { activityId, engineEvent } = action.payload;

		const activity = ActivitySelectors.activityById(activityId)(api.getState());
		if (activity === undefined) {
			return result;
		}

		createDispatcher(
			createMiddlewareAPIWrapper(api, activityId, engineStateSelector(activityId)),
			engineMiddlewares
		)(engineEvent);

		return result;
	};
}

/**
 * Creates a wrapper for a separated redux store structure.
 *
 * Only exported for testing purposes. Do not use this directly!
 *
 * @internal
 */
export function createMiddlewareAPIWrapper(
	api: MiddlewareAPI,
	activityId: string,
	engineStateSelector: Selector<EngineState | undefined>
): MiddlewareAPI {
	function getStateWrapper(): EngineState {
		const clientState = cddStateAdapter(activityId)(api.getState());
		const state = engineStateSelector(clientState);
		if (state === undefined) {
			throw new Error(`EngineState is not available in activity ${activityId}.`);
		}
		return state;
	}

	/**
	 * This is a little hack to prevent type issues with typescript 3.0.1.
	 */
	function dispatchWrapper<T extends Action>(action: Action): T {
		return api.dispatch(action as T);
	}

	return {
		getState: getStateWrapper,
		dispatch(engineEvent) {
			const clientState = api.getState();
			if (Commands.setDocument.match(engineEvent)) {
				const payload = engineEvent.payload;
				const document = payload.changes ? payload.document : payload;
				if (CddSelectors.cdd(activityId)(clientState)) {
					const modelGraph = ModelSelectors.modelGraph()(clientState);

					return dispatchWrapper(
						CddActions.changeCddDocument({
							activityId,
							document,
							modelGraph,
							changes: toChangeMap(engineEvent.payload.changes)
						})
					);
				} else {
					return dispatchWrapper(
						ActivityActions.setData({
							activityId,
							data: { document: engineEvent.payload.document }
						})
					);
				}
			} else if (Commands.setDataDirty.match(engineEvent)) {
				return dispatchWrapper(ActivityActions.setDirty({ activityId, dirty: engineEvent.payload }));
			} else if (allEngineCommandTypes.some((type) => type === engineEvent.type)) {
				if (Commands.changeScreenState.match(engineEvent) && engineEvent.payload.dirty !== undefined) {
					dispatchWrapper(ActivityActions.setDirty({ activityId, dirty: engineEvent.payload.dirty }));
				}

				return dispatchWrapper(FormEngineActions.command({ engineEvent, activityId }));
			} else if (allEngineEventTypes.some((type) => type === engineEvent.type)) {
				return dispatchWrapper(FormEngineActions.event({ engineEvent, activityId }));
			} else {
				return engineEvent;
			}
		}
	};
}

/**
 * This function combines a chain of middlewares to a single dispatch function.
 */
function createDispatcher(api: MiddlewareAPI, middlewares: Middleware[]): Dispatch {
	return middlewares.reduceRight<Dispatch>(
		(dispatcher, middleware) => middleware(api)(dispatcher),
		(action) => action
	);
}

const allEngineEventTypes = getAllEventActions().map((a) => a().type);
const allEngineCommandTypes = getAllCommandActions().map((a) => a().type);

/**
 * @internal
 * client state /w cdd -> client state with data.document
 */
export function cddStateAdapter(activityId: string): Selector<object> {
	return (state) => {
		const activity = activitySelector(activityId)(state);
		return cddActivityStateAdapter(activity)(state);
	};
}

function activitySelector(activityId: string): Selector<Activity> {
	return (state) => {
		const activity = ActivitySelectors.activityById(activityId)(state);
		if (activity === undefined) {
			throw new Error(`Activity with id ${activityId} does not exist.`);
		}

		return activity;
	};
}

/**
 * client state /w cdd in given activity -> client state with data.document
 *
 * Views can pass the activity from props to this function, so that it also
 * works for animations when closing the activity.
 */
export function cddActivityStateAdapter(activity: Activity): Selector<object> {
	return (state) => {
		const cdd = CddSelectors.cdd(activity.id)(state);

		if (cdd === undefined) {
			return state;
		}

		// default DH must exist because CDD exists
		const dataHolder = Activity.findDefaultDataHolder(activity);
		assertObject(dataHolder, "Default data holder does not exist");

		const dataHolderWithDocument: Activity.DataHolder = {
			...dataHolder,
			data: {
				document: cdd.document
			},
			dirty: cdd.dirty,
			loadingState: cdd.loadingState
		};

		const activityWithDocumentState: Activity = {
			...activity,
			dataHolders: activity.dataHolders?.map((dh) => (dh === dataHolder ? dataHolderWithDocument : dh))
		};

		const activities = ActivitySelectors.activities()(state);

		const activitiesWithDocumentState = {
			...activities,
			[activity.id]: activityWithDocumentState
		};

		return {
			...state,
			activities: activitiesWithDocumentState
		};
	};
}

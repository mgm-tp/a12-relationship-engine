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

import {
	Model,
	type Selector,
	ModelSelectors,
	LocaleSelectors,
	ActivitySelectors
} from "@com.mgmtp.a12.client/client-core";
import {
	type Models,
	isFormModel,
	type EngineState,
	createEngineStore,
	FormEngineSelectors
} from "@com.mgmtp.a12.formengine/formengine-core";

export namespace CustomFormEngineSelectors {
	/**
	 * Custom implementation of the engine state selector that retrieves the
	 * `models` property of the engine state by the `taskType` property of the
	 * {@link Activity.Descriptor}.
	 *
	 * If no `taskType` property exists, then the result of
	 * {@link FormEngineSelectors.engineState} is returned.
	 */
	export function engineState(activityId: string): Selector<EngineState | undefined> {
		return function engineStateSelector(state) {
			// Use default selector if activity does not belong to dynamic model loading
			if (!isActivityRelevantForDynamicModelLoading(state, activityId)) {
				return FormEngineSelectors.engineState(activityId)(state);
			}

			const models = CustomFormEngineSelectors.models(activityId)(state);
			const ui = FormEngineSelectors.uiState(activityId)(state);

			return models && ui
				? createEngineStore({
						models,
						ui,
						data: FormEngineSelectors.dataState(activityId)(state),
						locale: LocaleSelectors.locale()(state)
					})
				: undefined;
		};
	}

	/**
	 * Custom implementation of the model selector that retrieves models by
	 * the `taskType` property of the {@link Activity.Descriptor}.
	 */
	export function models(activityId: string): Selector<Models | undefined> {
		return (state) => {
			const activity = ActivitySelectors.activityById(activityId)(state);

			if (activity === undefined) {
				return undefined;
			}

			const documentModelName = `${activity.descriptor.taskType}-document`;
			const documentAndValidationModel = selectModelOrThrow(
				documentModelName,
				Model.isDocumentAndValidationModel
			)(state);

			if (documentAndValidationModel === undefined) {
				return undefined;
			}

			const formModelName = `${activity.descriptor.taskType}-form`;
			const formModel = selectModelOrThrow(formModelName, isFormModel)(state);

			if (formModel === undefined) {
				return undefined;
			}

			const { generatedCodeAccessor: validatorProvider } = documentAndValidationModel;

			return {
				documentModel: documentAndValidationModel,
				validatorProvider,
				formModel
			};
		};
	}

	function isActivityRelevantForDynamicModelLoading(state: object, activityId: string): boolean {
		return ActivitySelectors.activityById(activityId)(state)?.descriptor.taskType !== undefined;
	}

	const selectModelOrThrow: typeof ModelSelectors.modelByName = function selectModelOrThrow(modelName, typeGuard) {
		const modelSelector = ModelSelectors.modelByName(modelName, typeGuard);
		const modelErrorSelector = ModelSelectors.modelErrorByName(modelName);

		return (state) => {
			const formModel = modelSelector(state);

			if (formModel === undefined) {
				const error = modelErrorSelector(state);

				if (error) {
					throw error;
				}
			}

			return formModel;
		};
	};
}

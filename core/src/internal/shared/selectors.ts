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
 * @module shared
 */

import type { Header, Model as ModelAPI } from "@com.mgmtp.a12.base/base-model-api";
import { Model, type Selector, ModelSelectors, type ApplicationModel } from "@com.mgmtp.a12.client/client-core";

type ModelTypeGuard<T extends ModelAPI> = (m: ModelAPI) => m is T;

function defaultModelTypeGuard<T extends ModelAPI>(model: ModelAPI): model is T {
	return true;
}

/**
 * @internal
 */
export const InternalModelSelectors = {
	modules(): Selector<ReadonlyArray<ApplicationModel.Module>> {
		return (state: object) => ModelSelectors.applicationModel()(state).content.modules;
	},
	sceneByReference({
		moduleName,
		flowName,
		sceneName
	}: ApplicationModel.SceneReference): Selector<ApplicationModel.Scene> {
		return (state: object) => {
			const module = InternalModelSelectors.modules()(state).find(({ name }) => name === moduleName);

			if (module === undefined) {
				throw new Error(`No module with the name "${moduleName}" exists.`);
			}

			const flow = module.flows.find(({ name }) => name === flowName);

			if (flow === undefined) {
				throw new Error(`No flow with the name "${flowName}" exists in the module "${moduleName}".`);
			}

			const scene = flow.scenes.find(({ name }) => name === sceneName);

			if (scene === undefined) {
				throw new Error(
					`No scene with the name "${sceneName}" exists in the flow "${flowName}" of the module "${moduleName}".`
				);
			}

			return scene;
		};
	},
	/**
	 * Selects the ui model with the given identifier
	 * and its document model from the state.
	 *
	 * As the return value of this selector always contains the
	 * "selected" value in `returnValue`, it should only be used in conjunction
	 * with {@link StoreSagas.waitForStateChange }.
	 */
	uiModelAndDocumentModelLoaded<T extends ModelAPI>(
		identifier: string,
		typeGuard: ModelTypeGuard<T> = defaultModelTypeGuard
	): Selector<ModelResult.ModelsLoaded<T>> {
		return (state) => {
			const uiModelResult = ModelSelectors.modelLoaded(identifier, typeGuard)(state);

			if (uiModelResult.returnValue === undefined || Model.Error.isInstance(uiModelResult.returnValue)) {
				return { stateChanged: uiModelResult.stateChanged, returnValue: uiModelResult.returnValue };
			}

			const uiModel = uiModelResult.returnValue.model;

			const documentModelName = InternalModelSelectors.getDocumentModelReference(uiModel);

			const result = ModelSelectors.modelLoaded(documentModelName, Model.isDocumentAndValidationModel)(state);

			if (result.returnValue === undefined || Model.Error.isInstance(result.returnValue)) {
				return { stateChanged: result.stateChanged, returnValue: result.returnValue };
			}

			return {
				stateChanged: true,
				returnValue: { uiModel, documentAndValidationModel: result.returnValue.model }
			};
		};
	},
	/**
	 * Selects the ui model of the current scene
	 * and its document model from the state.
	 *
	 * As the return value of this selector always contains the
	 * "selected" value in `returnValue`, it should only be used in conjunction
	 * with {@link StoreSagas.waitForStateChange }.
	 */
	uiModelAndDocumentModelLoadedByActivityId<T extends ModelAPI>(
		activityId: string,
		modelDescriptor: {
			readonly modelType: string;
			readonly documentModel?: string;
		},
		typeGuard: ModelTypeGuard<T> = defaultModelTypeGuard
	): Selector<ModelResult.ModelsLoaded<T>> {
		return (state) => {
			const criteria = { activityId, ...modelDescriptor };
			const uiModel = ModelSelectors.modelInScene(criteria, typeGuard)(state);

			if (uiModel === undefined) {
				const error = ModelSelectors.modelErrorInScene(criteria)(state);

				return { stateChanged: error !== undefined, returnValue: error };
			}

			const documentModelName = InternalModelSelectors.getDocumentModelReference(uiModel);

			const result = ModelSelectors.modelLoaded(documentModelName, Model.isDocumentAndValidationModel)(state);

			if (result.returnValue === undefined || Model.Error.isInstance(result.returnValue)) {
				return { stateChanged: result.stateChanged, returnValue: result.returnValue };
			}

			return {
				stateChanged: true,
				returnValue: { uiModel, documentAndValidationModel: result.returnValue.model }
			};
		};
	},
	getDocumentModelReference({ header }: { readonly header: Header }): string {
		const { reference } = header.modelReferences?.find((x) => x.modelType === "document") || {};

		if (reference === undefined) {
			throw new Error(`Could not find any document model reference in ${header.id}.`);
		}

		return InternalModelSelectors.guessModelNameFromFileReferenceButSeriouslyRemoveThisUglyHack(reference);
	},
	guessModelNameFromFileReferenceButSeriouslyRemoveThisUglyHack(ref: string): string {
		const refn = ref.replace(/\\/g, "/");
		const lastSlash = refn.lastIndexOf("/");
		const jsonSuffix = refn.lastIndexOf(".json");

		return refn.slice(lastSlash >= 0 ? lastSlash + 1 : 0, jsonSuffix >= 0 ? jsonSuffix : undefined);
	}
};

export namespace ModelResult {
	/**
	 * @internal
	 */
	export interface LoadedEngineModels<T extends ModelAPI = ModelAPI> {
		readonly uiModel: T;
		readonly documentAndValidationModel: Model.DocumentAndValidationModel;
	}

	/**
	 * @internal
	 */
	export interface ModelsLoaded<T extends ModelAPI = ModelAPI> {
		readonly stateChanged: boolean;
		readonly returnValue: LoadedEngineModels<T> | Model.Error | undefined;
	}
}

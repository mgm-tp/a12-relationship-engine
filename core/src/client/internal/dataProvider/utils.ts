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

import { StoreSagas } from "@com.mgmtp.a12.client/client-core";
import { FormEngineSelectors } from "@com.mgmtp.a12.formengine/formengine-core";
import { type Selector, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import { isRelationshipModel } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { Model, ModelSelectors as ClientModelSelectors } from "@com.mgmtp.a12.client/client-core";

import { SourceEntitySelectors } from "../../../store/index.js";
import { findFormModelElementPath } from "../../../store/index.js";
import { validateRelationshipUiModel } from "../../../models/index.js";
import type { RelationshipEngineActions } from "../../../store/index.js";
import { ModelSelectors as REModelSelectors } from "../../../store/index.js";

export function* selectUiModelInstances(
	activityId: string
): SagaGenerator<RelationshipEngineActions.Commands.UiModelInstance[]> {
	const activity = yield* select(ActivitySelectors.activityById(activityId));

	if (activity === undefined) {
		throw new Error(`No activity found for id ${activityId}.`);
	}

	if (activity.descriptor.instance === undefined) {
		throw new Error(
			"The relationship feature relies on the instance property. " +
				"It expects the sourceDocId as part of it, e.g. DomainProduct/15"
		);
	}

	const sourceDocId = activity.descriptor.instance;

	const uiModels = yield* select(REModelSelectors.uiModels(activityId));

	if (uiModels.length === 0) {
		throw new Error(`No relationship UI models found for activity ${activityId}`);
	}

	for (const uiModel of uiModels) {
		validateRelationshipUiModel(uiModel);
	}

	const formModel = yield* select((state) => FormEngineSelectors.models(activityId)(state)?.formModel);
	const fmIndex = yield* select(SourceEntitySelectors.formModelIndex(activityId));

	if (!formModel || !fmIndex) {
		throw new Error(`Form model not loaded for relationship activity ${activityId}`);
	}

	return yield* select((state) =>
		uiModels.map((b) => {
			const { content } = b;
			const elementId = fmIndex.elementIdByUiModelId[b.header.id];

			return {
				uiModelId: b.header.id,
				configuration: content,
				sourceDocId,
				formModelPath: elementId ? findFormModelElementPath(formModel, elementId) : null,
				relationshipModel: ClientModelSelectors.modelByName(content.relationshipName, isRelationshipModel)(state)
			};
		})
	);
}

/** @internal */
export function* waitUntilModelsAreResolved(activityId: string): SagaGenerator<void> {
	const loadedOrErrors = yield* call(() => StoreSagas.waitForStateChange(modelsLoaded(activityId)));

	if (Array.isArray(loadedOrErrors)) {
		const errMessage = loadedOrErrors?.map(({ message }) => message).join("\n") ?? "Cannot load necessary models.";

		throw new Error(errMessage);
	}
}

function modelsLoaded(activityId: string): Selector<{ stateChanged: boolean; returnValue: boolean | Model.Error[] }> {
	return (state) => {
		const models = ClientModelSelectors.allLoadedModelsInScene(activityId)(state);

		if (!models) {
			return { stateChanged: false, returnValue: false };
		}

		const errors = models.filter(Model.Error.isInstance);

		if (errors.length > 0) {
			return { stateChanged: true, returnValue: errors };
		}

		return { stateChanged: true, returnValue: true };
	};
}

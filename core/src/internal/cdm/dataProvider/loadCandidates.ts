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
import { call, put, type SagaGenerator, select, takeEvery } from "typed-redux-saga";
import { type Action } from "typescript-fsa";

import { ActivitySelectors, ModelSelectors, StoreSagas } from "@com.mgmtp.a12.client/client-core";
import { type FormModel, isFormModel } from "@com.mgmtp.a12.formengine/formengine-core";

import { assertObject } from "../../shared/assertion.js";
import { InternalModelSelectors } from "../../shared/selectors.js";
import { type Relationship } from "../../relationship/index.js";

import { CddActions } from "../cdd/redux/index.js";
import { initAndLoadCandidates, type MergePayload } from "../cdd/redux/actions.js";

export function* createCandidateDataHoldersSaga(): SagaIterator<void> {
	yield* takeEvery([CddActions.merge, CddActions.setSubActivityData], initializeAndLoadCandidateDataHolders);
}

function* initializeAndLoadCandidateDataHolders(action: Action<MergePayload>): SagaGenerator<void> {
	const activityId = action.payload.activityId;

	const activity = yield* select(ActivitySelectors.activityById(activityId));
	assertObject(activity);

	const modelDescriptor = {
		modelType: "form",
		documentModel: activity.descriptor.model
	};
	yield* call(
		StoreSagas.waitForStateChange,
		InternalModelSelectors.uiModelAndDocumentModelLoadedByActivityId(activity.id, modelDescriptor)
	);
	const scdmFormModel = yield* select(ModelSelectors.modelInScene({ activityId, ...modelDescriptor }, isFormModel));
	assertObject(scdmFormModel);

	const bindings = resolveBindings(scdmFormModel);
	const modelGraph = yield* select(ModelSelectors.modelGraph());
	const modelsInScene = yield* select(ModelSelectors.referencedModelsInScene(activityId));

	yield* put(initAndLoadCandidates({ activityId, bindings, modelGraph, modelsInScene }));
}

function resolveBindings(formModel: FormModel): Relationship.UiConfigurationBinding[] {
	const bcAnnotation = formModel.header.annotations?.find((a) => a.name === "bindingConfiguration")?.value;
	if (!bcAnnotation) {
		return [];
	}
	return JSON.parse(bcAnnotation) as Relationship.UiConfigurationBinding[];
}

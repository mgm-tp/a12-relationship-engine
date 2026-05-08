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
 * @module relationship
 */
import { type SagaIterator } from "redux-saga";
import { call, put, type SagaGenerator, select, takeEvery } from "typed-redux-saga";
import { type Action, type AnyAction } from "typescript-fsa";

import {
	ActivityActions,
	ActivitySelectors,
	type ApplicationSaga,
	ModelSelectors,
	StoreSagas
} from "@com.mgmtp.a12.client/client-core";

import { InternalModelSelectors } from "../../shared/selectors.js";
import { CddSelectors } from "../../cdm/cdd/redux/index.js";

import { RelationshipActions } from "../actions.js";
import { Relationship } from "../relationship.js";
import { RelationshipSelectors } from "../selectors.js";

/** @internal */
export function* initializeDataHoldersSaga(config: ApplicationSaga.Configuration): SagaIterator<void> {
	yield* takeEvery(
		(a: AnyAction) =>
			ActivityActions.push.match(a) || (ActivityActions.cancel.match(a) && a.payload.replacementActivity !== undefined),
		initializeDataHoldersAndLoadMissingData,
		config
	);
}

function* initializeDataHoldersAndLoadMissingData(
	config: ApplicationSaga.Configuration,
	action: Action<ActivityActions.PushPayload> | Action<ActivityActions.CancelPayload>
): SagaGenerator<void> {
	const activityId = ActivityActions.cancel.match(action)
		? action.payload.replacementActivity?.id
		: action.payload.activity.id;
	if (activityId === undefined) {
		throw new Error(`No activity found`);
	}

	// prevent loading of candidates/links in case of CDM
	if (yield* select(CddSelectors.isCddActivity, activityId)) {
		return;
	}

	try {
		const success = yield* call(waitForFormModelLoading, activityId);
		if (success) {
			const instances = selectFromState(activityId, yield* select());

			yield* put(
				RelationshipActions.Commands.createInstanceDataholders({
					activityId,
					instances
				})
			);
		}
	} catch (error) {
		yield* put(ActivityActions.error({ activityId, error, operationType: "loading" }));
	}
}

function* waitForFormModelLoading(activityId: string): SagaGenerator<boolean> {
	const modelDescriptors = yield* select(ModelSelectors.modelDescriptorsByActivityId(activityId));
	if (modelDescriptors.every((md) => md.modelType === "form")) {
		// The Form Model has to be loaded before we can access the binding
		// configuration, because the binding config is embedded inside it.

		for (const modelDescriptor of modelDescriptors) {
			yield* call(
				StoreSagas.waitForStateChange,
				InternalModelSelectors.uiModelAndDocumentModelLoaded(modelDescriptor.name)
			);
		}
	}

	const bindings = yield* select(RelationshipSelectors.relationshipBindings({ activityId }));
	return bindings.length > 0;
}

function selectFromState(activityId: string, state: object): RelationshipActions.Commands.BindingInstance[] {
	const activity = ActivitySelectors.activityById(activityId)(state);

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

	const bindings = RelationshipSelectors.relationshipBindings({ activityId })(state);

	return bindings.map((b) => {
		const models = RelationshipSelectors.overviewModels({
			activityId,
			componentConfig: b.details.components[0],
			resultDocumentModelType: "candidate"
		})(state);

		return {
			elementId: b.elementId,
			details: b.details,
			sourceDocId,
			relationshipModel: ModelSelectors.modelByName(
				b.details.relationshipName,
				Relationship.isRelationshipModel
			)(state),
			overviewModel: models.loadingState === "loaded" ? models.overviewModel : undefined,
			documentModel: models.loadingState === "loaded" ? models.documentModel : undefined
		};
	});
}

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

import type { Middleware } from "redux";

import { ModelPath } from "@com.mgmtp.a12.base/base-model-api";
import type { EntityInstancePath } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import { OverviewEngineActions } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import { ModelSelectors as ClientModelSelectors } from "@com.mgmtp.a12.client/client-core";
import { Events as OverviewEvents } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import { FormEngineActions, FormEngineSelectors } from "@com.mgmtp.a12.formengine/formengine-core";
import { type Activity, ActivityActions, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import { UiStateSelectors, Events as FormEngineEvents } from "@com.mgmtp.a12.formengine/formengine-core";

import { Dialog } from "../state.js";
import { ModelSelectors } from "../selectors/model.js";
import { RelationshipEngineActions } from "../actions.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";
import { newChildInstanceDocRef } from "../utils/newChildDocRef.js";
import type { RelationshipUiModel } from "../../../models/index.js";
import { RelationshipEngineEvents } from "../../../models/index.js";
import { getEntityByRole } from "../utils/relationshipModelUtils.js";
import { hasVariants, getSingleConcreteModel } from "../utils/variantUtils.js";

import { makeRowsPathForRepeat } from "./helpers/repeatPathUtils.js";

/**
 * @internal
 */
export const onAddDocumentMiddleware: Middleware = (store) => (next) => (action) => {
	const result = next(action);

	const params = extractAddDocumentParams(action, store.getState());

	if (!params) {
		return result;
	}

	const { activityId, instanceId, uiConfiguration, sourceEntity, dataHolderDescriptor, canUseFeAddRow } = params;
	const { modificationConfiguration, relationshipName, targetRole } = uiConfiguration;

	if (!sourceEntity?.docRef) {
		return result;
	}

	const state = store.getState();

	if (!modificationConfiguration) {
		if (!canUseFeAddRow || !dataHolderDescriptor) {
			return result;
		}

		const formEngineState = FormEngineSelectors.engineState(activityId)(state);

		if (!formEngineState) {
			return result;
		}

		const linkDataHolder = ActivitySelectors.activityPropById(activityId, (activity) =>
			activity.dataHolders
				.filter(RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance)
				.find((candidate) => candidate.descriptor.instanceId === instanceId)
		)(state);

		if (!linkDataHolder) {
			return result;
		}

		const formModelPathString = linkDataHolder.slices.formModelPath;
		const repeatFormModelPath = formModelPathString ? ModelPath.fromString(formModelPathString) : undefined;

		if (!repeatFormModelPath) {
			return result;
		}

		const repeatGroupPath = ModelSelectors.groupPath(activityId, dataHolderDescriptor)(state);
		const currentLocation = UiStateSelectors.currentScreenLocation()(formEngineState);
		const dataContext = currentLocation?.path as EntityInstancePath | undefined;
		const rootDocumentModelResult = ModelSelectors.rootDocumentModel(activityId)(state);

		if (!repeatGroupPath || !dataContext || !rootDocumentModelResult) {
			return result;
		}

		const rowsPath = makeRowsPathForRepeat(rootDocumentModelResult.documentModel, repeatGroupPath, dataContext);

		store.dispatch(
			FormEngineActions.event({
				activityId,
				engineEvent: FormEngineEvents.Repeat.addRow({
					path: rowsPath,
					repeatFormModelPath
				})
			})
		);

		return result;
	}

	const relationshipModel = ModelSelectors.relationshipModel(relationshipName)(state);

	if (!relationshipModel) {
		return result;
	}

	const targetEntity = getEntityByRole(relationshipModel, targetRole);

	if (!targetEntity?.documentModel) {
		return result;
	}

	const modelGraph = ClientModelSelectors.modelGraph()(state);
	const targetDocumentModel = modelGraph.documentModels.find((dm) => dm.modelId === targetEntity.documentModel);

	if (!targetDocumentModel) {
		return result;
	}

	if (hasVariants(targetDocumentModel, modelGraph)) {
		store.dispatch(
			RelationshipEngineActions.Commands.setDialogState({
				activityId,
				state: {
					type: Dialog.Type.VARIANT_SELECTION,
					targetDocumentModelId: targetEntity.documentModel,
					context: {
						activityId,
						instanceId,
						relationshipName,
						targetRole,
						sourceDocRef: sourceEntity.docRef,
						sourceRole: sourceEntity.role
					}
				} satisfies Dialog.VariantSelection
			})
		);

		return result;
	}

	const concreteModelId = getSingleConcreteModel(targetDocumentModel, modelGraph);

	if (!concreteModelId) {
		return result;
	}

	const baseDescriptor: Activity.Descriptor = {
		model: concreteModelId,
		instance: newChildInstanceDocRef(state, activityId, concreteModelId),
		sourceDocRef: sourceEntity.docRef,
		sourceRole: sourceEntity.role,
		relationshipName,
		targetRole
	};

	let activityDescriptor: Activity.Descriptor = baseDescriptor;

	if (modificationConfiguration?.extendParentActivityDescriptor) {
		const parentActivity = ActivitySelectors.activityById(activityId)(state);

		if (parentActivity) {
			activityDescriptor = { ...parentActivity.descriptor, ...baseDescriptor };
		}
	} else if (modificationConfiguration?.activityDescriptor) {
		activityDescriptor = { ...modificationConfiguration.activityDescriptor, ...baseDescriptor };
	}

	store.dispatch(
		ActivityActions.create({
			activityDescriptor,
			initiatingActivityId: activityId,
			data: { document: {} },
			loadingState: "loaded"
		})
	);

	return result;
};

interface AddDocumentParams {
	activityId: string;
	instanceId: string;
	uiConfiguration: RelationshipUiModel.Content;
	sourceEntity: { docRef: string | null; role: string };
	/** Present only for the OE-button trigger; required for the FE addRow path. */
	dataHolderDescriptor?: Activity.DataHolderDescriptor;
	/** True only when the trigger is the OE event-button, enabling the FE addRow fallback path. */
	canUseFeAddRow: boolean;
}

/**
 * Extracts normalized add-document parameters from either:
 * - an OE `onEventButtonClicked` action carrying an `ADD_DOCUMENT` event, or
 * - a `RelationshipEngineActions.Events.addDocumentRequested` action.
 */
function extractAddDocumentParams(action: unknown, state: object): AddDocumentParams | undefined {
	if (
		OverviewEngineActions.event.match(action) &&
		OverviewEvents.onEventButtonClicked.match(action.payload.engineAction)
	) {
		const { activityId, engineAction, dataHolderDescriptor } = action.payload;

		if (!dataHolderDescriptor || engineAction.payload.event !== RelationshipEngineEvents.ADD_DOCUMENT) {
			return undefined;
		}

		const { instanceId } = dataHolderDescriptor;

		if (!instanceId) {
			return undefined;
		}

		const linkDataHolder = ActivitySelectors.activityPropById(activityId, (activity) =>
			activity.dataHolders
				.filter(RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance)
				.find((candidate) => candidate.descriptor.instanceId === instanceId)
		)(state);

		if (!linkDataHolder) {
			return undefined;
		}

		return {
			activityId,
			instanceId,
			uiConfiguration: linkDataHolder.slices.uiConfiguration,
			sourceEntity: linkDataHolder.slices.sourceEntity,
			dataHolderDescriptor,
			canUseFeAddRow: true
		};
	}

	if (RelationshipEngineActions.Events.addDocumentRequested.match(action)) {
		const { activityId, instanceId } = action.payload;
		const dropdownHolder = ActivitySelectors.activityPropById(activityId, (activity) =>
			activity.dataHolders
				.filter(RelationshipEngineDataHolder.DropdownSelectionDataHolder.isInstance)
				.find((dh) => dh.descriptor.instanceId === instanceId)
		)(state);

		if (!dropdownHolder) {
			return undefined;
		}

		return {
			activityId,
			instanceId,
			uiConfiguration: dropdownHolder.slices.uiConfiguration,
			sourceEntity: dropdownHolder.slices.sourceEntity,
			canUseFeAddRow: false
		};
	}

	return undefined;
}

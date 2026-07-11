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

import { Activity, ActivityActions, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";

import { Dialog } from "../state.js";
import { RelationshipEngineActions } from "../actions.js";
import { UiStateSelectors } from "../selectors/uiState.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";
import { newChildInstanceDocRef } from "../utils/newChildDocRef.js";

export const onDialogConfirmedMiddleware: Middleware = (store) => (next) => (action) => {
	const result = next(action);

	if (!RelationshipEngineActions.Events.dialogConfirmed.match(action)) {
		return result;
	}

	const { activityId, selectedDocumentModelId } = action.payload;
	const state = store.getState();

	// Get the activity to find the current dialog state
	const activity = ActivitySelectors.activityById(activityId)(state);

	if (!activity) {
		return result;
	}

	// Get dialog state from default data holder's slices
	const defaultDataHolder = Activity.findDefaultDataHolder(activity);
	const reUiState = UiStateSelectors.fromDataHolder(defaultDataHolder);
	const dialogState = reUiState?.dialog;

	if (!dialogState || !Dialog.VariantSelection.isAssignableFrom(dialogState)) {
		return result;
	}

	const { context } = dialogState;
	const { instanceId, relationshipName, sourceDocRef, sourceRole } = context;

	// Find the holder for this instance (link instance or dropdown selection)
	const dataHolder = activity.dataHolders.find((candidate) => {
		if (RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance(candidate)) {
			return candidate.descriptor.instanceId === instanceId;
		}

		if (RelationshipEngineDataHolder.DropdownSelectionDataHolder.isInstance(candidate)) {
			return candidate.descriptor.instanceId === instanceId;
		}

		return false;
	});

	if (!dataHolder) {
		// Close dialog even if we can't find the data holder
		store.dispatch(
			RelationshipEngineActions.Commands.setDialogState({
				activityId,
				state: null
			})
		);

		return result;
	}

	if (
		!RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance(dataHolder) &&
		!RelationshipEngineDataHolder.DropdownSelectionDataHolder.isInstance(dataHolder)
	) {
		return result;
	}

	// Get the modification configuration to check for activity descriptor customization
	const { modificationConfiguration } = dataHolder.slices.uiConfiguration;

	// Build the activity descriptor for the new entity.
	// ParentLinkDescriptor fields tell initDataHolders to inject an inherited
	// linkAdded entry into the child's changelog at init time.
	const baseDescriptor: Activity.Descriptor = {
		model: selectedDocumentModelId,
		instance: newChildInstanceDocRef(state, activityId, selectedDocumentModelId),
		parentInstance: sourceDocRef,
		parentRelationshipName: relationshipName,
		parentRelationshipRole: sourceRole
	};

	// Apply modification configuration if present
	let activityDescriptor: Activity.Descriptor = baseDescriptor;

	if (modificationConfiguration?.extendParentActivityDescriptor) {
		activityDescriptor = {
			...activity.descriptor,
			...baseDescriptor
		};
	} else if (modificationConfiguration?.activityDescriptor) {
		activityDescriptor = {
			...modificationConfiguration.activityDescriptor,
			...baseDescriptor
		};
	}

	// Close the dialog
	store.dispatch(
		RelationshipEngineActions.Commands.setDialogState({
			activityId,
			state: null
		})
	);

	// Create the child activity for the new entity
	store.dispatch(
		ActivityActions.create({ activityDescriptor, initiatingActivityId: activityId, loadingState: "missing" })
	);

	return result;
};

/**
 * Middleware handling dialog close events.
 * Clears the dialog state when the user closes without selecting.
 */
export const onDialogClosedMiddleware: Middleware = (store) => (next) => (action) => {
	const result = next(action);

	if (!RelationshipEngineActions.Events.dialogClosed.match(action)) {
		return result;
	}

	const { activityId } = action.payload;

	// Close the dialog by setting state to null
	store.dispatch(
		RelationshipEngineActions.Commands.setDialogState({
			activityId,
			state: null
		})
	);

	return result;
};

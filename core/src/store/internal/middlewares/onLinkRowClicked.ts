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
 * Middleware that listens for plain row click events on a relationship link instance (usually a TableList component)
 * and spawns a child activity for the clicked target document.
 *
 * STARTING IMPLEMENTATION (See old code: subActivityDescriptor & createActivityForExistingEntity
 * in `internal/relationship/ui/components/scdm_adapter/scdm_adapter.ts`).
 *
 * Assumptions (to be refined):
 *  - Overview Engine dispatches OverviewEngineActions.event with an engineAction whose payload
 *    contains a `documentId` when a row is clicked. For a simple row click there is no
 *    `rowActionModel` present (different from button clicks).
 *  - We only handle selected items data holders (RelationshipEngineDataHolder.SelectedItemsDataHolder).
 *  - If a child activity for the same instance/document is already present we do nothing.
 *  - Child activity descriptor is minimal: we reuse parent model (until model of target document
 *    can be derived) and set the instance to the target document id.
 *
 */
import type { Middleware } from "redux";

import { ModelPath } from "@com.mgmtp.a12.base/base-model-api";
import { FormEngineActions, FormEngineSelectors } from "@com.mgmtp.a12.formengine/formengine-core";
import { type Activity, ActivityActions, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import { UiStateSelectors, Events as FormEngineEvents } from "@com.mgmtp.a12.formengine/formengine-core";
import type { DocumentModel, GroupInstance, EntityInstancePath } from "@com.mgmtp.a12.kernel/kernel-md-facade";

import { LinkSelectors } from "../selectors/link.js";
import { ModelSelectors } from "../selectors/model.js";
import { RelationshipEngineActions } from "../actions.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";
import { DocumentGraphSelectors } from "../selectors/documentGraph.js";
// TODO: Copy getDocRefByCddPath into new-arch once its transitive dependencies (modelUtils, isRelationshipGroup, etc.) are extracted
// eslint-disable-next-line no-restricted-imports
import { getDocRefByCddPath } from "../../../internal/cdm/cdd/core/index.js";

import { extractDefaultRowClickParams } from "./helpers/rowClickParams.js";
import { applyRowIndex, makeRowsPathForRepeat } from "./helpers/repeatPathUtils.js";

export const onLinkRowClickedMiddleware: Middleware = (store) => (next) => (action) => {
	const result = next(action);

	const params = extractDefaultRowClickParams(action);

	if (!params) {
		return result;
	}

	const { activityId, dataHolderDescriptor } = params;

	const state = store.getState();
	const parentActivity = ActivitySelectors.activityById(activityId)(state);

	if (!parentActivity) {
		return result;
	}

	// Identify the link instance data holder backing this TableList
	const linkDataHolder = ActivitySelectors.activityPropById(activityId, (a) =>
		a.dataHolders
			?.filter(RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance)
			.find((dh) => dh.descriptor.instanceId === dataHolderDescriptor.instanceId)
	)(state);

	if (!linkDataHolder) {
		return result; // Not a link instance row click we care about
	}

	// Basic validation: require a concrete source docRef (like other middlewares)
	const sourceEntity = linkDataHolder.slices.sourceEntity;

	if (!sourceEntity?.docRef) {
		return result;
	}

	const { modificationConfiguration } = linkDataHolder.slices.uiConfiguration;

	if (modificationConfiguration) {
		// Prevent duplicate child activity for same documentId & instance
		const existingChild = ActivitySelectors.childActivityByInstanceId(parentActivity, params.documentId)(state);

		if (existingChild) {
			return result;
		}

		// Try to resolve linkRef for the clicked target document
		const { relationshipName, targetRole } = linkDataHolder.slices.uiConfiguration;
		const [linkRef] = params.linkId
			? LinkSelectors.findLinkById(activityId, params.linkId)(state)
			: LinkSelectors.findLink(activityId, {
					relationshipModel: relationshipName,
					source: { role: sourceEntity.role, docRef: sourceEntity.docRef },
					target: { role: targetRole, docRef: params.documentId }
				})(state);

		const targetModel = DocumentGraphSelectors.getModelName(params.documentId);
		const isDrafting = RelationshipEngineActions.Events.onDraftingRowClicked.match(action);

		const childDescriptor: Activity.Descriptor = {
			...(modificationConfiguration.extendParentActivityDescriptor ? { ...parentActivity.descriptor } : {}),
			...(modificationConfiguration.activityDescriptor ? { ...modificationConfiguration.activityDescriptor } : {}),
			model: targetModel,
			instance: params.documentId,
			relationshipName,
			sourceDocRef: sourceEntity.docRef,
			sourceRole: sourceEntity.role,
			targetDocRef: params.documentId,
			targetRole,
			selectedLinkId: linkRef?.id,
			...(isDrafting && { drafting: "true" })
		};

		store.dispatch(
			ActivityActions.create({
				initiatingActivityId: activityId,
				activityDescriptor: childDescriptor,
				data: {},
				loadingState: "missing"
			})
		);
	} else {
		const formEngineState = FormEngineSelectors.engineState(activityId)(state);

		if (!formEngineState) {
			return result;
		}

		const repeatGroupPath = ModelSelectors.groupPath(activityId, dataHolderDescriptor)(state);
		const formModelPathString = linkDataHolder.slices.formModelPath;
		const repeatFormModelPath = formModelPathString ? ModelPath.fromString(formModelPathString) : undefined;
		const currentLocation = UiStateSelectors.currentScreenLocation()(formEngineState);
		const dataContext = currentLocation?.path as EntityInstancePath | undefined;
		const documents = linkDataHolder.data?.documents ?? [];
		const fallbackRowIndex = documents.findIndex((doc) => doc?.id === params.documentId);
		const rootDocumentModelResult = ModelSelectors.rootDocumentModel(activityId)(state);
		const cddDocument = formEngineState.data.document as GroupInstance | undefined;

		if (!repeatGroupPath || !repeatFormModelPath || !dataContext || !rootDocumentModelResult) {
			return result;
		}

		const documentModel = rootDocumentModelResult.documentModel;
		const rowsPath = makeRowsPathForRepeat(documentModel, repeatGroupPath, dataContext);
		let resolvedRowPath: EntityInstancePath | undefined;

		if (cddDocument) {
			resolvedRowPath = resolveRepeatRowPath({
				baseRowsPath: rowsPath,
				cddDocument,
				documentModel,
				rowCountHint: documents.length,
				targetDocRef: params.documentId
			});
		}

		if (!resolvedRowPath && fallbackRowIndex >= 0) {
			resolvedRowPath = applyRowIndex(rowsPath, fallbackRowIndex + 1);
		}

		if (!resolvedRowPath) {
			return result;
		}

		store.dispatch(
			FormEngineActions.event({
				activityId,
				engineEvent: FormEngineEvents.Repeat.enterRow({
					repeatFormModelPath,
					rowPath: resolvedRowPath,
					triggerElement: "row"
				})
			})
		);
	}

	return result;
};

interface ResolveRepeatRowPathParams {
	baseRowsPath: EntityInstancePath;
	cddDocument: GroupInstance;
	documentModel: DocumentModel;
	rowCountHint: number;
	targetDocRef: string;
}

function resolveRepeatRowPath({
	baseRowsPath,
	cddDocument,
	documentModel,
	rowCountHint,
	targetDocRef
}: ResolveRepeatRowPathParams): EntityInstancePath | undefined {
	const totalRows = Number.isFinite(rowCountHint) && rowCountHint > 0 ? Math.floor(rowCountHint) : 0;

	if (totalRows === 0) {
		return undefined;
	}

	for (let offset = 0; offset < totalRows; offset += 1) {
		const rowIndex = offset + 1;
		const candidatePath = applyRowIndex(baseRowsPath, rowIndex);
		const docRef = getDocRefByCddPath(candidatePath, cddDocument, documentModel);

		if (docRef === targetDocRef) {
			return candidatePath;
		}
	}

	return undefined;
}

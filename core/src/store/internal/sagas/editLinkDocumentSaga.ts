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

import type { SagaGenerator } from "typed-redux-saga";
import { put, call, select, takeEvery } from "typed-redux-saga";

import type { Action } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";

import { LinkSelectors } from "../selectors/link.js";
import { ModelSelectors } from "../selectors/model.js";
import { RelationshipEngineActions } from "../actions.js";
import { ThumbnailSelectors } from "../selectors/thumbnail.js";
import { buildOpenLinkFormAction } from "../utils/openLinkFormActivity.js";

import { selectSourceDocRef, selectDropdownDataHolder } from "./helpers/dropdownUtils.js";

export function* editLinkDocumentSaga(): SagaGenerator<void> {
	yield* takeEvery(RelationshipEngineActions.Events.editLinkDocumentRequested, handleEditLinkDocumentRequested);
}

function* handleEditLinkDocumentRequested(
	action: Action<RelationshipEngineActions.Events.EditLinkDocumentRequestedPayload>
): SagaGenerator<void> {
	const { activityId, instanceId, targetDocRef } = action.payload;

	const dropdownHolder = yield* call(selectDropdownDataHolder, activityId, instanceId);

	if (!dropdownHolder) {
		return;
	}

	const { uiConfiguration, sourceEntity } = dropdownHolder.slices;
	const { relationshipName, targetRole } = uiConfiguration;
	const sourceRole = sourceEntity.role;

	const sourceDocRef = yield* call(selectSourceDocRef, activityId, dropdownHolder);

	if (!sourceDocRef) {
		return;
	}

	const linkFormModels = yield* select(ModelSelectors.linkFormModelByName(uiConfiguration.component.linkFormModel));

	if (!linkFormModels) {
		return;
	}

	// Find existing link reference for the edit
	const [linkRef, linkDocument] = yield* select(
		LinkSelectors.findLink(activityId, {
			relationshipModel: relationshipName,
			source: { role: sourceRole, docRef: sourceDocRef },
			target: { role: targetRole, docRef: targetDocRef }
		})
	);

	const { formModel, documentModel } = linkFormModels;

	const thumbnails = yield* select(ThumbnailSelectors.thumbnails(activityId));

	yield* put(
		buildOpenLinkFormAction({
			activityId,
			formModel,
			documentModel,
			sourceDocRef,
			sourceRole,
			relationshipName,
			targetDocRef,
			targetRole,
			linkId: linkRef?.id,
			linkDocRef: linkRef?.id,
			linkDocument,
			singleSelection: true,
			thumbnails
		})
	);
}

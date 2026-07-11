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
import { Activity, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";

import { ModelSelectors } from "../selectors/model.js";
import { RelationshipEngineActions } from "../actions.js";
import { ThumbnailSelectors } from "../selectors/thumbnail.js";
import { ChangelogSelectors } from "../selectors/changelog.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";
import { nextDraftingLinkId } from "../utils/linkIdAndDocRef.js";
import { RelationshipEngineEvents } from "../../../models/index.js";
import { buildOpenLinkFormAction } from "../utils/openLinkFormActivity.js";

import { extractEventRowClickParams } from "./helpers/rowClickParams.js";

/**
 * @internal
 */
export const onLinkAddedRequestedMiddleware: Middleware = (store) => (next) => (action) => {
	const result = next(action);

	const params = extractEventRowClickParams(action, RelationshipEngineEvents.ADD_LINK);

	if (!params) {
		return result;
	}

	const { activityId, documentId, dataHolderDescriptor } = params;

	const dataHolder = ActivitySelectors.activityPropById(activityId, (a) =>
		a.dataHolders
			.filter(RelationshipEngineDataHolder.AvailableItemsDataHolder.isInstance)
			.find(Activity.DataHolder.hasDescriptor(dataHolderDescriptor))
	)(store.getState());

	const document = dataHolder?.data?.documents.find((b) => b?.id === documentId);

	if (!dataHolder || !document) {
		return result;
	}

	const { relationshipName, targetRole } = dataHolder.slices.uiConfiguration;

	const sourceEntityDocRef = dataHolder.slices.sourceEntity.docRef;

	if (!sourceEntityDocRef) {
		throw new Error("Invalid source entity");
	}

	const groupPath = ModelSelectors.groupPath(activityId, dataHolderDescriptor)(store.getState());

	const linkForm = ModelSelectors.linkFormModels(activityId, dataHolderDescriptor)(store.getState());

	if (linkForm !== undefined) {
		const thumbnails = ThumbnailSelectors.thumbnails(activityId)(store.getState());

		store.dispatch(
			buildOpenLinkFormAction({
				activityId,
				formModel: linkForm.formModel,
				documentModel: linkForm.documentModel,
				sourceDocRef: sourceEntityDocRef,
				sourceRole: dataHolder.slices.sourceEntity.role,
				relationshipName,
				targetDocRef: documentId,
				targetRole,
				groupPath: groupPath && ModelPath.toString(groupPath),
				thumbnails
			})
		);
	} else {
		// Dispatch on link added directly
		const existingChangelog = ChangelogSelectors.changelog(activityId)(store.getState());
		const newLinkId = nextDraftingLinkId(relationshipName, existingChangelog);

		// In exclude mode, snapshot the target document so it can be rendered as a drafting row
		const excludeMode = ModelSelectors.isExcludeMode(activityId, relationshipName)(store.getState());
		const targetDocument = excludeMode ? document : undefined;
		const targetDocumentModelName = excludeMode ? document.modelId : undefined;

		store.dispatch(
			RelationshipEngineActions.Events.linkAdded({
				activityId,
				linkRef: {
					id: newLinkId,
					linkDescriptor: {
						relationshipModel: relationshipName,
						entities: [
							{ role: dataHolder.slices.sourceEntity.role, docRef: sourceEntityDocRef },
							{ role: targetRole, docRef: documentId }
						]
					}
				},
				groupPath,
				docRef: documentId,
				targetDocument,
				targetDocumentModelName
			})
		);
	}

	return result;
};

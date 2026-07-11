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

import { ActivitySelectors } from "@com.mgmtp.a12.client/client-core";

import { LinkSelectors } from "../selectors/link.js";
import { ModelSelectors } from "../selectors/model.js";
import { ThumbnailSelectors } from "../selectors/thumbnail.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";
import { RelationshipEngineEvents } from "../../../models/index.js";
import { DocumentGraphSelectors } from "../selectors/documentGraph.js";
import { buildOpenLinkFormAction } from "../utils/openLinkFormActivity.js";

import { extractEventRowClickParams } from "./helpers/rowClickParams.js";

/**
 * @internal
 */
export const onLinkDocumentEditRequestedMiddleware: Middleware = (store) => (next) => (action) => {
	const result = next(action);

	const params = extractEventRowClickParams(action, RelationshipEngineEvents.EDIT_LINK_DOCUMENT);

	if (!params) {
		return result;
	}

	const { activityId, documentId, linkId, dataHolderDescriptor } = params;

	const state = store.getState();
	const linkDataHolder = ActivitySelectors.activityPropById(activityId, (activity) =>
		activity.dataHolders
			.filter(RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance)
			.find((candidate) => candidate.descriptor.instanceId === dataHolderDescriptor.instanceId)
	)(state);

	if (!linkDataHolder) {
		return result;
	}

	const sourceEntity = linkDataHolder.slices.sourceEntity;

	if (!sourceEntity.docRef) {
		return result;
	}

	const { relationshipName, targetRole } = linkDataHolder.slices.uiConfiguration;
	const linkForm = ModelSelectors.linkFormModels(activityId, dataHolderDescriptor)(state);

	if (!linkForm) {
		return result;
	}

	const excludeMode = ModelSelectors.isExcludeMode(activityId, relationshipName)(state);

	const [linkRef, linkDocument] =
		excludeMode && linkId
			? LinkSelectors.findLinkById(activityId, linkId)(state)
			: LinkSelectors.findLink(activityId, {
					relationshipModel: relationshipName,
					source: { role: sourceEntity.role, docRef: sourceEntity.docRef },
					target: { role: targetRole, docRef: documentId }
				})(state);

	if (!linkRef) {
		return result;
	}

	const documentGraph = DocumentGraphSelectors.documentGraph(activityId)(state);
	const linkDocRef = documentGraph?.links.byId[linkRef.id]?.linkDocRef;
	const thumbnails = ThumbnailSelectors.thumbnails(activityId)(state);

	store.dispatch(
		buildOpenLinkFormAction({
			activityId,
			formModel: linkForm.formModel,
			documentModel: linkForm.documentModel,
			sourceDocRef: sourceEntity.docRef,
			sourceRole: sourceEntity.role,
			relationshipName,
			targetDocRef: documentId,
			targetRole,
			linkId: linkRef.id,
			linkDocRef: linkDocRef ?? undefined,
			linkDocument,
			thumbnails
		})
	);

	return result;
};

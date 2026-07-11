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

import { RelationshipEngineActions } from "../actions.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";
import type { GroupPathLoadPayload } from "../../../client/index.js";

export const onLinkAddedMiddleware: Middleware = (store) => (next) => (action) => {
	const result = next(action);

	if (!RelationshipEngineActions.Events.linkAdded.match(action)) {
		return result;
	}

	const { activityId, linkRef, linkDocument, docRef, groupPath, targetDocument, targetDocumentModelName } =
		action.payload;

	// Turn the event into a changelog entry with incremental id
	store.dispatch(
		RelationshipEngineActions.Commands.addChangeLog({
			activityId,
			change: {
				kind: "linkAdded",
				linkId: linkRef.id,
				linkRef,
				linkDocument,
				targetDocument,
				targetDocumentModelName
			}
		})
	);

	const affectedLinksDataHolders = ActivitySelectors.activityPropById(activityId, (a) =>
		a.dataHolders
			.filter(RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance)
			.filter((dh) => dh.slices.uiConfiguration.relationshipName === linkRef.linkDescriptor.relationshipModel)
	)(store.getState());

	const affectedDataHolders: Activity.DataHolder[] = affectedLinksDataHolders ?? [];

	if (groupPath) {
		const documentGraphDataHolder = ActivitySelectors.activityPropById(activityId, (a) =>
			a.dataHolders.find(RelationshipEngineDataHolder.DocumentGraphDataHolder.isInstance)
		)(store.getState());

		if (documentGraphDataHolder) {
			affectedDataHolders?.push(documentGraphDataHolder);
		}

		const defaultDataHolder = ActivitySelectors.activityPropById(
			activityId,
			Activity.findDefaultDataHolder
		)(store.getState());

		if (defaultDataHolder) {
			affectedDataHolders?.push(defaultDataHolder);
		}
	}

	if (affectedDataHolders.length > 0) {
		const dataHolderDescriptors = affectedDataHolders.map((dh) => dh.descriptor);
		const groupPathPayload: GroupPathLoadPayload | undefined = groupPath ? { groupPath, docRef } : undefined;
		store.dispatch(
			ActivityActions.loadData({
				activityId,
				dataHolderDescriptors,
				...(groupPathPayload ?? {})
			})
		);
	}

	return result;
};

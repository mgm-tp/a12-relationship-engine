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

import type { Activity } from "@com.mgmtp.a12.client/client-core";
import { Events, OverviewEngineActions } from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import { RelationshipEngineActions } from "../../actions.js";

/**
 * @internal
 */
export interface RowClickParams {
	activityId: string;
	dataHolderDescriptor: Activity.DataHolderDescriptor;
	documentId: string;
	linkId?: string;
}

/**
 * @internal
 */
export function extractEventRowClickParams(action: unknown, eventName: string): RowClickParams | undefined {
	if (OverviewEngineActions.event.match(action) && Events.onRowButtonClicked.match(action.payload.engineAction)) {
		const { activityId, engineAction, dataHolderDescriptor } = action.payload;
		const { documentId, linkId } = engineAction.payload;

		if (!dataHolderDescriptor || engineAction.payload.rowActionModel?.event !== eventName) {
			return undefined;
		}

		return { activityId, documentId, linkId, dataHolderDescriptor };
	}

	if (OverviewEngineActions.event.match(action) && Events.onRowClicked.match(action.payload.engineAction)) {
		const { activityId, engineAction, dataHolderDescriptor } = action.payload;
		const { documentId, linkId } = engineAction.payload;

		if (!dataHolderDescriptor || engineAction.payload.customEvent !== eventName) {
			return undefined;
		}

		return { activityId, documentId, linkId, dataHolderDescriptor };
	}

	if (RelationshipEngineActions.Events.onDraftingLinkClicked.match(action)) {
		const { activityId, documentId, linkId, dataHolderDescriptor, customEvent } = action.payload;

		if (!dataHolderDescriptor || customEvent !== eventName) {
			return undefined;
		}

		return { activityId, documentId, linkId, dataHolderDescriptor };
	}

	if (RelationshipEngineActions.Events.onDraftingRowClicked.match(action)) {
		const { activityId, documentId, linkId, dataHolderDescriptor, customEvent } = action.payload;

		if (!dataHolderDescriptor || customEvent !== eventName) {
			return undefined;
		}

		return { activityId, documentId, linkId, dataHolderDescriptor };
	}

	return undefined;
}

/**
 * @internal
 */
export function extractDefaultRowClickParams(action: unknown): RowClickParams | undefined {
	if (OverviewEngineActions.event.match(action)) {
		const { activityId, engineAction, dataHolderDescriptor } = action.payload;

		if (!dataHolderDescriptor || !Events.onRowClicked.match(engineAction)) {
			return undefined;
		}

		const { documentId, linkId, customEvent } = engineAction.payload;

		if (customEvent !== undefined) {
			return undefined;
		}

		return { activityId, documentId, linkId, dataHolderDescriptor };
	}

	if (RelationshipEngineActions.Events.onDraftingRowClicked.match(action)) {
		const { activityId, documentId, linkId, dataHolderDescriptor } = action.payload;

		return { activityId, documentId, linkId, dataHolderDescriptor };
	}

	if (RelationshipEngineActions.Events.onDraftingLinkClicked.match(action)) {
		const { activityId, documentId, linkId, dataHolderDescriptor } = action.payload;

		return { activityId, documentId, linkId, dataHolderDescriptor };
	}

	return undefined;
}

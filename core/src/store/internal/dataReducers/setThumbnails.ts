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
import { THUMBNAIL_SLICE } from "@com.mgmtp.a12.client/client-core/a12internal";
import type { Action } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";

import type { RelationshipEngineActions } from "../actions.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";

/**
 * Merges incoming thumbnails into the default, selected-items, and available-items data holders.
 * @internal
 */
export function handleSetThumbnails(
	dataHolders: Activity.DataHolder[],
	action: Action<RelationshipEngineActions.Commands.SetThumbnailsPayload>
): Activity.DataHolder[] {
	const { thumbnails } = action.payload;

	return dataHolders.map(function propagateThumbnail(dh) {
		const isEligible =
			!RelationshipEngineDataHolder.ChangelogDataHolder.isInstance(dh) &&
			!RelationshipEngineDataHolder.DocumentGraphDataHolder.isInstance(dh) &&
			!RelationshipEngineDataHolder.DropdownSelectionDataHolder.isInstance(dh);

		if (!isEligible) {
			return dh;
		}

		const existingThumbnails: Record<string, string> = (dh.slices[THUMBNAIL_SLICE] as Record<string, string>) ?? {};

		return {
			...dh,
			slices: {
				...dh.slices,
				[THUMBNAIL_SLICE]: { ...existingThumbnails, ...thumbnails }
			}
		};
	});
}

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

import { Activity } from "@com.mgmtp.a12.client/client-core";
import type { Action } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";

import type { RelationshipEngineActions } from "../actions.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";

export function handleSetDataHolderSourceEntities(
	dataHolders: Activity.DataHolder[],
	action: Action<RelationshipEngineActions.Commands.SetSourceEntitiesPayload>
): Activity.DataHolder[] {
	const { updates } = action.payload;

	if (updates.length === 0) {
		return dataHolders;
	}

	let mutated = false;
	const nextDataHolders = dataHolders.map((dataHolder) => {
		const update = updates.find((candidate) => Activity.DataHolder.hasDescriptor(candidate.descriptor)(dataHolder));

		if (!update) {
			return dataHolder;
		}

		if (
			!RelationshipEngineDataHolder.AvailableItemsDataHolder.isInstance(dataHolder) &&
			!RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance(dataHolder) &&
			!RelationshipEngineDataHolder.DropdownSelectionDataHolder.isInstance(dataHolder)
		) {
			return dataHolder;
		}

		mutated = true;

		return {
			...dataHolder,
			slices: { ...dataHolder.slices, sourceEntity: update.sourceEntity }
		} as Activity.DataHolder;
	});

	return mutated ? nextDataHolders : dataHolders;
}

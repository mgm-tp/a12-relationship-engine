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

import { select } from "typed-redux-saga";
import type { SagaGenerator } from "typed-redux-saga";

import { ActivitySelectors } from "@com.mgmtp.a12.client/client-core";

import { RelationshipEngineDataHolder } from "../../dataHolder.js";
import { DocumentGraphSelectors } from "../../selectors/documentGraph.js";

/**
 * Retrieves the DropdownSelectionDataHolder for the given activity and instance ID.
 * Saga-compatible version of the middleware's findDropdownDataHolder helper.
 */
export function* selectDropdownDataHolder(
	activityId: string,
	instanceId: string
): SagaGenerator<RelationshipEngineDataHolder.DropdownSelectionDataHolder | undefined> {
	return yield* select(
		ActivitySelectors.activityPropById(activityId, (activity) =>
			activity.dataHolders
				.filter(RelationshipEngineDataHolder.DropdownSelectionDataHolder.isInstance)
				.find((dh: RelationshipEngineDataHolder.DropdownSelectionDataHolder) => dh.descriptor.instanceId === instanceId)
		)
	);
}

/**
 * Resolves the source document reference for a dropdown data holder.
 * Priority: slices value > document graph rootDocRef > activity instance ID.
 * Saga-compatible version of the middleware's resolveSourceDocRef helper.
 */
export function* selectSourceDocRef(
	activityId: string,
	dropdownHolder: RelationshipEngineDataHolder.DropdownSelectionDataHolder
): SagaGenerator<string | undefined> {
	if (dropdownHolder.slices.sourceEntity.docRef) {
		return dropdownHolder.slices.sourceEntity.docRef;
	}

	const rootDocRef = yield* select(DocumentGraphSelectors.rootDocRef(activityId));

	if (rootDocRef) {
		return rootDocRef;
	}

	return yield* select(ActivitySelectors.activityPropById(activityId, (activity) => activity?.descriptor.instance));
}

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

import { put, takeLatest, type SagaGenerator } from "typed-redux-saga";

import { ActivityActions, NEW_INSTANCE_IDENTIFIER } from "@com.mgmtp.a12.client/client-core";
import { Events, OverviewEngineActions } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import type { ParentLinkDescriptor } from "@com.mgmtp.a12.relationshipengine/relationshipengine-core/store";

export function* addChildCategorySaga(): SagaGenerator<void> {
	yield* takeLatest((action: unknown) => {
		return (
			OverviewEngineActions.event.match(action) &&
			Events.onRowButtonClicked.match(action.payload.engineAction) &&
			action.payload.engineAction.payload.rowActionModel.event === "add-child"
		);
	}, handler);
}

function* handler(action: ReturnType<typeof OverviewEngineActions.event>): SagaGenerator<void> {
	const { engineAction, activityId } = action.payload;

	if (!Events.onRowButtonClicked.match(engineAction)) {
		return;
	}

	const { documentId } = engineAction.payload;

	const parentLinkDescriptor: ParentLinkDescriptor = {
		parentRelationshipName: "CategoryCategory",
		parentRelationshipRole: "ParentCategory",
		parentInstance: documentId
	};
	yield* put(
		ActivityActions.create({
			activityDescriptor: {
				model: "Category-document",
				instance: NEW_INSTANCE_IDENTIFIER,
				section: "Relationships",
				feature: "Form",
				...parentLinkDescriptor
			},
			initiatingActivityId: activityId
		})
	);
}

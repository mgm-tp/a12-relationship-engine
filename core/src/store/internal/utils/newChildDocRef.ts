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

import { NEW_INSTANCE_IDENTIFIER } from "@com.mgmtp.a12.client/client-core";

import { ChangelogSelectors } from "../selectors/changelog.js";

import { nextDraftingDocRef } from "./linkIdAndDocRef.js";

/** State type inferred from the changelog selector. */
type State = Parameters<ReturnType<typeof ChangelogSelectors.changelog>>[0];

/**
 * Returns the `descriptor.instance` value to use when opening a new child activity.
 *
 * If `parentActivityId` has an RE `ChangelogDataHolder` (i.e. the new activity will be
 * a nested child under an existing RE CDM context), returns a unique `nextDraftingDocRef`
 * so that sibling NEW children each get a distinct docRef in the parent's DocumentGraph.
 *
 * Otherwise returns `NEW_INSTANCE_IDENTIFIER` so the root-level create flow is unchanged.
 */
export function newChildInstanceDocRef(
	state: State,
	parentActivityId: string | undefined,
	documentModelId: string
): string {
	if (parentActivityId) {
		const parentChangelog = ChangelogSelectors.changelog(parentActivityId)(state);

		if (parentChangelog) {
			return nextDraftingDocRef(documentModelId, parentChangelog);
		}
	}

	return NEW_INSTANCE_IDENTIFIER;
}

/**
 * Saga variant of {@link newChildInstanceDocRef}. Selects the Redux state internally.
 */
export function* newChildInstanceDocRefSaga(
	parentActivityId: string | undefined,
	documentModelId: string
): SagaGenerator<string> {
	if (parentActivityId) {
		const parentChangelog = yield* select(ChangelogSelectors.changelog(parentActivityId));

		if (parentChangelog) {
			return nextDraftingDocRef(documentModelId, parentChangelog);
		}
	}

	return NEW_INSTANCE_IDENTIFIER;
}

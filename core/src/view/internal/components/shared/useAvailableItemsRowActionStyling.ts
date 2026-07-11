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

import React from "react";

import type { OverviewEngineApi } from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import type { ChangelogSelectors } from "../../../../store/index.js";
import { RelationshipEngineEvents } from "../../../../models/index.js";

/**
 * Row action styling for the available items (candidate) pane.
 *
 * Disables the ADD_LINK button for rows that are already linked or have been
 * added in the current session, unless `excludeMode` is true (duplicates allowed).
 * @internal
 */
export function useAvailableItemsRowActionStyling(
	lifecycle: ChangelogSelectors.LifecycleSets,
	alreadyLinked: ReadonlySet<string>,
	excludeMode: boolean
): OverviewEngineApi.RowActionStyling {
	return React.useCallback(
		({ row, button }) => {
			if (button.event !== RelationshipEngineEvents.ADD_LINK) {
				return undefined;
			}

			if (excludeMode) {
				return undefined;
			}

			const id = row.id;

			if (lifecycle.added.includes(id)) {
				return { disabled: true };
			}

			if (alreadyLinked.has(id) && !lifecycle.removed.includes(id) && !lifecycle.withdrawn.includes(id)) {
				return { disabled: true };
			}

			return undefined;
		},
		[alreadyLinked, excludeMode, lifecycle.added, lifecycle.removed, lifecycle.withdrawn]
	);
}

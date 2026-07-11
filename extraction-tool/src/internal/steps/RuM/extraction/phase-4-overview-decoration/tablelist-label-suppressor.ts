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

import type { OverviewDecorationState, OverviewDecorationContext } from "./types.js";

/**
 * Clears header.labels on direct TableList selected overview models.
 *
 * These IDs are identified during P3. The runtime resolves their labels
 * at render time via useResolveRelationshipLabel; the extraction tool must
 * not pre-populate them.
 *
 * Runs as P4 sub-step 6, after populateDefaultLabels, so any label injected
 * by earlier steps (source fixture preservation, pane-label migration,
 * registry fallback, or default labels) is explicitly cleared.
 */
export function clearTableListDirectSelectedOverviewLabels(
	pipelineContext: OverviewDecorationContext,
	state: OverviewDecorationState
): void {
	for (const overviewId of pipelineContext.tableListDirectSelectedOverviewIds) {
		if (!state.has(overviewId)) {
			continue;
		}

		state.draftOM(overviewId, (draft) => {
			draft.header.labels = [];
		});
	}
}

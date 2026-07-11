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
 * Minimal logger interface for Phase 4 decoration operations.
 */
export interface OverviewDecorationLogger {
	warn(message: string): void;
}

/**
 * Groups pageSizeMigrations by overviewModelId, detects conflicts,
 * and applies the maximum page size to each overview model.
 *
 * Implements GAP-5: when multiple bindings set different page sizes
 * on the same overview, a warning is logged and the maximum value is used.
 *
 * @param pipelineContext - The aggregated pipeline context with page size migrations.
 * @param state - The extraction state to mutate via draftOM.
 * @param logger - Optional logger for conflict warnings.
 */
export function migratePageSizes(
	pipelineContext: OverviewDecorationContext,
	state: OverviewDecorationState,
	logger?: OverviewDecorationLogger
): void {
	const grouped = collectPageSizes(pipelineContext);

	for (const [overviewId, sizes] of grouped) {
		const maxSize = Math.max(...sizes);
		const uniqueSizes = [...new Set(sizes)];

		if (uniqueSizes.length > 1 && logger) {
			logger.warn(
				`GAP-5: Conflicting page sizes for overview "${overviewId}": ${uniqueSizes.join(", ")}. Using max: ${maxSize}`
			);
		}

		if (!state.has(overviewId)) {
			continue;
		}

		state.draftOM(overviewId, (draft) => {
			if (!draft.content.configuration) {
				draft.content.configuration = { enableFilter: false };
			}

			draft.content.configuration.pagingSize = maxSize;
		});
	}
}

function collectPageSizes(pipelineContext: OverviewDecorationContext): ReadonlyMap<string, readonly number[]> {
	const grouped = new Map<string, number[]>();

	for (const migration of pipelineContext.pageSizeMigrations) {
		const sizes = grouped.get(migration.overviewModelId);

		if (sizes) {
			sizes.push(migration.pageSize);
		} else {
			grouped.set(migration.overviewModelId, [migration.pageSize]);
		}
	}

	for (const [overviewId, pageSize] of pipelineContext.candidatePageSizeMap) {
		if (!grouped.has(overviewId)) {
			grouped.set(overviewId, [pageSize]);
		}
	}

	return grouped;
}

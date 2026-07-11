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
 * Returns the numeric priority for a label migration source.
 *
 * Lower number = higher priority (first applied wins within same level).
 *
 * | Value                   | Priority |
 * |-------------------------|----------|
 * | `pane-label`            | 2        |
 * | `nested-edit-pane-label`| 2        |
 * | `registry`              | 3        |
 * | `undefined` (legacy)    | 4        |
 */
function sourcePriority(source: string | undefined): number {
	switch (source) {
		case "pane-label":
		case "nested-edit-pane-label":
			return 2;
		case "registry":
			return 3;
		default:
			return 4;
	}
}

/**
 * Applies overview label migrations to overview models with precedence ordering.
 *
 * Reads overviewLabelMigrations from the PipelineContext (collected from P1
 * extraction: explicit pane-labels, nested edit pane-labels, and cross-binding
 * registry) and writes each migration's labels to the corresponding
 * overview's header.labels.
 *
 * **Precedence (Phase 4):** Migrations are sorted by source priority before
 * application. For each overview model ID, only the first (highest-priority)
 * migration writes; lower-priority migrations targeting the same overview are
 * skipped. Within the same priority level, the first migration in binding
 * iteration order wins (deterministic per form-model declaration order).
 *
 * Priority order (highest → lowest):
 * 1. `pane-label` / `nested-edit-pane-label` — explicit binding props
 * 2. `registry` — cross-binding sibling label
 * 3. `undefined` — legacy / no-source
 *
 * @param pipelineContext - The aggregated pipeline context with overview label migrations.
 * @param state - The extraction state to mutate via draftOM.
 */
export function migrateOverviewLabels(
	pipelineContext: OverviewDecorationContext,
	state: OverviewDecorationState
): void {
	// Sort by priority (stable sort: same-priority entries keep relative iteration order)
	const sortedMigrations = [...pipelineContext.overviewLabelMigrations].sort(
		(a, b) => sourcePriority(a.source) - sourcePriority(b.source)
	);

	// Track the priority level at which each overview model received its label.
	// First-writer wins within same priority level (prio < existingPrio check).
	const writtenPriority = new Map<string, number>();

	for (const migration of sortedMigrations) {
		if (!state.has(migration.overviewModelId)) {
			continue;
		}

		const prio = sourcePriority(migration.source);
		const existingPrio = writtenPriority.get(migration.overviewModelId) ?? Number.MAX_SAFE_INTEGER;

		// Only write if this migration has strictly higher priority than any
		// previously written migration for the same overview.
		if (prio < existingPrio) {
			state.draftOM(migration.overviewModelId, (draft) => {
				// Spread the readonly migration labels into a mutable array for the draft
				draft.header.labels = [...migration.labels];
			});
			writtenPriority.set(migration.overviewModelId, prio);
		}
	}
}

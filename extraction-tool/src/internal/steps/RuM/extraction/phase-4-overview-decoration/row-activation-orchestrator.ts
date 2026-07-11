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

import type { RowActivationMigration, OverviewDecorationState, OverviewDecorationContext } from "./types.js";

/**
 * Orchestrates row activation migration across all overview models.
 *
 * Groups rowActivationMigrations by overview model ID, applies first-writer-
 * wins deduplication, and writes the resulting activation to
 * content.rowActivation.
 *
 * CDM suppression is intentionally narrow: only `non_interactive`
 * activations are skipped for CDM forms. Event activations still apply.
 *
 * @param pipelineContext - The aggregated pipeline context with row activation migrations.
 * @param state - The extraction state to mutate via draftOM.
 */
export function orchestrateRowActivations(
	pipelineContext: OverviewDecorationContext,
	state: OverviewDecorationState
): void {
	const grouped = new Map<string, RowActivationMigration>();

	for (const migration of pipelineContext.rowActivationMigrations) {
		if (!grouped.has(migration.overviewModelId)) {
			grouped.set(migration.overviewModelId, migration);
		}
	}

	for (const [overviewId, migration] of grouped) {
		if (!state.has(overviewId)) {
			continue;
		}

		if (pipelineContext.isCdm && migration.activation.type === "non_interactive") {
			continue;
		}

		state.draftOM(overviewId, (draft) => {
			draft.content.rowActivation = migration.activation;
		});
	}
}

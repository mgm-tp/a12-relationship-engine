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

import type { FinalRuM as P2FinalRuM } from "../phase-2-binding-enrichment/index.js";

import { migratePageSizes } from "./page-size-migrator.js";
import { orchestrateRowActions } from "./row-action-orchestrator.js";
import { migrateOverviewLabels } from "./overview-label-migrator.js";
import { populateDefaultLabels } from "./heading-label-populator.js";
import { orchestrateRowActivations } from "./row-activation-orchestrator.js";
import type { OverviewDecorationState, OverviewDecorationContext } from "./types.js";
import { clearTableListDirectSelectedOverviewLabels } from "./tablelist-label-suppressor.js";

/**
 * Phase 4 orchestrator: decorates overview models with page sizes, row
 * actions, row activations, and labels.
 *
 * Sub-steps execute in a strict order:
 * 1. pageSizeMigrations — apply page sizes from legacy config
 * 2. rowActions — apply row actions from legacy modificationConfiguration
 * 3. rowActivation — apply row activations from legacy selection behavior
 * 4. overviewLabels — apply explicit pane label overrides
 * 5. defaults — fill in default labels for empty overview headings
 * 6. tableList label clear — clear direct TableList selected overview labels
 *
 * Each sub-step uses `state.draftOM()` for Immer-style mutation.
 *
 * @param pipelineContext - Pipeline context with overview context map,
 *                          clone map, multi-context remap, and migrations.
 * @param state - Extraction state for Immer-style draft mutations.
 * @param _finalRuMs - The finalized RuM array from P2 enrichment.
 */
export function decorateOverviews(
	pipelineContext: OverviewDecorationContext,
	state: OverviewDecorationState,
	_finalRuMs: readonly P2FinalRuM[]
): void {
	// Step 1: Page size migrations (GAP-5)
	migratePageSizes(pipelineContext, state);

	// Step 2: Row actions
	orchestrateRowActions(pipelineContext, state);

	// Step 3: Row activation (must not affect rowActionGroup.actions)
	orchestrateRowActivations(pipelineContext, state);

	// Step 4: Explicit overview label migrations (from availableItemsTable/selectedItemsTable)
	migrateOverviewLabels(pipelineContext, state);

	// Step 5: Default heading labels (fills in overviews with empty labels)
	populateDefaultLabels(pipelineContext, state);

	// Step 6: Clear labels on direct TableList selected overview outputs
	// (runtime resolves these at render time via useResolveRelationshipLabel)
	clearTableListDirectSelectedOverviewLabels(pipelineContext, state);
}

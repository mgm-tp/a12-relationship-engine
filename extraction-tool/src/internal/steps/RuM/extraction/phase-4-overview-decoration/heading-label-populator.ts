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

import { hasNonEmptyLabels } from "../model-accessors/localization-helpers.js";
import { LINK_DEFAULT_LABELS, MULTI_CONTEXT_SEPARATOR, CANDIDATE_DEFAULT_LABELS } from "../constants.js";

import type { OverviewContext, OverviewDecorationState, OverviewDecorationContext } from "./types.js";

/**
 * Determines the primary context type for an overview.
 *
 * If ANY context entry is a link overview, the overview is treated as a link
 * overview. Otherwise (all contexts are candidate), it's a candidate overview.
 * An overview referenced by no context entries receives no default labels.
 */
function getOverviewContextType(
	overviewContexts: readonly OverviewContext[] | undefined
): "candidate" | "link" | "unknown" {
	if (!overviewContexts || overviewContexts.length === 0) {
		return "unknown";
	}

	if (overviewContexts.some((ctx) => ctx.isLinkOverview)) {
		return "link";
	}

	return "candidate";
}

/**
 * Applies default heading labels to overviews whose header.labels are still empty.
 *
 * For candidate overviews: "Available Items" (en) / "Verfügbare Einträge" (de)
 * For link overviews: "Selected Items" (en) / "Ausgewählte Einträge" (de)
 *
 * This is step (f) in the decoration order and must run after explicit pane
 * label migration (d). It only fills in overviews
 * that still have empty labels after the earlier steps.
 *
 * Handles four classes of overview:
 * 1. Base overviews present in `overviewContextMap`.
 * 2. Relationship-context clones (`--RelationshipName` suffix) registered in
 *    `multiContextRemap` — their context type is inferred from the base overview.
 * 3. Existing single-context `--RelationshipName` clones.
 * 4. Existing direct table (`-tableList`) and edit clones from `cloneMap`.
 *
 * @param pipelineContext - The aggregated pipeline context with overview context map.
 * @param state - The extraction state to mutate via draftOM.
 */
export function populateDefaultLabels(
	pipelineContext: OverviewDecorationContext,
	state: OverviewDecorationState
): void {
	// Step 1: Apply defaults for base overviews present in the context map.
	for (const [overviewId, contexts] of pipelineContext.overviewContextMap) {
		if (!state.has(overviewId)) {
			continue;
		}

		const contextType = getOverviewContextType(contexts);

		if (contextType === "unknown") {
			continue;
		}

		state.draftOM(overviewId, (draft) => {
			// Only apply default if labels are still empty (hasNonEmptyLabels returns false)
			if (!hasNonEmptyLabels(draft.header.labels)) {
				draft.header.labels = contextType === "link" ? [...LINK_DEFAULT_LABELS] : [...CANDIDATE_DEFAULT_LABELS];
			}
		});
	}

	// Step 2: Apply defaults for --RelationshipName clones tracked in multiContextRemap.
	// These are multi-relationship-name clones: the base overview has two or more unique
	// relationship names, so P3 emits one clone per relationship name and records them
	// in multiContextRemap. They are absent from overviewContextMap, so Step 1 misses them.
	for (const [baseOverviewId, relToCloneMap] of pipelineContext.multiContextRemap) {
		const baseContexts = pipelineContext.overviewContextMap.get(baseOverviewId);
		const contextType = getOverviewContextType(baseContexts);

		if (contextType === "unknown") {
			continue;
		}

		for (const [, cloneId] of relToCloneMap) {
			if (!state.has(cloneId)) {
				continue;
			}

			state.draftOM(cloneId, (draft) => {
				if (!hasNonEmptyLabels(draft.header.labels)) {
					draft.header.labels = contextType === "link" ? [...LINK_DEFAULT_LABELS] : [...CANDIDATE_DEFAULT_LABELS];
				}
			});
		}
	}

	// Step 3: Apply defaults for single-context --RelationshipName clones.
	// When an overview has only ONE unique relationship name across all its contexts,
	// P3 creates the clone via resolveSingleContextCloneId (keepModels=true path),
	// naming it "{baseId}--{relName}". These clones are NOT recorded in multiContextRemap
	// (which only covers multi-relationship cases), so Steps 1 and 2 both miss them.
	//
	// Example: Category_Category_AvailableItemsOverview has two contexts both with
	// relationshipName="CategoryCategory" (same rel, different targetRoles). returns false,
	// so multiContextRemap has no entry. But P3 still creates
	// Category_Category_AvailableItemsOverview--CategoryCategory via the single-context clone path.
	// This step handles those clones.
	for (const [baseOverviewId, contexts] of pipelineContext.overviewContextMap) {
		// Skip base overviews already covered by multiContextRemap (Step 2 handles their clones)
		if (pipelineContext.multiContextRemap.has(baseOverviewId)) {
			continue;
		}

		const contextType = getOverviewContextType(contexts);

		if (contextType === "unknown") {
			continue;
		}

		// Collect unique relationship names from candidate (non-link) contexts.
		// For each, the single-context clone ID would be "{baseId}--{relName}".
		const candidateContexts = contexts.filter((c) => !c.isLinkOverview);
		const uniqueRelNames = new Set(candidateContexts.map((c) => c.relationshipName));

		for (const relName of uniqueRelNames) {
			const potentialCloneId = `${baseOverviewId}${MULTI_CONTEXT_SEPARATOR}${relName}`;

			if (!state.has(potentialCloneId)) {
				continue;
			}

			state.draftOM(potentialCloneId, (draft) => {
				if (!hasNonEmptyLabels(draft.header.labels)) {
					draft.header.labels = contextType === "link" ? [...LINK_DEFAULT_LABELS] : [...CANDIDATE_DEFAULT_LABELS];
				}
			});
		}
	}

	// Step 4: Apply defaults for existing direct table and edit clones.
	// P3 structure and P5 remap may create selected/table clones outside overviewContextMap.
	// The clone hints remain existence-only: populate labels only when state already
	// contains the concrete clone.
	for (const [baseOverviewId, contexts] of pipelineContext.overviewContextMap) {
		const contextType = getOverviewContextType(contexts);

		if (contextType === "unknown") {
			continue;
		}

		const editCloneId = pipelineContext.cloneMap.get(baseOverviewId);

		if (editCloneId) {
			populateLabelsIfEmpty(editCloneId, contextType, state);
		}

		if (contextType === "link") {
			const tableListId = `${baseOverviewId}-tableList`;

			if (!pipelineContext.tableListDirectSelectedOverviewIds.has(tableListId)) {
				populateLabelsIfEmpty(tableListId, contextType, state);
			}
		}
	}
}

function populateLabelsIfEmpty(
	overviewId: string,
	contextType: "candidate" | "link",
	state: OverviewDecorationState
): void {
	if (!state.has(overviewId)) {
		return;
	}

	state.draftOM(overviewId, (draft) => {
		if (!hasNonEmptyLabels(draft.header.labels)) {
			draft.header.labels = contextType === "link" ? [...LINK_DEFAULT_LABELS] : [...CANDIDATE_DEFAULT_LABELS];
		}
	});
}

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

import type { Mutable } from "../types.js";
import { EventName, DEFAULT_DROPDOWN_EDIT_LABEL } from "../constants.js";
import type { OverviewModel } from "../../../../../models/overview-model.js";

import type { RowActionMigration, OverviewDecorationState, OverviewDecorationContext } from "./types.js";

/**
 * Orchestrates row action migration across all overview models.
 *
 * Groups rowActionMigrations by effective overview model ID and applies
 * the deduplicated actions to each overview via draftOM.
 *
 * Row actions are grouped by overviewId, deduplicated by actionType
 * (first writer wins for same action type), and applied to the overview's
 * rowActionGroup.actions array.
 *
 * @param pipelineContext - The aggregated pipeline context with row action migrations.
 * @param state - The extraction state to mutate via draftOM.
 */
export function orchestrateRowActions(
	pipelineContext: OverviewDecorationContext,
	state: OverviewDecorationState
): void {
	// Group row action migrations by overview model ID
	const grouped = new Map<string, RowActionMigration[]>();

	for (const migration of pipelineContext.rowActionMigrations) {
		const actions = grouped.get(migration.overviewModelId);

		if (actions) {
			actions.push(migration);
		} else {
			grouped.set(migration.overviewModelId, [migration]);
		}
	}

	// Apply deduplicated actions to each overview
	for (const [overviewId, actions] of grouped) {
		if (!state.has(overviewId)) {
			continue;
		}

		// Deduplicate by actionType: first writer wins
		const dedupedByAction = new Map<string, RowActionMigration>();

		for (const action of actions) {
			if (!dedupedByAction.has(action.actionType)) {
				dedupedByAction.set(action.actionType, action);
			}
		}

		state.draftOM(overviewId, (draft) => {
			const actionsArray = [...dedupedByAction.values()].map(createRowActionButton);

			if (!draft.content.rowActionGroup) {
				draft.content.rowActionGroup = {};
			}

			draft.content.rowActionGroup.actions = actionsArray;
		});
	}
}

function createRowActionButton(action: RowActionMigration): Mutable<OverviewModel.Button> {
	return {
		event: action.actionType,
		icon: { name: action.icon },
		...createAccessibleLabel(action.actionType),
		...createDestructiveFlag(action)
	};
}

function createAccessibleLabel(actionType: string): Pick<Mutable<OverviewModel.Button>, "label" | "labelHidden"> {
	switch (actionType) {
		case EventName.DeleteLink:
			return {
				label: [
					{ locale: "en", text: "Remove" },
					{ locale: "de", text: "Entfernen" }
				],
				labelHidden: true
			};
		case EventName.RestoreLink:
			return {
				label: [
					{ locale: "en", text: "Restore" },
					{ locale: "de", text: "Wiederherstellen" }
				],
				labelHidden: true
			};
		case EventName.EditLinkDocument:
			return {
				label: [...DEFAULT_DROPDOWN_EDIT_LABEL],
				labelHidden: true
			};
		default:
			return {};
	}
}

function createDestructiveFlag(action: RowActionMigration): Pick<Mutable<OverviewModel.Button>, "destructive"> {
	if (action.actionType === EventName.DeleteLink || action.destructive === undefined) {
		return {};
	}

	return { destructive: action.destructive };
}

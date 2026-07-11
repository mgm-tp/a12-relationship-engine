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

import type { RelationshipUiModel } from "../../relationship-ui-model.js";
import type { OverviewModel } from "../../../../../models/overview-model.js";
import type {
	Mutable,
	PageSizeMigration,
	RowActionMigration,
	OverviewLabelMigration,
	RowActivationMigration
} from "../types.js";

export type { OverviewLabelMigration, RowActionMigration, RowActivationMigration };

export interface OverviewContext {
	readonly relationshipName: string;
	readonly targetRole: string;
	readonly isLinkOverview: boolean;
	readonly affinity?: string;
}

export interface OverviewDecorationContext {
	readonly overviewContextMap: ReadonlyMap<string, readonly OverviewContext[]>;
	readonly pageSizeMigrations: readonly PageSizeMigration[];
	readonly candidatePageSizeMap: ReadonlyMap<string, number>;
	readonly rowActionMigrations: readonly RowActionMigration[];
	readonly rowActivationMigrations: readonly RowActivationMigration[];
	readonly overviewLabelMigrations: readonly OverviewLabelMigration[];
	readonly cloneMap: ReadonlyMap<string, string>;
	readonly multiContextRemap: ReadonlyMap<string, ReadonlyMap<string, string>>;
	/**
	 * IDs of direct TableList selected overview outputs.
	 * P4 skips default labels and clears any existing labels for these.
	 */
	readonly tableListDirectSelectedOverviewIds: ReadonlySet<string>;
	readonly isCdm: boolean;
}

/**
 * Mutable state interface for Phase 4 decoration operations.
 *
 * Models must be `put()` into state before they can be drafted.
 * Follows the section-02 type contracts for state manipulation.
 */
export type { Mutable } from "../types.js";

export interface OverviewDecorationState {
	/** Store a model, keyed by model.header.id. */
	put(model: object): void;

	/** Immer-powered mutation for an OverviewModel already in state. */
	draftOM(id: string, recipe: (draft: Mutable<OverviewModel>) => void): void;

	/** Immer-powered mutation for a RelationshipUiModel already in state. */
	draftRuM(id: string, recipe: (draft: Mutable<RelationshipUiModel>) => void): void;

	/** Retrieve a stored model by ID, or undefined if absent. */
	get(id: string): object | undefined;

	/** True if a model with id is currently stored. */
	has(id: string): boolean;
}

/**
 * Identifiers for Phase 4 decoration sub-steps.
 * Used by the ordering guard to validate execution order.
 */
export type DecorationStep = "pageSize" | "rowActions" | "rowActivation" | "overviewLabels" | "defaultLabels";

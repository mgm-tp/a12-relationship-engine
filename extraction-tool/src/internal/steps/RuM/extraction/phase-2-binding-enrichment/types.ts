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

import type { Annotation } from "@com.mgmtp.a12.base/base-model-api";
import type { QueryModel } from "@com.mgmtp.a12.querymodel/querymodel-core";

import type { RelationshipUiModel } from "../../relationship-ui-model.js";
import type {
	RowActionMigration,
	OverviewLabelMigration,
	RowActivationMigration,
	ModificationConfigFlags,
	BindingResult as SharedBindingResult,
	BindingMigrations as SharedBindingMigrations,
	PageSizeMigration as SharedPageSizeMigration
} from "../types.js";

/**
 * Enrichment context passed through all Phase 2 sub-steps.
 * Provides model resolution and optional file system checks.
 */
export interface EnrichmentContext {
	/** Resolves a model by its ID. Returns undefined if the model cannot be found. */
	readonly resolveModel: (modelId: string) => object | undefined;
	/**
	 * Checks whether a model file exists on disk.
	 * Used by query-regenerator to detect missing query model files.
	 */
	readonly fileExists?: (modelId: string) => boolean;
	/** Roles annotations copied from the source form model. */
	readonly rolesAnnotations?: readonly Annotation[];
}

export type BindingResult = SharedBindingResult;
export type BindingMigrations = SharedBindingMigrations;

export type {
	SharedPageSizeMigration as PageSizeMigration,
	OverviewLabelMigration,
	RowActionMigration,
	RowActivationMigration,
	ModificationConfigFlags
};

/**
 * Result of upgrading DropDownSelection bindings.
 */
export interface DropDownUpgradeResult {
	/** The updated binding results with query model references. */
	readonly updatedBindings: readonly BindingResult[];
	/** Newly generated query models from the upgrade. */
	readonly additionalQueryModels: readonly QueryModel[];
}

/**
 * Result of regenerating missing query models.
 */
export interface QueryRegeneratorResult {
	/** The original binding results (unchanged). */
	readonly updatedBindings: readonly BindingResult[];
	/** Regenerated query models that were missing on disk. */
	readonly regeneratedQueryModels: readonly QueryModel[];
}

/**
 * Enriched, finalized RuM produced by P2.
 * Consumed by P3 (overview context), P5 (reference remapping), and P6 (form model update).
 *
 * Follows the plan section 02 type contract.
 */
export interface FinalRuM {
	/** Fully enriched RelationshipUiModel — authoritative source for P3 onwards. */
	readonly rumModel: RelationshipUiModel;
	/** Additional query models produced during P2 enrichment (DropDown→query upgrade). These are AUTHORITATIVE for DropDown bindings — supersede P1's BindingResult.queryModels. */
	readonly additionalQueryModels: readonly QueryModel[];
	/** Binding name as declared in the bindingConfiguration annotation. */
	readonly bindingName: string;
	/** ID of the form element this binding is attached to. */
	readonly elementId: string;
	/** Relationship model name this binding references. */
	readonly relationshipName: string;
	/** Target role within the relationship model (e.g., "Location", "CoInsurer"). */
	readonly targetRole: string;
}

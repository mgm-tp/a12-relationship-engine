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
import type { LocalizedModelText } from "@com.mgmtp.a12.utils/utils-localization";
import type { GenericModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import type { RelationshipUiModel } from "../relationship-ui-model.js";
import type { OverviewModel } from "../../../../models/overview-model.js";
import type { ComponentConfiguration } from "../../binding/binding-model.js";

/**
 * Removes readonly from all properties of T and unwraps ReadonlyArray.
 * Used to simulate Immer's Draft<T> for object types in extraction-state
 * `draftRuM` / `draftOM` recipes used by P4 decoration and other overview drafts.
 */
export type Mutable<T> =
	T extends ReadonlyArray<infer U> ? Mutable<U>[] : T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T;

/**
 * Page size to be migrated to overview model configuration.
 */
export interface PageSizeMigration {
	/** The overview model ID to update */
	readonly overviewModelId: string;
	/** The page size value */
	readonly pageSize: number;
}

/**
 * Target hints for clone-aware overview label routing.
 *
 * - `base` — the original overview model itself (no suffix)
 * - `RelName` — the `--<RelationshipName>` multi-context or single-context clone
 * - `tableList` — the `-tableList` keepModels/direct-clone (only if it already exists)
 * - `edit` — the `-edit` clone (for TableList nested selected dialog)
 * - `edit-available` — routing alias for the edit-dialog available/candidate clone
 *   (typically the `--<RelName>` candidate clone; do not invent `-edit-available` suffix)
 */
export type OverviewLabelCloneTarget = "base" | "RelName" | "tableList" | "edit" | "edit-available";

/**
 * Overview model heading label to be set on header.labels.
 */
export interface OverviewLabelMigration {
	/** The overview model ID to update */
	readonly overviewModelId: string;
	/** Localized heading labels */
	readonly labels: LocalizedModelText;
	/** Label source marker used for phase-scoped routing rules. */
	readonly source?: "pane-label" | "nested-edit-pane-label" | "registry";
	/** Optional clone-routing hints collected during extraction. */
	readonly cloneTargets?: ReadonlySet<OverviewLabelCloneTarget>;
}

/**
 * Row action to be migrated to overview model rowActionGroup.
 */
export interface RowActionMigration {
	/** The overview model ID to update */
	readonly overviewModelId: string;
	/** The row action type/event name */
	readonly actionType: string;
	/** Icon name for the action button */
	readonly icon: string;
	/** Whether the action is destructive (e.g., delete) */
	readonly destructive?: boolean;
}

/**
 * Row activation to be migrated to overview model content.rowActivation.
 */
export interface RowActivationMigration {
	/** The overview model ID to update */
	readonly overviewModelId: string;
	/** The row activation configuration */
	readonly activation: OverviewModel.RowActivation;
}

/**
 * Discriminated union representing the classified component kind
 * and its legacy configuration data.
 *
 * Produced by `classifyComponent` in P1. The `component` field carries
 * the original legacy `ComponentConfiguration`, and for `TableList` the
 * optional `dualPaneComponent` carries an additional `DualPaneSelection`
 * component used as the nested edit dialog.
 */
export type ComponentKind =
	| {
			readonly kind: "DualPaneSelection";
			/** The original legacy component configuration. */
			readonly component: ComponentConfiguration;
			readonly candidatePageSize?: number;
			readonly selectedPageSize?: number;
	  }
	| {
			readonly kind: "TableList";
			/** The original legacy `TableList` component configuration. */
			readonly component: ComponentConfiguration;
			/** Optional nested `DualPaneSelection` for the edit dialog. */
			readonly dualPaneComponent?: ComponentConfiguration;
			readonly linkPageSize?: number;
	  }
	| {
			readonly kind: "DropDownSelection";
			/** The original legacy component configuration. */
			readonly component: ComponentConfiguration;
			readonly candidatePageSize?: number;
	  };

/**
 * Discriminated union for query model strategies used during extraction.
 */
export type QueryStrategy =
	| {
			readonly type: "overview";
			readonly overviewModelId: string;
	  }
	| {
			readonly type: "query";
			readonly queryModelId: string;
	  };

/**
 * Discriminated union for classifying overview model columns.
 */
export type ColumnClassification =
	| {
			readonly type: "data";
			readonly elementId: string;
	  }
	| {
			readonly type: "action";
			readonly eventName: string;
	  }
	| {
			readonly type: "label";
			readonly label: string;
	  };

/**
 * Parsed flags from a legacy modification configuration.
 */
export interface ModificationConfigFlags {
	/** Whether the parent activity descriptor should be extended. */
	readonly extendParentActivityDescriptor: boolean;
	/** The activity descriptor string, if present. */
	readonly activityDescriptor?: string;
}

/**
 * Result of extracting a single binding from a form model.
 */
export interface BindingResult {
	/** The extracted relationship UI model. */
	readonly ruModel: RelationshipUiModel;
	/** Binding name as declared in the bindingConfiguration annotation (normalized). */
	readonly bindingName: string;
	/** ID of the form element this binding is attached to. */
	readonly elementId: string;
	/** Page size migrations produced by this binding. */
	readonly pageSizeMigrations: PageSizeMigration[];
	/** Row action migrations produced by this binding. */
	readonly rowActionMigrations: RowActionMigration[];
	/** Row activation migrations produced by this binding. */
	readonly rowActivationMigrations: RowActivationMigration[];
	/** Overview label migrations produced by this binding. */
	readonly overviewLabelMigrations: OverviewLabelMigration[];
	/**
	 * Phase 2 compatibility alias for the same relationship UI model.
	 * Prefer `ruModel` in phase 1 implementations.
	 */
	readonly relationshipUiModel?: RelationshipUiModel;
	/**
	 * Query models referenced by phase 2 dropdown processing.
	 */
	readonly queryModels?: readonly QueryModel[];
	/**
	 * Compatibility migration payload with phase 2 naming for downstream phases.
	 */
	readonly migrations?: BindingMigrations;
	/**
	 * Phase 2 optional convenience alias for element reference on dropdown bindings.
	 */
	readonly elementRef?: string;
	/**
	 * Relationship name as resolved from the binding source.
	 */
	readonly relationshipName?: string;
	/**
	 * Target role as resolved from the binding source.
	 */
	readonly targetRole?: string;
}

/**
 * Aggregated migrations from all binding extractions.
 */
export interface BindingMigrations {
	/** All page size migrations (legacy phase 1 naming). */
	readonly pageSizeMigrations: PageSizeMigration[];
	/** All row action migrations (legacy phase 1 naming). */
	readonly rowActionMigrations: RowActionMigration[];
	/** All row activation migrations (legacy phase 1 naming). */
	readonly rowActivationMigrations: RowActivationMigration[];
	/** All overview label migrations. */
	readonly overviewLabelMigrations: OverviewLabelMigration[];

	/**
	 * Binding-level add button label from modificationConfiguration.addButtonLabel.
	 */
	readonly addButtonLabel?: LocalizedModelText;
	/**
	 * Binding-level edit button label from modificationConfiguration.editButtonLabel.
	 */
	readonly editButtonLabel?: LocalizedModelText;
	/**
	 * Page size settings in phase 2 naming.
	 */
	readonly pageSizes?: readonly PageSizeMigration[];
	/**
	 * Row action entries from legacy modificationConfiguration.rowActions.
	 */
	readonly rowActions?: readonly RowActionMigration[];
	/**
	 * Row activation entries from phase 2 naming.
	 */
	readonly rowActivations?: readonly RowActivationMigration[];
	/**
	 * Boolean flags from phase 2 migration metadata.
	 */
	readonly modificationConfigFlags?: ModificationConfigFlags;
}

/**
 * The final relationship UI model after all extraction phases,
 * including resolved side effects.
 */
export interface FinalRuM {
	/** The UI model itself. */
	readonly model: RelationshipUiModel;
	/** The binding element ID that produced this model. */
	readonly elementId: string;
	/** The form model ID this belongs to. */
	readonly formModelId: string;
}

/**
 * Result of analyzing an overview model's structure in the context
 * of a relationship binding.
 */
export interface OverviewStructureResult {
	/** The overview model ID. */
	readonly overviewModelId: string;
	/** The relationship name this overview is linked to. */
	readonly relationshipName: string;
	/** The target role for this overview. */
	readonly targetRole: string;
	/** Whether this is a link overview (showing linked items). */
	readonly isLinkOverview: boolean;
}

/**
 * Context about an overview model's relationship properties.
 */
export interface OverviewContext {
	/** The relationship name associated with this overview. */
	readonly relationshipName: string;
	/** The target role for the overview. */
	readonly targetRole: string;
	/** The overview model ID. */
	readonly overviewModelId: string;
}

/**
 * Full pipeline context passed through all extraction phases.
 */
export interface PipelineContext {
	/** The form model being processed. */
	readonly formModel: GenericModel;
	/** The form model ID. */
	readonly formModelId: string;
	/** Collection of bindings extracted so far. */
	readonly bindings: readonly BindingResult[];
	/** Migrations accumulated during processing. */
	readonly migrations: BindingMigrations;
	/** Master preservation flag for extraction pipeline behavior. */
	readonly keepModels: boolean;
	/** Roles annotations copied from the source form model. */
	readonly rolesAnnotations: readonly Annotation[];
}

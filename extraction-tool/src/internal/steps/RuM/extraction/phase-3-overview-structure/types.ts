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

import type { QueryModel } from "@com.mgmtp.a12.querymodel/querymodel-core";
import type { Query } from "@com.mgmtp.a12.dataservices/dataservices-access";

import type { RelationshipUiModel } from "../../relationship-ui-model.js";
import type { OverviewModel } from "../../../../../models/overview-model.js";

/**
 * A narrow constraint type anchored to `Query.DocRefExactMatchOperator`.
 *
 * Narrows `value` to required `string` because the migration tool always constructs
 * a string placeholder `${docModelId, [/__meta/docRef]}` as the constraint value.
 */
export type QueryExactMatchConstraint = Query.DocRefExactMatchOperator & { readonly value: string };

/**
 * FinalRuM produced by P2. Consumed by P3 (overview context).
 */
export interface OverviewStructureFinalRuM {
	/** Fully enriched RelationshipUiModel. */
	readonly rumModel: RelationshipUiModel;
	/** Binding name as declared in the bindingConfiguration annotation. */
	readonly bindingName: string;
	/** ID of the form element this binding is attached to. */
	readonly elementId: string;
	/** Relationship model name this binding references. */
	readonly relationshipName: string;
	/** Target role within the relationship model. */
	readonly targetRole: string;
}

/**
 * Structural output of P3. Consumed by P4 for decoration and P5 for reference remapping.
 */
export interface OverviewStructureResult {
	/** overview ID → all relationship contexts that reference it. */
	readonly overviewContextMap: ReadonlyMap<string, readonly OverviewContext[]>;
	/** originalId → cloneId for overviews cloned under --keep-models (single-context path). */
	readonly cloneMap: ReadonlyMap<string, string>;
	/** originalId → (relationshipName → cloneId) for multi-context clones. */
	readonly multiContextRemap: ReadonlyMap<string, ReadonlyMap<string, string>>;
	/** Remapped overview models after generated-doc column analysis. */
	readonly remappedOverviews: ReadonlyMap<string, OverviewModel>;
	/** Link-type query models generated for overview columns with linkReferences. */
	readonly linkQueryModels: readonly QueryModel[];
	/** Candidate-type query models generated for overview columns/strategies. */
	readonly candidateQueryModels: readonly QueryModel[];
	/** Global candidate overview → page size fallback map derived from form bindings. */
	readonly candidatePageSizeMap: ReadonlyMap<string, number>;
	/** IDs of generated document models successfully replaced. */
	readonly deletionList: readonly string[];
	/**
	 * Final IDs of the direct TableList selected overview output per binding:
	 * - keepModels=true  → `${selectedItemsOverviewModel}-tableList`
	 * - keepModels=false → `selectedItemsOverviewModel`
	 *
	 * P4 uses this set to suppress default labels and to clear any
	 * pre-existing labels from source overview fixtures.
	 */
	readonly tableListDirectSelectedOverviewIds: ReadonlySet<string>;
}

/**
 * Per-binding context for a single overview model reference.
 */
export interface OverviewContext {
	/** Relationship model name the binding references. */
	readonly relationshipName: string;
	/** Target role within the relationship model. */
	readonly targetRole: string;
	/** True when this is the selectedItems (link) overview; false for candidate overview. */
	readonly isLinkOverview: boolean;
	/** Relationship semantic flag resolved from relationship.content.duplicatesAllowed. */
	readonly duplicatesAllowed: boolean;
	/** Optional affinity label for multi-context clone naming. */
	readonly affinity?: string;
}

/**
 * Analysis result for a generated document model, identifying its target
 * and link document models and their wrapper element ID prefixes.
 */
export interface TypedGeneratedDocAnalysis {
	/** The ID of the resolved target document model. */
	readonly targetDocumentModelId: string;
	/** The ID of the resolved link document model, if present. */
	readonly linkDocumentModelId?: string;
	/** The prefix string from the target wrapper group element ID (e.g., "I4_"). */
	readonly targetGroupPrefix: string;
	/** The prefix string from the relationship wrapper group element ID (e.g., "I5_"), if present. */
	readonly relationshipGroupPrefix?: string;
}

/**
 * Classification result for a single column in a generated document model.
 * Produced by classifyColumn in P3. Drives elementRef remapping and linkReferences construction.
 */
export type ColumnClassification =
	| {
			/** Column maps to a field in the target document model. */
			readonly kind: "target";
			readonly originalElementId: string;
	  }
	| {
			/** Column maps to a field in the link (relationship) document model. */
			readonly kind: "relationship";
			readonly originalElementId: string;
			readonly existsInLinkDoc: boolean;
	  }
	| {
			/** Column is a root-group wrapper (e.g., Section or Group at root level). */
			readonly kind: "rootGroup";
			readonly groupId: string;
	  }
	| {
			/** Column does not match a recognized prefix pattern. Warning log, column left unmodified. */
			readonly kind: "unmatched";
			readonly elementRef: string;
	  };

/**
 * Strategy for generating the overview query model.
 * Determined by duplicatesAllowed on the relationship model.
 */
export type QueryStrategy =
	| {
			/**
			 * HAS strategy — used when duplicatesAllowed === false.
			 * Only show items already linked to the current source document.
			 */
			readonly kind: "has";
			readonly targetDocumentModelId: string;
			readonly sourceDocumentModelId: string;
	  }
	| {
			/**
			 * EXCLUDE strategy — used when duplicatesAllowed === true.
			 * Show all items not yet linked to the source document.
			 */
			readonly kind: "exclude";
			readonly sourceDocumentModelId: string;
	  };

/**
 * Parameters for remapping an overview model backed by a generated document wrapper.
 */
export interface RemapOverviewParams {
	/** The overview model to process. */
	readonly overview: OverviewModel;
	/** The overview model's header.id. */
	readonly overviewId: string;
	/** The generated document wrapper model ID. */
	readonly genDocId: string;
	/** Resolved relationship context for this overview ID, if available. */
	readonly overviewContext: OverviewContext | undefined;
	/** First context entry from the overview context map, used for inline-field fallback. */
	readonly firstContext: OverviewContext | undefined;
	/** Model resolver function. */
	readonly resolveModel: (modelId: string) => object | undefined;
	/** Whether generated models should be preserved (--keep-models). */
	readonly keepModels: boolean;
	/** Source document model ID for query strategy resolution, if available. */
	readonly sourceDocumentModelId: string | undefined;
}

/** Result of remapping an overview model backed by a generated document wrapper. */
export interface RemapOverviewResult {
	readonly finalOverview: OverviewModel;
	readonly analysis: TypedGeneratedDocAnalysis;
	readonly analyzedGenDocId: string;
}

export type RelationshipBindingVisitor = (binding: RelationshipBindingEntry) => void;

export interface RelationshipBindingEntry {
	readonly relationshipName: string;
	readonly components: readonly RelationshipBindingComponent[];
}

export interface RelationshipBindingComponent {
	readonly candidatePageSize?: number;
	readonly models?: readonly {
		readonly use: string;
		readonly name: string;
	}[];
	readonly componentType?: string;
}

export interface CloneOverviewModelOptions {
	/** Optional explicit query model reference ID when updateModelRefs is true. */
	readonly queryModelReferenceId?: string;
}

export interface CreateCleanClonesOptions {
	readonly canCreateDualPaneEditClone?: (overviewId: string) => boolean;
}

/**
 * A segment in a field path, representing a single navigation step.
 */
export interface FieldPathSegment {
	readonly elementId: string;
	readonly name?: string;
}

/**
 * A field path that describes how to navigate from the document model root
 * to a specific field element.
 */
export type FieldPath = readonly FieldPathSegment[];

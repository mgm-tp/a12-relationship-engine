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

/**
 * Pipeline context required by the reconcile pass.
 *
 * Carries pipeline-context data that cannot be derived from model content
 * alone (e.g., the document model associated with an overview model, which
 * is resolved during P3 analysis).
 */
export interface ReconcileContext {
	/**
	 * Maps overview model ID → document model ID (from P3 analysis).
	 * Used to derive the `document-model-for-overview` ref on overview models.
	 */
	readonly overviewDocModelMap: ReadonlyMap<string, string>;
	/**
	 * Set of all query model IDs generated during this pipeline run (P2 + P3).
	 * Used to detect whether a `query-model-for-overview` ref should be emitted.
	 */
	readonly generatedQueryModelIds: ReadonlySet<string>;
	/**
	 * Existing overview → query reference assignments already present on models in
	 * extraction state before reconciliation.
	 *
	 * Reconciliation must preserve these valid query-backed assignments even when
	 * the query ID does not match the small suffix convention handled below
	 * (for example keepModels edit/tableList clones sharing a base `-query`).
	 */
	readonly existingOverviewQueryRefs: ReadonlyMap<string, string>;
}

/**
 * Internal editable model shape used by the reconcile phase.
 */
export interface EditableModel {
	readonly [key: string]: unknown;
	header?: unknown;
}

/**
 * Type guard for models that can be safely updated with derived `modelReferences`.
 */
export function isEditableModel(model: unknown): model is EditableModel {
	return typeof model === "object" && model !== null;
}

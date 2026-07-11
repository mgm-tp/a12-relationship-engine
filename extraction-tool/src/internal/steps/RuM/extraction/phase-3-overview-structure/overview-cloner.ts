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

import { isOverviewModel } from "../model-accessors/type-guards.js";
import type { OverviewModel } from "../../../../../models/overview-model.js";
import { EDIT_CLONE_SUFFIX, MULTI_CONTEXT_SEPARATOR } from "../constants.js";

import { requiresMultiRelationshipCandidateClone } from "./overview-context-map.js";
import type {
	OverviewContext,
	CreateCleanClonesOptions,
	OverviewStructureFinalRuM,
	CloneOverviewModelOptions
} from "./types.js";

export { EDIT_CLONE_SUFFIX, MULTI_CONTEXT_SEPARATOR };

/**
 * Creates a deep clone of an overview model with a new ID.
 * JSON.parse/JSON.stringify is a sanctioned `as` site per Gate L.
 * The clone preserves source header labels; empty source labels remain empty so
 * Phase 4 can still apply generic fallback labels.
 *
 * @param updateModelRefs - When true, replaces "document-model-for-overview"
 *   purpose refs with "query-model-for-overview" (for --RelationshipName and edit clones).
 */
export function cloneOverviewModel(
	overview: OverviewModel,
	newId: string,
	updateModelRefs = false,
	options: CloneOverviewModelOptions = {}
): OverviewModel {
	const raw: unknown = JSON.parse(JSON.stringify(overview));

	if (typeof raw !== "object" || raw === null || !isOverviewModel(raw)) {
		throw new Error(`Cannot clone overview model "${overview.header.id}": malformed JSON clone`);
	}

	const modelReferences = updateModelRefs
		? (() => {
				const queryReference = {
					purpose: "query-model-for-overview" as const,
					modelType: "query" as const,
					reference: options.queryModelReferenceId ?? `${newId}-query`
				};
				const sourceRefs = raw.header.modelReferences ?? [];
				const updatedRefs = sourceRefs
					.filter((ref) => ref.purpose !== "document-model-for-overview")
					.map((ref) => (ref.purpose === "query-model-for-overview" ? { ...queryReference } : ref));

				if (!updatedRefs.some((ref) => ref.purpose === "query-model-for-overview")) {
					updatedRefs.push(queryReference);
				}

				return updatedRefs;
			})()
		: raw.header.modelReferences;

	return {
		...raw,
		header: {
			...raw.header,
			id: newId,
			...(updateModelRefs && modelReferences !== undefined ? { modelReferences } : {})
		}
	};
}

/**
 * Resolves the overview model ID that should receive an edit clone,
 * based on the component type and the keepModels flag.
 *
 * - `TableList`: always returns `editConfiguration.selectedItemsOverviewModel`.
 * - `DualPaneSelection`: returns `selectedItemsOverviewModel` only when `keepModels` is `true`.
 * - `DropDownSelection` and other types: returns `undefined` (no edit clone).
 *
 * @internal
 */
function resolveEditCloneSource(
	component: OverviewStructureFinalRuM["rumModel"]["content"]["component"],
	keepModels: boolean
): { readonly overviewId: string; readonly fromDualPane: boolean } | undefined {
	if (!component) {
		return undefined;
	}

	if (component.componentType === "TableList") {
		const overviewId = component.editConfiguration?.selectedItemsOverviewModel;

		return overviewId !== undefined ? { overviewId, fromDualPane: false } : undefined;
	}

	if (keepModels && component.componentType === "DualPaneSelection") {
		const overviewId = component.selectedItemsOverviewModel;

		return overviewId !== undefined ? { overviewId, fromDualPane: true } : undefined;
	}

	return undefined;
}

/**
 * Creates edit-dialog clones for bindings that require a separate edit overview.
 *
 * - For `TableList` bindings with `editConfiguration`: clones
 *   `editConfiguration.selectedItemsOverviewModel` as `{overviewId}-edit`.
 * - For `DualPaneSelection` bindings under `keepModels`: clones
 *   `selectedItemsOverviewModel` as `{overviewId}-edit` so that P5 can
 *   remap selected and header refs to the shared edit clone.
 *
 * The edit clone shares its query model with the source overview
 * (`{overviewId}-query`). No `-edit-query` is generated.
 *
 * @param finalRuMs - The FinalRuM array from P2.
 * @param overviewModels - Map of overview model ID → overview model.
 * @param keepModels - Whether the keepModels flag is set (gates DualPane clone creation).
 * @returns An object containing the cloneMap and cloneModels.
 */
export function createCleanClones(
	finalRuMs: readonly OverviewStructureFinalRuM[],
	overviewModels: ReadonlyMap<string, OverviewModel>,
	keepModels: boolean,
	options: CreateCleanClonesOptions = {}
): {
	readonly cloneMap: ReadonlyMap<string, string>;
	readonly cloneModels: ReadonlyMap<string, OverviewModel>;
} {
	const cloneMap = new Map<string, string>();
	const cloneModels = new Map<string, OverviewModel>();

	for (const rum of finalRuMs) {
		const component = rum.rumModel.content.component;
		const cloneSource = resolveEditCloneSource(component, keepModels);

		if (!cloneSource) {
			continue;
		}

		const { overviewId, fromDualPane } = cloneSource;

		if (fromDualPane && options.canCreateDualPaneEditClone?.(overviewId) === false) {
			continue;
		}

		const cloneId = `${overviewId}${EDIT_CLONE_SUFFIX}`;

		// Skip if already cloned
		if (cloneMap.has(overviewId)) {
			continue;
		}

		const sourceModel = overviewModels.get(overviewId);

		if (!sourceModel) {
			continue;
		}

		// Edit clones share their selected-items query with the source overview
		// (v2 rule: no -edit-query generated): `{overviewId}-query`.
		const clone = cloneOverviewModel(sourceModel, cloneId, true, {
			queryModelReferenceId: `${overviewId}-query`
		});
		cloneMap.set(overviewId, cloneId);
		cloneModels.set(cloneId, clone);
	}

	return { cloneMap, cloneModels };
}

/**
 * Handles GAP-1 candidate overview clones.
 *
 * When multiple relationship contexts share a candidate overview with
 * distinct relationship names, creates per-relationship clones named
 * `{overviewId}--{relationshipName}`.
 *
 * @param overviewContextMap - The overview context map from buildOverviewContextMap.
 * @param overviewModels - Map of overview model ID → overview model.
 * @returns An object containing the multiContextRemap and clone models.
 */
export function handleCandidateClones(
	overviewContextMap: ReadonlyMap<string, readonly OverviewContext[]>,
	overviewModels: ReadonlyMap<string, OverviewModel>
): {
	readonly multiContextRemap: ReadonlyMap<string, ReadonlyMap<string, string>>;
	readonly cloneModels: ReadonlyMap<string, OverviewModel>;
} {
	const multiContextRemap = new Map<string, Map<string, string>>();
	const cloneModels = new Map<string, OverviewModel>();

	for (const [overviewId, contexts] of overviewContextMap) {
		if (!requiresMultiRelationshipCandidateClone([...contexts])) {
			continue;
		}

		// Only consider candidate contexts (isLinkOverview === false)
		const candidateContexts = [...contexts].filter((c) => !c.isLinkOverview);
		const uniqueRelNameContexts = new Map<string, OverviewContext>();

		for (const ctx of candidateContexts) {
			if (!uniqueRelNameContexts.has(ctx.relationshipName)) {
				uniqueRelNameContexts.set(ctx.relationshipName, ctx);
			}
		}

		const relToClone = new Map<string, string>();
		const sourceModel = overviewModels.get(overviewId);

		if (!sourceModel) {
			continue;
		}

		for (const [relName] of uniqueRelNameContexts) {
			const cloneId = `${overviewId}${MULTI_CONTEXT_SEPARATOR}${relName}`;
			relToClone.set(relName, cloneId);

			if (!cloneModels.has(cloneId)) {
				// Query-backed relationship-name clones must use query-model-for-overview refs.
				const clone = cloneOverviewModel(sourceModel, cloneId, true);
				cloneModels.set(cloneId, clone);
			}
		}

		multiContextRemap.set(overviewId, relToClone);
	}

	return { multiContextRemap, cloneModels };
}

/**
 * Generates a single-context clone ID based on the keepModels flag.
 * When keepModels is true, uses --RelationshipName suffix (the intended naming convention).
 */
export function resolveSingleContextCloneId(
	overviewId: string,
	relationshipName: string,
	keepModels: boolean,
	shouldCloneCandidate: boolean = false
): string {
	if (keepModels || shouldCloneCandidate) {
		return `${overviewId}${MULTI_CONTEXT_SEPARATOR}${relationshipName}`;
	}

	return overviewId;
}

/**
 * Resolves the effective clone ID for an overview, considering edit clones,
 * multi-context clones, and the keepModels flag.
 */
export function resolveCloneId(
	overviewId: string,
	relationshipName: string,
	cloneMap: ReadonlyMap<string, string>,
	multiContextRemap: ReadonlyMap<string, ReadonlyMap<string, string>>,
	keepModels: boolean,
	shouldCloneCandidate: boolean = false
): string {
	// Check edit clone map first
	const editCloneId = cloneMap.get(overviewId);

	if (editCloneId) {
		return editCloneId;
	}

	// Check multi-context remap
	const relToClone = multiContextRemap.get(overviewId);

	if (relToClone) {
		return relToClone.get(relationshipName) ?? overviewId;
	}

	// Default: single-context path
	return resolveSingleContextCloneId(overviewId, relationshipName, keepModels, shouldCloneCandidate);
}

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

import { ModelNotFoundError } from "../model-not-found-error.js";
import { isRelationshipModel } from "../model-accessors/type-guards.js";
import type { RelationshipUiModel } from "../../relationship-ui-model.js";

import type { OverviewContext, OverviewStructureFinalRuM } from "./types.js";

/**
 * Extracts candidate and link overview model references from a RelationshipUiModel's component.
 *
 * @param rum - The relationship UI model.
 * @returns An array of objects with overviewId, isLinkOverview flag.
 */
function extractOverviewRefs(
	rum: RelationshipUiModel
): ReadonlyArray<{ readonly overviewId: string; readonly isLinkOverview: boolean }> {
	const refs: Array<{ overviewId: string; isLinkOverview: boolean }> = [];
	const component = rum.content.component;

	if (!component) {
		return refs;
	}

	// selectedItemsOverviewModel → link overview
	if (component.selectedItemsOverviewModel) {
		refs.push({
			overviewId: component.selectedItemsOverviewModel,
			isLinkOverview: true
		});
	}

	// availableItemsOverviewModel → candidate overview
	if (component.availableItemsOverviewModel) {
		refs.push({
			overviewId: component.availableItemsOverviewModel,
			isLinkOverview: false
		});
	}

	if (component.componentType === "TableList") {
		// For TableList component, also check editConfiguration for nested DualPane candidate ref.
		if (component.editConfiguration?.availableItemsOverviewModel) {
			refs.push({
				overviewId: component.editConfiguration.availableItemsOverviewModel,
				isLinkOverview: false
			});
		}

		// For TableList component, always include editConfiguration.selectedItemsOverviewModel as a
		// link overview. The edit dialog needs its own -edit clone even when it starts from the
		// same legacy overview as the direct selectedItemsOverviewModel under non-keepModels.
		if (component.editConfiguration?.selectedItemsOverviewModel) {
			refs.push({
				overviewId: component.editConfiguration.selectedItemsOverviewModel,
				isLinkOverview: true
			});
		}
	}

	return refs;
}

/**
 * Checks whether a given context entry already exists in the array.
 *
 * Two contexts are considered duplicate when they share the same
 * relationshipName, targetRole, and isLinkOverview value.
 */
function isDuplicateEntry(entries: readonly OverviewContext[], newEntry: OverviewContext): boolean {
	return entries.some(
		(entry) =>
			entry.relationshipName === newEntry.relationshipName &&
			entry.targetRole === newEntry.targetRole &&
			entry.isLinkOverview === newEntry.isLinkOverview &&
			entry.duplicatesAllowed === newEntry.duplicatesAllowed
	);
}

/**
 * Scans FinalRuM[] for overview model references and builds a multi-valued
 * context map: overviewId → OverviewContext[].
 *
 * For TableList components, also scans the nested DualPane sub-component's
 * availableItemsOverviewModel when building the context map.
 *
 * Deduplicates entries with the same (relationshipName, targetRole, isLinkOverview).
 *
 * @param finalRuMs - The enriched FinalRuM array from P2.
 * @returns A map of overviewId → array of unique OverviewContext entries.
 */
export function resolveDuplicatesAllowed(
	resolveModel: (modelId: string) => object | undefined,
	relationshipName: string
): boolean {
	const relationshipModel = resolveModel(relationshipName);

	if (relationshipModel === undefined) {
		throw new ModelNotFoundError(relationshipName);
	}

	if (!isRelationshipModel(relationshipModel)) {
		throw new ModelNotFoundError(relationshipName);
	}

	const content = Reflect.get(relationshipModel, "content");

	if (content === null || typeof content !== "object" || Array.isArray(content)) {
		return false;
	}

	const duplicatesAllowed = Reflect.get(content, "duplicatesAllowed");

	if (typeof duplicatesAllowed !== "boolean") {
		return false;
	}

	return duplicatesAllowed;
}

export function buildOverviewContextMap(
	finalRuMs: readonly OverviewStructureFinalRuM[],
	resolveModel: (modelId: string) => object | undefined
): Map<string, OverviewContext[]> {
	const contextMap = new Map<string, OverviewContext[]>();

	for (const rum of finalRuMs) {
		const overviewRefs = extractOverviewRefs(rum.rumModel);

		for (const ref of overviewRefs) {
			const entry: OverviewContext = {
				relationshipName: rum.relationshipName,
				targetRole: rum.targetRole,
				isLinkOverview: ref.isLinkOverview,
				duplicatesAllowed: resolveDuplicatesAllowed(resolveModel, rum.relationshipName)
			};

			const existing = contextMap.get(ref.overviewId);

			if (existing) {
				if (!isDuplicateEntry(existing, entry)) {
					existing.push(entry);
				}
			} else {
				contextMap.set(ref.overviewId, [entry]);
			}
		}
	}

	return contextMap;
}

/**
 * Determines whether candidate overview contexts require a multi-relationship clone.
 *
 * GAP-1: Shared candidate overview appears in multiple relationship contexts.
 *
 * @param contexts - The overview contexts to evaluate.
 * @returns True when multi-context cloning is required.
 */
export function requiresMultiRelationshipCandidateClone(contexts: readonly OverviewContext[]): boolean {
	if (contexts.length <= 1) {
		return false;
	}

	// Link overviews are not cloned in this multi-relationship path
	if (contexts.every((c) => c.isLinkOverview)) {
		return false;
	}

	const candidateRelationships = contexts.filter((c) => !c.isLinkOverview);
	const uniqueRelNames = new Set(candidateRelationships.map((c) => c.relationshipName));

	return uniqueRelNames.size > 1;
}

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

import type { ModelReference } from "@com.mgmtp.a12.base/base-model-api";

import type { FinalRuM } from "../types.js";
import { MULTI_CONTEXT_SEPARATOR } from "../constants.js";
import type { RelationshipUiModel } from "../../relationship-ui-model.js";
import { getModelReferences } from "../model-accessors/header-accessors.js";

import type { RemappedRuM, RemapSingleRefOptions } from "./types.js";

/**
 * Remaps a single overview model reference using cloneMap and multiContextRemap.
 *
 * Checks single-context cloneMap first, then falls back to multiContextRemap
 * keyed by relationshipName. Returns the original reference unchanged if no
 * mapping is found.
 *
 * @param ref - The overview model ID to remap, or undefined.
 * @param cloneMap - Single-context clone mapping (originalId -> cloneId).
 * @param multiContextRemap - Multi-context clone mapping keyed by relationship name.
 * @param relationshipName - The relationship name for multi-context lookup.
 * @returns The remapped ID, or the original ID if no mapping exists.
 */
function resolveDualPaneSelectedCloneTarget(
	selectedRef: string | undefined,
	cloneMap: ReadonlyMap<string, string>,
	existingOverviewIds: ReadonlySet<string>
): string | undefined {
	if (selectedRef === undefined) {
		return undefined;
	}

	const cloneTarget = cloneMap.get(selectedRef);

	if (cloneTarget !== undefined && existingOverviewIds.has(cloneTarget)) {
		return cloneTarget;
	}

	const editCloneTarget = `${selectedRef}-edit`;

	if (existingOverviewIds.has(editCloneTarget)) {
		return editCloneTarget;
	}

	return undefined;
}

function appendTableListEditOverviewRefs(
	refs: readonly ModelReference[],
	availableRef: string | undefined,
	selectedRef: string | undefined
): ModelReference[] {
	const result: ModelReference[] = [...refs];

	for (const reference of [availableRef, selectedRef]) {
		if (reference === undefined || result.some((ref) => ref.modelType === "overview" && ref.reference === reference)) {
			continue;
		}

		result.push({ modelType: "overview", reference, purpose: "overview" });
	}

	return result;
}

function resolveTableListDirectCloneTarget(
	selectedRef: string | undefined,
	existingOverviewIds: ReadonlySet<string>
): string | undefined {
	if (selectedRef === undefined) {
		return undefined;
	}

	const tableListCloneTarget = `${selectedRef}-tableList`;

	if (existingOverviewIds.has(tableListCloneTarget)) {
		return tableListCloneTarget;
	}

	return undefined;
}

function remapSingleRef(
	ref: string | undefined,
	cloneMap: ReadonlyMap<string, string>,
	multiContextRemap: ReadonlyMap<string, ReadonlyMap<string, string>>,
	relationshipName: string,
	existingOverviewIds: ReadonlySet<string>,
	options: RemapSingleRefOptions = {}
): string | undefined {
	if (ref === undefined) {
		return undefined;
	}

	// Single-context clone map (fast path)
	if (options.skipCloneMap !== true) {
		const mapped = cloneMap.get(ref);

		if (mapped !== undefined) {
			return mapped;
		}
	}

	// Multi-context clone map
	const byRelationship = multiContextRemap.get(ref);

	if (byRelationship !== undefined) {
		const byRel = byRelationship.get(relationshipName);

		if (byRel !== undefined) {
			return byRel;
		}
	}

	if (options.allowImplicitRelationshipClone === true) {
		const implicitCloneId = `${ref}${MULTI_CONTEXT_SEPARATOR}${relationshipName}`;

		if (existingOverviewIds.has(implicitCloneId)) {
			return implicitCloneId;
		}
	}

	// No mapping found — return original
	return ref;
}

function remapComponentRefs(
	component: RelationshipUiModel.ComponentConfiguration,
	relationshipName: string,
	cloneMap: ReadonlyMap<string, string>,
	multiContextRemap: ReadonlyMap<string, ReadonlyMap<string, string>>,
	existingOverviewIds: ReadonlySet<string>
): RelationshipUiModel.ComponentConfiguration {
	const remappedAvailableItemsOverviewModel = remapSingleRef(
		component.availableItemsOverviewModel,
		cloneMap,
		multiContextRemap,
		relationshipName,
		existingOverviewIds,
		component.componentType === "DualPaneSelection" ? { allowImplicitRelationshipClone: true } : undefined
	);
	const remappedSelectedItemsOverviewModel =
		component.componentType === "DualPaneSelection"
			? (resolveDualPaneSelectedCloneTarget(component.selectedItemsOverviewModel, cloneMap, existingOverviewIds) ??
				component.selectedItemsOverviewModel)
			: component.componentType === "TableList"
				? (resolveTableListDirectCloneTarget(component.selectedItemsOverviewModel, existingOverviewIds) ??
					component.selectedItemsOverviewModel)
				: remapSingleRef(
						component.selectedItemsOverviewModel,
						cloneMap,
						multiContextRemap,
						relationshipName,
						existingOverviewIds
					);
	const remappedEditConfigurationAvailableItemsOverviewModel = remapSingleRef(
		component.editConfiguration?.availableItemsOverviewModel,
		cloneMap,
		multiContextRemap,
		relationshipName,
		existingOverviewIds,
		component.componentType === "TableList" ? { allowImplicitRelationshipClone: true } : undefined
	);
	const remappedEditConfigurationSelectedItemsOverviewModel = remapSingleRef(
		component.editConfiguration?.selectedItemsOverviewModel,
		cloneMap,
		multiContextRemap,
		relationshipName,
		existingOverviewIds
	);

	return {
		...component,
		availableItemsOverviewModel: remappedAvailableItemsOverviewModel,
		selectedItemsOverviewModel: remappedSelectedItemsOverviewModel,
		editConfiguration:
			component.editConfiguration === undefined
				? undefined
				: {
						...component.editConfiguration,
						availableItemsOverviewModel:
							remappedEditConfigurationAvailableItemsOverviewModel ??
							component.editConfiguration.availableItemsOverviewModel,
						selectedItemsOverviewModel:
							remappedEditConfigurationSelectedItemsOverviewModel ??
							component.editConfiguration.selectedItemsOverviewModel
					}
	};
}

function remapHeaderOverviewRefs(
	refs: readonly ModelReference[],
	component: RelationshipUiModel.ComponentConfiguration,
	remappedComponent: RelationshipUiModel.ComponentConfiguration,
	cloneMap: ReadonlyMap<string, string>,
	multiContextRemap: ReadonlyMap<string, ReadonlyMap<string, string>>,
	relationshipName: string,
	existingOverviewIds: ReadonlySet<string>
): ModelReference[] {
	const remappedRefs = refs.map((ref) => {
		if (ref.modelType !== "overview") {
			return ref;
		}

		const isDualPaneSelectedRef =
			component.componentType === "DualPaneSelection" && ref.reference === component.selectedItemsOverviewModel;
		const isDualPaneAvailableRef =
			component.componentType === "DualPaneSelection" && ref.reference === component.availableItemsOverviewModel;
		const isTableListDirectSelectedRef =
			component.componentType === "TableList" && ref.reference === component.selectedItemsOverviewModel;
		const isTableListEditConfigurationAvailableRef =
			component.componentType === "TableList" &&
			ref.reference === component.editConfiguration?.availableItemsOverviewModel;

		if (isTableListDirectSelectedRef) {
			const directCloneTarget = resolveTableListDirectCloneTarget(ref.reference, existingOverviewIds);

			return directCloneTarget !== undefined ? { ...ref, reference: directCloneTarget } : ref;
		}

		const remapped =
			(isDualPaneSelectedRef
				? resolveDualPaneSelectedCloneTarget(ref.reference, cloneMap, existingOverviewIds)
				: undefined) ??
			remapSingleRef(
				ref.reference,
				cloneMap,
				multiContextRemap,
				relationshipName,
				existingOverviewIds,
				isDualPaneSelectedRef
					? { skipCloneMap: true }
					: isDualPaneAvailableRef || isTableListEditConfigurationAvailableRef
						? { allowImplicitRelationshipClone: true }
						: undefined
			);

		return remapped !== undefined ? { ...ref, reference: remapped } : ref;
	});

	return component.componentType === "TableList"
		? appendTableListEditOverviewRefs(
				remappedRefs,
				remappedComponent.editConfiguration?.availableItemsOverviewModel,
				remappedComponent.editConfiguration?.selectedItemsOverviewModel
			)
		: remappedRefs;
}

/**
 * Remaps all overview model references in FinalRuM models from original IDs
 * to clone IDs, using the cloneMap and multiContextRemap produced by P3.
 *
 * Only runs when `keepModels=true` (conditional path).
 *
 * Updates both:
 * - `content.component` overview references (availableItemsOverviewModel,
 *   selectedItemsOverviewModel, editConfiguration.*)
 * - `header.modelReferences` entries with modelType "overview"
 *
 * @param finalRuMs - The FinalRuM array produced by P2.
 * @param cloneMap - Single-context clone mapping (originalId -> cloneId).
 * @param multiContextRemap - Multi-context clone mapping keyed by relationship name.
 * @returns An array of RemappedRuM with updated overview references.
 */
export function remapOverviewRefsInBindings(
	finalRuMs: readonly FinalRuM[],
	cloneMap: ReadonlyMap<string, string>,
	multiContextRemap: ReadonlyMap<string, ReadonlyMap<string, string>>,
	existingOverviewIds: ReadonlySet<string>
): RemappedRuM[] {
	return finalRuMs.map((fr): RemappedRuM => {
		const rum = fr.model;
		const relationshipName = rum.content.relationshipName;
		const remappedComponent = remapComponentRefs(
			rum.content.component,
			relationshipName,
			cloneMap,
			multiContextRemap,
			existingOverviewIds
		);
		const remappedRefs = remapHeaderOverviewRefs(
			getModelReferences(rum),
			rum.content.component,
			remappedComponent,
			cloneMap,
			multiContextRemap,
			relationshipName,
			existingOverviewIds
		);

		return {
			model: {
				...rum,
				header: { ...rum.header, modelReferences: remappedRefs },
				content: { ...rum.content, component: remappedComponent }
			},
			elementId: fr.elementId,
			formModelId: fr.formModelId
		};
	});
}

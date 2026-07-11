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

import type { MigrationStepContext } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import type { ExtractionState } from "../extraction-state.js";
import { ModelNotFoundError } from "../model-not-found-error.js";
import { isOverviewModel } from "../model-accessors/type-guards.js";

import type { OverviewStructureResult } from "./types.js";
import type { OverviewStructureFinalRuM } from "./types.js";
import { remapAvailableOverviewRefs, resolveCandidateAvailableCloneId } from "./overview-migration-id-remapper.js";

/**
 * Collects overview IDs that currently exist for guarded keepModels remapping.
 *
 * Includes IDs tracked from P3 remapped overviews, both clone-map sources and
 * clone targets, and all overview IDs accumulated in extraction state.
 */
export function collectExistingOverviewIdsForRemap(
	overviewStructure: Pick<OverviewStructureResult, "remappedOverviews" | "cloneMap">,
	state: Pick<ExtractionState, "overviewModelIds">
): ReadonlySet<string> {
	const existingOverviewIds = new Set<string>();

	for (const overviewId of overviewStructure.remappedOverviews.keys()) {
		existingOverviewIds.add(overviewId);
	}

	for (const [sourceOverviewId, cloneOverviewId] of overviewStructure.cloneMap.entries()) {
		existingOverviewIds.add(sourceOverviewId);
		existingOverviewIds.add(cloneOverviewId);
	}

	for (const overviewId of state.overviewModelIds) {
		existingOverviewIds.add(overviewId);
	}

	return existingOverviewIds;
}

/**
 * Ensures a row-action target overview model is present in extraction state.
 *
 * In particular, base overview models that were not cloned in P3 are
 * not guaranteed to be in state yet. When encountered in row-action
 * migrations, they can be restored from migration context workspace and
 * added here so P4 decoration can apply actions.
 */
export function ensureOverviewInState(
	overviewId: string,
	state: ExtractionState,
	context: MigrationStepContext | undefined
): void {
	if (state.has(overviewId)) {
		return;
	}

	if (context === undefined) {
		throw new ModelNotFoundError(overviewId);
	}

	const workspaceModel = context.findModel(overviewId);

	if (workspaceModel === undefined) {
		throw new ModelNotFoundError(overviewId);
	}

	const resolvedModel = context.resolveModel(workspaceModel);

	if (resolvedModel === undefined) {
		throw new ModelNotFoundError(overviewId);
	}

	if (!isOverviewModel(resolvedModel)) {
		throw new ModelNotFoundError(overviewId);
	}

	state.put(resolvedModel);
	state.addOverviewModelId(overviewId);
}

/**
 * Remaps TableList edit selected-overview references to edit clones already produced in P3.
 */
export function remapTableListEditSelectedOverviewRefs(
	finalRuMs: readonly OverviewStructureFinalRuM[],
	cloneMap: ReadonlyMap<string, string>,
	state: ExtractionState
): void {
	for (const finalRuM of finalRuMs) {
		const component = finalRuM.rumModel.content.component;

		if (component.componentType !== "TableList") {
			continue;
		}

		const editSelectedOverviewId = component.editConfiguration?.selectedItemsOverviewModel;

		if (editSelectedOverviewId === undefined) {
			continue;
		}

		const editCloneId = cloneMap.get(editSelectedOverviewId);

		if (editCloneId === undefined) {
			continue;
		}

		state.draftRuM(finalRuM.rumModel.header.id, (draft) => {
			if (draft.content.component.editConfiguration !== undefined) {
				draft.content.component.editConfiguration.selectedItemsOverviewModel = editCloneId;
			}

			draft.header.modelReferences ??= [];

			if (!draft.header.modelReferences.some((ref) => ref.modelType === "overview" && ref.reference === editCloneId)) {
				draft.header.modelReferences.push({ purpose: "overview", modelType: "overview", reference: editCloneId });
			}
		});
	}
}

/**
 * Remaps non-keepModels candidate available-overview references to relationship-scoped clones.
 */
export function remapNonKeepModelsCandidateAvailableOverviewRefs(
	finalRuMs: readonly OverviewStructureFinalRuM[],
	overviewStructure: Pick<OverviewStructureResult, "multiContextRemap">,
	existingOverviewIds: ReadonlySet<string>,
	state: ExtractionState
): void {
	for (const finalRuM of finalRuMs) {
		const component = finalRuM.rumModel.content.component;

		if (component.componentType === "DropDownSelection") {
			continue;
		}

		const relationshipName = finalRuM.rumModel.content.relationshipName;
		const directAvailableCloneId = resolveCandidateAvailableCloneId(
			component.availableItemsOverviewModel,
			relationshipName,
			overviewStructure.multiContextRemap,
			existingOverviewIds
		);
		const editAvailableCloneId =
			component.componentType === "TableList"
				? resolveCandidateAvailableCloneId(
						component.editConfiguration?.availableItemsOverviewModel,
						relationshipName,
						overviewStructure.multiContextRemap,
						existingOverviewIds
					)
				: undefined;
		const availableRemaps = new Map<string, string>();

		if (component.availableItemsOverviewModel !== undefined && directAvailableCloneId !== undefined) {
			availableRemaps.set(component.availableItemsOverviewModel, directAvailableCloneId);
		}

		if (component.editConfiguration?.availableItemsOverviewModel !== undefined && editAvailableCloneId !== undefined) {
			availableRemaps.set(component.editConfiguration.availableItemsOverviewModel, editAvailableCloneId);
		}

		const protectedOverviewIds = new Set(
			[component.selectedItemsOverviewModel, component.editConfiguration?.selectedItemsOverviewModel].filter(
				(id): id is string => id !== undefined
			)
		);

		if (availableRemaps.size === 0) {
			continue;
		}

		state.draftRuM(finalRuM.rumModel.header.id, (draft) => {
			if (draft.content.component.availableItemsOverviewModel !== undefined) {
				draft.content.component.availableItemsOverviewModel =
					availableRemaps.get(draft.content.component.availableItemsOverviewModel) ??
					draft.content.component.availableItemsOverviewModel;
			}

			if (
				draft.content.component.componentType === "TableList" &&
				draft.content.component.editConfiguration !== undefined
			) {
				draft.content.component.editConfiguration.availableItemsOverviewModel =
					availableRemaps.get(draft.content.component.editConfiguration.availableItemsOverviewModel) ??
					draft.content.component.editConfiguration.availableItemsOverviewModel;
			}

			draft.header.modelReferences = remapAvailableOverviewRefs(
				draft.header.modelReferences ?? [],
				availableRemaps,
				protectedOverviewIds
			) as typeof draft.header.modelReferences;
		});
	}
}

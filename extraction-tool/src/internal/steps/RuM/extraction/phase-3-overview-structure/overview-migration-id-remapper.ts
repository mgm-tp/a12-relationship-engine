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

import { EventName, MULTI_CONTEXT_SEPARATOR } from "../constants.js";
import type { PageSizeMigration, RowActionMigration, RowActivationMigration } from "../types.js";

/**
 * Resolve a row-action migration target overview ID using overview clone and remap metadata.
 */
export function remapRowActionOverviewId(
	overviewModelId: string,
	relationshipName: string,
	componentType: string | undefined,
	actionType: string,
	cloneMap: ReadonlyMap<string, string>,
	multiContextRemap: ReadonlyMap<string, ReadonlyMap<string, string>>,
	keepModels: boolean,
	existingOverviewIds: ReadonlySet<string>
): string {
	const dualPaneSelectedActionTypes = new Set<string>([
		EventName.DeleteLink,
		EventName.RestoreLink,
		EventName.EditLinkDocument
	]);
	const isDualPaneSelectedAction = componentType === "DualPaneSelection" && dualPaneSelectedActionTypes.has(actionType);
	const isDropDownAction = componentType === "DropDownSelection";
	const singleContextClone = cloneMap.get(overviewModelId);

	if (isDropDownAction) {
		return overviewModelId;
	}

	if (isDualPaneSelectedAction) {
		if (keepModels && singleContextClone !== undefined) {
			return singleContextClone;
		}

		return overviewModelId;
	}

	if (singleContextClone !== undefined) {
		return singleContextClone;
	}

	const multiContextMap = multiContextRemap.get(overviewModelId);
	const remappedOverviewModelId = multiContextMap?.get(relationshipName);

	if (remappedOverviewModelId !== undefined) {
		return remappedOverviewModelId;
	}

	if (actionType === EventName.AddLink) {
		const candidateCloneOverviewId = `${overviewModelId}${MULTI_CONTEXT_SEPARATOR}${relationshipName}`;

		if (existingOverviewIds.has(candidateCloneOverviewId)) {
			return candidateCloneOverviewId;
		}
	}

	return overviewModelId;
}

/**
 * Applies relationship-scoped overview remapping to a binding's row-action migrations.
 */
export function remapRowActionMigrations(
	rowActionMigrations: readonly RowActionMigration[],
	relationshipName: string,
	componentType: string | undefined,
	cloneMap: ReadonlyMap<string, string>,
	multiContextRemap: ReadonlyMap<string, ReadonlyMap<string, string>>,
	keepModels: boolean,
	existingOverviewIds: ReadonlySet<string>
): RowActionMigration[] {
	return rowActionMigrations.map((migration) => ({
		...migration,
		overviewModelId: remapRowActionOverviewId(
			migration.overviewModelId,
			relationshipName,
			componentType,
			migration.actionType,
			cloneMap,
			multiContextRemap,
			keepModels,
			existingOverviewIds
		)
	}));
}

/**
 * Applies relationship-scoped overview remapping to a binding's row-activation migrations.
 */
export function remapRowActivationMigrations(
	migrations: readonly RowActivationMigration[],
	relationshipName: string,
	componentType: string | undefined,
	cloneMap: ReadonlyMap<string, string>,
	multiContextRemap: ReadonlyMap<string, ReadonlyMap<string, string>>,
	keepModels: boolean,
	existingOverviewIds: ReadonlySet<string>,
	hasExistingOverview: (overviewId: string) => boolean
): RowActivationMigration[] {
	return migrations.map((migration) => ({
		...migration,
		overviewModelId: remapRowActivationOverviewId(
			migration,
			relationshipName,
			componentType,
			cloneMap,
			multiContextRemap,
			keepModels,
			existingOverviewIds,
			hasExistingOverview
		)
	}));
}

/**
 * Resolves an overview-migration target overview ID using overview clone and remap metadata.
 */
export function remapOverviewMigrationTargetOverviewId(
	overviewModelId: string,
	relationshipName: string,
	cloneMap: ReadonlyMap<string, string>,
	multiContextRemap: ReadonlyMap<string, ReadonlyMap<string, string>>
): string {
	const singleContextClone = cloneMap.get(overviewModelId);

	if (singleContextClone !== undefined) {
		return singleContextClone;
	}

	const multiContextMap = multiContextRemap.get(overviewModelId);
	const remappedOverviewModelId = multiContextMap?.get(relationshipName);

	if (remappedOverviewModelId !== undefined) {
		return remappedOverviewModelId;
	}

	return overviewModelId;
}

/**
 * Applies relationship-scoped overview remapping to a binding's page-size migrations.
 */
export function remapPageSizeMigrations(
	migrations: readonly PageSizeMigration[],
	relationshipName: string,
	cloneMap: ReadonlyMap<string, string>,
	multiContextRemap: ReadonlyMap<string, ReadonlyMap<string, string>>
): PageSizeMigration[] {
	return migrations.map((migration) => ({
		...migration,
		overviewModelId: remapOverviewMigrationTargetOverviewId(
			migration.overviewModelId,
			relationshipName,
			cloneMap,
			multiContextRemap
		)
	}));
}

interface DraftModelReference {
	readonly purpose?: string;
	readonly modelType: unknown;
	readonly reference: string;
}

/**
 * Remaps RuM header overview refs for non-keepModels available/candidate clones.
 *
 * @internal
 */
export function remapAvailableOverviewRefs(
	refs: readonly DraftModelReference[],
	remaps: ReadonlyMap<string, string>,
	protectedOverviewIds: ReadonlySet<string>
): DraftModelReference[] {
	const result: DraftModelReference[] = [];

	for (const ref of refs) {
		const shouldKeepBaseRef = ref.modelType === "overview" && protectedOverviewIds.has(ref.reference);
		const remappedReference =
			ref.modelType === "overview" && !shouldKeepBaseRef ? remaps.get(ref.reference) : undefined;
		const nextRef =
			remappedReference === undefined ? ref : { ...ref, reference: remappedReference, modelType: "overview" as const };

		if (
			!result.some(
				(existingRef) => existingRef.modelType === nextRef.modelType && existingRef.reference === nextRef.reference
			)
		) {
			result.push(nextRef);
		}
	}

	for (const cloneId of remaps.values()) {
		if (!result.some((ref) => ref.modelType === "overview" && ref.reference === cloneId)) {
			result.push({ purpose: "overview", modelType: "overview", reference: cloneId });
		}
	}

	return result;
}

/**
 * Resolves the available-items overview clone ID for a relationship when one exists.
 */
export function resolveCandidateAvailableCloneId(
	baseOverviewId: string | undefined,
	relationshipName: string,
	multiContextRemap: ReadonlyMap<string, ReadonlyMap<string, string>>,
	existingOverviewIds: ReadonlySet<string>
): string | undefined {
	if (baseOverviewId === undefined) {
		return undefined;
	}

	const explicitCloneId = multiContextRemap.get(baseOverviewId)?.get(relationshipName);

	if (explicitCloneId !== undefined) {
		return explicitCloneId;
	}

	const implicitCloneId = `${baseOverviewId}${MULTI_CONTEXT_SEPARATOR}${relationshipName}`;

	return existingOverviewIds.has(implicitCloneId) ? implicitCloneId : undefined;
}

function remapRowActivationOverviewId(
	migration: RowActivationMigration,
	relationshipName: string,
	componentType: string | undefined,
	cloneMap: ReadonlyMap<string, string>,
	multiContextRemap: ReadonlyMap<string, ReadonlyMap<string, string>>,
	keepModels: boolean,
	existingOverviewIds: ReadonlySet<string>,
	hasExistingOverview: (overviewId: string) => boolean
): string {
	if (migration.activation.type === "event") {
		return remapRowActionOverviewId(
			migration.overviewModelId,
			relationshipName,
			componentType,
			migration.activation.event,
			cloneMap,
			multiContextRemap,
			keepModels,
			existingOverviewIds
		);
	}

	if (componentType === "TableList") {
		const tableListCloneId = `${migration.overviewModelId}-tableList`;

		return hasExistingOverview(tableListCloneId) ? tableListCloneId : migration.overviewModelId;
	}

	return remapOverviewMigrationTargetOverviewId(
		migration.overviewModelId,
		relationshipName,
		cloneMap,
		multiContextRemap
	);
}

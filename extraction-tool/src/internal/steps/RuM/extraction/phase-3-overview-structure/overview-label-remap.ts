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

import type { LocalizedModelText } from "@com.mgmtp.a12.utils/utils-localization";

import { MULTI_CONTEXT_SEPARATOR } from "../constants.js";
import type { OverviewLabelMigration, OverviewLabelCloneTarget } from "../types.js";

import { remapOverviewMigrationTargetOverviewId } from "./overview-migration-id-remapper.js";

/**
 * Resolves the effective overview ID for a label migration.
 */
export function remapOverviewLabelOverviewId(
	migration: OverviewLabelMigration,
	relationshipName: string,
	cloneMap: ReadonlyMap<string, string>,
	multiContextRemap: ReadonlyMap<string, ReadonlyMap<string, string>>,
	_keepModels: boolean,
	_existingOverviewIds: ReadonlySet<string>
): string {
	return remapOverviewMigrationTargetOverviewId(
		migration.overviewModelId,
		relationshipName,
		cloneMap,
		multiContextRemap
	);
}

/**
 * Resolves a single clone-target hint to a concrete overview model ID.
 *
 * Returns `undefined` when the target clone does not exist in the current
 * pipeline context. Callers must skip `undefined` results — they must not
 * create clones solely for label routing.
 *
 * Target semantics:
 * - `base`         — the original overview model itself; always present.
 * - `RelName`      — the `--<RelationshipName>` multi-context or single-context clone.
 * - `tableList`    — the `-tableList` clone; only honoured when keepModels/direct-clone
 *                    generation has already created it.
 * - `edit`         — the `-edit` clone; looked up in cloneMap.
 * - `edit-available` — routing alias for the edit-dialog available/candidate clone
 *                    (the `--<RelName>` clone of the candidate overview);
 *                    never routes to the bare candidate overview.
 */
export function resolveCloneTargetId(
	target: OverviewLabelCloneTarget,
	originalOverviewId: string,
	relationshipName: string,
	cloneMap: ReadonlyMap<string, string>,
	multiContextRemap: ReadonlyMap<string, ReadonlyMap<string, string>>,
	keepModels: boolean,
	existingOverviewIds: ReadonlySet<string>
): string | undefined {
	switch (target) {
		case "base":
			return originalOverviewId;

		case "RelName":
		case "edit-available": {
			// Multi-context GAP-1 clone via multiContextRemap
			const multiContextId = multiContextRemap.get(originalOverviewId)?.get(relationshipName);

			if (multiContextId !== undefined) {
				return multiContextId;
			}

			// Single-context keepModels path: `--<RelName>` clone
			// Only use if it was already created (exists in existingOverviewIds)
			const singleContextId = `${originalOverviewId}${MULTI_CONTEXT_SEPARATOR}${relationshipName}`;

			if (keepModels && existingOverviewIds.has(singleContextId)) {
				return singleContextId;
			}

			// No clone found: drop this target. For edit-available, never fall back to bare base.
			return undefined;
		}

		case "tableList": {
			// `-tableList` clone: only honoured when keepModels/direct-clone generation created it
			const tableListId = `${originalOverviewId}-tableList`;

			return existingOverviewIds.has(tableListId) ? tableListId : undefined;
		}

		case "edit": {
			// `-edit` clone: stored in cloneMap
			return cloneMap.get(originalOverviewId);
		}
	}
}

/**
 * Builds the cross-binding explicit-label registry from all pane-label migrations.
 *
 * Keyed by `originalOverviewModelId`. First-writer wins (stable binding iteration order).
 * Only `pane-label` source migrations are registered; nested and host labels are excluded.
 */
export function buildOverviewLabelRegistry(
	allMigrations: readonly OverviewLabelMigration[]
): ReadonlyMap<string, OverviewLabelRegistryEntry> {
	const registry = new Map<string, OverviewLabelRegistryEntry>();

	for (const migration of allMigrations) {
		if (migration.source !== "pane-label") {
			continue;
		}

		if (!migration.cloneTargets) {
			continue;
		}

		if (registry.has(migration.overviewModelId)) {
			continue;
		} // first-writer wins

		registry.set(migration.overviewModelId, {
			labels: [...migration.labels],
			cloneTargets: migration.cloneTargets
		});
	}

	return registry;
}

/**
 * Generates registry-fallback migrations for overview models that are referenced
 * by a binding but have no explicit pane-label migration
 * from that binding. Consults the registry built from sibling bindings.
 *
 * Registry fallback migrations carry `source: "registry"` and inherit
 * `cloneTargets` from the originating explicit pane-label migration.
 * They are expanded to concrete targets the same way explicit migrations are.
 */
export function generateRegistryFallbackMigrations(
	bindingOverviewLabelMigrations: readonly OverviewLabelMigration[],
	component:
		| { readonly availableItemsOverviewModel?: string; readonly selectedItemsOverviewModel?: string }
		| undefined,
	relationshipName: string,
	registry: ReadonlyMap<string, OverviewLabelRegistryEntry>,
	cloneMap: ReadonlyMap<string, string>,
	multiContextRemap: ReadonlyMap<string, ReadonlyMap<string, string>>,
	keepModels: boolean,
	existingOverviewIds: ReadonlySet<string>
): OverviewLabelMigration[] {
	if (!component) {
		return [];
	}

	// Collect the original overview IDs covered by explicit migrations from this binding
	const explicitOriginalIds = new Set(
		bindingOverviewLabelMigrations.filter((m) => m.source === "pane-label").map((m) => m.overviewModelId)
	);

	const result: OverviewLabelMigration[] = [];

	// Check main available and selected overviews for registry fallback
	const overviewsToCheck = [component.availableItemsOverviewModel, component.selectedItemsOverviewModel].filter(
		(id): id is string => id !== undefined
	);

	for (const overviewId of overviewsToCheck) {
		if (explicitOriginalIds.has(overviewId)) {
			continue;
		}

		const registryEntry = registry.get(overviewId);

		if (!registryEntry) {
			continue;
		}

		// Create registry migration with inherited cloneTargets from originating pane-label
		const registryMigration: OverviewLabelMigration = {
			overviewModelId: overviewId,
			labels: registryEntry.labels,
			source: "registry",
			cloneTargets: registryEntry.cloneTargets
		};

		// Expand registry migration to concrete targets (same logic as explicit)
		const expanded = expandOverviewLabelMigration(
			registryMigration,
			relationshipName,
			cloneMap,
			multiContextRemap,
			keepModels,
			existingOverviewIds
		);

		result.push(...expanded);
	}

	return result;
}

/**
 * Applies relationship-scoped overview remapping to a binding's label migrations.
 */
export function remapOverviewLabelMigrations(
	migrations: readonly OverviewLabelMigration[],
	relationshipName: string,
	cloneMap: ReadonlyMap<string, string>,
	multiContextRemap: ReadonlyMap<string, ReadonlyMap<string, string>>,
	keepModels: boolean,
	existingOverviewIds: ReadonlySet<string>
): OverviewLabelMigration[] {
	return migrations.flatMap((migration) =>
		expandOverviewLabelMigration(
			migration,
			relationshipName,
			cloneMap,
			multiContextRemap,
			keepModels,
			existingOverviewIds
		)
	);
}

/**
 * Expands a single OverviewLabelMigration into 0..N concrete migrations based
 * on its `cloneTargets` hints, intersecting with actual clone existence.
 *
 * Migrations without `cloneTargets` are single-target and use the existing
 * `remapOverviewLabelOverviewId` logic unchanged.
 *
 * @internal
 */
function expandOverviewLabelMigration(
	migration: OverviewLabelMigration,
	relationshipName: string,
	cloneMap: ReadonlyMap<string, string>,
	multiContextRemap: ReadonlyMap<string, ReadonlyMap<string, string>>,
	keepModels: boolean,
	existingOverviewIds: ReadonlySet<string>
): OverviewLabelMigration[] {
	// Migrations without cloneTargets (legacy) → single-target remap
	if (!migration.cloneTargets || migration.cloneTargets.size === 0) {
		return [
			{
				...migration,
				overviewModelId: remapOverviewLabelOverviewId(
					migration,
					relationshipName,
					cloneMap,
					multiContextRemap,
					keepModels,
					existingOverviewIds
				)
			}
		];
	}

	const result: OverviewLabelMigration[] = [];

	for (const target of migration.cloneTargets) {
		const resolvedId = resolveCloneTargetId(
			target,
			migration.overviewModelId,
			relationshipName,
			cloneMap,
			multiContextRemap,
			keepModels,
			existingOverviewIds
		);

		if (resolvedId !== undefined) {
			// Expanded migrations carry source but not cloneTargets (already resolved)
			result.push({
				overviewModelId: resolvedId,
				labels: migration.labels,
				source: migration.source
			});
		}
	}

	return result;
}

/**
 * Registry entry for cross-binding label propagation (§3.2 of design).
 * Holds the labels and the clone-target hints from the originating pane-label migration.
 *
 * @internal
 */
interface OverviewLabelRegistryEntry {
	readonly labels: LocalizedModelText;
	readonly cloneTargets: ReadonlySet<OverviewLabelCloneTarget>;
}

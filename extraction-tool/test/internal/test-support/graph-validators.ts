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

import type { ModelIndex, IndexedModel } from "./model-index.js";

/**
 * Model types scanned by the fixture graph validators.
 */
export const FIXTURE_GRAPH_MODEL_TYPES = [
	"document",
	"form",
	"overview",
	"relationship",
	"relationship-ui",
	"query"
] as const;

/**
 * Asserts that every generated artifact id has at least one inbound reference, unless allowlisted.
 */
export function assertReachability(
	index: ModelIndex,
	generatedIds: readonly string[],
	allowlist: readonly string[] = []
): void {
	const allowlistedIds = new Set(allowlist);
	const models = collectKnownModels(index);
	const orphanIds = generatedIds.filter((generatedId) => {
		const hasInboundReference = models.some(
			(model) => model.header.id !== generatedId && modelReferencesId(model, generatedId)
		);

		return !allowlistedIds.has(generatedId) && !hasInboundReference;
	});

	assertInvariant(
		orphanIds.length === 0,
		`reachability invariant broken: generated artifact(s) have no inbound reference: ${orphanIds.join(", ")}`
	);
}

/**
 * Asserts that no surviving model in the fixture index references a deleted model id.
 */
export function assertDeletionSafety(index: ModelIndex, deletedIds: readonly string[]): void {
	const deletedIdSet = new Set(deletedIds);
	const survivingModels = collectKnownModels(index).filter((model) => !deletedIdSet.has(model.header.id));
	const violations = survivingModels.flatMap((model) =>
		deletedIds
			.filter((deletedId) => modelReferencesId(model, deletedId))
			.map((deletedId) => `${model.header.id} -> ${deletedId}`)
	);

	assertInvariant(
		violations.length === 0,
		`deletion-safety invariant broken: surviving model(s) still reference deleted id(s): ${violations.join(", ")}`
	);
}

function collectKnownModels(index: ModelIndex): readonly IndexedModel[] {
	const models = FIXTURE_GRAPH_MODEL_TYPES.flatMap((modelType) => index.allByType(modelType));
	const deduped = new Map(models.map((model) => [model.header.id, model]));

	return [...deduped.values()];
}

function modelReferencesId(model: IndexedModel, id: string): boolean {
	return jsonTreeContainsString(model.header, id) || jsonTreeContainsString(model.content, id);
}

/**
 * Recursively scans fixture header/content JSON for exact string values matching a model id.
 * This is intentionally a small test-support traversal, not a production graph walker:
 * it follows plain JSON arrays/objects and ignores substrings inside larger strings.
 */
function jsonTreeContainsString(value: unknown, target: string): boolean {
	if (typeof value === "string") {
		return value === target;
	}

	if (Array.isArray(value)) {
		return value.some((entry) => jsonTreeContainsString(entry, target));
	}

	if (isRecord(value)) {
		return Object.values(value).some((entry) => jsonTreeContainsString(entry, target));
	}

	return false;
}

function assertInvariant(condition: boolean, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

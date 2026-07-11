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
 * Minimal structural header shape shared by committed model fixtures.
 */
export interface IndexedModelHeader {
	readonly id: string;
	readonly modelType: string;
	readonly modelReferences?: readonly unknown[];
}

/**
 * Minimal structural model shape accepted by the fixture model index.
 */
export interface IndexedModel {
	readonly header: IndexedModelHeader;
	readonly content?: unknown;
	readonly path: string;
}

/**
 * Index and reference helpers for fixture models.
 */
export interface ModelIndex<Model extends IndexedModel = IndexedModel> {
	/**
	 * Resolves a fixture model by header id.
	 */
	readonly resolveRef: (id: string) => Model | undefined;
	/**
	 * Returns all fixture models with the requested header modelType.
	 */
	readonly allByType: (modelType: string) => Model[];
	/**
	 * Extracts header.modelReferences matching the requested purpose.
	 */
	readonly headerRefsOf: (model: Model, purpose: string) => string[];
	/**
	 * Extracts string references from model.content using a small JSON path format.
	 */
	readonly contentRefsOf: (model: Model, jsonPath: string) => string[];
}

/**
 * Builds an immutable-by-convention fixture model index by header id.
 */
export function buildModelIndex<Model extends IndexedModel>(models: readonly Model[]): ModelIndex<Model> {
	const byId = new Map(models.map((model) => [model.header.id, model]));

	return {
		resolveRef(id: string): Model | undefined {
			return byId.get(id);
		},
		allByType(modelType: string): Model[] {
			return models.filter((model) => model.header.modelType === modelType);
		},
		headerRefsOf(model: Model, purpose: string): string[] {
			return headerRefsOf(model, purpose);
		},
		contentRefsOf(model: Model, jsonPath: string): string[] {
			return contentRefsOf(model, jsonPath);
		}
	};
}

/**
 * Extracts header.modelReferences entries whose purpose matches the requested purpose.
 */
export function headerRefsOf(model: IndexedModel, purpose: string): string[] {
	return (model.header.modelReferences ?? []).flatMap((entry) => {
		if (!isReferenceWithPurpose(entry, purpose)) {
			return [];
		}

		return [entry.reference];
	});
}

/**
 * Extracts string values from model.content via a fixture-focused JSON path.
 *
 * Supported path syntax:
 * - optional leading `$.` for readability;
 * - dot-separated object properties, for example `component.selectedItemsOverviewModel`;
 * - `[]` after a segment to flatten arrays, for example `component.models[].name`.
 *
 * The helper intentionally returns only string leaves because later fixture tests
 * use it to collect model id references. Missing paths, non-array values at `[]`,
 * and non-string leaves resolve to an empty array.
 */
export function contentRefsOf(model: IndexedModel, jsonPath: string): string[] {
	const segments = parseJsonPath(jsonPath);
	const leaves = segments.reduce<readonly unknown[]>(resolvePathSegment, [model.content]);

	return leaves.filter((value): value is string => typeof value === "string");
}

interface JsonPathSegment {
	readonly property: string;
	readonly flattenArray: boolean;
}

interface ReferenceWithPurpose {
	readonly purpose: string;
	readonly reference: string;
}

function isReferenceWithPurpose(value: unknown, purpose: string): value is ReferenceWithPurpose {
	return isRecord(value) && value.purpose === purpose && typeof value.reference === "string";
}

function parseJsonPath(jsonPath: string): readonly JsonPathSegment[] {
	const trimmedPath = jsonPath.trim();
	const pathWithoutRoot = trimmedPath.startsWith("$.") ? trimmedPath.slice(2) : trimmedPath;

	if (pathWithoutRoot.length === 0) {
		return [];
	}

	return pathWithoutRoot.split(".").map((segment) => ({
		property: segment.endsWith("[]") ? segment.slice(0, -2) : segment,
		flattenArray: segment.endsWith("[]")
	}));
}

function resolvePathSegment(values: readonly unknown[], segment: JsonPathSegment): readonly unknown[] {
	return values.flatMap((value) => resolveProperty(value, segment));
}

function resolveProperty(value: unknown, segment: JsonPathSegment): readonly unknown[] {
	if (!isRecord(value) || !(segment.property in value)) {
		return [];
	}

	const nextValue = value[segment.property];

	if (!segment.flattenArray) {
		return [nextValue];
	}

	return Array.isArray(nextValue) ? nextValue : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

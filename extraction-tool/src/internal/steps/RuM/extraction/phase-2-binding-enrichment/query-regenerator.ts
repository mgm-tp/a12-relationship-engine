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

import { QUERY_MODEL_VERSION } from "../constants.js";
import type { RelationshipUiModel } from "../../relationship-ui-model.js";
import { isQueryModel, isRelationshipModel } from "../model-accessors/type-guards.js";

import type { BindingResult, EnrichmentContext, QueryRegeneratorResult } from "./types.js";

function getBindingModel(binding: BindingResult): RelationshipUiModel {
	return binding.relationshipUiModel ?? binding.ruModel;
}

function getBindingRelationshipName(binding: BindingResult): string {
	return binding.relationshipName ?? binding.ruModel.content.relationshipName;
}

function getBindingTargetRole(binding: BindingResult): string {
	return binding.targetRole ?? binding.ruModel.content.targetRole;
}

/**
 * Query model reference key patterns in component configuration.
 * These are the keys that contain query model IDs.
 */
const QUERY_REF_KEYS = ["availableItemsQueryModel", "selectedItemQueryModel"] as const;

/** Extracts query model IDs referenced in a binding's component configuration. */
function extractReferencedQueryIds(binding: BindingResult): readonly string[] {
	const component = getBindingModel(binding).content.component;
	const ids: string[] = [];

	for (const key of QUERY_REF_KEYS) {
		const value = component[key];

		if (typeof value === "string" && value.length > 0) {
			ids.push(value);
		}
	}

	return ids;
}

/** Checks whether a query model with the given ID exists and is valid. */
function queryModelExists(context: EnrichmentContext, queryId: string): boolean {
	const model = context.resolveModel(queryId);

	return model !== undefined && isQueryModel(model);
}

/** Resolves the target document model ID for a dropdown query binding. */
function resolveDropdownTargetDocumentModel(
	context: EnrichmentContext,
	binding: BindingResult | undefined
): string | undefined {
	if (binding === undefined) {
		return undefined;
	}

	const relationshipModel = context.resolveModel(getBindingRelationshipName(binding));

	if (!relationshipModel || !isRelationshipModel(relationshipModel)) {
		return undefined;
	}

	for (const characteristic of relationshipModel.content.entityCharacteristics) {
		if (characteristic.role === getBindingTargetRole(binding) && characteristic.documentModel.length > 0) {
			return characteristic.documentModel;
		}
	}

	return undefined;
}

/** Creates a query model with sensible defaults when regeneration data is incomplete. */
function createRegeneratedQueryModel(
	queryId: string,
	context: EnrichmentContext,
	binding: BindingResult | undefined
): QueryModel {
	const targetDocumentModel = resolveDropdownTargetDocumentModel(context, binding);
	const relationshipName = binding === undefined ? undefined : getBindingRelationshipName(binding);
	const hasDropdownReferences =
		typeof targetDocumentModel === "string" &&
		targetDocumentModel.length > 0 &&
		typeof relationshipName === "string" &&
		relationshipName.length > 0;

	return {
		header: {
			id: queryId,
			modelType: "query",
			modelVersion: QUERY_MODEL_VERSION,
			annotations: [...(context.rolesAnnotations ?? [])],
			modelReferences: hasDropdownReferences
				? [
						{
							purpose: "document-model-for-query",
							modelType: "document",
							alias: "DM",
							reference: targetDocumentModel
						},
						{
							purpose: "relationship-model-for-query",
							modelType: "relationship",
							alias: "RM",
							reference: relationshipName
						}
					]
				: []
		},
		content: {
			targetDocumentModel: targetDocumentModel ?? "",
			projectionName: "document",
			paging: {
				pageNumber: 0,
				pageSize: 50
			},
			links: []
		}
	};
}

/** Regenerates missing query models for bindings that reference query IDs absent on disk. */
export function regenerateMissingQueryModels(
	bindings: readonly BindingResult[],
	context: EnrichmentContext
): QueryRegeneratorResult {
	// Collect unique query model IDs from all bindings
	const referencedIds = new Set<string>();
	const referencedBindingByQueryId = new Map<string, BindingResult>();

	for (const binding of bindings) {
		const ids = extractReferencedQueryIds(binding);

		for (const id of ids) {
			referencedIds.add(id);

			if (!referencedBindingByQueryId.has(id)) {
				referencedBindingByQueryId.set(id, binding);
			}
		}
	}

	// Check each referenced query model and regenerate if missing
	const regenerated: QueryModel[] = [];

	for (const queryId of referencedIds) {
		if (!queryModelExists(context, queryId)) {
			regenerated.push(createRegeneratedQueryModel(queryId, context, referencedBindingByQueryId.get(queryId)));
		}
	}

	return {
		updatedBindings: bindings,
		regeneratedQueryModels: regenerated
	};
}

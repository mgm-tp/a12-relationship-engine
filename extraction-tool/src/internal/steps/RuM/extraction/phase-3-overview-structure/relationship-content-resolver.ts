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
import { getModelReferences } from "../model-accessors/header-accessors.js";
import type { OverviewModel } from "../../../../../models/overview-model.js";
import { isQueryModel, isRelationshipModel } from "../model-accessors/type-guards.js";

interface RelationshipCharacteristic {
	readonly role: string;
	readonly documentModel?: string;
}

/**
 * Resolves only the target document model ID for a query-backed overview.
 *
 * Source-of-truth boundaries in P3:
 * - binding / RuM / OverviewContext provide `relationshipName` and `targetRole`
 * - relationship model `entityCharacteristics` provide role-to-document mapping
 *   and the source role
 * - query content is only consulted here for the primary overview target
 *   document model via `content.targetDocumentModel`
 */
export function getQueryBackedOverviewTargetDocumentModelId(
	overview: OverviewModel,
	resolveModel: (modelId: string) => object | undefined
): string | undefined {
	const queryRef = getModelReferences(overview).find(
		(ref) => ref.purpose === "query-model-for-overview" && typeof ref.reference === "string" && ref.reference.length > 0
	)?.reference;

	if (queryRef === undefined) {
		return undefined;
	}

	const queryModel = resolveModel(queryRef);

	if (!queryModel || !isQueryModel(queryModel)) {
		return undefined;
	}

	const targetDocumentModel = queryModel.content.targetDocumentModel;

	return typeof targetDocumentModel === "string" && targetDocumentModel.length > 0 ? targetDocumentModel : undefined;
}

/**
 * Attempts to resolve the overview's target document model without a generated
 * document wrapper.
 *
 * Prefers an existing `query-model-for-overview` target when present. Otherwise,
 * falls back to the direct `document-model-for-overview` reference used by plain
 * overview models such as Address-overview. This keeps relationship-specific
 * query refs on emitted clones resolvable even when no generated document model
 * participates in the traversal.
 */
export function getFallbackTargetDocumentModelId(
	overview: OverviewModel,
	resolveModel: (modelId: string) => object | undefined
): string | undefined {
	const queryTargetDocumentModelId = getQueryBackedOverviewTargetDocumentModelId(overview, resolveModel);

	if (queryTargetDocumentModelId !== undefined) {
		return queryTargetDocumentModelId;
	}

	return getModelReferences(overview).find(
		(ref) =>
			ref.purpose === "document-model-for-overview" && typeof ref.reference === "string" && ref.reference.length > 0
	)?.reference;
}

/**
 * Resolves the source role and its optional document model ID from a relationship
 * model's `entityCharacteristics` array.
 *
 * Source-of-truth boundaries in P3:
 * - binding / RuM / OverviewContext provide `relationshipName` and `targetRole`
 * - relationship model `entityCharacteristics` provide role-to-document mapping
 *   and the source role
 * - query content is not a relationship-detail source
 *
 * This assumes binary relationship semantics. If exactly one characteristic role
 * differs from `targetRole`, that role is treated as the source/form role. If
 * multiple roles differ, the relationship is ambiguous for this phase and no
 * source context is resolved.
 */
export function resolveSourceContextFromRelationship(
	resolveModel: (modelId: string) => object | undefined,
	relationshipName: string,
	targetRole: string
): { readonly sourceRole: string; readonly sourceDocumentModelId?: string } | undefined {
	const characteristics = getRelationshipCharacteristics(resolveModel, relationshipName);

	const nonTargetCharacteristics = characteristics.filter((characteristic) => characteristic.role !== targetRole);

	if (nonTargetCharacteristics.length !== 1) {
		return undefined;
	}

	const sourceCharacteristic = nonTargetCharacteristics[0];

	return {
		sourceRole: sourceCharacteristic.role,
		sourceDocumentModelId: sourceCharacteristic.documentModel
	};
}

/**
 * Resolves the document model ID for a specific role from a relationship model's
 * `entityCharacteristics` array.
 *
 * Used as a fallback when generated-doc analysis cannot determine the target
 * document model — for example when the generated doc uses the inline-field
 * pattern (no `includeConfig` reference) and the document model ID must be
 * sourced from the relationship's role characteristic instead.
 */
export function resolveTargetDocumentModelIdFromRelationship(
	resolveModel: (modelId: string) => object | undefined,
	relationshipName: string,
	targetRole: string
): string | undefined {
	const characteristics = getRelationshipCharacteristics(resolveModel, relationshipName);

	const targetCharacteristic = characteristics.find((characteristic) => characteristic.role === targetRole);

	return typeof targetCharacteristic?.documentModel === "string" && targetCharacteristic.documentModel.length > 0
		? targetCharacteristic.documentModel
		: undefined;
}

function getRelationshipCharacteristics(
	resolveModel: (modelId: string) => object | undefined,
	relationshipName: string
): readonly RelationshipCharacteristic[] {
	const relationshipModel = resolveModel(relationshipName);

	if (relationshipModel === undefined) {
		throw new ModelNotFoundError(relationshipName);
	}

	if (!isRelationshipModel(relationshipModel)) {
		throw new ModelNotFoundError(relationshipName);
	}

	return relationshipModel.content.entityCharacteristics;
}

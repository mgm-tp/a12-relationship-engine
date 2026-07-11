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

import type { Annotation } from "@com.mgmtp.a12.base/base-model-api";
import type { QueryModel } from "@com.mgmtp.a12.querymodel/querymodel-core";

import { QUERY_MODEL_VERSION } from "../constants.js";

import type { QueryStrategy, TypedGeneratedDocAnalysis, QueryExactMatchConstraint } from "./types.js";

/**
 * Default page size for link overview query models.
 */
export const DEFAULT_LINK_PAGE_SIZE = 50;

/**
 * Default page size for candidate overview query models.
 */
export const DEFAULT_CANDIDATE_PAGE_SIZE = 50;

/**
 * Generates the query model ID for a link overview.
 *
 * @param overviewId - The overview model ID (may include clone suffix).
 * @returns The query model ID.
 */
export function getLinkQueryModelId(overviewId: string): string {
	return `${overviewId}-query`;
}

/**
 * Generates the query model ID for a candidate overview.
 *
 * Overview relationship-context queries intentionally use the same
 * `{overviewId}-query` naming as the query-backed overview ref.
 *
 * @param overviewId - The overview model ID (may include clone suffix).
 * @returns The query model ID.
 */
export function getCandidateQueryModelId(overviewId: string): string {
	return `${overviewId}-query`;
}

function buildSourceDocumentPlaceholder(documentModelId: string): string {
	return `\${${documentModelId}, [/__meta/docRef]}`;
}

function buildExactMatchConstraint(documentModelId: string): QueryExactMatchConstraint {
	return {
		operator: "exact_match",
		field: "/__meta/docRef",
		value: buildSourceDocumentPlaceholder(documentModelId)
	};
}

/**
 * Creates a query model header with required query dependencies.
 */
function createQueryModelHeader(
	id: string,
	targetDocumentModelId: string,
	relationshipName: string,
	rolesAnnotations: readonly Annotation[] | undefined
): QueryModel["header"] {
	return {
		id,
		modelType: "query",
		modelVersion: QUERY_MODEL_VERSION,
		annotations: [...(rolesAnnotations ?? [])],
		modelReferences: [
			{
				purpose: "document-model-for-query",
				modelType: "document",
				alias: "DM",
				reference: targetDocumentModelId
			},
			{
				purpose: "relationship-model-for-query",
				modelType: "relationship",
				alias: "RM",
				reference: relationshipName
			}
		]
	};
}

/**
 * Internal helper type: query content with a guaranteed non-null links array.
 *
 * `QueryModel.content = Query.QueryRoot` declares `links?: QueryLink[]` as optional.
 * `createBaseQueryContent` always constructs a links array, so callers can safely
 * access `content.links[0]` without a non-null assertion.
 */
type BaseQueryContent = QueryModel["content"] & {
	readonly links: NonNullable<QueryModel["content"]["links"]>;
};

function createBaseQueryContent(
	analysis: TypedGeneratedDocAnalysis,
	strategy: QueryStrategy,
	relationshipName: string,
	sourceRole: string,
	pageSize: number,
	useDirectLinkConstraint: boolean
): BaseQueryContent {
	const sourceConstraint = buildExactMatchConstraint(strategy.sourceDocumentModelId);

	return {
		targetDocumentModel: analysis.targetDocumentModelId,
		projectionName: "document",
		paging: {
			pageNumber: 0,
			pageSize
		},
		links: [
			{
				relationshipModel: relationshipName,
				targetRole: sourceRole,
				maxDepth: 1,
				constraint:
					strategy.kind === "exclude" && !useDirectLinkConstraint
						? {
								operator: "has",
								relationshipModel: relationshipName,
								targetRole: sourceRole,
								constraint: sourceConstraint,
								maxDepth: 1
							}
						: sourceConstraint
			}
		]
	};
}

/**
 * Generates a selected/link overview query model in the QueryRoot
 * shape used by the query model package.
 *
 * For exclude-mode queries (`duplicatesAllowed=true`, Rule Q-EXCLUDE):
 * - `targetDocumentModel` = source/form document (`strategy.sourceDocumentModelId`)
 * - `links[0].targetRole` = items/displayed role (`itemsRole`)
 * - `links[0].constraint.targetRole` (nested HAS) = source role (`sourceRole`)
 * - `header.modelReferences[document-model-for-query]` = source document
 *
 * For HAS-mode queries (`duplicatesAllowed=false`, Rule Q-HAS):
 * - `targetDocumentModel` = items document (`analysis.targetDocumentModelId`)
 * - `links[0].targetRole` = source role (`sourceRole`)
 * - behaviour unchanged
 *
 * @param analysis - The generated doc analysis with target doc info.
 * @param strategy - The query strategy (HAS or EXCLUDE).
 * @param overviewId - The overview model ID.
 * @param relationshipName - Relationship model ID.
 * @param sourceRole - Role of the source/filtering document in the relationship.
 * @param itemsRole - Role of the items/displayed document in the relationship
 *   (= relationship context `targetRole`). Used as `links[0].targetRole` in
 *   exclude-mode queries so OE's display-document switching resolves columns
 *   against the correct document.
 * @returns A QueryModel for the link overview.
 */
export function generateLinkOverviewQueryModel(
	analysis: TypedGeneratedDocAnalysis,
	strategy: QueryStrategy,
	overviewId: string,
	relationshipName: string,
	sourceRole: string,
	itemsRole: string,
	rolesAnnotations?: readonly Annotation[]
): QueryModel {
	const isExclude = strategy.kind === "exclude";

	// Rule Q-EXCLUDE: exclude-mode queries target the source/form document so
	// OE's display-document switching (links[0].targetRole) resolves columns
	// against the items document instead of the source document.
	// Rule Q-HAS: HAS-mode queries target the items document unchanged.
	const queryTargetDocumentModelId = isExclude ? strategy.sourceDocumentModelId : analysis.targetDocumentModelId;

	const queryModelId = getLinkQueryModelId(overviewId);
	const content = createBaseQueryContent(
		analysis,
		strategy,
		relationshipName,
		sourceRole,
		DEFAULT_LINK_PAGE_SIZE,
		false
	);
	const sourceConstraint = buildExactMatchConstraint(strategy.sourceDocumentModelId);

	// For exclude mode, override targetDocumentModel and links[0].targetRole to
	// restore master-parity query direction (Rule Q-EXCLUDE).
	// The nested HAS constraint targetRole (sourceRole) is preserved by spreading
	// content.links[0] and only replacing targetRole.
	const adjustedLinks = isExclude
		? [
				{
					...content.links[0],
					targetRole: itemsRole
				}
			]
		: content.links;

	return {
		header: createQueryModelHeader(queryModelId, queryTargetDocumentModelId, relationshipName, rolesAnnotations),
		content: {
			...content,
			targetDocumentModel: queryTargetDocumentModelId,
			links: adjustedLinks,
			...(isExclude ? { exclude: true } : {}),
			constraint: isExclude
				? sourceConstraint
				: {
						operator: "has",
						relationshipModel: relationshipName,
						targetRole: sourceRole,
						constraint: sourceConstraint,
						maxDepth: 1
					}
		}
	};
}

/**
 * Generates an available-items overview query model in the QueryRoot
 * shape used by the query model package.
 *
 * @param analysis - The generated doc analysis with target doc info.
 * @param strategy - The query strategy (HAS or EXCLUDE).
 * @param overviewId - The overview model ID.
 * @param relationshipName - Relationship model ID.
 * @param sourceRole - Role of the source/filtering document in the relationship.
 * @returns A QueryModel for the candidate overview.
 */
export function generateCandidateQueryModel(
	analysis: TypedGeneratedDocAnalysis,
	strategy: QueryStrategy,
	overviewId: string,
	relationshipName: string,
	sourceRole: string,
	rolesAnnotations?: readonly Annotation[]
): QueryModel {
	const queryModelId = getCandidateQueryModelId(overviewId);

	return {
		header: createQueryModelHeader(queryModelId, analysis.targetDocumentModelId, relationshipName, rolesAnnotations),
		content: createBaseQueryContent(analysis, strategy, relationshipName, sourceRole, DEFAULT_CANDIDATE_PAGE_SIZE, true)
	};
}

/**
 * Resolves the query strategy based on duplicatesAllowed and document model IDs.
 *
 * HAS strategy (duplicatesAllowed === false):
 * - Generates a constraint to only show items linked to the source document
 *
 * EXCLUDE strategy (duplicatesAllowed === true):
 * - Generates a constraint to show items NOT yet linked
 *
 * @param duplicatesAllowed - Whether the relationship allows duplicate links.
 * @param targetDocId - The target document model ID.
 * @param sourceDocId - The source document model ID.
 * @returns The resolved QueryStrategy.
 */
export function resolveQueryStrategy(
	duplicatesAllowed: boolean,
	targetDocId: string,
	sourceDocId: string
): QueryStrategy {
	return duplicatesAllowed
		? { kind: "exclude", sourceDocumentModelId: sourceDocId }
		: {
				kind: "has",
				targetDocumentModelId: targetDocId,
				sourceDocumentModelId: sourceDocId
			};
}

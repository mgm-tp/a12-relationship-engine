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

import { QUERY_MODEL_VERSION } from "../../../src/internal/steps/RuM/extraction/constants.js";

/**
 * Minimal structural query-model header accepted by the query shape validators.
 */
export interface QueryShapeHeader {
	readonly modelVersion: string;
}

/**
 * Minimal structural full query model accepted by the exported query shape validators.
 */
export interface QueryShapeModel {
	readonly header: QueryShapeHeader;
	readonly content: unknown;
}

/**
 * Asserts the canonical LINK/exclude query shape used for duplicatesAllowed relationships.
 */
export function assertLinkExcludeQueryShape(query: QueryShapeModel | unknown): void {
	const content = getQueryContent(query);
	assertQueryModelVersion(query);
	assertRequiredQueryFields(content);
	assertInvariant(content.exclude === true, "LINK/exclude invariant broken: content.exclude must be true");
	assertInvariant(
		isExactMatchConstraint(content.constraint),
		"LINK/exclude invariant broken: top-level constraint must be a flat exact_match constraint"
	);
	assertInvariant(
		content.links.some((link) => isHasConstraint(link.constraint)),
		"LINK/exclude invariant broken: links must contain a nested has constraint"
	);
}

/**
 * Asserts the canonical CHILD/HAS query shape used for non-duplicatesAllowed relationships.
 */
export function assertChildHasQueryShape(query: QueryShapeModel | unknown): void {
	const content = getQueryContent(query);
	assertQueryModelVersion(query);
	assertRequiredQueryFields(content);
	assertInvariant(!("exclude" in content), "CHILD/has invariant broken: content.exclude must be absent");
	assertInvariant(
		isHasConstraint(content.constraint),
		"CHILD/has invariant broken: top-level constraint must be a has constraint"
	);
	assertInvariant(
		content.links.some((link) => isExactMatchConstraint(link.constraint)),
		"CHILD/has invariant broken: links must contain a flat exact_match constraint"
	);
	assertInvariant(
		!isDropDownLegacyHasContent(content),
		"CHILD/has invariant broken: DropDown legacy-HAS query is only valid in DropDown mode"
	);
}

/**
 * Asserts the legacy DropDown selected-query HAS shape that intentionally bypasses LINK/CHILD branching.
 */
export function assertDropDownLegacyHasQueryShape(query: QueryShapeModel | unknown): void {
	const content = getQueryContent(query);
	assertQueryModelVersion(query);
	assertRequiredQueryFields(content);
	assertInvariant(
		isDropDownLegacyHasContent(content),
		"DropDown legacy-HAS invariant broken: selected query must use pageSize 1 with a top-level has constraint and flat link constraint"
	);
}

/**
 * Returns true when the query content matches the legacy DropDown selected-query HAS exception.
 */
export function isDropDownLegacyHasQueryShape(query: QueryShapeModel | unknown): boolean {
	try {
		return isDropDownLegacyHasContent(getQueryContent(query));
	} catch (_error) {
		return false;
	}
}

/**
 * Asserts a full query model header uses the canonical generated query model version.
 */
export function assertQueryModelVersion(query: QueryShapeModel | unknown): void {
	assertInvariant(isRecord(query), "query version invariant broken: query model must be an object");
	assertInvariant("header" in query, "query version invariant broken: query model header must be present");
	assertInvariant(isRecord(query.header), "query version invariant broken: query model header must be an object");
	assertInvariant(
		"modelVersion" in query.header,
		"query version invariant broken: query model header.modelVersion must be present"
	);
	assertInvariant(
		query.header.modelVersion === QUERY_MODEL_VERSION,
		`query version invariant broken: modelVersion must be ${QUERY_MODEL_VERSION}`
	);
}

interface QueryContentShape {
	readonly targetDocumentModel: string;
	readonly projectionName: string;
	readonly paging: Record<string, unknown>;
	readonly links: readonly QueryLinkShape[];
	readonly constraint?: unknown;
	readonly exclude?: unknown;
}

interface QueryLinkShape {
	readonly constraint?: unknown;
}

interface OperatorConstraint {
	readonly operator: string;
}

function assertRequiredQueryFields(content: QueryContentShape): void {
	assertInvariant(
		content.targetDocumentModel.length > 0,
		"required query field invariant broken: targetDocumentModel must be a non-empty string"
	);
	assertInvariant(
		content.projectionName.length > 0,
		"required query field invariant broken: projectionName must be a non-empty string"
	);
	assertInvariant(isRecord(content.paging), "required query field invariant broken: paging must be present");
	assertInvariant(Array.isArray(content.links), "required query field invariant broken: links must be present");
}

function getQueryContent(query: QueryShapeModel | unknown): QueryContentShape {
	const content = isRecord(query) && "content" in query ? query.content : query;
	assertInvariant(isRecord(content), "query content invariant broken: query content must be an object");
	assertInvariant(
		typeof content.targetDocumentModel === "string",
		"required query field invariant broken: targetDocumentModel must be present"
	);
	assertInvariant(
		typeof content.projectionName === "string",
		"required query field invariant broken: projectionName must be present"
	);
	assertInvariant(isRecord(content.paging), "required query field invariant broken: paging must be present");
	assertInvariant(Array.isArray(content.links), "required query field invariant broken: links must be present");

	return {
		targetDocumentModel: content.targetDocumentModel,
		projectionName: content.projectionName,
		paging: content.paging,
		links: content.links.map(toQueryLinkShape),
		...("constraint" in content ? { constraint: content.constraint } : {}),
		...("exclude" in content ? { exclude: content.exclude } : {})
	};
}

function toQueryLinkShape(value: unknown): QueryLinkShape {
	assertInvariant(isRecord(value), "required query field invariant broken: links must contain objects");

	return "constraint" in value ? { constraint: value.constraint } : {};
}

function isDropDownLegacyHasContent(content: QueryContentShape): boolean {
	return (
		content.paging.pageSize === 1 &&
		!("exclude" in content) &&
		isHasConstraint(content.constraint) &&
		content.links.some((link) => isExactMatchConstraint(link.constraint))
	);
}

function isExactMatchConstraint(value: unknown): value is OperatorConstraint {
	return isRecord(value) && value.operator === "exact_match";
}

function isHasConstraint(value: unknown): value is OperatorConstraint {
	return isRecord(value) && value.operator === "has";
}

function assertInvariant(condition: boolean, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

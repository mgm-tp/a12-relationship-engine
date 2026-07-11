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
 * Minimal structural overview model accepted by column linkReference validators.
 */
export interface LinkReferenceOverview {
	readonly header?: {
		readonly id?: string;
		readonly modelReferences?: readonly unknown[];
	};
	readonly content?: {
		readonly columns?: readonly unknown[];
	};
}

/**
 * Column classification input used by fixture tests to describe where a column originated.
 */
export interface LinkReferenceColumnSets {
	readonly targetDocumentElementRefs: readonly string[];
	readonly linkDocumentElementRefs: readonly string[];
}

/**
 * Asserts that no overview column contains both LINK and CHILD linkReferences.
 */
export function assertNoMixedLinkReferenceTypes(overview: LinkReferenceOverview): void {
	for (const column of getColumns(overview)) {
		const types = new Set(column.linkReferences.map((reference) => reference.type));
		assertInvariant(
			!(types.has("LINK") && types.has("CHILD")),
			`linkReference invariant broken: column ${column.id} mixes LINK and CHILD refs (${formatReferences(column.linkReferences)})`
		);
	}
}

/**
 * Asserts LINK/exclude semantics: target-document columns carry CHILD refs and link-document columns carry LINK refs.
 */
export function assertLinkExcludeLinkReferences(
	overview: LinkReferenceOverview,
	columnSets: LinkReferenceColumnSets
): void {
	assertNoMixedLinkReferenceTypes(overview);
	const columns = getColumns(overview);
	const targetRefs = new Set(columnSets.targetDocumentElementRefs);
	const linkRefs = new Set(columnSets.linkDocumentElementRefs);

	assertClassificationSetNotEmpty(targetRefs, "LINK/exclude target-document");
	assertClassificationSetNotEmpty(linkRefs, "LINK/exclude link-document");
	assertEveryClassificationRefMatchesColumn(columns, targetRefs, "LINK/exclude target-document");
	assertEveryClassificationRefMatchesColumn(columns, linkRefs, "LINK/exclude link-document");

	for (const column of columns) {
		if (targetRefs.has(column.elementRef)) {
			assertColumnHasOnlyType(column, "CHILD", "LINK/exclude target-document column");
		}

		if (linkRefs.has(column.elementRef)) {
			assertColumnHasOnlyType(column, "LINK", "LINK/exclude link-document column");
		}
	}
}

/**
 * Asserts CHILD/has semantics: target-document columns carry no linkReferences.
 */
export function assertChildHasLinkReferences(
	overview: LinkReferenceOverview,
	columnSets: Pick<LinkReferenceColumnSets, "targetDocumentElementRefs">
): void {
	assertNoMixedLinkReferenceTypes(overview);
	const columns = getColumns(overview);
	const targetRefs = new Set(columnSets.targetDocumentElementRefs);

	assertClassificationSetNotEmpty(targetRefs, "CHILD/has target-document");
	assertEveryClassificationRefMatchesColumn(columns, targetRefs, "CHILD/has target-document");

	for (const column of columns) {
		if (targetRefs.has(column.elementRef)) {
			assertInvariant(
				column.linkReferences.length === 0,
				`linkReference invariant broken: CHILD/has target-document column ${column.id} (${column.elementRef}) must not have linkReferences`
			);
		}
	}
}

/**
 * Asserts query-backed `-edit` overviews do not retain generated-document `I4_` element refs in columns.
 */
export function assertNoI4ElementRefsInQueryBackedEditColumns(overview: LinkReferenceOverview): void {
	const overviewId = overview.header?.id ?? "<unknown-overview>";
	const queryBacked = hasHeaderRefPurpose(overview, "query-model-for-overview");

	if (!queryBacked || !overviewId.endsWith("-edit")) {
		return;
	}

	const offendingColumns = getColumns(overview).filter((column) => column.elementRef.startsWith("I4_"));
	assertInvariant(
		offendingColumns.length === 0,
		`linkReference invariant broken: query-backed edit overview ${overviewId} has I4_ element refs in column(s): ${offendingColumns.map(formatColumn).join(", ")}`
	);
}

interface OverviewColumn {
	readonly id: string;
	readonly elementRef: string;
	readonly linkReferences: readonly LinkReference[];
}

interface LinkReference {
	readonly type: "LINK" | "CHILD";
	readonly reference?: string;
}

function assertColumnHasOnlyType(column: OverviewColumn, expectedType: LinkReference["type"], context: string): void {
	assertInvariant(
		column.linkReferences.length > 0,
		`linkReference invariant broken: ${context} ${column.id} (${column.elementRef}) must have ${expectedType} linkReferences`
	);

	const offendingRefs = column.linkReferences.filter((reference) => reference.type !== expectedType);
	assertInvariant(
		offendingRefs.length === 0,
		`linkReference invariant broken: ${context} ${column.id} (${column.elementRef}) has offending ref(s): ${formatReferences(offendingRefs)}`
	);
}

function assertClassificationSetNotEmpty(classificationRefs: ReadonlySet<string>, context: string): void {
	assertInvariant(
		classificationRefs.size > 0,
		`linkReference invariant broken: ${context} classification set must not be empty`
	);
}

function assertEveryClassificationRefMatchesColumn(
	columns: readonly OverviewColumn[],
	classificationRefs: ReadonlySet<string>,
	context: string
): void {
	const columnElementRefs = new Set(columns.map((column) => column.elementRef));
	const unmatchedRefs = [...classificationRefs].filter((elementRef) => !columnElementRefs.has(elementRef));

	assertInvariant(
		unmatchedRefs.length === 0,
		`linkReference invariant broken: ${context} classification refs do not match parsed columns: ${unmatchedRefs.join(", ")}`
	);
}

function getColumns(overview: LinkReferenceOverview): readonly OverviewColumn[] {
	assertInvariant(
		Array.isArray(overview.content?.columns),
		"linkReference invariant broken: content.columns must be present"
	);
	assertInvariant(
		overview.content.columns.length > 0,
		"linkReference invariant broken: content.columns must not be empty"
	);

	return overview.content.columns.map(toOverviewColumn);
}

function toOverviewColumn(value: unknown): OverviewColumn {
	assertInvariant(isRecord(value), "linkReference invariant broken: overview column must be an object");
	assertInvariant(typeof value.id === "string", "linkReference invariant broken: overview column id must be present");
	assertInvariant(
		typeof value.elementRef === "string",
		`linkReference invariant broken: overview column ${value.id} elementRef must be present`
	);

	return {
		id: value.id,
		elementRef: value.elementRef,
		linkReferences: toLinkReferences(value.linkReferences, value.id)
	};
}

function toLinkReferences(value: unknown, columnId: string): readonly LinkReference[] {
	if (value === undefined) {
		return [];
	}

	assertInvariant(
		Array.isArray(value),
		`linkReference invariant broken: column ${columnId} linkReferences must be an array`
	);

	return value.map((entry, index) => toLinkReference(entry, columnId, index));
}

function toLinkReference(entry: unknown, columnId: string, index: number): LinkReference {
	assertInvariant(
		isRecord(entry),
		`linkReference invariant broken: column ${columnId} linkReferences[${index}] must be an object`
	);
	assertInvariant(
		entry.type === "LINK" || entry.type === "CHILD",
		`linkReference invariant broken: column ${columnId} linkReferences[${index}] has unsupported type ${String(entry.type)}`
	);

	return { type: entry.type, reference: getReferenceValue(entry) };
}

function hasHeaderRefPurpose(overview: LinkReferenceOverview, purpose: string): boolean {
	return (overview.header?.modelReferences ?? []).some(
		(reference) => isRecord(reference) && reference.purpose === purpose && typeof reference.reference === "string"
	);
}

function getReferenceValue(entry: Record<string, unknown>): string | undefined {
	const value = entry.reference ?? entry.ref ?? entry.elementRef;

	return typeof value === "string" ? value : undefined;
}

function formatReferences(references: readonly LinkReference[]): string {
	return references.map((reference) => `${reference.type}:${reference.reference ?? "<unknown-ref>"}`).join(", ");
}

function formatColumn(column: OverviewColumn): string {
	return `${column.id} (${column.elementRef})`;
}

function assertInvariant(condition: boolean, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

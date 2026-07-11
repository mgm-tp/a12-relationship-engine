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

import { EventName } from "../../../src/internal/steps/RuM/extraction/constants.js";

import type { ModelIndex } from "./model-index.js";

/**
 * Options for topology checks that differ between keepModels and non-keepModels extraction output.
 */
export interface OverviewTopologyOptions {
	readonly keepModels: boolean;
	readonly isCdm?: boolean;
}

/**
 * Asserts overview header references and component-specific overview routing for a RuM fixture.
 *
 * Assumptions: the helper accepts the structural Relationship UI Model shape emitted by the
 * extraction pipeline: `content.component.componentType`, direct overview refs on the component,
 * and optional edit overview refs under `content.component.editConfiguration`.
 */
export function assertOverviewTopology(rumContent: unknown, index: ModelIndex, options: OverviewTopologyOptions): void {
	assertOverviewQueryReferences(index);
	const component = getRuMComponent(rumContent);

	if (component.componentType === "DualPaneSelection") {
		assertDualPaneKeepModelsTopology(component, index, options);

		return;
	}

	if (component.componentType === "TableList") {
		assertTableListTopology(component, index, options);

		return;
	}

	if (component.componentType === "DropDownSelection") {
		assertDropDownHasNoOverviewOutput(component);

		return;
	}

	assertInvariant(
		false,
		`overview topology invariant broken: unsupported componentType ${component.componentType ?? "<missing>"}`
	);
}

/**
 * Asserts every query-backed overview resolves its `query-model-for-overview` reference to a query model,
 * and preserved base overviews do not carry both document and query overview purposes.
 */
export function assertOverviewQueryReferences(index: ModelIndex): void {
	for (const overview of index.allByType("overview")) {
		const queryRefs = index.headerRefsOf(overview, "query-model-for-overview");
		const documentRefs = index.headerRefsOf(overview, "document-model-for-overview");

		for (const queryRef of queryRefs) {
			const resolvedModel = index.resolveRef(queryRef);
			assertInvariant(
				resolvedModel?.header.modelType === "query",
				`overview topology invariant broken: overview ${overview.header.id} query-model-for-overview ref ${queryRef} must resolve to a query model`
			);
		}

		assertInvariant(
			queryRefs.length === 0 || documentRefs.length === 0,
			`overview topology invariant broken: overview ${overview.header.id} must not carry both query-model-for-overview and document-model-for-overview references`
		);
	}
}

interface RuMComponent {
	readonly componentType?: string;
	readonly availableItemsOverviewModel?: string;
	readonly selectedItemsOverviewModel?: string;
	readonly availableItemsQueryModel?: string;
	readonly selectedItemQueryModel?: string;
	readonly editConfiguration?: EditConfiguration;
}

interface EditConfiguration {
	readonly availableItemsOverviewModel?: string;
	readonly selectedItemsOverviewModel?: string;
}

function assertDualPaneKeepModelsTopology(
	component: RuMComponent,
	index: ModelIndex,
	options: OverviewTopologyOptions
): void {
	const selectedOverviewRef = component.selectedItemsOverviewModel;
	const availableOverviewRef = component.availableItemsOverviewModel;

	if (selectedOverviewRef !== undefined) {
		const selectedOverview = assertOverviewRefExists(selectedOverviewRef, index, "DualPane selectedItemsOverviewModel");
		assertSelectedOverviewActivation(selectedOverview, "DualPane selectedItemsOverviewModel");
	}

	if (availableOverviewRef !== undefined) {
		const availableOverview = assertOverviewRefExists(
			availableOverviewRef,
			index,
			"DualPane availableItemsOverviewModel"
		);
		assertCandidateOverviewActivation(availableOverview, "DualPane availableItemsOverviewModel");
	}

	if (!options.keepModels) {
		return;
	}

	const requiredSelectedOverviewRef = assertRequiredRef(selectedOverviewRef, "DualPane selectedItemsOverviewModel");
	assertInvariant(
		requiredSelectedOverviewRef.endsWith("-edit"),
		`overview topology invariant broken: DualPane keepModels selected overview ${requiredSelectedOverviewRef} must end with -edit`
	);
}

function assertTableListTopology(component: RuMComponent, index: ModelIndex, options: OverviewTopologyOptions): void {
	const directSelected = assertRequiredRef(
		component.selectedItemsOverviewModel,
		"TableList direct selectedItemsOverviewModel"
	);
	const editSelected = assertRequiredRef(
		component.editConfiguration?.selectedItemsOverviewModel,
		"TableList editConfiguration.selectedItemsOverviewModel"
	);
	const directOverview = assertOverviewRefExists(directSelected, index, "TableList direct selectedItemsOverviewModel");
	const editSelectedOverview = assertOverviewRefExists(
		editSelected,
		index,
		"TableList editConfiguration.selectedItemsOverviewModel"
	);

	assertNoEditRowActionsOnDirectTableListOverview(directOverview);
	assertTableListDirectOverviewActivation(directOverview, options.isCdm ?? false);
	assertSelectedOverviewActivation(editSelectedOverview, "TableList editConfiguration.selectedItemsOverviewModel");
	assertInvariant(
		directSelected !== editSelected,
		`overview topology invariant broken: TableList direct selected overview ${directSelected} must be separate from edit selected overview ${editSelected}`
	);
	assertInvariant(
		editSelected.endsWith("-edit"),
		`overview topology invariant broken: TableList edit selected overview ${editSelected} must end with -edit`
	);

	const editAvailable = component.editConfiguration?.availableItemsOverviewModel;

	if (editAvailable !== undefined) {
		const editAvailableOverview = assertOverviewRefExists(
			editAvailable,
			index,
			"TableList editConfiguration.availableItemsOverviewModel"
		);
		assertCandidateOverviewActivation(editAvailableOverview, "TableList editConfiguration.availableItemsOverviewModel");
	}

	if (options.keepModels) {
		assertInvariant(
			directSelected.endsWith("-tableList"),
			`overview topology invariant broken: TableList keepModels direct selected overview ${directSelected} must end with -tableList`
		);
	}

	if (!options.keepModels) {
		assertInvariant(
			!directSelected.endsWith("-tableList") && !directSelected.endsWith("-edit"),
			`overview topology invariant broken: TableList non-keepModels direct selected overview ${directSelected} must use the base overview id`
		);
	}
}

function assertDropDownHasNoOverviewOutput(component: RuMComponent): void {
	const overviewRefs = [component.availableItemsOverviewModel, component.selectedItemsOverviewModel].filter(
		(ref): ref is string => ref !== undefined
	);
	assertInvariant(
		overviewRefs.length === 0,
		`overview topology invariant broken: DropDown must not produce overview refs, found ${overviewRefs.join(", ")}`
	);
}

function assertRequiredRef(ref: string | undefined, fieldName: string): string {
	assertInvariant(
		ref !== undefined,
		`overview topology invariant broken: ${fieldName} ref must be present for this topology check`
	);

	return ref;
}

function assertOverviewRefExists(
	ref: string,
	index: ModelIndex,
	fieldName: string
): { readonly header: { readonly id: string }; readonly content?: unknown } {
	const resolvedModel = index.resolveRef(ref);
	assertInvariant(
		resolvedModel?.header.modelType === "overview",
		`overview topology invariant broken: ${fieldName} ref ${ref} must resolve to an overview model`
	);

	return resolvedModel;
}

function assertNoEditRowActionsOnDirectTableListOverview(overview: {
	readonly header: { readonly id: string };
	readonly content?: unknown;
}): void {
	const editEvents = new Set<string>([EventName.DeleteLink, EventName.RestoreLink, EventName.EditLinkDocument]);
	const offendingEvents = getRowActionEvents(overview.content).filter((event) => editEvents.has(event));

	assertInvariant(
		offendingEvents.length === 0,
		`overview topology invariant broken: TableList direct selected overview ${overview.header.id} carries edit row action(s): ${offendingEvents.join(", ")}`
	);
}

function getRowActionEvents(content: unknown): readonly string[] {
	const rowActionGroup = isRecord(content) ? content.rowActionGroup : undefined;
	const actions = isRecord(rowActionGroup) && Array.isArray(rowActionGroup.actions) ? rowActionGroup.actions : [];

	return actions.flatMap((action) => {
		if (!isRecord(action) || typeof action.event !== "string") {
			return [];
		}

		return [action.event];
	});
}

function assertTableListDirectOverviewActivation(
	overview: { readonly header: { readonly id: string }; readonly content?: unknown },
	isCdm: boolean
): void {
	const rowActivation = getRowActivation(overview.content, `TableList direct selected overview ${overview.header.id}`);

	if (isCdm) {
		assertInvariant(
			rowActivation === undefined,
			`overview topology invariant broken: TableList direct selected overview ${overview.header.id} must omit rowActivation for CDM output`
		);

		return;
	}

	assertRowActivationMatches(
		rowActivation,
		{ type: "non_interactive" },
		`TableList direct selected overview ${overview.header.id}`
	);
}

function assertSelectedOverviewActivation(
	overview: { readonly header: { readonly id: string }; readonly content?: unknown },
	fieldName: string
): void {
	assertRowActivationMatches(
		getRowActivation(overview.content, `${fieldName} ${overview.header.id}`),
		{ type: "event", event: EventName.DeleteLink },
		`${fieldName} ${overview.header.id}`
	);
}

function assertCandidateOverviewActivation(
	overview: { readonly header: { readonly id: string }; readonly content?: unknown },
	fieldName: string
): void {
	assertRowActivationMatches(
		getRowActivation(overview.content, `${fieldName} ${overview.header.id}`),
		{ type: "event", event: EventName.AddLink },
		`${fieldName} ${overview.header.id}`
	);
}

interface ParsedRowActivation {
	readonly type: string;
	readonly event?: string;
}

function getRowActivation(content: unknown, context: string): ParsedRowActivation | undefined {
	if (!isRecord(content) || content.rowActivation === undefined) {
		return undefined;
	}

	assertInvariant(
		isRecord(content.rowActivation),
		`overview topology invariant broken: ${context} rowActivation must be an object when present`
	);
	assertInvariant(
		typeof content.rowActivation.type === "string",
		`overview topology invariant broken: ${context} rowActivation.type must be a string when present`
	);
	assertInvariant(
		content.rowActivation.event === undefined || typeof content.rowActivation.event === "string",
		`overview topology invariant broken: ${context} rowActivation.event must be a string when present`
	);

	return {
		type: content.rowActivation.type,
		event: typeof content.rowActivation.event === "string" ? content.rowActivation.event : undefined
	};
}

function assertRowActivationMatches(
	actual: ParsedRowActivation | undefined,
	expected: ParsedRowActivation,
	context: string
): void {
	assertInvariant(
		actual !== undefined,
		`overview topology invariant broken: ${context} rowActivation must equal ${describeRowActivation(expected)}, but was missing`
	);
	assertInvariant(
		actual.type === expected.type,
		`overview topology invariant broken: ${context} rowActivation must equal ${describeRowActivation(expected)}, but was ${describeRowActivation(actual)}`
	);
	assertInvariant(
		actual.event === expected.event,
		`overview topology invariant broken: ${context} rowActivation must equal ${describeRowActivation(expected)}, but was ${describeRowActivation(actual)}`
	);
}

function describeRowActivation(rowActivation: ParsedRowActivation): string {
	if (rowActivation.event === undefined) {
		return `{ type: "${rowActivation.type}" }`;
	}

	return `{ type: "${rowActivation.type}", event: "${rowActivation.event}" }`;
}

function getRuMComponent(rumContent: unknown): RuMComponent {
	assertInvariant(isRecord(rumContent), "overview topology invariant broken: RuM content must be an object");
	assertInvariant(
		isRecord(rumContent.component),
		"overview topology invariant broken: RuM content.component must be an object"
	);

	return {
		componentType: getOptionalString(rumContent.component, "componentType"),
		availableItemsOverviewModel: getOptionalString(rumContent.component, "availableItemsOverviewModel"),
		selectedItemsOverviewModel: getOptionalString(rumContent.component, "selectedItemsOverviewModel"),
		availableItemsQueryModel: getOptionalString(rumContent.component, "availableItemsQueryModel"),
		selectedItemQueryModel: getOptionalString(rumContent.component, "selectedItemQueryModel"),
		editConfiguration: toEditConfiguration(rumContent.component.editConfiguration)
	};
}

function toEditConfiguration(value: unknown): EditConfiguration | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	return {
		availableItemsOverviewModel: getOptionalString(value, "availableItemsOverviewModel"),
		selectedItemsOverviewModel: getOptionalString(value, "selectedItemsOverviewModel")
	};
}

function getOptionalString(record: Record<string, unknown>, key: string): string | undefined {
	const value = record[key];

	return typeof value === "string" ? value : undefined;
}

function assertInvariant(condition: boolean, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

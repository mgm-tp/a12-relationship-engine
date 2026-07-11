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

import { vi, expect } from "vitest";

import type { GenericModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import { extractionTransform } from "../../src/internal/steps/RuM/extraction/index.js";
import { buildModelIndex, type IndexedModel } from "../internal/test-support/model-index.js";
import { DOCUMENT_MODEL_VERSION } from "../../src/internal/steps/RuM/extraction/constants.js";
import { assertOverviewTopology } from "../internal/test-support/overview-topology-validator.js";
import { loadFixtureModels, createFixtureContext } from "../internal/test-support/fixture-context-factory.js";

import { must, array, record, single, string, optionalRecord } from "./fixture-utils.js";

export const FIXTURES = [
	"shared/form-models/Contract-form.json",
	"shared/relationship-models/CoInsurer.json",
	"shared/overview-models/CoInsurerLinks-overview.json",
	"shared/overview-models/BusinessPartner_AvailableItemsOverview.json",
	"shared/document-models/CoInsurer_contract____generated.json",
	"shared/document-models/BusinessPartner-document.json"
] as const;
export const INLINE_MODELS = [
	documentModel("Contract-document"),
	linkDocumentModel(),
	generatedBusinessPartnerDoc()
] as const;

export interface CoInsurerOutput {
	readonly selectedQuery: IndexedModel;
	readonly selectedQueryLinkConstraintOperator: string | undefined;
	readonly selectedOverview: IndexedModel;
}
export interface Column {
	readonly elementRef: string;
	readonly linkReferences: readonly string[];
}

/** Runs the CoInsurer DualPane LINK keepModels fixture through extraction. */
export function extractCoInsurerDualPane(): CoInsurerOutput {
	const workspaceModels = [...loadFixtureModels(FIXTURES), ...INLINE_MODELS];
	const fixture = createFixtureContext({ fixturePaths: FIXTURES, models: INLINE_MODELS, config: { keepModels: true } });
	const form = must(
		fixture.context.resolveModel(must(fixture.context.findModel("Contract-form"), "Contract-form workspace entry")),
		"form model"
	);

	extractionTransform(form, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, fixture.context);

	const indexed = toIndexedModels([...workspaceModels, ...fixture.getAddedModels()]);
	const index = buildModelIndex<IndexedModel>(indexed);
	const rum = single(
		indexed.filter(
			(model) => model.header.modelType === "relationship-ui" && componentType(model) === "DualPaneSelection"
		),
		"DualPane RuM"
	);
	const selectedOverviewId = string(
		record(record(rum.content).component).selectedItemsOverviewModel,
		"selected overview ref"
	);
	const selectedOverview = must(index.resolveRef(selectedOverviewId), selectedOverviewId);
	const selectedQueryId = single(
		index.headerRefsOf(selectedOverview, "query-model-for-overview"),
		"selected query ref"
	);
	const selectedQuery = must(index.resolveRef(selectedQueryId), selectedQueryId);

	assertOverviewTopology(rum.content, index, { keepModels: true });
	expect(selectedOverviewId).toBe("CoInsurerLinks-overview-edit");
	expect(selectedQuery.header.modelType).toBe("query");

	return {
		selectedQuery,
		selectedQueryLinkConstraintOperator: operator(
			firstRecord(record(selectedQuery.content).links, "query links").constraint
		),
		selectedOverview
	};
}

/** Converts an indexed model into the query-shape validator input. */
export function toQueryShape(query: IndexedModel): {
	readonly header: { readonly modelVersion: string };
	readonly content: unknown;
} {
	return {
		header: { modelVersion: string(record(query.header).modelVersion, "query modelVersion") },
		content: query.content
	};
}

/** Converts an indexed model into the link-reference validator input. */
export function toLinkReferenceOverview(overview: IndexedModel): {
	readonly header: IndexedModel["header"];
	readonly content: { readonly columns: readonly unknown[] };
} {
	return { header: overview.header, content: { columns: array(record(overview.content).columns, "overview columns") } };
}

/** Returns overview column summaries. */
export function columns(overview: IndexedModel): readonly Column[] {
	return array(record(overview.content).columns, "overview columns").map((value) => {
		const column = record(value);

		return {
			elementRef: string(column.elementRef, "column elementRef"),
			linkReferences: array(column.linkReferences ?? [], "column linkReferences").map((ref) =>
				string(record(ref).type, "ref type")
			)
		};
	});
}

/** Returns link reference types for each requested elementRef. */
export function linkReferenceTypes(
	overview: IndexedModel,
	elementRefs: readonly string[]
): readonly (readonly string[])[] {
	return elementRefs.map(
		(elementRef) =>
			single(
				columns(overview).filter((column) => column.elementRef === elementRef),
				elementRef
			).linkReferences
	);
}

/** Returns link reference relationship values for each requested elementRef (parallel to linkReferenceTypes). */
export function linkReferenceRelationships(
	overview: IndexedModel,
	elementRefs: readonly string[]
): readonly (readonly string[])[] {
	const allColumns = array(record(overview.content).columns, "overview columns");

	return elementRefs.map((elementRef) => {
		const columnData = allColumns.find((col) => optionalRecord(col)?.elementRef === elementRef);

		if (!columnData) {
			throw new Error(`No column for elementRef ${elementRef}`);
		}

		const refs = array(record(columnData).linkReferences ?? [], "linkReferences");

		return refs.map((ref) => {
			const rel = optionalRecord(ref)?.relationship;

			return typeof rel === "string" ? rel : "missing-relationship";
		});
	});
}

/** Returns true when a column does not mix LINK and CHILD refs. */
export function hasNoMixedRefs(column: Column): boolean {
	return !(column.linkReferences.includes("LINK") && column.linkReferences.includes("CHILD"));
}

/** Returns row action event names from an overview. */
export function rowActionEvents(overview: IndexedModel): readonly string[] {
	const rowActionGroup = optionalRecord(record(overview.content).rowActionGroup);

	return array(rowActionGroup?.actions ?? [], "row actions").map((action) =>
		string(record(action).event, "row action event")
	);
}

/** Returns the first record from an array-like value. */
export function firstRecord(value: unknown, description: string): Record<string, unknown> {
	return record(single(array(value, description), description));
}

/** Returns an operator field from an object-like value. */
export function operator(value: unknown): string | undefined {
	const operatorValue = optionalRecord(value)?.operator;

	return typeof operatorValue === "string" ? operatorValue : undefined;
}

export { record };

function documentModel(id: string): GenericModel {
	return {
		header: { id, modelType: "document", modelVersion: DOCUMENT_MODEL_VERSION },
		content: { modelRoot: { rootGroups: [] } }
	} as GenericModel;
}

function linkDocumentModel(): GenericModel {
	return {
		header: { id: "CoInsurerAdditionalFields", modelType: "document", modelVersion: DOCUMENT_MODEL_VERSION },
		content: {
			modelRoot: {
				rootGroups: [
					{
						type: "Group",
						id: "G1",
						name: "additionalFields",
						Group: {
							repeatability: 1,
							elements: [
								{ Field: { fieldType: { type: "StringType" } }, id: "field_de37b", name: "field_de37b", type: "Field" }
							]
						}
					}
				]
			}
		}
	} as GenericModel;
}

function generatedBusinessPartnerDoc(): GenericModel {
	return {
		header: {
			id: "CoInsurer_businessPartner____generated",
			modelType: "document",
			modelVersion: DOCUMENT_MODEL_VERSION,
			modelReferences: [
				{ alias: "Contract-document", modelType: "document", purpose: "include", reference: "Contract-document" },
				{
					alias: "CoInsurerAdditionalFields",
					modelType: "document",
					purpose: "include",
					reference: "CoInsurerAdditionalFields"
				}
			]
		},
		content: {
			modelRoot: {
				rootGroups: [
					includedGroup("G2", "target", "I4", "contract", "Contract-document"),
					includedGroup("G3", "relationship", "I5", "additionalFields", "CoInsurerAdditionalFields")
				]
			}
		}
	} as GenericModel;
}

function includedGroup(
	groupId: string,
	groupName: string,
	includeId: string,
	includeName: string,
	reference: string
): unknown {
	return {
		type: "Group",
		id: groupId,
		name: groupName,
		Group: {
			repeatability: 1,
			elements: [
				{ type: "Group", id: includeId, name: includeName, Group: { repeatability: 1, includeConfig: { reference } } }
			]
		}
	};
}

function toIndexedModels(models: readonly unknown[]): IndexedModel[] {
	return models.map((model) => {
		const value = record(model);
		const header = record(value.header);

		return {
			header: {
				id: string(header.id, "header id"),
				modelType: string(header.modelType, "header modelType"),
				modelVersion: string(header.modelVersion, "header modelVersion"),
				modelReferences: Array.isArray(header.modelReferences) ? header.modelReferences : undefined
			} as IndexedModel["header"],
			content: value.content,
			path: `${String(header.id)}.json`
		};
	});
}

function componentType(model: IndexedModel): string | undefined {
	const component = optionalRecord(optionalRecord(model.content)?.component);

	return typeof component?.componentType === "string" ? component.componentType : undefined;
}

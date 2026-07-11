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
 * Test fixture helper for CategoryCategory candidate clone routing tests.
 *
 * The CategoryCategory form has two relationship bindings that share the same
 * candidate overview `Category_ChildCategory_AvailableItemsOverview`:
 *   - DropDown for `CategoryCategory` relationship
 *   - DualPane for `CategoryCategoryAlias` relationship
 *
 * This triggers multi-relationship candidate clone routing (GAP-1), resulting in
 * `--RelationshipName` overview clones when the global candidate map sees 2+ relationships.
 */

import { vi } from "vitest";

import type { GenericModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import { extractionTransform } from "../../src/internal/steps/RuM/extraction/index.js";
import { loadFixtureModel, createFixtureContext } from "../internal/test-support/fixture-context-factory.js";
import { buildModelIndex, type ModelIndex, type IndexedModel } from "../internal/test-support/model-index.js";
import { DOCUMENT_MODEL_VERSION, OVERVIEW_MODEL_VERSION } from "../../src/internal/steps/RuM/extraction/constants.js";

import { isRecord } from "./fixture-utils.js";

// ---------------------------------------------------------------------------
// Public constants
// ---------------------------------------------------------------------------

/** Base candidate overview used by both relationship bindings. */
export const AVAILABLE_OVERVIEW_BASE_ID = "Category_ChildCategory_AvailableItemsOverview";

/** Candidate clone for the DualPane CategoryCategoryAlias relationship. */
export const AVAILABLE_OVERVIEW_ALIAS_CLONE_ID = `${AVAILABLE_OVERVIEW_BASE_ID}--CategoryCategoryAlias`;

/** Generated document backing the candidate overview. */
export const GENERATED_DOC_ID = "Category_ChildCategory____generated";

/** RuM ID for the DropDown (CategoryCategory) binding. */
export const DROPDOWN_RUM_ID = "Category-form-binding-ChildCategoryDropDown_RuM";

/** RuM ID for the DualPane (CategoryCategoryAlias) binding. */
export const DUALPANE_RUM_ID = "Category-form-binding-AliasCategoryCandidates_RuM";

// ---------------------------------------------------------------------------
// Fixture paths
// ---------------------------------------------------------------------------

const FIXTURE_PATHS = [
	"products/CategoryCategory/relationship.json",
	"products/CategoryCategory/relationship-secondary.json",
	"products/CategoryCategory/overview-available.json",
	"products/CategoryCategory/document-model.json"
] as const;
const FORM_FIXTURE_PATH = "products/CategoryCategory/form.json";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

/** Result of running CategoryCategory extraction. */
export interface CategoryExtractionResult {
	readonly addedModels: readonly IndexedModel[];
	readonly deletedIds: readonly string[];
	readonly updatedForm: IndexedModel;
	readonly allModels: readonly IndexedModel[];
	readonly index: ModelIndex<IndexedModel>;
	readonly findAddedById: (id: string) => IndexedModel | undefined;
}

// ---------------------------------------------------------------------------
// Extraction runner
// ---------------------------------------------------------------------------

/**
 * Runs the CategoryCategory fixture through extraction.
 *
 * @param keepModels - Whether to preserve base overviews and binding annotations.
 * @param formVariant - `"multi-rel"` uses both bindings (DropDown + DualPane);
 *   `"single-rel"` strips the DropDown binding, leaving only the DualPane.
 */
export function runCategoryExtraction(
	keepModels: boolean,
	formVariant: "multi-rel" | "single-rel"
): CategoryExtractionResult {
	const baseForm = loadFixtureModel(FORM_FIXTURE_PATH);
	const formModel = formVariant === "single-rel" ? createSingleRelFormVariant(baseForm) : (baseForm as GenericModel);
	const inlineModels = [categoryDocument()];
	const workspaceModels = [...FIXTURE_PATHS.map(loadFixtureModel), formModel, ...inlineModels];
	const harness = createFixtureContext({ models: workspaceModels, config: { keepModels } });
	const updatedForm = toIndexed(
		extractionTransform(formModel, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, harness.context)
	);
	const addedModels = harness.getAddedModels().map(toIndexed);
	const deletedIds = harness.getDeletedIds();
	const allModels = mergeSurviving(workspaceModels.map(toIndexed), addedModels, updatedForm, deletedIds);
	const index = buildModelIndex<IndexedModel>(allModels.map(withPath));

	return {
		addedModels,
		deletedIds,
		updatedForm,
		allModels,
		index,
		findAddedById: (id) => addedModels.find((m) => m.header.id === id)
	};
}

// ---------------------------------------------------------------------------
// Inline model builders
// ---------------------------------------------------------------------------

/** Returns the available-items overview component from a RuM. */
export function getAvailableOverviewRef(rum: IndexedModel): string | undefined {
	const component = isRecord(rum.content) ? rum.content.component : undefined;

	if (!isRecord(component)) {
		return undefined;
	}

	return typeof component.availableItemsOverviewModel === "string" ? component.availableItemsOverviewModel : undefined;
}

/** Returns header label entries from an indexed model. */
export function getHeaderLabels(model: IndexedModel): ReadonlyArray<{ locale?: string; text?: string }> {
	const rawLabels = (model.header as { labels?: unknown }).labels;

	if (!Array.isArray(rawLabels)) {
		return [];
	}

	return rawLabels.filter((l) => isRecord(l)) as Array<{ locale?: string; text?: string }>;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Creates a form variant with only the DualPane (CategoryCategoryAlias) binding,
 * removing the DropDown (CategoryCategory) binding. This results in a single-
 * relationship candidate scenario where `shouldCloneCandidate` returns false.
 */
function createSingleRelFormVariant(baseForm: GenericModel): GenericModel {
	const form = structuredClone(baseForm) as MutableModel;
	const bindingAnnotation = form.header.annotations?.find(
		(annotation: { name?: string }) => annotation.name === "bindingConfiguration"
	);

	if (!bindingAnnotation) {
		return baseForm;
	}

	const allBindings = parseBindings(bindingAnnotation.value ?? "");
	const dualPaneOnly = allBindings.filter((b) => b.details?.name === "AliasCategoryCandidates");

	form.header.annotations = (form.header.annotations ?? []).map((annotation: { name?: string; value?: string }) =>
		annotation.name === "bindingConfiguration" ? { ...annotation, value: JSON.stringify(dualPaneOnly) } : annotation
	);
	form.header.modelReferences = (form.header.modelReferences ?? []).filter(
		(ref: { reference?: string }) => ref.reference !== "Category_ChildCategory_AvailableItemsOverview"
	);

	return form as unknown as GenericModel;
}

/** Creates a minimal inline Category document model. */
function categoryDocument(): GenericModel {
	return {
		header: {
			id: "Category-document",
			modelType: "document",
			modelVersion: DOCUMENT_MODEL_VERSION
		},
		content: {
			modelInfo: { name: "Category-document" },
			modelRoot: {
				rootGroups: [
					{
						type: "Group",
						id: "G1",
						name: "Properties",
						Group: {
							repeatability: 1,
							elements: [{ type: "Field", id: "F1", name: "name", Field: { fieldType: { type: "StringType" } } }]
						}
					}
				]
			}
		}
	} as unknown as GenericModel;
}

/** Creates a minimal available-items overview with the given document reference. */
export function minimalAvailableOverview(id: string, documentRef: string): GenericModel {
	return {
		header: {
			id,
			modelType: "overview",
			modelVersion: OVERVIEW_MODEL_VERSION,
			modelReferences: [{ purpose: "document-model-for-overview", modelType: "document", reference: documentRef }]
		},
		content: {
			configuration: { enableFilter: false, showFullTextSearch: false, pagingSize: 10 },
			rowActionGroup: { actions: [] },
			columns: [],
			subHeaderBox: { leftSlot: [], rightSlot: [] },
			footerBox: { leftSlot: [], rightSlot: [] }
		}
	} as unknown as GenericModel;
}

/** Creates a minimal document model for use in workspace setup. */
export function minimalDocumentModel(id: string): GenericModel {
	return {
		header: { id, modelType: "document", modelVersion: DOCUMENT_MODEL_VERSION },
		content: { modelInfo: { name: id }, modelRoot: { rootGroups: [] } }
	} as unknown as GenericModel;
}

function parseBindings(value: string): readonly BindingEntry[] {
	try {
		const parsed: unknown = JSON.parse(value);

		return Array.isArray(parsed) ? (parsed as BindingEntry[]) : [];
	} catch {
		return [];
	}
}

function toIndexed(model: GenericModel): IndexedModel {
	const header = (model as { header: IndexedModel["header"] }).header;

	return { header, content: (model as { content?: unknown }).content, path: `${header.id}.json` };
}

function withPath(model: IndexedModel): IndexedModel {
	return { ...model, path: `${model.header.id}.json` };
}

function mergeSurviving(
	initial: readonly IndexedModel[],
	added: readonly IndexedModel[],
	updated: IndexedModel,
	deleted: readonly string[]
): readonly IndexedModel[] {
	const deletedSet = new Set(deleted);
	const byId = new Map<string, IndexedModel>();

	for (const m of [...initial, ...added, updated]) {
		if (!deletedSet.has(m.header.id)) {
			byId.set(m.header.id, m);
		}
	}

	return [...byId.values()];
}

interface BindingEntry {
	readonly details?: { readonly name?: string };
}

interface MutableModel {
	header: {
		annotations?: Array<{ name?: string; value?: string }>;
		modelReferences?: Array<{ reference?: string }>;
	};
}

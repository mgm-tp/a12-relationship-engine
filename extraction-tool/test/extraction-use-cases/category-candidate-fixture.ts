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

import { vi } from "vitest";

import type { GenericModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import { extractionTransform } from "../../src/internal/steps/RuM/extraction/index.js";
import { DOCUMENT_MODEL_VERSION } from "../../src/internal/steps/RuM/extraction/constants.js";
import { loadFixtureModels, createFixtureContext } from "../internal/test-support/fixture-context-factory.js";

import { isRecord } from "./fixture-utils.js";

const FIXTURE_PATHS = [
	"products/CategoryCategory/relationship.json",
	"products/CategoryCategory/relationship-secondary.json",
	"products/CategoryCategory/document-model.json",
	"products/CategoryCategory/overview-available.json"
] as const;
const FORM_PATH = "products/CategoryCategory/form.json";

/** The shared candidate overview used by both CategoryCategory and CategoryCategoryAlias. */
export const CANDIDATE_OVERVIEW_ID = "Category_ChildCategory_AvailableItemsOverview";

/**
 * Clone emitted for the CategoryCategoryAlias relationship (DualPane binding).
 *
 * GAP-1 clone routing: the DropDown binding (CategoryCategory) uses query refs after P2
 * enrichment and does NOT contribute a candidate context to the overview context map.
 * Therefore only the DualPane binding's relationship drives the --RelationshipName clone.
 */
export const CLONE_ALIAS_ID = `${CANDIDATE_OVERVIEW_ID}--CategoryCategoryAlias`;

export interface LocalizedLabel {
	readonly locale?: string;
	readonly text?: string;
}

export interface CandidateExtractionResult {
	readonly addedModels: readonly GenericModel[];
	readonly deletedIds: readonly string[];
	readonly findAddedById: (id: string) => GenericModel | undefined;
	/** The DualPane RuM for the CategoryCategoryAlias binding; undefined when not present. */
	readonly dualPaneRuM: GenericModel | undefined;
	/** The DropDown RuM for the CategoryCategory binding; undefined when not present. */
	readonly dropDownRuM: GenericModel | undefined;
}

/** Runs the full CategoryCategory form (both bindings) through extraction. */
export function runMultiRelCandidateExtraction(keepModels: boolean): CandidateExtractionResult {
	return runCategoryExtraction(keepModels, false);
}

/** Runs a single-relationship variant (CategoryCategory DropDown only) through extraction. */
export function runSingleRelCandidateExtraction(keepModels: boolean): CandidateExtractionResult {
	return runCategoryExtraction(keepModels, true);
}

/** Returns the component field of a RuM or an empty record if absent. */
export function getComponent(model: GenericModel): Record<string, unknown> {
	const content = isRecord((model as { content?: unknown }).content)
		? (model as { content: Record<string, unknown> }).content
		: {};
	const component = content.component;

	return isRecord(component) ? component : {};
}

/** Returns header labels for a model. */
export function getHeaderLabels(model: GenericModel): readonly LocalizedLabel[] {
	const labels = (model as { header?: { labels?: unknown } }).header?.labels;

	return Array.isArray(labels) ? (labels as LocalizedLabel[]) : [];
}

/** Returns raw row action entries from a GenericModel's content.rowActionGroup. */
export function getCloneRowActions(model: GenericModel): readonly unknown[] {
	const content = (model as { content?: unknown }).content;

	if (!isRecord(content)) {
		return [];
	}

	const rowActionGroup = content.rowActionGroup;

	if (!isRecord(rowActionGroup)) {
		return [];
	}

	return Array.isArray(rowActionGroup.actions) ? rowActionGroup.actions : [];
}

/** Returns header modelReferences for a model sorted by purpose (stable snapshot order). */
export function getSortedModelReferences(model: GenericModel): readonly unknown[] {
	const refs = (model as { header?: { modelReferences?: unknown[] } }).header?.modelReferences ?? [];

	return [...refs].sort((a, b) => {
		const pa = isRecord(a) && typeof a.purpose === "string" ? a.purpose : "";
		const pb = isRecord(b) && typeof b.purpose === "string" ? b.purpose : "";

		return pa.localeCompare(pb);
	});
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function runCategoryExtraction(keepModels: boolean, singleRelOnly: boolean): CandidateExtractionResult {
	const [formModel, workspaceModels] = buildWorkspaceModels(singleRelOnly);
	const harness = createFixtureContext({ models: workspaceModels, config: { keepModels } });
	const logger = { log: vi.fn(), info: vi.fn(), error: vi.fn() };

	extractionTransform(formModel, logger, harness.context);

	const addedModels = harness.getAddedModels();

	return {
		addedModels,
		deletedIds: harness.getDeletedIds(),
		findAddedById: (id: string) => addedModels.find((model) => getModelId(model) === id),
		dualPaneRuM: addedModels.find(isDualPaneRuM),
		dropDownRuM: addedModels.find(isDropDownRuM)
	};
}

function buildWorkspaceModels(singleRelOnly: boolean): [GenericModel, GenericModel[]] {
	const fixtureModels = loadFixtureModels(FIXTURE_PATHS);
	const formModel = singleRelOnly ? createSingleRelForm() : loadFormModel();
	const categoryDoc = createCategoryDocument();
	const workspaceModels = [...fixtureModels, formModel, categoryDoc];

	return [formModel, workspaceModels];
}

function loadFormModel(): GenericModel {
	return loadFixtureModels([FORM_PATH])[0];
}

function createSingleRelForm(): GenericModel {
	const fullForm = loadFormModel();
	const annotations = getAnnotations(fullForm);
	const bindingAnnotation = annotations.find((a) => a.name === "bindingConfiguration");

	if (!bindingAnnotation) {
		return fullForm;
	}

	const allBindings = parseBindingConfiguration(bindingAnnotation.value ?? "[]");
	const singleBinding = allBindings.filter((b) => {
		const details = isRecord(b) ? b.details : undefined;

		return isRecord(details) && details.relationshipName === "CategoryCategory";
	});
	const updatedAnnotations = annotations.map((a) =>
		a.name === "bindingConfiguration" ? { ...a, value: JSON.stringify(singleBinding) } : a
	);

	return {
		...fullForm,
		header: {
			...(fullForm as { header: Record<string, unknown> }).header,
			annotations: updatedAnnotations
		}
	} as GenericModel;
}

function createCategoryDocument(): GenericModel {
	return {
		header: {
			id: "Category-document",
			modelType: "document",
			modelVersion: DOCUMENT_MODEL_VERSION,
			labels: [],
			annotations: []
		},
		content: {
			modelInfo: { name: "Category-document" },
			modelRoot: {
				rootGroups: [
					{
						type: "Group",
						id: "G1",
						name: "category",
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

function getModelId(model: GenericModel): string {
	return (model as { header?: { id?: string } }).header?.id ?? "";
}

function getAnnotations(model: GenericModel): Array<{ name?: string; value?: string }> {
	const annotations = (model as { header?: { annotations?: unknown } }).header?.annotations;

	return Array.isArray(annotations) ? (annotations as Array<{ name?: string; value?: string }>) : [];
}

function parseBindingConfiguration(value: string): unknown[] {
	try {
		const parsed: unknown = JSON.parse(value);

		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function isDualPaneRuM(model: GenericModel): boolean {
	return getComponent(model).componentType === "DualPaneSelection";
}

function isDropDownRuM(model: GenericModel): boolean {
	return getComponent(model).componentType === "DropDownSelection";
}

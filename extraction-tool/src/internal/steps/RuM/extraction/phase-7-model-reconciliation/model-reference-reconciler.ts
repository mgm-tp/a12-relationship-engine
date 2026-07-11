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

import { EDIT_CLONE_SUFFIX } from "../constants.js";
import type { ExtractionState } from "../extraction-state.js";
import { getHeader } from "../model-accessors/header-accessors.js";
import type { FormModel } from "../../../../../models/form-model.js";
import type { RelationshipUiModel } from "../../relationship-ui-model.js";
import { isFormModel, isQueryModel, isRelationshipUiModel } from "../model-accessors/type-guards.js";

import { isEditableModel } from "./types.js";
import type { ReconcileContext } from "./types.js";

/**
 * A single model reference entry with stable key order.
 */
interface ModelReference {
	readonly purpose?: string;
	readonly modelType: string;
	readonly alias?: string;
	readonly reference: string;
}

/**
 * Relationship-ui component property names that carry model references.
 */
type RuMComponentStringField =
	| "availableItemsOverviewModel"
	| "selectedItemsOverviewModel"
	| "availableItemsQueryModel"
	| "selectedItemQueryModel"
	| "linkFormModel"
	| "componentType";

/**
 * Relationship-ui edit configuration property names that carry model references.
 */
type RuMEditConfigurationStringField = "availableItemsOverviewModel" | "selectedItemsOverviewModel";

/**
 * Post-content reconciliation pass: derives `header.modelReferences` from model
 * content for every model in the extraction state.
 *
 * This is the single authoritative source for all `modelReferences` in the
 * pipeline output. All prior phases (P1–P4) produce correct **content** only;
 * this pass builds refs from that content deterministically.
 *
 * Derivation rules per model type:
 * - `relationship-ui`: derived from `content.component` fields (overview/query refs)
 * - `overview`: query-model-for-overview ref if a generated query model exists;
 *   otherwise document-model-for-overview ref if document model exists (mutually exclusive)
 * - `query`: derived from `content.targetDocumentModel` and `content.links[0].relationshipModel`
 * - `form`: scans elements for RuM references; preserves pre-existing non-RE refs
 *
 * Mutates models in-place within the state via `state.put()`.
 *
 * @param state - The extraction state containing all output models.
 * @param context - Pipeline context with overview→doc map and query model ID set.
 */
export function reconcileAllModelReferences(state: ExtractionState, context: ReconcileContext): void {
	for (const [id, model] of state.models) {
		const header = getHeader(model);

		if (!header || header.modelType === undefined) {
			continue;
		}

		let newRefs: ModelReference[];

		switch (header.modelType) {
			case "relationship-ui":
				if (!isRelationshipUiModel(model)) {
					continue;
				}

				newRefs = deriveRuMRefs(model.content);
				break;

			case "overview":
				newRefs = deriveOverviewRefs(id, context);
				break;

			case "query":
				if (!isQueryModel(model)) {
					continue;
				}

				newRefs = deriveQueryRefs(model, readExistingRefs(model));
				break;

			case "form": {
				if (!isFormModel(model)) {
					continue;
				}

				const existingRefs = readExistingRefs(model);
				newRefs = deriveFormRefs(model.content, existingRefs);
				break;
			}

			default:
				continue;
		}

		state.put(withModelReferences(model, newRefs));
	}
}

/**
 * Derives `modelReferences` for a `relationship-ui` model from its content.
 *
 * Rules:
 * - DropDownSelection: selectedItems/availableItems overview refs (if present)
 *   + availableItemsQueryModel + selectedItemQueryModel → query refs
 * - DualPaneSelection / TableList: selectedItemsOverviewModel first,
 *   then availableItemsOverviewModel + linkFormModel +
 *   editConfiguration.availableItemsOverviewModel +
 *   editConfiguration.selectedItemsOverviewModel → overview/form refs
 * - Only includes entries where the field is non-empty/defined.
 * - Deduplicates by (purpose + modelType + reference).
 */
function deriveRuMRefs(content: RelationshipUiModel["content"]): ModelReference[] {
	const component = content.component;
	const refs: ModelReference[] = [];
	const componentType = readRuMComponentField(component, "componentType");

	if (componentType === "DropDownSelection") {
		// Overview refs — availableItems first, then selectedItems
		const availableOverview = readRuMComponentField(component, "availableItemsOverviewModel");

		if (availableOverview !== undefined && availableOverview.length > 0) {
			refs.push({ purpose: "availableItems", modelType: "overview", reference: availableOverview });
		}

		const selectedOverview = readRuMComponentField(component, "selectedItemsOverviewModel");

		if (selectedOverview !== undefined && selectedOverview.length > 0) {
			refs.push({ purpose: "selectedItems", modelType: "overview", reference: selectedOverview });
		}

		// Query refs
		const availableQuery = readRuMComponentField(component, "availableItemsQueryModel");

		if (availableQuery !== undefined && availableQuery.length > 0) {
			refs.push({ purpose: "availableItemsQuery", modelType: "query", reference: availableQuery });
		}

		const selectedQuery = readRuMComponentField(component, "selectedItemQueryModel");

		if (selectedQuery !== undefined && selectedQuery.length > 0) {
			refs.push({ purpose: "selectedItemQuery", modelType: "query", reference: selectedQuery });
		}

		// linkFormModel — DropDownSelection can also have a link form
		const linkForm = readRuMComponentField(component, "linkFormModel");

		if (linkForm !== undefined && linkForm.length > 0) {
			refs.push({ purpose: "link", modelType: "form", reference: linkForm });
		}
	} else {
		// DualPaneSelection and TableList — availableItems first, then selectedItems
		const availableOverview = readRuMComponentField(component, "availableItemsOverviewModel");

		if (availableOverview !== undefined && availableOverview.length > 0) {
			refs.push({ purpose: "availableItems", modelType: "overview", reference: availableOverview });
		}

		const selectedOverview = readRuMComponentField(component, "selectedItemsOverviewModel");

		if (selectedOverview !== undefined && selectedOverview.length > 0) {
			refs.push({ purpose: "selectedItems", modelType: "overview", reference: selectedOverview });
		}

		const linkForm = readRuMComponentField(component, "linkFormModel");

		if (linkForm !== undefined && linkForm.length > 0) {
			refs.push({ purpose: "link", modelType: "form", reference: linkForm });
		}

		const editConfig = readRuMEditConfig(component);

		if (editConfig !== undefined) {
			const editAvailable = readRuMEditConfigStringField(editConfig, "availableItemsOverviewModel");

			if (editAvailable !== undefined && editAvailable.length > 0) {
				refs.push({ purpose: "availableItemsInEditModal", modelType: "overview", reference: editAvailable });
			}

			const editSelected = readRuMEditConfigStringField(editConfig, "selectedItemsOverviewModel");

			if (editSelected !== undefined && editSelected.length > 0) {
				refs.push({ purpose: "selectedItemsInEditModal", modelType: "overview", reference: editSelected });
			}
		}
	}

	return deduplicateRefs(refs);
}

/**
 * Reads a string-valued component field when present; returns `undefined` otherwise.
 */
function readRuMComponentField(component: unknown, field: RuMComponentStringField): string | undefined {
	if (component === null || typeof component !== "object" || Array.isArray(component)) {
		return undefined;
	}

	const value = Reflect.get(component, field);

	return typeof value === "string" ? value : undefined;
}

/**
 * Reads the `editConfiguration` object from a Relationship UI component.
 */
function readRuMEditConfig(component: unknown): unknown {
	if (component === null || typeof component !== "object" || Array.isArray(component)) {
		return undefined;
	}

	return Reflect.get(component, "editConfiguration");
}

/**
 * Reads a string-valued field from a Relationship UI edit configuration.
 */
function readRuMEditConfigStringField(editConfig: unknown, field: RuMEditConfigurationStringField): string | undefined {
	if (editConfig === null || typeof editConfig !== "object" || Array.isArray(editConfig)) {
		return undefined;
	}

	const value = Reflect.get(editConfig, field);

	return typeof value === "string" ? value : undefined;
}

/**
 * Derives `modelReferences` for an `overview` model using pipeline context.
 *
 * Rules (mutually exclusive):
 * - `--Role` role-based clones (IDs containing "--") always get
 *   `document-model-for-overview` — they are base-type overviews, not
 *   query-backed clones.
 * - Otherwise, first checks for a generated query model with ID pattern
 *   `<overviewId>-query`, `-new-query`, `-edit-query`, or `-available-query`.
 *   If found → *only* emits a `query-model-for-overview` ref (no document ref).
 * - If no query model exists, looks up the document model in
 *   `overviewDocModelMap`. If found → emits `document-model-for-overview`.
 * - If neither exists → emits nothing.
 */
function deriveOverviewRefs(overviewId: string, context: ReconcileContext): ModelReference[] {
	const refs: ModelReference[] = [];
	const existingQueryRef = context.existingOverviewQueryRefs.get(overviewId);

	if (existingQueryRef !== undefined && existingQueryRef.length > 0) {
		refs.push({ purpose: "query-model-for-overview", modelType: "query", reference: existingQueryRef });

		return refs;
	}

	// Candidate -new clones use query-model-for-overview (same as SelectedItems -new).
	// No --Role clones exist — all candidate clones use -new convention.
	// Check for generated query models by convention — query wins over document.
	//
	// Suffix semantics:
	//   -query           → base overview query (including keepModels edit clones
	//                      that intentionally share the source overview query)
	//   -new-query       → candidate/new-clone query
	//   -available-query → candidate/available-items overview query
	const queryIdsToCheck = overviewId.endsWith(EDIT_CLONE_SUFFIX)
		? [
				`${overviewId.slice(0, -EDIT_CLONE_SUFFIX.length)}-query`,
				`${overviewId.slice(0, -EDIT_CLONE_SUFFIX.length)}-new-query`
			]
		: [`${overviewId}-query`, `${overviewId}-available-query`];

	for (const queryId of queryIdsToCheck) {
		if (context.generatedQueryModelIds.has(queryId)) {
			refs.push({ purpose: "query-model-for-overview", modelType: "query", reference: queryId });

			return refs; // Query model takes priority — no document ref
		}
	}

	// No query model found — fall back to document model if available
	const docModelId = context.overviewDocModelMap.get(overviewId);

	if (docModelId !== undefined && docModelId.length > 0) {
		refs.push({ purpose: "document-model-for-overview", modelType: "document", alias: "DM", reference: docModelId });
	}

	return refs;
}

/**
 * Derives `modelReferences` for a `query` model from its content.
 *
 * Rules:
 * - `content.targetDocumentModel` → `{ purpose: "document-model-for-query", modelType: "document" }`
 * - `content.links[0].relationshipModel` → `{ purpose: "relationship-model-for-query", modelType: "relationship" }`
 * - if `links` is absent/empty or `links[0]` has no relationship model, preserve an
 *   existing `relationship-model-for-query` header ref for linkless regenerated dropdown queries
 */
function deriveQueryRefs(queryModel: QueryModel, existingRefs: readonly ModelReference[]): ModelReference[] {
	const refs: ModelReference[] = [];

	const targetDocumentModel = queryModel.content.targetDocumentModel;

	if (typeof targetDocumentModel === "string" && targetDocumentModel.length > 0) {
		refs.push({
			purpose: "document-model-for-query",
			modelType: "document",
			alias: "DM",
			reference: targetDocumentModel
		});
	}

	const relationshipModelReference = getRelationshipModelReferenceFromQueryContent(queryModel);

	if (relationshipModelReference !== undefined) {
		refs.push(relationshipModelReference);

		return refs;
	}

	const existingRelationshipModelReference = existingRefs.find(
		(ref) => ref.purpose === "relationship-model-for-query" && ref.modelType === "relationship"
	);

	if (existingRelationshipModelReference !== undefined) {
		refs.push({
			purpose: "relationship-model-for-query",
			modelType: "relationship",
			alias: "RM",
			reference: existingRelationshipModelReference.reference
		});
	}

	return refs;
}

function getRelationshipModelReferenceFromQueryContent(queryModel: QueryModel): ModelReference | undefined {
	const relationshipModel = queryModel.content.links?.[0]?.relationshipModel;

	if (typeof relationshipModel !== "string" || relationshipModel.length === 0) {
		return undefined;
	}

	return {
		purpose: "relationship-model-for-query",
		modelType: "relationship",
		alias: "RM",
		reference: relationshipModel
	};
}

/**
 * Annotation name used to store a RuM reference on DetachedRepeat elements.
 */
const RUM_REFERENCE_ANNOTATION = "a12-relationship-ui-model-reference";

/**
 * Collects all relationship-ui refs from form content by traversing elements.
 *
 * Handles:
 * - CustomScreenElement with `reference` (flat property per A12 Referencing) → relationship-ui ref
 * - DetachedRepeat (or other elements) with annotation `a12-relationship-ui-model-reference` → relationship-ui ref
 *
 * @param elements - Form elements to traverse.
 * @param collected - Accumulator for discovered refs.
 */
function collectRuMRefsFromScreenElements(elements: readonly FormModel.ScreenElement[], collected: Set<string>): void {
	for (const element of elements) {
		switch (element.type) {
			case "CustomScreenElement": {
				const reference = element.reference;

				if (reference !== undefined && reference.length > 0) {
					collected.add(reference);
				}

				break;
			}

			case "Section":
			case "MultiColumnSection":
				if (element.screenElements !== undefined) {
					collectRuMRefsFromScreenElements(element.screenElements, collected);
				}

				break;

			case "DetachedRepeat": {
				const annotation = element.annotations?.find(({ name }) => name === RUM_REFERENCE_ANNOTATION);

				if (annotation?.value !== undefined && annotation.value.length > 0) {
					collected.add(annotation.value);
				}

				collectRuMRefsFromScreenElements(element.detailScreen.screenElements, collected);
				break;
			}

			case "ControlGrid":
			case "ButtonPanel":
			case "InlineRepeat":
			case "EmbeddedRepeat":
				break;
		}
	}
}

/**
 * Derives the `relationship-ui` model references for a `form` model.
 *
 * Traverses form content elements to find RuM references, then merges with
 * pre-existing refs that do NOT have purpose `"relationship-ui"` (those are
 * preserved as-is).
 *
 * @param content - Form model content.
 * @param existingRefs - Pre-existing header.modelReferences from the form model.
 * @returns Updated model references: pre-existing non-RE refs + newly derived RE refs.
 */
function deriveFormRefs(content: FormModel["content"], existingRefs: readonly ModelReference[]): ModelReference[] {
	const ruMIds = new Set<string>();

	for (const screen of content.screens) {
		collectRuMRefsFromScreenElements(screen.screenElements, ruMIds);
	}

	// Merge pre-existing relationship-ui ref IDs into the collected set.
	// P4 (updateFormModel) may have already set correct refs that element
	// traversal cannot recover (e.g., element lookup failures are silent).
	// By preserving them here we ensure they survive the reconcile pass.
	for (const ref of existingRefs) {
		if (ref.purpose === "relationship-ui") {
			ruMIds.add(ref.reference);
		}
	}

	// Preserve pre-existing refs that are NOT purpose "relationship-ui"
	const preservedRefs = existingRefs.filter((ref) => ref.purpose !== "relationship-ui");

	// Build merged relationship-ui refs (stable key order)
	const newRuMRefs: ModelReference[] = [];

	for (const id of ruMIds) {
		newRuMRefs.push({ purpose: "relationship-ui", modelType: "relationship-ui", reference: id });
	}

	return [...preservedRefs, ...newRuMRefs];
}

/**
 * Deduplicates model references by (purpose, modelType, reference) triple.
 * Preserves insertion order of first occurrence.
 */
function deduplicateRefs(refs: ModelReference[]): ModelReference[] {
	const seen = new Set<string>();
	const result: ModelReference[] = [];

	for (const ref of refs) {
		const key = `${ref.purpose}|${ref.modelType}|${ref.reference}`;

		if (!seen.has(key)) {
			seen.add(key);
			result.push(ref);
		}
	}

	return result;
}

/**
 * Reads header.modelReferences from a raw model object.
 */
function readExistingRefs(model: object): ModelReference[] {
	const refs = getHeader(model)?.modelReferences;

	return refs !== undefined ? [...refs] : [];
}

/**
 * Writes a new modelReferences array onto a model (returns a new model object).
 *
 * Header key order: id, modelType, modelVersion, annotations, modelReferences.
 * This preserves existing header fields while replacing modelReferences.
 */
function withModelReferences(model: object, refs: ModelReference[]): object {
	if (!isEditableModel(model)) {
		return {
			header: { modelReferences: refs }
		};
	}

	const existingHeader = model.header;

	if (typeof existingHeader !== "object" || existingHeader === null) {
		return {
			...model,
			header: { modelReferences: refs }
		};
	}

	return {
		...model,
		header: {
			...existingHeader,
			modelReferences: refs
		}
	};
}

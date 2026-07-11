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

import type { RelationshipUiModel } from "../relationship-ui-model.js";
import type { OverviewModel } from "../../../../models/overview-model.js";

import { getHeader } from "./model-accessors/header-accessors.js";
import { isOverviewModel, isRelationshipUiModel } from "./model-accessors/type-guards.js";
import type {
	Mutable,
	FinalRuM,
	PageSizeMigration,
	RowActionMigration,
	OverviewLabelMigration,
	RowActivationMigration
} from "./types.js";

/**
 * Mutable extraction state for the extraction pipeline.
 *
 * Combines pipeline tracking (from ExtractionState interface in types.ts)
 * with model storage, Immer-style draft mutations (via JSON deep clone
 * instead of `produce`), and deletion tracking (from P8 FlushState).
 *
 * Invariants:
 * - `_models.keys() ∩ _deletionIds = ∅` at all times
 * - `put(model)` clears pending deletion for that model's ID
 * - `delete(id)` removes model from _models if present
 */
export class ExtractionState {
	// ---- Model storage ----
	private readonly _models = new Map<string, object>();
	private readonly _deletionIds = new Set<string>();

	// ---- Pipeline tracking ----
	private readonly _finalModels: FinalRuM[] = [];
	private readonly _pageSizeMigrations: PageSizeMigration[] = [];
	private readonly _rowActionMigrations: RowActionMigration[] = [];
	private readonly _rowActivationMigrations: RowActivationMigration[] = [];
	private readonly _overviewLabelMigrations: OverviewLabelMigration[] = [];
	private readonly _queryModelIds: string[] = [];
	private readonly _overviewModelIds: string[] = [];
	private readonly _processedElementIds: string[] = [];
	private readonly _processedFormModelIds: string[] = [];
	private _hasFatalError = false;
	private readonly _errors: string[] = [];

	// -----------------------------------------------------------------------
	// Pipeline tracking getters (implements ExtractionState interface)
	// -----------------------------------------------------------------------

	get finalModels(): readonly FinalRuM[] {
		return this._finalModels;
	}

	get pageSizeMigrations(): readonly PageSizeMigration[] {
		return this._pageSizeMigrations;
	}

	get rowActionMigrations(): readonly RowActionMigration[] {
		return this._rowActionMigrations;
	}

	get rowActivationMigrations(): readonly RowActivationMigration[] {
		return this._rowActivationMigrations;
	}

	get overviewLabelMigrations(): readonly OverviewLabelMigration[] {
		return this._overviewLabelMigrations;
	}

	get queryModelIds(): readonly string[] {
		return this._queryModelIds;
	}

	get overviewModelIds(): readonly string[] {
		return this._overviewModelIds;
	}

	get processedElementIds(): readonly string[] {
		return this._processedElementIds;
	}

	get processedFormModelIds(): readonly string[] {
		return this._processedFormModelIds;
	}

	get hasFatalError(): boolean {
		return this._hasFatalError;
	}

	get errors(): readonly string[] {
		return this._errors;
	}

	// -----------------------------------------------------------------------
	// Pipeline tracking mutators
	// -----------------------------------------------------------------------

	addFinalModel(model: FinalRuM): void {
		this._finalModels.push(model);
	}

	addPageSizeMigration(migration: PageSizeMigration): void {
		this._pageSizeMigrations.push(migration);
	}

	addRowActionMigration(migration: RowActionMigration): void {
		this._rowActionMigrations.push(migration);
	}

	addRowActivationMigration(migration: RowActivationMigration): void {
		this._rowActivationMigrations.push(migration);
	}

	addOverviewLabelMigration(migration: OverviewLabelMigration): void {
		this._overviewLabelMigrations.push(migration);
	}

	addQueryModelId(id: string): void {
		this._queryModelIds.push(id);
	}

	addOverviewModelId(id: string): void {
		this._overviewModelIds.push(id);
	}

	addProcessedElementId(id: string): void {
		this._processedElementIds.push(id);
	}

	addProcessedFormModelId(id: string): void {
		this._processedFormModelIds.push(id);
	}

	setHasFatalError(value: boolean): void {
		this._hasFatalError = value;
	}

	addError(error: string): void {
		this._errors.push(error);
	}

	// -----------------------------------------------------------------------
	// Model storage methods (P4/P5/P8 state helpers + FlushState)
	// -----------------------------------------------------------------------

	/**
	 * Stores a model keyed by its header.id.
	 * Clears any pending deletion for this ID.
	 *
	 * @param model - The model object to store. Must have a `header.id` property.
	 */
	put(model: object): void {
		const header = getHeader(model);

		if (!header) {
			throw new Error("Model is missing a header — cannot extract modelReferences or modelType");
		}

		const id = header.id;

		if (id.length === 0) {
			throw new Error("Cannot put model without a non-empty header.id");
		}

		this._models.set(id, model);

		// Invariant: put clears pending deletion
		this._deletionIds.delete(id);
	}

	/**
	 * Immer-style draft mutation for a RelationshipUiModel already in state.
	 *
	 * Deep clones the model via JSON round-trip, applies the recipe to the
	 * mutable draft, then stores the result. This is functionally equivalent
	 * to `produce(model, recipe)` from immer.
	 *
	 * @param id - The model header.id.
	 * @param recipe - A function that mutates a draft of the model in place.
	 */
	draftRuM(id: string, recipe: (draft: Mutable<RelationshipUiModel>) => void): void {
		const model = this._models.get(id);

		if (model === undefined) {
			throw new Error(`Cannot draft RelationshipUiModel "${id}": not found in state`);
		}

		// JSON round-trip deep clone (sanctioned for draft mutation)
		const draft = createRelationshipUiDraft(model, id);

		recipe(draft);

		this._models.set(id, draft);
	}

	/**
	 * Immer-style draft mutation for an overview model already in state.
	 *
	 * Deep clones the model via JSON round-trip, applies the recipe to the
	 * mutable draft, then stores the result. This is functionally equivalent
	 * to `produce(model, recipe)` from immer.
	 *
	 * @param id - The model header.id.
	 * @param recipe - A function that mutates a draft of the model in place.
	 */
	draftOM(id: string, recipe: (draft: Mutable<OverviewModel>) => void): void {
		const model = this._models.get(id);

		if (model === undefined) {
			throw new Error(`Cannot draft OverviewModel "${id}": not found in state`);
		}

		// JSON round-trip deep clone (sanctioned for draft mutation)
		const draft = createOverviewDraft(model, id);

		recipe(draft);

		this._models.set(id, draft);
	}

	/**
	 * Marks a model for deletion. Removes from _models if present.
	 *
	 * Invariant: after delete(), `_models.keys() ∩ _deletionIds = ∅`
	 * because delete() removes the model from _models.
	 *
	 * @param id - The model header.id to mark for deletion.
	 */
	delete(id: string): void {
		this._models.delete(id);
		this._deletionIds.add(id);
	}

	/**
	 * Retrieves a stored model by ID, or undefined if absent.
	 *
	 * @param id - The model header.id.
	 * @returns The stored model, or undefined.
	 */
	get(id: string): object | undefined {
		return this._models.get(id);
	}

	/**
	 * Returns true if a model with the given ID is currently stored.
	 *
	 * @param id - The model header.id.
	 * @returns True if the model exists in state.
	 */
	has(id: string): boolean {
		return this._models.has(id);
	}

	/** All accumulated models, keyed by model header.id. */
	get models(): ReadonlyMap<string, object> {
		return this._models;
	}

	/** IDs queued for deletion at flush time. */
	get deletionIds(): ReadonlySet<string> {
		return this._deletionIds;
	}
}

/**
 * Creates a mutable `RelationshipUiModel` draft via JSON clone and validates
 * the cloned payload before mutation.
 *
 * The round-trip clone can normalize non-serializable values; if that
 * process corrupts the model shape, the draft path now fails explicitly.
 *
 * @param model - The source model from state.
 * @param id - The model header.id used for diagnostics.
 * @returns A mutable draft model.
 */
function createRelationshipUiDraft(model: object, id: string): Mutable<RelationshipUiModel> {
	const cloned = JSON.parse(JSON.stringify(model));

	if (!isValidRelationshipUiModelDraft(cloned)) {
		throw new Error(`Cannot draft RelationshipUiModel "${id}": malformed JSON clone`);
	}

	return cloned as Mutable<RelationshipUiModel>;
}

/**
 * Creates a mutable `OverviewModel` draft via JSON clone and validates
 * the cloned payload before mutation.
 *
 * The round-trip clone can normalize non-serializable values; if that
 * process corrupts the model shape, the draft path now fails explicitly.
 *
 * @param model - The source model from state.
 * @param id - The model header.id used for diagnostics.
 * @returns A mutable draft model.
 */
function createOverviewDraft(model: object, id: string): Mutable<OverviewModel> {
	const cloned = JSON.parse(JSON.stringify(model));

	if (!isValidOverviewModelDraft(cloned)) {
		throw new Error(`Cannot draft OverviewModel "${id}": malformed JSON clone`);
	}

	return cloned as Mutable<OverviewModel>;
}

/**
 * Checks the cloned payload is still a RelationshipUiModel after JSON
 * round-trip, using the domain guard instead of a structural fallback.
 */
function isValidRelationshipUiModelDraft(value: unknown): value is RelationshipUiModel {
	return typeof value === "object" && value !== null && isRelationshipUiModel(value);
}

/**
 * Checks the cloned payload is still an OverviewModel after JSON round-trip,
 * using the domain guard instead of a structural fallback.
 */
function isValidOverviewModelDraft(value: unknown): value is OverviewModel {
	return typeof value === "object" && value !== null && isOverviewModel(value);
}

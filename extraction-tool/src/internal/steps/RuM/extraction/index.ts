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

import type {
	GenericModel,
	WorkspaceModel,
	MigrationStepContext
} from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import type { RelationshipUiModel } from "../relationship-ui-model.js";

import { ExtractionState } from "./extraction-state.js";
import { readConfigFlags } from "./extraction-config.js";
import { flushState } from "./phase-8-write-flush/index.js";
import { isFormModel } from "./model-accessors/type-guards.js";
import { enrichBindings } from "./phase-2-binding-enrichment/index.js";
import { decorateOverviews } from "./phase-4-overview-decoration/index.js";
import { extractBindingModels } from "./phase-1-binding-extraction/index.js";
import { remapOverviewRefsInBindings } from "./phase-5-reference-remapping/index.js";
import { requireWorkspaceModel } from "./model-accessors/workspace-model-resolver.js";
import type { OverviewDecorationContext } from "./phase-4-overview-decoration/index.js";
import { getOrComputeWorkspaceFormSpan } from "./phase-8-write-flush/workspace-span-check.js";
import type { FinalRuM, BindingResult, PipelineContext, BindingMigrations } from "./types.js";
import { updateFormModel, restoreElementReferences } from "./phase-6-form-model-update/index.js";
import type { EnrichmentContext, FinalRuM as P2FinalRuM } from "./phase-2-binding-enrichment/index.js";
import { type ReconcileContext, reconcileAllModelReferences } from "./phase-7-model-reconciliation/index.js";
import {
	getHeader,
	getModelReferences,
	findAnnotationByName,
	extractRolesAnnotation,
	getDirectDocumentReference
} from "./model-accessors/header-accessors.js";
import {
	ensureOverviewInState,
	buildOverviewStructure,
	remapPageSizeMigrations,
	remapRowActionMigrations,
	buildOverviewLabelRegistry,
	remapOverviewLabelMigrations,
	remapRowActivationMigrations,
	type OverviewStructureResult,
	type OverviewStructureContext,
	collectExistingOverviewIdsForRemap,
	generateRegistryFallbackMigrations,
	buildGlobalCandidateRelationshipMap,
	remapTableListEditSelectedOverviewRefs,
	remapNonKeepModelsCandidateAvailableOverviewRefs
} from "./phase-3-overview-structure/index.js";

export { extractionIsMigrated } from "./extraction-config.js";

function getP2BindingMigrations(binding: BindingResult): BindingMigrations {
	return (
		binding.migrations ?? {
			addButtonLabel: undefined,
			editButtonLabel: undefined,
			pageSizes: binding.pageSizeMigrations,
			rowActions: binding.rowActionMigrations,
			rowActivations: binding.rowActivationMigrations,
			pageSizeMigrations: binding.pageSizeMigrations,
			rowActionMigrations: binding.rowActionMigrations,
			rowActivationMigrations: binding.rowActivationMigrations,
			overviewLabelMigrations: binding.overviewLabelMigrations,
			modificationConfigFlags: {
				extendParentActivityDescriptor: false
			}
		}
	);
}

function getP2BindingModel(binding: BindingResult): RelationshipUiModel {
	return binding.relationshipUiModel ?? binding.ruModel;
}

function getP2BindingRelationshipName(binding: BindingResult): string {
	return binding.relationshipName ?? binding.ruModel.content.relationshipName;
}

function readWorkspaceModels(ctx: MigrationStepContext | undefined): readonly WorkspaceModel[] {
	const workspace = ctx?.workspace;
	const models = workspace?.models;

	return Array.isArray(models) ? models : [];
}

function buildOverviewDocModelMap(state: ExtractionState): ReadonlyMap<string, string> {
	const overviewDocModelMap = new Map<string, string>();

	for (const [modelId, model] of state.models) {
		const header = getHeader(model);

		if (header?.modelType !== "overview") {
			continue;
		}

		const documentReference = getModelReferences(model).find(
			(reference) => reference.purpose === "document-model-for-overview" && typeof reference.reference === "string"
		)?.reference;

		if (documentReference !== undefined) {
			overviewDocModelMap.set(modelId, documentReference);
		}
	}

	return overviewDocModelMap;
}

function buildExistingOverviewQueryRefs(state: ExtractionState): ReadonlyMap<string, string> {
	const existingOverviewQueryRefs = new Map<string, string>();

	for (const [modelId, model] of state.models) {
		const header = getHeader(model);

		if (header?.modelType !== "overview") {
			continue;
		}

		const queryReference = getModelReferences(model).find(
			(reference) => reference.purpose === "query-model-for-overview" && typeof reference.reference === "string"
		)?.reference;

		if (queryReference !== undefined) {
			existingOverviewQueryRefs.set(modelId, queryReference);
		}
	}

	return existingOverviewQueryRefs;
}

function detectCdmSourceDocument(formModel: object, resolveModel: (modelId: string) => object | undefined): boolean {
	const sourceDocumentModelId = getDirectDocumentReference(formModel);

	if (sourceDocumentModelId === undefined) {
		return false;
	}

	const sourceDocumentModel = requireWorkspaceModel(sourceDocumentModelId, resolveModel);

	return findAnnotationByName(sourceDocumentModel, "cdm.queryRoot") !== undefined;
}

/**
 * Main extraction transform — orchestrates the full P1→P8 pipeline.
 *
 * Pipeline:
 *   P1: extractBindingModels → BindingResult[] + elementBindingMap
 *   P2: enrichBindings → FinalRuM[]
 *   P3: buildOverviewStructure → OverviewStructureResult
 *   P4: decorateOverviews → mutations on state
 *   P5: (conditional) remapOverviewRefsInBindings
 *   P6: updateFormModel + restoreElementReferences → updated form model
 *   P7: reconcileAllModelReferences → model reference normalization
 *   P8: flushState → writes to migration context
 *
 * @param model - The form model to process.
 * @param logger - Logger for pipeline progress and errors.
 * @param context - Optional migration step context.
 * @returns The updated form model with modelReferences for relationship UI models.
 */
export function extractionTransform(
	model: GenericModel,
	logger: { log: (s: string) => void; info: (s: string) => void; error: (s: string) => void },
	context?: MigrationStepContext
): GenericModel {
	const formModelId = getHeader(model)?.id ?? "unknown";
	const config = readConfigFlags(context);

	logger.info(`Starting extraction pipeline for form model "${formModelId}"`);

	// -------------------------------------------------------------------
	// Create PipelineContext for P1
	// -------------------------------------------------------------------
	const emptyMigrations: BindingMigrations = {
		pageSizeMigrations: [],
		rowActionMigrations: [],
		rowActivationMigrations: [],
		overviewLabelMigrations: []
	};

	const rolesAnnotations = extractRolesAnnotation(model);
	const pipelineContext: PipelineContext = {
		formModel: model,
		formModelId,

		bindings: [],
		migrations: emptyMigrations,
		keepModels: config.keepModels,
		rolesAnnotations
	};

	// Create extraction state
	const state = new ExtractionState();

	// -------------------------------------------------------------------
	// P1: Extract binding models
	// -------------------------------------------------------------------
	logger.info("Phase 1: Extracting binding models");

	const { bindings: p2Bindings, p1Bindings, elementBindingMap } = extractBindingModels(model, pipelineContext);

	if (p2Bindings.length === 0) {
		logger.info(`No bindings found in form model "${formModelId}" — returning unchanged`);

		return model;
	}

	logger.info(`Extracted ${p2Bindings.length} binding(s) from form model "${formModelId}"`);

	// -------------------------------------------------------------------
	// P2: Enrich bindings
	// -------------------------------------------------------------------
	logger.info("Phase 2: Enriching bindings");

	// Create EnrichmentContext with model resolution from state then workspace
	const enrichmentContext: EnrichmentContext = {
		rolesAnnotations,
		resolveModel: (modelId: string): object | undefined => {
			// 1. Check local state (models already created during this run)
			const fromState = state.get(modelId);

			if (fromState !== undefined) {
				return fromState;
			}

			// 2. Fall back to workspace resolution
			if (context !== undefined) {
				const wsModel = context.findModel(modelId);

				if (wsModel !== undefined) {
					return context.resolveModel(wsModel);
				}
			}

			return undefined;
		}
	};

	const finalRuMs: readonly P2FinalRuM[] = enrichBindings(p2Bindings, enrichmentContext);

	logger.info(`Enriched ${finalRuMs.length} binding(s)`);

	// Put RuM models into state
	for (const finalRuM of finalRuMs) {
		state.put(finalRuM.rumModel);
		state.addFinalModel({
			model: finalRuM.rumModel,
			elementId: finalRuM.elementId,
			formModelId
		});
	}

	// Put additional query models into state
	for (const finalRuM of finalRuMs) {
		for (const queryModel of finalRuM.additionalQueryModels) {
			state.put(queryModel);
			state.addQueryModelId(queryModel.header.id);
		}
	}

	// -------------------------------------------------------------------
	// P3: Build overview structure
	// -------------------------------------------------------------------
	logger.info("Phase 3: Build overview structure");

	const workspaceModels = readWorkspaceModels(context);
	const globalCandidateRelMap = buildGlobalCandidateRelationshipMap(workspaceModels);

	const p3aContext: OverviewStructureContext = {
		resolveModel: (modelId: string): object | undefined => {
			// 1. Check local state (models already created during this run)
			const fromState = state.get(modelId);

			if (fromState !== undefined) {
				return fromState;
			}

			// 2. Fall back to workspace resolution
			if (context !== undefined) {
				const wsModel = context.findModel(modelId);

				if (wsModel !== undefined) {
					return context.resolveModel(wsModel);
				}
			}

			return undefined;
		},
		keepModels: config.keepModels,
		workspaceModels,
		globalCandidateRelMap,
		rolesAnnotations,
		formModel: model
	};

	const sourceDocumentModelId = getDirectDocumentReference(model);

	const overviewStructure: OverviewStructureResult = buildOverviewStructure(finalRuMs, {
		...p3aContext,
		sourceDocumentModelId
	});

	logger.info(
		`Built overview structure: ${overviewStructure.cloneMap.size} clone(s), ` +
			`${overviewStructure.linkQueryModels.length} link query model(s), ` +
			`${overviewStructure.candidateQueryModels.length} candidate query model(s)`
	);

	// Put remapped overviews into state
	for (const [overviewId, overviewModel] of overviewStructure.remappedOverviews) {
		state.put(overviewModel);
		state.addOverviewModelId(overviewId);
	}

	// Put generated link/candidate query models into state
	for (const linkQuery of overviewStructure.linkQueryModels) {
		state.put(linkQuery);
		state.addQueryModelId(linkQuery.header.id);
	}

	for (const candidateQuery of overviewStructure.candidateQueryModels) {
		state.put(candidateQuery);
		state.addQueryModelId(candidateQuery.header.id);
	}

	for (const deletionId of overviewStructure.deletionList) {
		state.delete(deletionId);
	}

	remapTableListEditSelectedOverviewRefs(finalRuMs, overviewStructure.cloneMap, state);

	const existingOverviewIdsForRowActionRemap = collectExistingOverviewIdsForRemap(overviewStructure, state);

	if (!config.keepModels) {
		remapNonKeepModelsCandidateAvailableOverviewRefs(
			finalRuMs,
			overviewStructure,
			existingOverviewIdsForRowActionRemap,
			state
		);
	}

	// Phase 4 prepass: build cross-binding explicit-label registry from all pane-label migrations.
	// First-writer wins; stable order is guaranteed by form-model binding declaration order.
	const overviewLabelRegistry = buildOverviewLabelRegistry(
		p2Bindings.flatMap((b) => getP2BindingMigrations(b).overviewLabelMigrations)
	);

	for (const p2Binding of p2Bindings) {
		const p2BindingModel = getP2BindingModel(p2Binding);
		const p2BindingMigrations = getP2BindingMigrations(p2Binding);
		const componentType = p2BindingModel.content.component?.componentType;
		const relationshipName = getP2BindingRelationshipName(p2Binding);

		if (componentType === "DropDownSelection") {
			continue;
		}

		for (const migration of remapPageSizeMigrations(
			p2BindingMigrations.pageSizes ?? [],
			relationshipName,
			overviewStructure.cloneMap,
			overviewStructure.multiContextRemap
		)) {
			ensureOverviewInState(migration.overviewModelId, state, context);
			state.addPageSizeMigration(migration);
		}

		// Phase 4: Expand explicit overview-label migrations per cloneTargets
		for (const migration of remapOverviewLabelMigrations(
			p2BindingMigrations.overviewLabelMigrations,
			relationshipName,
			overviewStructure.cloneMap,
			overviewStructure.multiContextRemap,
			config.keepModels,
			existingOverviewIdsForRowActionRemap
		)) {
			ensureOverviewInState(migration.overviewModelId, state, context);
			state.addOverviewLabelMigration(migration);
		}

		// Phase 4: Registry fallback migrations for overviews not covered by explicit migrations
		for (const migration of generateRegistryFallbackMigrations(
			p2BindingMigrations.overviewLabelMigrations,
			p2BindingModel.content.component,
			relationshipName,
			overviewLabelRegistry,
			overviewStructure.cloneMap,
			overviewStructure.multiContextRemap,
			config.keepModels,
			existingOverviewIdsForRowActionRemap
		)) {
			if (overviewStructure.tableListDirectSelectedOverviewIds.has(migration.overviewModelId)) {
				continue;
			}

			ensureOverviewInState(migration.overviewModelId, state, context);
			state.addOverviewLabelMigration(migration);
		}

		for (const migration of remapRowActionMigrations(
			p2BindingMigrations.rowActions ?? [],
			relationshipName,
			componentType,
			overviewStructure.cloneMap,
			overviewStructure.multiContextRemap,
			config.keepModels,
			existingOverviewIdsForRowActionRemap
		)) {
			ensureOverviewInState(migration.overviewModelId, state, context);
			state.addRowActionMigration(migration);
		}

		for (const migration of remapRowActivationMigrations(
			p2BindingMigrations.rowActivations ?? [],
			relationshipName,
			componentType,
			overviewStructure.cloneMap,
			overviewStructure.multiContextRemap,
			config.keepModels,
			existingOverviewIdsForRowActionRemap,
			(overviewId: string) =>
				existingOverviewIdsForRowActionRemap.has(overviewId) ||
				state.has(overviewId) ||
				context?.findModel(overviewId) !== undefined
		)) {
			ensureOverviewInState(migration.overviewModelId, state, context);
			state.addRowActivationMigration(migration);
		}
	}

	// -------------------------------------------------------------------
	// P4: Decorate overviews
	// -------------------------------------------------------------------
	logger.info("Phase 4: Decorating overviews");

	const isCdm = detectCdmSourceDocument(model, p3aContext.resolveModel);

	const decorationContext: OverviewDecorationContext = {
		overviewContextMap: overviewStructure.overviewContextMap,
		pageSizeMigrations: state.pageSizeMigrations,
		candidatePageSizeMap: overviewStructure.candidatePageSizeMap,
		rowActionMigrations: state.rowActionMigrations,
		rowActivationMigrations: state.rowActivationMigrations,
		overviewLabelMigrations: state.overviewLabelMigrations,
		cloneMap: overviewStructure.cloneMap,
		multiContextRemap: overviewStructure.multiContextRemap,
		tableListDirectSelectedOverviewIds: overviewStructure.tableListDirectSelectedOverviewIds,
		isCdm
	};

	decorateOverviews(decorationContext, state, finalRuMs);

	// -------------------------------------------------------------------
	// P5: (conditional) Remap overview references in bindings
	// -------------------------------------------------------------------
	if (config.keepModels) {
		logger.info("Phase 5: Remap overview references in bindings");

		// Map P2FinalRuM to FinalRuM shape for remap (structural: rumModel → model)
		const remapInput: readonly FinalRuM[] = finalRuMs.map((fr) => ({
			model: fr.rumModel,
			elementId: fr.elementId,
			formModelId
		}));

		const existingOverviewIds = collectExistingOverviewIdsForRemap(overviewStructure, state);

		const remappedRuMs = remapOverviewRefsInBindings(
			remapInput,
			overviewStructure.cloneMap,
			overviewStructure.multiContextRemap,
			existingOverviewIds
		);

		// Update state with remapped RuMs
		for (const remapped of remappedRuMs) {
			state.put(remapped.model);
		}
	}

	// -------------------------------------------------------------------
	// P6: Update form model
	// -------------------------------------------------------------------
	logger.info("Phase 6: Updating form model");

	const finalRuMsForUpdate: readonly FinalRuM[] = finalRuMs.map((fr) => ({
		model: fr.rumModel,
		elementId: fr.elementId,
		formModelId
	}));

	const updatedFormModel = updateFormModel(model, p1Bindings, finalRuMsForUpdate, {
		keepModels: config.keepModels
	});

	if (!isFormModel(updatedFormModel)) {
		throw new Error("Expected form model after updateFormModel");
	}

	// Restore element references in the form model
	const updatedFormWithRefs = restoreElementReferences(updatedFormModel, elementBindingMap);

	// Update state with the updated form model
	state.put(updatedFormWithRefs);

	// -------------------------------------------------------------------
	// P7: Reconcile all model references
	// -------------------------------------------------------------------
	logger.info("Phase 7: Reconciling model references");

	const reconcileContext: ReconcileContext = {
		overviewDocModelMap: buildOverviewDocModelMap(state),
		generatedQueryModelIds: new Set(state.queryModelIds),
		existingOverviewQueryRefs: buildExistingOverviewQueryRefs(state)
	};

	reconcileAllModelReferences(state, reconcileContext);

	// -------------------------------------------------------------------
	// P8: Flush state to migration context
	// -------------------------------------------------------------------
	if (context !== undefined) {
		logger.info("Phase 8: Flushing state to migration context");

		const formModelEntry = context.findModel(formModelId);
		const formModelFilePath = formModelEntry?.path ?? "";
		const lastSlash = formModelFilePath.lastIndexOf("/");
		const outputDir = lastSlash >= 0 ? formModelFilePath.slice(0, lastSlash) : "";

		const spansMultipleDirs = getOrComputeWorkspaceFormSpan(workspaceModels);
		const spanOptions = spansMultipleDirs ? { sharedTargetDir: "", formModelIdToPreserve: formModelId } : {};

		flushState(state, context, { keepModels: config.keepModels, outputDir, ...spanOptions });
	} else {
		logger.info("Skipping Phase 8 flush: no migration context available");
	}

	logger.info(`Extraction pipeline complete for form model "${formModelId}"`);

	return updatedFormWithRefs;
}

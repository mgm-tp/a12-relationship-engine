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
import type { GenericModel, WorkspaceModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import { MULTI_CONTEXT_SEPARATOR } from "../constants.js";
import { ModelNotFoundError } from "../model-not-found-error.js";
import type { OverviewModel } from "../../../../../models/overview-model.js";
import { replaceRolesAnnotations } from "../model-accessors/header-accessors.js";
import { isOverviewModel, isLegacyGeneratedDocumentModel } from "../model-accessors/type-guards.js";

import type { OverviewStructureFinalRuM } from "./types.js";

export type { OverviewStructureFinalRuM };
import { buildOverviewContextMap } from "./overview-context-map.js";
import { reconcileSubHeaderSlots } from "./interactive-stripper.js";
import { analyzeGeneratedDocumentModel } from "./generated-doc-analyzer.js";
import { buildGlobalCandidatePageSizeMap } from "./global-page-size-map.js";
import { shouldCloneCandidate } from "./global-candidate-relationship-map.js";
import { findGeneratedDocModelId } from "./generated-doc-overview-helpers.js";
import { remapOverviewWithGeneratedDoc } from "./generated-doc-overview-remapper.js";
import { collectOrphanSelectedOverviewDeletionIds } from "./orphan-selected-overview-cleanup.js";
import { resolveCloneId, createCleanClones, cloneOverviewModel, handleCandidateClones } from "./overview-cloner.js";
import type { QueryStrategy, OverviewContext, OverviewStructureResult, TypedGeneratedDocAnalysis } from "./types.js";
import {
	resolveQueryStrategy,
	generateCandidateQueryModel,
	generateLinkOverviewQueryModel
} from "./query-model-generator.js";
import {
	getFallbackTargetDocumentModelId,
	resolveSourceContextFromRelationship,
	resolveTargetDocumentModelIdFromRelationship
} from "./relationship-content-resolver.js";

type OverviewStructureRolesAnnotations = readonly Annotation[];

/**
 * Context for P3 overview structure analysis.
 */
export interface OverviewStructureContext {
	/** Resolves a model by its header.id. Returns undefined if not found. */
	readonly resolveModel: (modelId: string) => object | undefined;
	/** Master preservation flag for clone/deletion behavior. */
	readonly keepModels: boolean;
	/** Optional workspace models for building global candidate page size map. */
	readonly workspaceModels?: readonly WorkspaceModel[];
	/** Optional global candidate overview → relationship names map for conditional non-keepModels cloning. */
	readonly globalCandidateRelMap?: ReadonlyMap<string, ReadonlySet<string>>;
	/** Optional source document model ID for query strategy resolution. */
	readonly sourceDocumentModelId?: string;
	/** Roles annotations copied from the source form model. */
	readonly rolesAnnotations?: OverviewStructureRolesAnnotations;
	/** The form model being processed. */
	readonly formModel: GenericModel;
}

/**
 * Builds the deletion list from successfully analyzed generated document models.
 * Only includes models that are NOT kept (keepModels === false).
 */
function buildDeletionList(
	analyzedGenDocIds: readonly string[],
	orphanSelectedOverviewDeletionIds: readonly string[],
	keepModels: boolean
): readonly string[] {
	if (keepModels) {
		return [];
	}

	return [...new Set([...analyzedGenDocIds, ...orphanSelectedOverviewDeletionIds])];
}

/**
 * Resolves the relationship context for a specific overview model id.
 *
 * Rules:
 * - If the overview id encodes a relationship clone suffix (`--{relationshipName}`),
 *   return that matching context.
 * - If there is exactly one context, return it.
 * - Otherwise return undefined to avoid accidental cross-relationship routing.
 */
function resolveContextForOverviewId(
	overviewId: string,
	contexts: readonly OverviewContext[]
): OverviewContext | undefined {
	for (const overviewContext of contexts) {
		if (overviewId.includes(`${MULTI_CONTEXT_SEPARATOR}${overviewContext.relationshipName}`)) {
			return overviewContext;
		}
	}

	if (contexts.length === 1) {
		return contexts[0];
	}

	return undefined;
}

/**
 * Resolves all overview IDs that should own generated query models for this
 * overview context.
 *
 * Rules:
 * - TableList edit clones: use the base overview ID for the shared selected-items
 *   query (avoid forcing `--RelationshipName-query`).
 * - Candidate/GAP-1 multi-context overviews: generate one query per relationship
 *   clone ID (`{overview}--{Relationship}`).
 * - Default: use `resolveCloneId` for each relationship context to preserve
 *   existing clone resolution behavior.
 */
function resolveQueryOwnerOverviewIds(
	overviewId: string,
	contexts: readonly OverviewContext[],
	cloneMap: ReadonlyMap<string, string>,
	multiContextRemap: ReadonlyMap<string, ReadonlyMap<string, string>>,
	keepModels: boolean,
	globalCandidateRelMap: ReadonlyMap<string, ReadonlySet<string>> | undefined
): readonly string[] {
	const editCloneId = cloneMap.get(overviewId);

	if (editCloneId !== undefined) {
		// TableList edit + edit-pane sharing rule.
		return [overviewId];
	}

	const relToClone = multiContextRemap.get(overviewId);

	if (relToClone !== undefined) {
		const ownerIds = new Set<string>();

		for (const context of contexts) {
			const shouldCloneSingleContextCandidate =
				!context.isLinkOverview &&
				globalCandidateRelMap !== undefined &&
				shouldCloneCandidate(overviewId, globalCandidateRelMap);
			const ownerId =
				relToClone.get(context.relationshipName) ??
				resolveCloneId(
					overviewId,
					context.relationshipName,
					cloneMap,
					multiContextRemap,
					keepModels,
					shouldCloneSingleContextCandidate
				);
			ownerIds.add(ownerId);
		}

		return [...ownerIds];
	}

	const ownerIds = new Set<string>();

	if (contexts.length === 0) {
		ownerIds.add(overviewId);

		return [...ownerIds];
	}

	for (const context of contexts) {
		const shouldCloneSingleContextCandidate =
			!context.isLinkOverview &&
			globalCandidateRelMap !== undefined &&
			shouldCloneCandidate(overviewId, globalCandidateRelMap);
		ownerIds.add(
			resolveCloneId(
				overviewId,
				context.relationshipName,
				cloneMap,
				multiContextRemap,
				keepModels,
				shouldCloneSingleContextCandidate
			)
		);
	}

	return [...ownerIds];
}

function collectTableListDirectCloneSources(
	finalRuMs: readonly OverviewStructureFinalRuM[],
	keepModels: boolean
): ReadonlySet<string> {
	if (!keepModels) {
		return new Set<string>();
	}

	const sources = new Set<string>();

	for (const finalRuM of finalRuMs) {
		const component = finalRuM.rumModel.content.component;

		if (component.componentType !== "TableList") {
			continue;
		}

		const selectedOverviewId = component.selectedItemsOverviewModel;

		if (typeof selectedOverviewId === "string" && selectedOverviewId.length > 0) {
			sources.add(selectedOverviewId);
		}
	}

	return sources;
}

function withSourceFormRoles(
	overview: OverviewModel,
	rolesAnnotations: readonly Annotation[] | undefined
): OverviewModel {
	return {
		...overview,
		header: {
			...overview.header,
			annotations: replaceRolesAnnotations(overview.header.annotations, rolesAnnotations)
		}
	};
}

function cloneAsTableListDirectOverview(
	sourceOverview: OverviewModel,
	sourceOverviewId: string,
	rolesAnnotations: readonly Annotation[] | undefined
): OverviewModel {
	const tableListClone = cloneOverviewModel(sourceOverview, `${sourceOverviewId}-tableList`, true, {
		queryModelReferenceId: `${sourceOverviewId}-query`
	});
	const cloneWithRoles = withSourceFormRoles(tableListClone, rolesAnnotations);
	const rowActionGroup: OverviewModel.RowActionGroup = {};

	return {
		...cloneWithRoles,
		header: {
			...cloneWithRoles.header,
			labels: []
		},
		content: {
			...cloneWithRoles.content,
			rowActionGroup
		}
	};
}

function collectTableListDirectSelectedOverviewIds(
	finalRuMs: readonly OverviewStructureFinalRuM[],
	keepModels: boolean,
	remappedOverviewIds: ReadonlySet<string>
): ReadonlySet<string> {
	const ids = new Set<string>();

	for (const finalRuM of finalRuMs) {
		const component = finalRuM.rumModel.content.component;

		if (component.componentType !== "TableList") {
			continue;
		}

		const selectedId = component.selectedItemsOverviewModel;

		if (typeof selectedId !== "string" || selectedId.length === 0) {
			continue;
		}

		if (keepModels) {
			const tableListId = `${selectedId}-tableList`;

			if (remappedOverviewIds.has(tableListId)) {
				ids.add(tableListId);
			}
		} else {
			ids.add(selectedId);
		}
	}

	return ids;
}

/**
 * Phase 3 orchestrator: analyzes overview model structure in the context of
 * relationship bindings.
 *
 * Flow:
 * 1. Build overview context map from FinalRuM array
 * 2. Build global candidate page size map (if workspace models available)
 * 3. Handle edit clones and multi-context candidate clones
 * 4. For each overview, delegate generated-doc remapping to remapOverviewWithGeneratedDoc,
 *    or use fallback target doc resolution for plain overviews; generate query models
 * 5. Build deletion list for generated document models
 *
 * @param finalRuMs - The FinalRuM array from P2 enrichment.
 * @param context - P3 context providing model resolution and flags.
 * @returns OverviewStructureResult with clone mappings, remapped models, and
 *          generated query models.
 */
export function buildOverviewStructure(
	finalRuMs: readonly OverviewStructureFinalRuM[],
	context: OverviewStructureContext
): OverviewStructureResult {
	// Step 1: Build overview context map
	const overviewContextMap = buildOverviewContextMap(finalRuMs, context.resolveModel);

	// Step 2: Build global candidate page size map (conditional)
	const candidatePageSizeMap =
		context.workspaceModels !== undefined
			? buildGlobalCandidatePageSizeMap(context.workspaceModels)
			: new Map<string, number>();

	// Resolve overview models for clone operations
	const overviewModels = new Map<string, OverviewModel>();

	for (const [overviewId] of overviewContextMap) {
		const resolved = context.resolveModel(overviewId);

		if (resolved === undefined) {
			throw new ModelNotFoundError(overviewId);
		}

		if (!isOverviewModel(resolved)) {
			throw new ModelNotFoundError(overviewId);
		}

		overviewModels.set(overviewId, resolved);
	}

	const canCreateDualPaneEditClone = (overviewId: string): boolean => {
		const overview = overviewModels.get(overviewId);

		if (overview === undefined) {
			return false;
		}

		const generatedDocId = findGeneratedDocModelId(overview);

		if (generatedDocId === undefined) {
			return getFallbackTargetDocumentModelId(overview, context.resolveModel) !== undefined;
		}

		const generatedDoc = context.resolveModel(generatedDocId);

		if (generatedDoc === undefined || !isLegacyGeneratedDocumentModel(generatedDoc)) {
			return false;
		}

		const analysis = analyzeGeneratedDocumentModel(generatedDoc);

		if (analysis.targetDocumentModelId.length > 0) {
			return true;
		}

		// Inline-field pattern: fall back to the relationship model's entity characteristics.
		const overviewContexts = overviewContextMap.get(overviewId) ?? [];
		const firstOverviewContext = overviewContexts[0];

		return (
			firstOverviewContext !== undefined &&
			resolveTargetDocumentModelIdFromRelationship(
				context.resolveModel,
				firstOverviewContext.relationshipName,
				firstOverviewContext.targetRole
			) !== undefined
		);
	};

	// Step 3: Handle clones
	const { cloneMap, cloneModels: editCloneModels } = createCleanClones(finalRuMs, overviewModels, context.keepModels, {
		canCreateDualPaneEditClone
	});
	const { multiContextRemap, cloneModels: candidateCloneModels } = handleCandidateClones(
		overviewContextMap,
		overviewModels
	);
	const tableListDirectCloneSources = collectTableListDirectCloneSources(finalRuMs, context.keepModels);

	// Step 4: Generated doc analysis and column remapping
	const remappedOverviews = new Map<string, OverviewModel>();
	const linkQueryModels: QueryModel[] = [];
	const candidateQueryModels: QueryModel[] = [];
	const analyzedGenDocIds: string[] = [];

	for (const [overviewId, contexts] of overviewContextMap) {
		const overview = overviewModels.get(overviewId);

		if (overview === undefined) {
			throw new ModelNotFoundError(overviewId);
		}

		const contextsArray = [...contexts];
		const firstContext: OverviewContext | undefined = contextsArray[0];
		const overviewContext = resolveContextForOverviewId(overviewId, contextsArray);
		const genDocId = findGeneratedDocModelId(overview);

		let analysis: TypedGeneratedDocAnalysis | undefined;
		let finalOverview = overview;

		if (genDocId === undefined) {
			// Plain overview — no generated doc wrapper; derive target doc from fallback resolution
			const targetDocumentModelId = getFallbackTargetDocumentModelId(overview, context.resolveModel);

			if (targetDocumentModelId === undefined) {
				// No generated doc and no fallback query target — keep overview unchanged
				remappedOverviews.set(overviewId, overview);

				continue;
			}

			analysis = {
				targetDocumentModelId,
				linkDocumentModelId: undefined,
				targetGroupPrefix: "",
				relationshipGroupPrefix: undefined
			};

			const reconciledSubHeaderBox = reconcileSubHeaderSlots(
				overview.content.subHeaderBox,
				overview.content.configuration
			);

			if (reconciledSubHeaderBox !== overview.content.subHeaderBox) {
				finalOverview = {
					...overview,
					content: {
						...overview.content,
						...(reconciledSubHeaderBox !== undefined ? { subHeaderBox: reconciledSubHeaderBox } : {})
					}
				};
			}
		} else {
			// Generated-doc path — delegate remapping, column classification, and interactive
			// stripping to the focused generated-doc overview remapper.
			const remapResult = remapOverviewWithGeneratedDoc({
				overview,
				overviewId,
				genDocId,
				overviewContext,
				firstContext,
				resolveModel: context.resolveModel,
				keepModels: context.keepModels,
				sourceDocumentModelId: context.sourceDocumentModelId
			});

			analyzedGenDocIds.push(remapResult.analyzedGenDocId);
			analysis = remapResult.analysis;
			finalOverview = remapResult.finalOverview;
		}

		if (analysis === undefined) {
			remappedOverviews.set(overviewId, overview);
			continue;
		}

		remappedOverviews.set(overviewId, finalOverview);

		// Determine the effective clone ID for this overview
		const relName = firstContext?.relationshipName ?? "";
		const shouldCloneSingleContextCandidate =
			!(firstContext?.isLinkOverview ?? true) &&
			context.globalCandidateRelMap !== undefined &&
			shouldCloneCandidate(overviewId, context.globalCandidateRelMap);
		const cloneId = resolveCloneId(
			overviewId,
			relName,
			cloneMap,
			multiContextRemap,
			context.keepModels,
			shouldCloneSingleContextCandidate
		);
		const queryOwnerOverviewIds = resolveQueryOwnerOverviewIds(
			overviewId,
			contextsArray,
			cloneMap,
			multiContextRemap,
			context.keepModels,
			context.globalCandidateRelMap
		);

		// --- Create single-context clone model when needed ---
		// When the effective cloneId differs from overviewId and keepModels is true,
		// or a non-keepModels candidate trigger applies, create a deep clone with
		// query-model-for-overview refs. The base model retains the original overviewId;
		// the clone gets the relationship-specific ID.
		if (cloneId !== overviewId && (context.keepModels || shouldCloneSingleContextCandidate) && analysis !== undefined) {
			const cloneModel = withSourceFormRoles(
				cloneOverviewModel(finalOverview, cloneId, true),
				context.rolesAnnotations
			);
			remappedOverviews.set(cloneId, cloneModel);

			// Strip column labels from the base model for SelectedItems (link) overviews
			// (Fact 8: labels belong on the clone, not the base model)
			if (firstContext?.isLinkOverview ?? false) {
				const strippedColumns = (finalOverview.content.columns ?? []).map((col) => ({
					...col,
					label: undefined
				}));

				remappedOverviews.set(overviewId, {
					...finalOverview,
					content: {
						...finalOverview.content,
						columns: strippedColumns
					}
				});
			}
		}

		// Generate query models when we have source and target info
		if (
			analysis !== undefined &&
			context.sourceDocumentModelId !== undefined &&
			analysis.targetDocumentModelId.length > 0
		) {
			for (const queryOwnerOverviewId of queryOwnerOverviewIds) {
				const relationshipContext =
					contextsArray.find((overviewCtx) =>
						queryOwnerOverviewId.includes(`${MULTI_CONTEXT_SEPARATOR}${overviewCtx.relationshipName}`)
					) ?? firstContext;

				if (relationshipContext === undefined) {
					continue;
				}

				const sourceRelationshipContext = resolveSourceContextFromRelationship(
					context.resolveModel,
					relationshipContext.relationshipName,
					relationshipContext.targetRole
				);
				const sourceRole = sourceRelationshipContext?.sourceRole ?? relationshipContext.targetRole;
				const sourceDocumentModelId = sourceRelationshipContext?.sourceDocumentModelId ?? context.sourceDocumentModelId;

				const strategy: QueryStrategy = resolveQueryStrategy(
					relationshipContext.duplicatesAllowed,
					analysis.targetDocumentModelId,
					sourceDocumentModelId
				);

				if (relationshipContext.isLinkOverview) {
					const linkQuery = generateLinkOverviewQueryModel(
						analysis,
						strategy,
						queryOwnerOverviewId,
						relationshipContext.relationshipName,
						sourceRole,
						relationshipContext.targetRole,
						context.rolesAnnotations
					);
					linkQueryModels.push(linkQuery);
				} else {
					const candidateQuery = generateCandidateQueryModel(
						analysis,
						strategy,
						queryOwnerOverviewId,
						relationshipContext.relationshipName,
						sourceRole,
						context.rolesAnnotations
					);
					candidateQueryModels.push(candidateQuery);
				}
			}
		}
	}

	// Step 5: Build deletion list
	const orphanSelectedOverviewDeletionIds = collectOrphanSelectedOverviewDeletionIds({
		finalRuMs,
		keepModels: context.keepModels,
		resolveModel: context.resolveModel,
		workspaceModels: context.workspaceModels
	});
	const deletionList = buildDeletionList(analyzedGenDocIds, orphanSelectedOverviewDeletionIds, context.keepModels);

	// Add clone models to remappedOverviews so they flow through to state.
	// Prefer regenerating from already remapped source overviews to avoid stale
	// generated-doc wrapper refs on -edit clone columns.
	for (const [sourceOverviewId, cloneId] of cloneMap) {
		const remappedSourceOverview = remappedOverviews.get(sourceOverviewId);
		const clonedFromRemappedSource =
			remappedSourceOverview !== undefined
				? cloneOverviewModel(remappedSourceOverview, cloneId, true, {
						queryModelReferenceId: `${sourceOverviewId}-query`
					})
				: undefined;
		const fallbackClone = editCloneModels.get(cloneId);
		const finalCloneModel = clonedFromRemappedSource ?? fallbackClone;

		if (finalCloneModel !== undefined) {
			remappedOverviews.set(cloneId, withSourceFormRoles(finalCloneModel, context.rolesAnnotations));
		}
	}

	for (const [cloneId, cloneModel] of candidateCloneModels) {
		remappedOverviews.set(cloneId, withSourceFormRoles(cloneModel, context.rolesAnnotations));
	}

	for (const tableListDirectSourceOverviewId of tableListDirectCloneSources) {
		const sourceOverview = remappedOverviews.get(tableListDirectSourceOverviewId);

		if (sourceOverview === undefined) {
			continue;
		}

		const tableListDirectCloneId = `${tableListDirectSourceOverviewId}-tableList`;
		remappedOverviews.set(
			tableListDirectCloneId,
			cloneAsTableListDirectOverview(sourceOverview, tableListDirectSourceOverviewId, context.rolesAnnotations)
		);
	}

	const tableListDirectSelectedOverviewIds = collectTableListDirectSelectedOverviewIds(
		finalRuMs,
		context.keepModels,
		new Set(remappedOverviews.keys())
	);

	return {
		overviewContextMap,
		cloneMap,
		multiContextRemap,
		remappedOverviews,
		linkQueryModels,
		candidateQueryModels,
		candidatePageSizeMap,
		deletionList,
		tableListDirectSelectedOverviewIds
	};
}

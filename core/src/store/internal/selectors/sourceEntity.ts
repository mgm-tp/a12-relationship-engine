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

import type { DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import { type Activity, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import { type Selector, ModelSelectors as ClientModelSelectors } from "@com.mgmtp.a12.client/client-core";
import { isFormModel, type FormModel, isFormModelDetachedRepeat } from "@com.mgmtp.a12.formengine/formengine-core";

import type { DocumentGraph } from "../state.js";
import { parseInstanceId } from "../utils/instanceId.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";
import { buildFormModelIndex, type FormModelIndex } from "../utils/formModelLookup.js";
// eslint-disable-next-line no-restricted-imports
import {
	isRelationshipGroup,
	dmGroup2RelationshipGroupInfo
} from "../../../internal/cdm/cdmCommons/relationshipGroup.js";

import { ModelSelectors } from "./model.js";
import { createSelector } from "./selector.js";
import { DocumentGraphSelectors } from "./documentGraph.js";

/**
 * A data holder that carries a sourceEntity (both overview and dropdown holders share this shape).
 * @internal
 */
export type SourceEntityHolder = (
	| RelationshipEngineDataHolder.InstanceDataHolder
	| RelationshipEngineDataHolder.DropdownSelectionDataHolder
) & {
	slices: { sourceEntity: { docRef: string | null; role: string } };
};

/**
 * A resolved source entity update for a single data holder.
 * @internal
 */
export interface SourceEntityUpdate {
	readonly descriptor: Activity.DataHolderDescriptor;
	readonly sourceEntity: { docRef: string | null; role: string };
}

/** @internal */
export namespace SourceEntitySelectors {
	/**
	 * Selects the FormModelIndex built from the activity's form model; returns undefined when the model is not yet loaded.
	 */
	export function formModelIndex(activityId: string): Selector<FormModelIndex | undefined> {
		return (state) => formModelIndexReselect(state, activityId);
	}

	const formModelIndexReselect = createSelector(
		[
			(state: object, activityId: string): FormModel | undefined => {
				const activity = ActivitySelectors.activityById(activityId)(state);

				if (activity === undefined) {
					return undefined;
				}

				const criteria = {
					activityId,
					modelType: "form",
					documentModel: activity.descriptor.model
				};

				return ClientModelSelectors.modelInScene(criteria, isFormModel)(state);
			}
		],
		(formModel): FormModelIndex | undefined => {
			if (!formModel) {
				return undefined;
			}

			return buildFormModelIndex(formModel);
		}
	);

	/**
	 * @internal Options for {@link updates}.
	 */
	export interface UpdatesOptions {
		/** When set, overrides the fallback chain for all holders (e.g. newly saved instance docRef). */
		readonly overrideDocRef?: string;
	}

	/**
	 * Resolves source entity updates for all overview and dropdown data holders in an activity, returning only holders whose `sourceEntity.docRef` changed.
	 *
	 * Resolution paths:
	 * - No document graph: falls back to `overrideDocRef` then activity instance docRef.
	 * - With document graph: applies DetachedRepeat (Strategy 1), CDM hierarchy walk (Strategy 2), or global link scan (Strategy 3).
	 */
	export function updates(activityId: string, options: UpdatesOptions = {}): Selector<SourceEntityUpdate[]> {
		return (state) => updatesReselect(state, activityId, options.overrideDocRef);
	}

	const updatesReselect = createSelector(
		[
			(state: object, activityId: string) =>
				ActivitySelectors.activityPropById(activityId, (a) =>
					a.dataHolders.filter(
						(dh): dh is SourceEntityHolder =>
							RelationshipEngineDataHolder.AvailableItemsDataHolder.isInstance(dh) ||
							RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance(dh) ||
							RelationshipEngineDataHolder.DropdownSelectionDataHolder.isInstance(dh)
					)
				)(state) ?? [],
			(state: object, activityId: string) =>
				ActivitySelectors.activityPropById(activityId, (activity) => activity?.descriptor.instance)(state) ?? undefined,
			(state: object, activityId: string) => DocumentGraphSelectors.documentGraph(activityId)(state),
			(state: object, activityId: string) => formModelIndexReselect(state, activityId),
			(state: object, activityId: string) => DocumentGraphSelectors.rootDocRef(activityId)(state),
			(state: object, activityId: string) => ModelSelectors.rootDocumentModel(activityId)(state),
			(_state: object, _activityId: string, overrideDocRef: string | undefined) => overrideDocRef
		],
		(
			dataHolders,
			activityInstanceDocRef,
			documentGraph,
			fmIndex,
			rootDocRef,
			rootDocumentModel,
			overrideDocRef
		): SourceEntityUpdate[] => {
			if (dataHolders.length === 0) {
				return [];
			}

			if (!documentGraph) {
				const targetDocRef = overrideDocRef ?? activityInstanceDocRef;

				if (!targetDocRef) {
					return [];
				}

				return collectFallbackUpdates(dataHolders, targetDocRef);
			}

			if (!fmIndex) {
				return [];
			}

			const documentModel = rootDocumentModel?.documentModel;
			const updates: SourceEntityUpdate[] = [];

			for (const dataHolder of dataHolders) {
				const fallbackDocRef =
					overrideDocRef ?? dataHolder.slices.sourceEntity.docRef ?? rootDocRef ?? activityInstanceDocRef ?? undefined;
				const resolvedDocRef = resolveSourceDocRefForHolder(
					dataHolder,
					documentGraph,
					fmIndex,
					documentModel,
					fallbackDocRef,
					rootDocRef ?? undefined
				);

				if (resolvedDocRef && dataHolder.slices.sourceEntity.docRef !== resolvedDocRef) {
					updates.push({
						descriptor: dataHolder.descriptor,
						sourceEntity: { ...dataHolder.slices.sourceEntity, docRef: resolvedDocRef }
					});
				}
			}

			return updates;
		}
	);

	/**
	 * Resolves the source entity docRef for a specific data holder; returns `fallbackDocRef` when the document graph or form model is not yet loaded.
	 */
	export function resolvedDocRef(
		activityId: string,
		holder: SourceEntityHolder,
		fallbackDocRef?: string
	): Selector<string | undefined> {
		return (state) => resolvedDocRefReselect(state, activityId, holder, fallbackDocRef);
	}

	const resolvedDocRefReselect = createSelector(
		[
			(state: object, activityId: string) => DocumentGraphSelectors.documentGraph(activityId)(state),
			(state: object, activityId: string) => formModelIndexReselect(state, activityId),
			(state: object, activityId: string) => DocumentGraphSelectors.rootDocRef(activityId)(state),
			(state: object, activityId: string) => ModelSelectors.rootDocumentModel(activityId)(state),
			(_state: object, _activityId: string, holder: SourceEntityHolder) => holder,
			(_state: object, _activityId: string, _holder: SourceEntityHolder, fallbackDocRef?: string) => fallbackDocRef
		],
		(documentGraph, fmIndex, rootDocRef, rootDocumentModel, holder, fallbackDocRef): string | undefined => {
			if (!documentGraph) {
				return fallbackDocRef;
			}

			if (!fmIndex) {
				return fallbackDocRef;
			}

			const documentModel = rootDocumentModel?.documentModel;

			return resolveSourceDocRefForHolder(
				holder,
				documentGraph,
				fmIndex,
				documentModel,
				fallbackDocRef,
				rootDocRef ?? undefined
			);
		}
	);
}

// ---------------------------------------------------------------------------
// Private resolution logic
// ---------------------------------------------------------------------------

/** Applies a single targetDocRef to all holders whose current docRef differs (non-CDM fallback path). */
function collectFallbackUpdates(dataHolders: SourceEntityHolder[], targetDocRef: string): SourceEntityUpdate[] {
	const updates: SourceEntityUpdate[] = [];

	for (const dataHolder of dataHolders) {
		if (dataHolder.slices.sourceEntity.docRef !== targetDocRef) {
			updates.push({
				descriptor: dataHolder.descriptor,
				sourceEntity: { ...dataHolder.slices.sourceEntity, docRef: targetDocRef }
			});
		}
	}

	return updates;
}

/**
 * Resolves the source entity docRef for a single data holder using the document graph.
 *
 * Strategy 1 (DetachedRepeat): use groupRef to anchor a loaded document in the graph.
 * Strategy 2 (CDM hierarchy walk): walk parent relationship chain via document model annotations.
 * Strategy 3 (global link scan): search all graph links for relationship + source role match.
 *
 * @testPlan
 * - Strategy 1 only: holder inside DetachedRepeat, groupRef matches a loaded document → returns that docRef
 * - Strategy 1 reachability: groupRef matches a document NOT reachable from root → skip, fall through
 * - Strategy 2 only: holder NOT in DetachedRepeat, CDM has parent relationship → resolves through links
 * - Strategy 2 disambiguation: same relationship under 2 parents, ancestorGroupRef selects correct path
 * - Strategy 3 fallback: no DetachedRepeat, no CDM model → returns first matching link docRef
 * - No match: no strategies succeed → returns fallbackDocRef
 */
function resolveSourceDocRefForHolder(
	holder: SourceEntityHolder,
	documentGraph: DocumentGraph,
	fmIndex: FormModelIndex,
	documentModel: DocumentModel | undefined,
	fallbackDocRef: string | undefined,
	rootDocRef: string | undefined
): string | undefined {
	const relationshipName = holder.slices.uiConfiguration.relationshipName;
	const sourceRole = holder.slices.sourceEntity.role;

	const uiModelId = getUiModelId(holder);
	const ancestorRepeat = findAncestorDetachedRepeat(uiModelId, fmIndex);

	// Strategy 1: Anchor via DetachedRepeat groupRef
	if (ancestorRepeat) {
		const docRefFromGroup = resolveDocRefFromDetachedRepeat(ancestorRepeat, documentGraph, fallbackDocRef, rootDocRef);

		if (docRefFromGroup) {
			return docRefFromGroup;
		}
	}

	// Strategy 2: Walk CDM hierarchy to resolve through parent relationship links.
	if (documentModel && rootDocRef) {
		const docRefFromCdm = resolveDocRefFromCdmHierarchy(
			documentGraph,
			documentModel,
			relationshipName,
			sourceRole,
			rootDocRef,
			ancestorRepeat?.groupRef
		);

		if (docRefFromCdm) {
			return docRefFromCdm;
		}
	}

	// Strategy 3: Global link scan (least specific)
	const docRefFromLinks = findDocRefFromLinks(documentGraph, relationshipName, sourceRole, rootDocRef);

	return docRefFromLinks ?? fallbackDocRef;
}

/**
 * Extracts the form model element ID from a data holder's instanceId.
 *
 * @testPlan
 * - SelectedItemsDataHolder → extracts elementId from slices.id
 * - AvailableItemsDataHolder → extracts elementId from slices.id
 * - DropdownSelectionDataHolder → extracts elementId from descriptor.instanceId
 * - Unknown holder type → returns undefined
 */
function getUiModelId(holder: SourceEntityHolder): string | undefined {
	if (
		RelationshipEngineDataHolder.AvailableItemsDataHolder.isInstance(holder) ||
		RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance(holder)
	) {
		return parseInstanceId(holder.slices.id)?.uiModelName;
	}

	if (RelationshipEngineDataHolder.DropdownSelectionDataHolder.isInstance(holder)) {
		return parseInstanceId(holder.descriptor.instanceId)?.uiModelName;
	}

	return undefined;
}

/** Finds the nearest ancestor DetachedRepeat for a holder's UI model in the form model index. */
function findAncestorDetachedRepeat(
	uiModelId: string | undefined,
	fmIndex: FormModelIndex
): FormModel.DetachedRepeat | undefined {
	if (!uiModelId) {
		return undefined;
	}

	const elementId = fmIndex.elementIdByUiModelId[uiModelId];

	if (!elementId) {
		return undefined;
	}

	const element = fmIndex.byId[elementId];

	if (element && isFormModelDetachedRepeat(element)) {
		return element;
	}

	const ancestor = fmIndex.ancestorDetachedRepeatById[elementId];

	if (ancestor) {
		return ancestor;
	}

	return undefined;
}

/**
 * Strategy 1: Resolves the source docRef via the DetachedRepeat's groupRef matching against loaded documents in the graph.
 *
 * @testPlan
 * - groupRef matches a loaded document → returns its docRef
 * - groupRef matches multiple documents, preferred is among them → returns preferred
 * - groupRef matches a document not reachable from root → returns undefined
 * - no groupRef on DetachedRepeat → returns undefined
 */
function resolveDocRefFromDetachedRepeat(
	detachedRepeat: FormModel.DetachedRepeat,
	documentGraph: DocumentGraph,
	fallbackDocRef?: string,
	rootDocRef?: string
): string | undefined {
	const groupRef = detachedRepeat.groupRef;
	const docRefFromGroup = groupRef ? findDocRefByGroupRef(documentGraph, groupRef, fallbackDocRef) : undefined;

	if (!docRefFromGroup) {
		return undefined;
	}

	if (!rootDocRef || isReachableFromRoot(documentGraph, rootDocRef, docRefFromGroup)) {
		return docRefFromGroup;
	}

	return undefined;
}

/**
 * Strategy 2: Walks the CDM document model to resolve the source entity through parent relationship link chains.
 *
 * When `ancestorGroupRef` is provided, only CDM paths passing through a group with that ID are considered,
 * disambiguating between e.g. PostAddress under PolicyHolder vs. PostAddress under CoInsurer.
 *
 * @testPlan
 * - Nested relationship (PostAddress under PolicyHolder): CDM walk resolves parent link → correct docRef
 * - Same relationship under 2 parents + ancestorGroupRef → selects correct path
 * - Same relationship under 2 parents + no ancestorGroupRef → returns first non-empty chain
 * - Target relationship at root level (no ancestors) → returns undefined (empty chain)
 * - Link chain breaks (parent link missing) → returns undefined
 */
function resolveDocRefFromCdmHierarchy(
	documentGraph: DocumentGraph,
	documentModel: DocumentModel,
	relationshipName: string,
	sourceRole: string,
	rootDocRef: string,
	ancestorGroupRef?: string
): string | undefined {
	const allChains = findAllRelationshipAncestorChains(documentModel.content.modelRoot, relationshipName);

	if (allChains.length === 0) {
		return undefined;
	}

	const chain = selectAncestorChain(allChains, ancestorGroupRef);

	if (!chain || chain.length === 0) {
		return undefined;
	}

	let currentDocRef = rootDocRef;

	for (const ancestor of chain) {
		const resolved = resolveEntityDocRefFromLink(
			documentGraph,
			currentDocRef,
			ancestor.relationship,
			ancestor.targetRole
		);

		if (!resolved) {
			return undefined;
		}

		currentDocRef = resolved;
	}

	return currentDocRef;
}

/**
 * Selects the appropriate ancestor chain: by `ancestorGroupRef` if provided, otherwise the first non-empty chain.
 *
 * @testPlan
 * - ancestorGroupRef matches a chain's groupId → returns that chain
 * - ancestorGroupRef doesn't match any chain → returns undefined
 * - no ancestorGroupRef, multiple chains → returns first non-empty
 * - no ancestorGroupRef, all chains empty → returns undefined
 */
function selectAncestorChain(
	allChains: CdmAncestorChainResult[],
	ancestorGroupRef?: string
): CdmRelationshipMeta[] | undefined {
	if (ancestorGroupRef) {
		const match = allChains.find((c) => c.groupIds.some((id) => id === ancestorGroupRef));

		if (match) {
			return match.chain;
		}
	}

	const nonEmpty = allChains.find((c) => c.chain.length > 0);

	return nonEmpty?.chain;
}

interface CdmRelationshipMeta {
	relationship: string;
	sourceRole: string;
	targetRole: string;
}

interface CdmAncestorChainResult {
	chain: CdmRelationshipMeta[];
	groupIds: string[];
}

/**
 * Finds ALL CDM paths leading to a relationship group matching `targetRelationship`.
 *
 * @testPlan
 * - Target at root level → returns [{chain: [], groupIds: [targetId]}]
 * - Target nested under 1 parent → returns [{chain: [parentMeta], groupIds: [parentId, targetId]}]
 * - Target exists under 2 different parents → returns 2 chain results
 * - Target not found → returns []
 * - Non-relationship intermediate groups are traversed but not added to chain
 */
function findAllRelationshipAncestorChains(
	group: DocumentModel.Group,
	targetRelationship: string,
	currentChain: CdmRelationshipMeta[] = [],
	currentGroupIds: string[] = []
): CdmAncestorChainResult[] {
	const results: CdmAncestorChainResult[] = [];

	for (const element of group.elements) {
		if (element.type !== "Group") {
			continue;
		}

		if (!isRelationshipGroup(element)) {
			results.push(
				...findAllRelationshipAncestorChains(element, targetRelationship, currentChain, [
					...currentGroupIds,
					element.id
				])
			);
			continue;
		}

		const groupInfo = dmGroup2RelationshipGroupInfo(element);
		const meta: CdmRelationshipMeta = {
			relationship: groupInfo.relationship,
			sourceRole: groupInfo.sourceRole,
			targetRole: groupInfo.targetRole
		};

		if (meta.relationship === targetRelationship) {
			results.push({ chain: currentChain, groupIds: [...currentGroupIds, element.id] });
			continue;
		}

		results.push(
			...findAllRelationshipAncestorChains(
				element,
				targetRelationship,
				[...currentChain, meta],
				[...currentGroupIds, element.id]
			)
		);
	}

	return results;
}

/**
 * Finds the link for the given relationship starting from `sourceDocRef` and returns the matching `targetRole` docRef.
 *
 * @testPlan
 * - Link exists with matching relationship and sourceDocRef → returns targetRole docRef
 * - Multiple links, only one matches relationship → returns correct one
 * - Link exists but sourceDocRef is not among entities → skips
 * - No links for sourceDocRef → returns undefined
 */
function resolveEntityDocRefFromLink(
	documentGraph: DocumentGraph,
	sourceDocRef: string,
	relationshipName: string,
	targetRole: string
): string | undefined {
	const linkIds = documentGraph.links.linkIdsByDocId[sourceDocRef];

	if (!linkIds) {
		return undefined;
	}

	for (const linkId of linkIds) {
		const link = documentGraph.links.byId[linkId];

		if (!link || link.linkRef.linkDescriptor.relationshipModel !== relationshipName) {
			continue;
		}

		const hasSource = link.linkRef.linkDescriptor.entities.some((e) => e.docRef === sourceDocRef);

		if (!hasSource) {
			continue;
		}

		const targetEntity = link.linkRef.linkDescriptor.entities.find((e) => e.role === targetRole);

		if (targetEntity?.docRef) {
			return targetEntity.docRef;
		}
	}

	return undefined;
}

/**
 * Strategy 3: Searches all document graph links for a matching relationship + source role.
 *
 * @testPlan
 * - Single link matches → returns entity docRef
 * - Multiple links, one reachable from root → returns reachable one
 * - No rootDocRef → returns first match
 * - No matching links → returns undefined
 */
function findDocRefFromLinks(
	documentGraph: DocumentGraph,
	relationshipName: string,
	sourceRole: string,
	rootDocRef?: string
): string | undefined {
	let firstMatch: string | undefined;

	for (const link of Object.values(documentGraph.links.byId)) {
		if (link.linkRef.linkDescriptor.relationshipModel !== relationshipName) {
			continue;
		}

		const entity = link.linkRef.linkDescriptor.entities.find((candidate) => candidate.role === sourceRole);

		if (!entity) {
			continue;
		}

		if (typeof entity.docRef !== "string" || entity.docRef.length === 0) {
			continue;
		}

		if (!firstMatch) {
			firstMatch = entity.docRef;
		}

		if (!rootDocRef || isReachableFromRoot(documentGraph, rootDocRef, entity.docRef)) {
			return entity.docRef;
		}
	}

	return firstMatch;
}

/**
 * BFS through linkIdsByDocId to check if targetDocRef is reachable from rootDocRef.
 *
 * @testPlan
 * - targetDocRef === rootDocRef → true
 * - targetDocRef directly linked from root → true
 * - targetDocRef reachable via 2-hop chain → true
 * - targetDocRef not connected to root → false
 * - Cyclic links don't cause infinite loop → terminates
 */
function isReachableFromRoot(documentGraph: DocumentGraph, rootDocRef: string, targetDocRef: string): boolean {
	if (rootDocRef === targetDocRef) {
		return true;
	}

	const visited = new Set<string>();
	const queue = [rootDocRef];

	while (queue.length > 0) {
		const current = queue.shift();

		if (!current || visited.has(current)) {
			continue;
		}

		visited.add(current);

		const linkIds = documentGraph.links.linkIdsByDocId[current];

		if (!linkIds) {
			continue;
		}

		for (const linkId of linkIds) {
			const link = documentGraph.links.byId[linkId];

			if (!link) {
				continue;
			}

			for (const entity of link.linkRef.linkDescriptor.entities) {
				if (entity.docRef && !visited.has(entity.docRef)) {
					if (entity.docRef === targetDocRef) {
						return true;
					}

					queue.push(entity.docRef);
				}
			}
		}
	}

	return false;
}

/**
 * Finds a docRef in the document graph matching `groupRef`, preferring `preferred` if among matches.
 *
 * @testPlan
 * - docRef contains groupRef string → matches
 * - document metadata has matching groupRef → matches
 * - preferred docRef is among matches → returns preferred
 * - no matches → returns undefined
 */
function findDocRefByGroupRef(documentGraph: DocumentGraph, groupRef: string, preferred?: string): string | undefined {
	const matches: string[] = [];

	for (const entry of Object.values(documentGraph.documents.byDocRef)) {
		if (!isLoadedDocument(entry)) {
			continue;
		}

		if (entry.docRef.includes(groupRef)) {
			matches.push(entry.docRef);
			continue;
		}

		const extractedGroupRef = extractGroupRef(entry.document);

		if (extractedGroupRef === groupRef) {
			matches.push(entry.docRef);
		}
	}

	if (matches.length === 0) {
		return undefined;
	}

	if (preferred && matches.includes(preferred)) {
		return preferred;
	}

	return matches[0];
}

type LoadedDocument = Extract<DocumentGraph.Document, { loadingState: "loaded" }>;

function isLoadedDocument(document: DocumentGraph.Document): document is LoadedDocument {
	return document.loadingState === "loaded";
}

function extractGroupRef(document: unknown): string | undefined {
	if (typeof document !== "object" || document === null) {
		return undefined;
	}

	const meta = (document as { __meta?: unknown }).__meta;

	if (meta && typeof meta === "object") {
		const groupRef = (meta as { groupRef?: unknown }).groupRef;

		if (typeof groupRef === "string" && groupRef.length > 0) {
			return groupRef;
		}
	}

	const directGroupRef = (document as { groupRef?: unknown }).groupRef;

	if (typeof directGroupRef === "string" && directGroupRef.length > 0) {
		return directGroupRef;
	}

	return undefined;
}

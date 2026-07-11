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

import { select, type SagaGenerator } from "typed-redux-saga";

import { ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import type { Relationship } from "@com.mgmtp.a12.dataservices/dataservices-access";

import { ChangelogSelectors } from "../../../../store/index.js";
import { DocumentGraph, type Changelog } from "../../../../store/index.js";

export interface ChildData {
	/** Seed changelog entries (all marked `inherited: true`). */
	readonly changes: Changelog.Change[];
	/**
	 * Derived document graph slice for CDM activities.
	 * `undefined` for non-CDM — the caller should skip DG initialization.
	 */
	readonly documentGraph?: DocumentGraph;
}

interface ParentSeedContext {
	readonly changes: Changelog.Change[];
	readonly parentDocumentGraph: DocumentGraph | undefined;
	readonly parentRootDocRef: string | undefined;
	readonly effectiveTargetDocRef: string;
	readonly targetDocumentModel: string;
	readonly rewriteLinkRef: (linkRef: Relationship.LinkRef) => Relationship.LinkRef;
}

/**
 * Resolves the common parent seed state: changelog changes and the context needed to build
 * the document graph. Shared by {@link resolveSeedChangesFromParent} and {@link resolveSeedFromParent}.
 * @internal
 */
function* resolveParentSeedContext(
	activityId: string,
	targetDocRef?: string,
	selectedLinkId?: string
): SagaGenerator<ParentSeedContext | undefined> {
	const activityDescriptor = yield* select(ActivitySelectors.activityPropById(activityId, (a) => a?.descriptor));
	const effectiveTargetDocRef = targetDocRef ?? activityDescriptor?.instance;
	const targetDocumentModel = activityDescriptor?.model;

	if (!effectiveTargetDocRef || !targetDocumentModel) {
		return undefined;
	}

	const parentResult = yield* select(ChangelogSelectors.parent(effectiveTargetDocRef, activityId));

	if (!parentResult) {
		return undefined;
	}

	const parentRootDocRef = parentResult.rootDocRef;

	// Rewrite any link entity that points to the parent's real root so that, in the child's
	// re-rooted world, it points to the child's virtual ROOT_DOC_REF. This lets source-entity
	// resolution (Strategies 2/3) walk outwards from the child's root without leaking into the
	// parent's broader graph. `handleMergeSave` performs the inverse remap when pushing changes
	// back up to the parent.
	const rewriteLinkRef = (linkRef: Relationship.LinkRef): Relationship.LinkRef => {
		if (!parentRootDocRef) {
			return linkRef;
		}

		const needsRewrite = linkRef.linkDescriptor.entities.some((e) => e.docRef === parentRootDocRef);

		if (!needsRewrite) {
			return linkRef;
		}

		return {
			...linkRef,
			linkDescriptor: {
				...linkRef.linkDescriptor,
				entities: linkRef.linkDescriptor.entities.map((e) =>
					e.docRef === parentRootDocRef ? { ...e, docRef: DocumentGraph.ROOT_DOC_REF } : e
				)
			}
		};
	};

	const rewriteChange = (change: Changelog.Change): Changelog.Change => {
		if (change.kind === "linkAdded" || change.kind === "linkDeleted" || change.kind === "linkDocChanged") {
			return { ...change, linkRef: rewriteLinkRef(change.linkRef), inherited: true };
		}

		return { ...change, inherited: true } as Changelog.Change;
	};

	const changes: Changelog.Change[] = parentResult.changelog.changes
		.filter((c) => c.kind !== "cdmRootComputed")
		.map(rewriteChange);

	return {
		changes,
		parentDocumentGraph: parentResult.documentGraph,
		parentRootDocRef,
		effectiveTargetDocRef,
		targetDocumentModel,
		rewriteLinkRef
	};
}

/**
 * Derives the initial changelog seed for a child activity from the nearest ancestor that owns
 * an RE `ChangelogDataHolder`. Usable for both CDM and non-CDM child activities.
 *
 * Returns `undefined` if no RE ancestor is found.
 *
 * @param activityId - The child activity whose parent chain is traversed.
 * @param targetDocRef - The child's document reference. If omitted, read from `descriptor.instance`.
 * @param selectedLinkId - When navigating an existing link (duplicate entries), the specific
 *   link to isolate in the seed. Omitted for new/drafting links.
 */
export function* resolveSeedChangesFromParent(
	activityId: string,
	targetDocRef?: string,
	selectedLinkId?: string
): SagaGenerator<Changelog.Change[] | undefined> {
	const context = yield* resolveParentSeedContext(activityId, targetDocRef, selectedLinkId);

	return context?.changes;
}

/**
 * Resolves the seed data (changelog changes + document graph slice) for a child activity
 * from the nearest RE ancestor. For CDM child activities the returned document graph is a
 * BFS-limited subgraph rooted at the child's docRef, excluding the parent's broader graph.
 *
 * @param activityId - The child activity whose parent chain is traversed.
 * @param targetDocRef - The child's document reference. If omitted, read from `descriptor.instance`.
 * @param cdmName - The CDM document model name. When provided, a document graph slice is built.
 * @param selectedLinkId - When navigating an existing link (duplicate entries), the specific
 *   link to isolate. Sibling links sharing the same relationship model are excluded from
 *   the subgraph. Omitted for new/drafting links.
 */
export function* resolveSeedFromParent(
	activityId: string,
	targetDocRef?: string,
	cdmName?: string,
	selectedLinkId?: string
): SagaGenerator<ChildData | undefined> {
	const context = yield* resolveParentSeedContext(activityId, targetDocRef, selectedLinkId);

	if (!context) {
		return undefined;
	}

	const { changes, parentDocumentGraph, parentRootDocRef, effectiveTargetDocRef, targetDocumentModel, rewriteLinkRef } =
		context;

	if (!cdmName || !parentDocumentGraph) {
		return { changes, documentGraph: undefined };
	}

	// BFS outward from the child docRef, collecting documents and links that belong to the
	// child's subtree. Links that anchor on the parent's root are included (they carry the
	// child's parent-context relationship) but their far side is not traversed — otherwise the
	// entire parent graph would leak into the child.
	const reachableDocRefs = new Set<string>();
	const reachableLinkIds = new Set<string>();
	const queue: string[] = [effectiveTargetDocRef];

	while (queue.length > 0) {
		const current = queue.shift();

		if (!current || reachableDocRefs.has(current)) {
			continue;
		}

		reachableDocRefs.add(current);
		const linkIds = parentDocumentGraph.links.linkIdsByDocId[current];

		if (!linkIds) {
			continue;
		}

		// When a specific link was selected (e.g., from a duplicate entry row click),
		// resolve the relationship model of that link so we can exclude its sibling
		// duplicates from the root doc's reachable set.
		let selectedLinkRelationshipModel: string | undefined;

		if (selectedLinkId && current === effectiveTargetDocRef) {
			const selectedLink = parentDocumentGraph.links.byId[selectedLinkId];

			if (selectedLink) {
				selectedLinkRelationshipModel = selectedLink.linkRef.linkDescriptor.relationshipModel;
			}
		}

		for (const linkId of linkIds) {
			if (reachableLinkIds.has(linkId)) {
				continue;
			}

			const link = parentDocumentGraph.links.byId[linkId];

			if (!link) {
				continue;
			}

			// If a selected link exists and this link shares the same relationship
			// model but is NOT the selected one, skip it — it's a duplicate sibling.
			if (
				selectedLinkRelationshipModel !== undefined &&
				link.linkRef.linkDescriptor.relationshipModel === selectedLinkRelationshipModel &&
				linkId !== selectedLinkId
			) {
				continue;
			}

			reachableLinkIds.add(linkId);

			if (link.linkDocRef) {
				reachableDocRefs.add(link.linkDocRef);
			}

			const touchesParentRoot = parentRootDocRef
				? link.linkRef.linkDescriptor.entities.some((e) => e.docRef === parentRootDocRef)
				: false;

			if (touchesParentRoot) {
				continue;
			}

			for (const entity of link.linkRef.linkDescriptor.entities) {
				if (entity.docRef && !reachableDocRefs.has(entity.docRef)) {
					queue.push(entity.docRef);
				}
			}
		}
	}

	const byDocRef: Record<string, DocumentGraph.Document> = {
		[DocumentGraph.ROOT_DOC_REF]: {
			docRef: DocumentGraph.ROOT_DOC_REF,
			document: {},
			documentModelName: cdmName,
			loadingState: "loaded"
		}
	};

	for (const ref of reachableDocRefs) {
		const parentEntry = parentDocumentGraph.documents.byDocRef[ref];

		if (parentEntry) {
			byDocRef[ref] = parentEntry;
		}
	}

	if (!byDocRef[effectiveTargetDocRef]) {
		byDocRef[effectiveTargetDocRef] = {
			docRef: effectiveTargetDocRef,
			document: {},
			documentModelName: targetDocumentModel,
			loadingState: "loaded"
		};
	}

	const linksById: Record<string, DocumentGraph.Link> = {};
	const linkIdsByDocId: Record<string, string[]> = {};

	for (const linkId of reachableLinkIds) {
		const parentLink = parentDocumentGraph.links.byId[linkId];

		if (!parentLink) {
			continue;
		}

		const rewritten: DocumentGraph.Link = {
			...parentLink,
			linkRef: rewriteLinkRef(parentLink.linkRef)
		};
		linksById[linkId] = rewritten;

		for (const entity of rewritten.linkRef.linkDescriptor.entities) {
			if (!entity.docRef) {
				continue;
			}

			const bucket = linkIdsByDocId[entity.docRef] ?? [];
			bucket.push(linkId);
			linkIdsByDocId[entity.docRef] = bucket;
		}
	}

	const documentGraph: DocumentGraph = {
		documents: { byDocRef },
		links: { byId: linksById, linkIdsByDocId },
		changelogIndex: changes.length
	};

	return { changes, documentGraph };
}

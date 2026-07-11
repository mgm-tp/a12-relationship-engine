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

import type { Selector } from "@com.mgmtp.a12.client/client-core";
import { ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import { DocumentPath } from "@com.mgmtp.a12.formengine/formengine-core";
import type { DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import type { EntityInstancePath } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import type { RelationshipModel } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { Model, ModelSelectors as ClientModelSelectors } from "@com.mgmtp.a12.client/client-core";

import { ModelSelectors } from "../model.js";
import { DocumentGraph } from "../../state.js";
import { createSelector } from "../selector.js";
import { RelationshipEngineDataHolder } from "../../dataHolder.js";

import { resolveDraftingDoc } from "./drafting.js";
import type { DocumentBoundary } from "./traversal.js";
import { findDocumentBoundaries } from "./traversal.js";
import type { LinkResolution } from "./linkResolution.js";
import { resolveDocRefViaLink } from "./linkResolution.js";
import { rootDocRefReselect, documentGraphReselect } from "./base.js";
import { createRootDocumentContext, resolveRootDocumentModelName } from "./utils.js";

/** @internal */
export interface DocumentResult {
	/** Serialized EntityInstancePath within the target document, e.g. "/address[0]/street[0]" */
	readonly targetInstancePath: string;
	readonly documentModelName: string;
	readonly docRef: string;
}

/**
 * Resolves the document reference and model name for a given entity instance path.
 * @internal
 */
export function docRef(
	activityId: string,
	entityInstancePath: EntityInstancePath
): Selector<DocumentResult | undefined> {
	return (state) => docRefReselect(state, activityId, entityInstancePath);
}

const docRefReselect = createSelector(
	[
		(state: object, activityId: string) => documentGraphReselect(state, activityId),
		(state: object, activityId: string) => rootDocRefReselect(state, activityId),
		(state: object, activityId: string) => ModelSelectors.rootDocumentModel(activityId)(state),
		(state: object, activityId: string) =>
			ActivitySelectors.activityPropById(activityId, (activity) =>
				activity.dataHolders
					.filter(RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance)
					.map((dh) => dh.slices.draftingDocumentRow)
					.filter((row): row is NonNullable<typeof row> => row !== undefined)
			)(state),
		(state: object, activityId: string) =>
			ActivitySelectors.activityPropById(activityId, (a) => a?.descriptor.instance)(state),
		(state: object) => (modelId: string) =>
			ClientModelSelectors.modelByName(modelId, Model.isDocumentModel)(state) ?? undefined,
		(state: object) => ClientModelSelectors.modelGraph()(state).relationshipModels,
		(_state: object, _activityId: string, entityInstancePath: EntityInstancePath) => entityInstancePath
	],
	(
		documentGraph,
		rootDocRefValue,
		documentModels,
		draftingDocs,
		activityInstance,
		getModelById,
		relModels,
		entityInstancePath
	): DocumentResult | undefined => {
		// 1. Drafting documents take priority
		const draftingResult = resolveDraftingDoc(draftingDocs, entityInstancePath);

		if (draftingResult) {
			return draftingResult;
		}

		// 2. No DG or no document models: resolve directly from root document data
		if (!documentGraph || !documentModels) {
			return resolveFromRootDocData(activityInstance, documentModels?.documentModel.header.id, entityInstancePath);
		}

		const rootDocumentModel = documentModels.documentModel;
		const cddRootEntry = documentGraph.documents.byDocRef[DocumentGraph.ROOT_DOC_REF];

		const resolveDocumentModel = (modelId: string): DocumentModel | undefined => {
			if (modelId === rootDocumentModel.header.id) {
				return rootDocumentModel;
			}

			return getModelById(modelId);
		};

		const initialDocumentModelName = resolveRootDocumentModelName(cddRootEntry, rootDocumentModel.header.id);
		const initialDocumentModel = resolveDocumentModel(initialDocumentModelName) ?? rootDocumentModel;

		const rootDocumentContext = createRootDocumentContext({
			documentGraph: documentGraph,
			rootDocRef: rootDocRefValue,
			resolveDocumentModel
		});

		// 3. Model-based traversal: find all document boundaries along the path
		const boundaries = findDocumentBoundaries(
			initialDocumentModel.content.modelRoot,
			initialDocumentModel.header.annotations,
			entityInstancePath
		);

		if (!boundaries || boundaries.length === 0) {
			return undefined;
		}

		// 4. Chain-resolve docRefs through boundaries.
		// Cache relationship resolutions by boundary index so link document boundaries
		// can look up the parent link's linkDocRef without re-resolving.
		const relResolutions = new Map<number, LinkResolution>();
		let currentSourceDocRef: string = rootDocumentContext?.docRef ?? DocumentGraph.ROOT_DOC_REF;
		let currentDocRef: string = DocumentGraph.ROOT_DOC_REF;
		let documentModelName: string = initialDocumentModel.header.id;
		let pathOffset = 0;
		let resolved = false;

		for (const [index, boundary] of boundaries.entries()) {
			if (boundary.isCdmNative) {
				// Back in CDM root context — reset both docRef and source chain
				currentDocRef = DocumentGraph.ROOT_DOC_REF;
				currentSourceDocRef = rootDocumentContext?.docRef ?? DocumentGraph.ROOT_DOC_REF;
				documentModelName = initialDocumentModel.header.id;
				pathOffset = 0;
				resolved = true;
			} else if (boundary.isLinkDocument) {
				// Link document boundaries are always direct children of a relationship group
				// (enforced by traversal.ts via isDirectChildOfRel + LINKDOC_GROUPNAME check).
				const parentRelBoundary = findPrecedingRelBoundary(boundaries, index);

				if (!parentRelBoundary?.relationshipMeta) {
					return undefined;
				}

				const parentIdx = boundaries.indexOf(parentRelBoundary);
				const parentResolution = relResolutions.get(parentIdx);

				if (!parentResolution?.linkDocRef) {
					return undefined;
				}

				const relModel = resolveRelModel(relModels, parentRelBoundary.relationshipMeta.relationship);
				const linkDocModelName = relModel?.content.linkDocumentModel;

				if (!linkDocModelName) {
					return undefined;
				}

				currentDocRef = parentResolution.linkDocRef;
				documentModelName = linkDocModelName;
				pathOffset = boundary.pathIndex + 1;
				resolved = true;
			} else if (boundary.relationshipMeta) {
				const resolution = resolveDocRefViaLink(
					documentGraph,
					currentSourceDocRef,
					boundary.relationshipMeta,
					entityInstancePath[boundary.pathIndex]?.index ?? 0,
					rootDocumentContext
				);

				if (!resolution) {
					return undefined;
				}

				relResolutions.set(index, resolution);

				// The resolved target becomes the source for the next nested boundary
				currentSourceDocRef = resolution.docRef;
				currentDocRef = resolution.docRef;
				documentModelName = boundary.documentModelName;
				pathOffset = boundary.pathIndex + 1;
				resolved = true;
			} else {
				// Root document boundary
				currentDocRef = rootDocRefValue ?? DocumentGraph.ROOT_DOC_REF;
				documentModelName = boundary.documentModelName || initialDocumentModel.header.id;
				resolved = true;
			}
		}

		if (!resolved) {
			return undefined;
		}

		return {
			docRef: currentDocRef,
			documentModelName,
			targetInstancePath: DocumentPath.toString(entityInstancePath.slice(pathOffset) as EntityInstancePath)
		};
	}
);

/**
 * Find the relationship boundary immediately preceding the given index.
 * Link document boundaries depend on their parent relationship group's metadata.
 */
function findPrecedingRelBoundary(
	boundaries: readonly DocumentBoundary[],
	currentIdx: number
): DocumentBoundary | undefined {
	for (let i = currentIdx - 1; i >= 0; i--) {
		if (boundaries[i].relationshipMeta) {
			return boundaries[i];
		}
	}

	return undefined;
}

function resolveFromRootDocData(
	rootDocRef: string | undefined,
	documentModelName: string | undefined,
	entityInstancePath: EntityInstancePath
): DocumentResult | undefined {
	if (rootDocRef && documentModelName) {
		return {
			docRef: rootDocRef,
			documentModelName,
			targetInstancePath: DocumentPath.toString(entityInstancePath)
		};
	}

	return undefined;
}

function resolveRelModel(
	relModels: readonly RelationshipModel[],
	relationshipName: string
): RelationshipModel | undefined {
	return relModels.find((rm) => rm.header.id === relationshipName);
}

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
 * @packageDocumentation
 * @module cdm/cdd
 * @experimental
 */

import type { Relationship } from "../../../../relationship/relationship.js";
import { linksWithMetaData } from "../effectiveChanges/linksWithMetaData.js";
import { T_DOC_REF, TARGET_GROUPNAME, LINKDOC_GROUPNAME } from "../../../cdmCommons/cddTechnical.js";
import type { DgChangeLog, DeepReadonly, DocumentGraph } from "../../../../documentGraph/core/index.js";

interface LinksWithMetadataCacheEntry {
	readonly changeLog: DgChangeLog;
	readonly result: Relationship.LinkWithMutationMetadata[];
}

// WeakMap on dg, keyed by (relshName, sourceDocRef, targetRole); result is a pure function of dg+changeLog so activities sharing a dg safely share entries.
const linksWithMetadataCache = new WeakMap<DeepReadonly<DocumentGraph>, Map<string, LinksWithMetadataCacheEntry>>();

/**
 * @internal
 *
 * Builds a list of links with mutation. Reference-stable per (relshName, sourceDocRef, targetRole) while `dg`/`changeLog` are unchanged.
 */
export function cddLinksWithMetadata(
	relshName: string,
	sourceDocRef: string,
	targetRole: string,
	dg: DeepReadonly<DocumentGraph>,
	changeLog: DgChangeLog
): Relationship.LinkWithMutationMetadata[] {
	const cacheKey = `${relshName}|${sourceDocRef}|${targetRole}`;
	const cacheForGraph = linksWithMetadataCache.get(dg);
	const cached = cacheForGraph?.get(cacheKey);

	if (cached && cached.changeLog === changeLog) {
		return cached.result;
	}

	const result = computeLinksWithMetadata(relshName, sourceDocRef, targetRole, dg, changeLog);
	const nextCacheForGraph = cacheForGraph ?? new Map<string, LinksWithMetadataCacheEntry>();
	nextCacheForGraph.set(cacheKey, { changeLog, result });
	linksWithMetadataCache.set(dg, nextCacheForGraph);

	return result;
}

function computeLinksWithMetadata(
	relshName: string,
	sourceDocRef: string,
	targetRole: string,
	dg: DeepReadonly<DocumentGraph>,
	changeLog: DgChangeLog
): Relationship.LinkWithMutationMetadata[] {
	const linkMutations = linksWithMetaData(dg, changeLog);
	const filteredLinks = filterLinkMutations();

	return addTargetDocs();

	function filterLinkMutations(): Relationship.LinkWithMutationMetadata[] {
		return linkMutations.filter(
			(linkMutation) =>
				// filter by sourceDocRef and relshName
				linkMutation.link.linkRef.linkDescriptor.relationshipModel === relshName &&
				linkMutation.link.linkRef.linkDescriptor.entities.some(
					(entity) => entity.docRef === sourceDocRef && entity.role !== targetRole
				) &&
				// only return added and existing links since withdrawn and removed are not links any longer, undefined shall not be added either
				["added", "existing"].some((state) => state === linkMutation.mutationState)
		);
	}

	function addTargetDocs(): Relationship.LinkWithMutationMetadata[] {
		return filteredLinks.map((link) => {
			const targetEntityIdx =
				link.link.linkRef.linkDescriptor.entities.findIndex((e) => e.docRef === sourceDocRef) === 0 ? 1 : 0;
			const targetDocRef = link.link.linkRef.linkDescriptor.entities[targetEntityIdx].docRef;
			const targetDoc = targetDocRef !== null ? dg.documents.byDocRef[targetDocRef] : undefined;
			const actualDocument = targetDoc?.loadingState === "loaded" ? targetDoc.document : {};

			return {
				link: {
					...link.link,
					document: {
						[T_DOC_REF]: targetDocRef,
						[TARGET_GROUPNAME]: actualDocument,
						[LINKDOC_GROUPNAME]: link.link.document
					} as {}
				},
				modified: link.modified,
				mutationState: link.mutationState,
				relinked: false
			};
		});
	}
}

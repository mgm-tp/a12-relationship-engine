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

import type { Relationship } from "@com.mgmtp.a12.dataservices/dataservices-access";

import { DocumentGraph } from "../../state.js";

import type { CdmMeta, RootDocumentContext } from "./utils.js";

/** Result of resolving a link for a relationship boundary. */
export interface LinkResolution {
	docRef: string;
	linkDocRef?: string | null;
}

/**
 * Resolve target docRef by filtering links and verifying the link descriptor.
 * Index is used as a hint; descriptor verification is authoritative.
 * @internal
 */
export function resolveDocRefViaLink(
	documentGraph: DocumentGraph,
	sourceDocRef: string,
	relationshipMeta: CdmMeta,
	groupInstanceIndex: number,
	rootDocumentContext?: RootDocumentContext
): LinkResolution | undefined {
	// Adjust source docRef: ROOT_DOC_REF means use the actual root document context
	const effectiveSourceDocRef =
		sourceDocRef === DocumentGraph.ROOT_DOC_REF && rootDocumentContext ? rootDocumentContext.docRef : sourceDocRef;

	const links = findMatchingLinks(
		documentGraph,
		effectiveSourceDocRef,
		relationshipMeta.relationship,
		relationshipMeta.targetRole
	);

	if (links.length === 0) {
		return undefined;
	}

	// Use index as a hint (1-based from model, convert to 0-based).
	// Descriptor verification at the hinted index is authoritative —
	// if it fails, the index is genuinely wrong and we don't guess.
	const hintedIndex = typeof groupInstanceIndex === "number" && groupInstanceIndex > 0 ? groupInstanceIndex - 1 : 0;

	if (hintedIndex >= links.length) {
		return undefined;
	}

	const docRef = extractTargetDocRef(links[hintedIndex], relationshipMeta.targetRole);

	if (docRef === undefined) {
		return undefined;
	}

	return { docRef, linkDocRef: links[hintedIndex].linkDocRef };
}

/**
 * Find all links matching source docRef, relationship model, and target role.
 * All three are verified against the link descriptor, not just source/target matching.
 */
function findMatchingLinks(
	documentGraph: DocumentGraph,
	sourceDocRef: string,
	relationshipModel: string,
	targetRole: string
): DocumentGraph.Link[] {
	const linkIds = documentGraph.links.linkIdsByDocId[sourceDocRef] ?? [];
	const result: DocumentGraph.Link[] = [];

	for (const linkId of linkIds) {
		const link = documentGraph.links.byId[linkId];

		if (!link) {
			continue;
		}

		const descriptor = link.linkRef.linkDescriptor;

		// Verify relationship model matches
		if (descriptor.relationshipModel !== relationshipModel) {
			continue;
		}

		// Verify source docRef and target role are both present in entities
		let hasSource = false;
		let hasTargetRole = false;

		for (const entity of descriptor.entities as Relationship.LinkRef["linkDescriptor"]["entities"]) {
			if (entity.docRef === sourceDocRef) {
				hasSource = true;
			}

			if (entity.role === targetRole) {
				hasTargetRole = true;
			}
		}

		if (hasSource && hasTargetRole) {
			result.push(link);
		}
	}

	return result;
}

function extractTargetDocRef(link: DocumentGraph.Link, targetRole: string): string | undefined {
	for (const entity of link.linkRef.linkDescriptor.entities as Relationship.LinkRef["linkDescriptor"]["entities"]) {
		if (entity.role === targetRole) {
			return entity.docRef ?? undefined;
		}
	}

	return undefined;
}

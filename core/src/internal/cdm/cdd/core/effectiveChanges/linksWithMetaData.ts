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
import { type Relationship as RelationshipServerApi } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { type GroupInstance } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";

import { assertUnreachable } from "../../../../shared/assertion.js";
import { extractLinkDocument } from "../../../../documentGraph/core/index.js";
import { type ChangeLog, type LinkDeleted } from "../../../../documentGraph/core/changeLog/changeLog.js";
import { isLinkRelatedChange } from "../../../../documentGraph/core/changeLog/changeLogImpl.js";
import { type DocumentGraph } from "../../../../documentGraph/core/documentGraph.js";
import { type DgChangeLog } from "../../../../documentGraph/core/slices.js";
import { type DeepReadonly } from "../../../../documentGraph/core/utilityTypes.js";
import { type Relationship } from "../../../../relationship/relationship.js";

/** @internal */
export interface LinkWithMutationMetadataAndTime extends Relationship.LinkWithMutationMetadata {
	time: number;
}

/**
 * @internal
 *
 * Builds a list of links with mutation by computing the effective result of all changes in the changelog.
 */
export function linksWithMetaData(
	dg: DeepReadonly<DocumentGraph>,
	changeLog: DgChangeLog
): LinkWithMutationMetadataAndTime[] {
	// use timestamp in links to sort in ascending order (oldest item comes first)
	return consolidateLinkChanges(dg, changeLog).sort((a, b) => a.time - b.time);
}

function consolidateLinkChanges<S>(
	dg: DeepReadonly<DocumentGraph>,
	changeLog: ChangeLog<S>
): LinkWithMutationMetadataAndTime[] {
	const accumulator: Map<string, Relationship.LinkMutationMetadata | undefined> = new Map();
	const linkRefLookup: { [key: string]: RelationshipServerApi.LinkRef } = {};

	// initialize entries for all existing links
	Object.entries(dg.links.byId).forEach((entry) => {
		accumulator.set(entry[0], undefined);
	});

	changeLog.changes.forEach((change) => {
		if (isLinkRelatedChange(change)) {
			const { linkId, kind } = change;
			const currentMutationState = accumulator.get(linkId)?.mutationState;

			switch (kind) {
				case "linkAdded":
					accumulator.set(linkId, applyLinkAdded(currentMutationState, linkId));
					break;
				case "linkDeleted":
					linkRefLookup[linkId] = (change as LinkDeleted).linkRef;
					accumulator.set(linkId, applyLinkDeleted(currentMutationState, linkId));
					break;
				case "linkDocChanged":
					accumulator.set(linkId, applyLinkDocChanged(currentMutationState, linkId));
					break;
				default:
					assertUnreachable(kind);
			}
		}
	});

	return [...accumulator.entries()].map((entry) => makeLinkWithMetadata(entry[0], entry[1], dg, linkRefLookup));
}

function makeLinkWithMetadata(
	linkId: string,
	lmm: Relationship.LinkMutationMetadata | undefined,
	dg: DeepReadonly<DocumentGraph>,
	linkRefLookup: { [key: string]: RelationshipServerApi.LinkRef }
): LinkWithMutationMetadataAndTime {
	const dgLink = dg.links.byId[linkId];

	const linkRef = dgLink ? (dgLink.linkRef as RelationshipServerApi.LinkRef) : linkRefLookup[linkId];

	const document = dgLink ? (extractLinkDocument(dgLink, dg) ?? ({} as GroupInstance)) : ({} as GroupInstance);
	const metaData = lmm ?? {
		mutationState: "existing",
		modified: false,
		relinked: false
	};

	return {
		link: {
			linkRef,
			document
		},
		time: dgLink ? dgLink.rank : Date.now(),
		// Note: ...dgLinkWithDocRef would copy over linkWithDocRef property, which is too much
		...metaData
	};
}

function applyLinkAdded(
	currentMutationState: Relationship.LinkMutationState | undefined,
	linkId: string
): Relationship.LinkMutationMetadata {
	let mutationState: Relationship.LinkMutationState;
	switch (currentMutationState) {
		case undefined:
			mutationState = "added";
			break;
		case "added":
			throw new Error(`Cannot add the same link [linkId: ${linkId}] twice!`);
		case "existing":
			throw new Error(`Cannot add the existing link [linkId: ${linkId}] twice!`);
		case "withdrawn":
			mutationState = "added";
			break;
		case "removed":
			mutationState = "existing";
			break;
		default:
			assertUnreachable(currentMutationState);
	}
	return { mutationState, modified: false, relinked: false };
}

function applyLinkDocChanged(
	currentMutationState: Relationship.LinkMutationState | undefined,
	linkId: string
): Relationship.LinkMutationMetadata {
	let mutationState: Relationship.LinkMutationState;
	let modified = true;
	switch (currentMutationState) {
		case undefined:
		case "existing":
			mutationState = "existing";
			break;
		case "added":
			modified = false;
			mutationState = currentMutationState;
			break;
		case "withdrawn":
			throw new Error(`Cannot modify withdrawn link [linkId: ${linkId}]!`);
		case "removed":
			throw new Error(`Cannot modify removed link [linkId: ${linkId}]!`);
		default:
			assertUnreachable(currentMutationState);
	}
	return { mutationState, modified, relinked: false };
}

function applyLinkDeleted(
	currentMutationState: Relationship.LinkMutationState | undefined,
	linkId: string
): Relationship.LinkMutationMetadata {
	let mutationState: Relationship.LinkMutationState;
	switch (currentMutationState) {
		case undefined:
			mutationState = "removed";
			break;
		case "added":
			mutationState = "withdrawn";
			break;
		case "existing":
			mutationState = "removed";
			break;
		case "withdrawn":
			throw new Error(`Cannot remove a withdrawn link [linkId: ${linkId}]!`);
		case "removed":
			throw new Error(`Cannot remove an already removed link [linkId: ${linkId}]!`);
		default:
			assertUnreachable(currentMutationState);
	}
	return { mutationState, modified: false, relinked: false };
}

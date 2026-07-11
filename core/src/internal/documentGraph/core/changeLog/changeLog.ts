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
 * @module documentGraph/core
 * @experimental
 */
import type { Relationship as RelationshipServerApi } from "@com.mgmtp.a12.dataservices/dataservices-access";

import type { DocRef } from "../utilityTypes.js";

/**
 * The Change Log (ChLog) records changes to the document graph (excluding the CDD!) for these purposes:
 *
 * 	- **Saving changes to**
 * 		documents and links, including deletions. See also **(1)** below.
 * 	- **Dirty status**
 * 		of the DG and individual documents and link documents.
 * 	- **Listing Links**
 * 		where the change types and order of these changes to a link (including deleted ones)
 * 		are relevant to the display and order in the UI.
 * 	- **Rollback**
 * 		the DG (and Change Log) to a certain state.
 * 		This is used when cancelling a user interaction like "Detached Repeat"
 * 		where multiple changes were done and all of them have to be cancelled.
 *
 * Disclaimer: Change Log is not event sourcing, since information for replay is missing (no payload of actions)
 *
 * The changes *are not the same* as the action payload as the the changes have to always identify
 * the targeted documents and links. For example, the ADD_LINK action does not specify the Link Id,
 * but the associated change holds this Id.
 *
 * **(1) About saving changes:**
 * There are at least two ways to approach this:
 * - (a) one is to translate changes to requests,
 * - (b) the other is identify dirty and deleted documents and links and then derive
 * 		the appropriate request.
 * <br> The later (b) ensures **compaction** of changes, which is quite important.
 * For example in these change logs:
 * <br> `ChangeDoc Id 5,  AddLink (->NEW1), ChangeDoc Id 5, ModifyLink NEW1, DeleteLink NEW1`
 * <br> ==> Resulting requests for Save with approach (b):
 * <br> `MODIFY_DOCUMENT Id 5`
 * <br> The effect of the *implicit compaction* in (b) is obvious.
 */
export interface ChangeLog<SNAPSHOT_TYPE> {
	readonly changes: Change<SNAPSHOT_TYPE>[];
	readonly changeCounter: number;
}

//#region ==== Change and Marker Types ====

export type LinkChange = LinkAdded | LinkDeleted | LinkDocChanged;

export type DocumentChange = DocChanged | DocAdded;

export interface LinkAdded {
	readonly kind: "linkAdded";
	readonly linkId: string;
}

export interface LinkDeleted {
	readonly kind: "linkDeleted";
	readonly linkId: string;
	readonly linkRef: RelationshipServerApi.LinkRef;
}

export interface LinkDocChanged {
	readonly kind: "linkDocChanged";
	readonly linkId: string;
}

export interface DocAdded {
	readonly kind: "docAdded";
	readonly docRef: DocRef;
}

export interface DocChanged {
	readonly kind: "docChanged";
	readonly docRef: DocRef;
}

// Note that it also causes the changeNumber to increment, which is used to trigger the Cdd update
// Thus, if this change kind is removed (or not triggered with ADD_DG), then re-think the Cdd update logic
/**
 * This change is used to mark DG merges, e.g. with dg.SET_DG and cdd.MERGE
 */
export interface DgMerged {
	readonly kind: "dgMerged";
}

export interface Marker<SNAPSHOT_TYPE> {
	readonly kind: "marker";
	readonly id: string;
	readonly snapshot: SNAPSHOT_TYPE; // state before any changes after marker
}

// Note: Rollback is jumping back to the last open marker of a certain markerType without an end marker

export type Change<SNAPSHOT_TYPE> =
	| LinkAdded
	| LinkDeleted
	| LinkDocChanged
	| DocAdded
	| DocChanged
	| DgMerged
	| Marker<SNAPSHOT_TYPE>;

//#endregion

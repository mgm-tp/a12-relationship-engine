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

import type { GroupInstance } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import type { Relationship } from "@com.mgmtp.a12.dataservices/dataservices-access";

import type { DocRef } from "./utilityTypes.js";

/**
 * The Document Graph (DG) is the pure data structure and operations on it.
 *
 * - Change logging is supported through an interface, so that change information
 * can be stored outside of the DG.
 * - Data views like Composed Data Documents (Cdd) are supported by exporting relevant
 * data structures and operations (beyond Redux actions).
 */
export interface DocumentGraph {
	readonly documents: DgDocs;
	readonly links: DgLinks;
}

export interface DgDocs {
	readonly byDocRef: { [docRef: string]: DgDocument };
}

export type LoadingState = "missing" | "loading" | "loaded" | "error";

export type DgDocument =
	| {
			readonly docRef: DocRef;
			readonly document: GroupInstance;
			readonly documentModelName: string;
			readonly loadingState: "loaded";
	  }
	| {
			readonly docRef: DocRef;
			readonly loadingState: Exclude<LoadingState, "loaded">;
	  };

export interface DgLinksById {
	[id: string]: DgLinkInternal;
}

export interface DgLinks {
	readonly byId: DgLinksById;
	readonly linkIdsByDocId: { [docId: string]: string[] | undefined };
}

export interface DgLinkInternal {
	readonly linkRef: Relationship.LinkRef;
	readonly rank: number;
	readonly linkDocRef?: string | null;
}

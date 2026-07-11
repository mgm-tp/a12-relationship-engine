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

import { DocumentPath } from "@com.mgmtp.a12.formengine/formengine-core";
import type { EntityInstancePath } from "@com.mgmtp.a12.kernel/kernel-md-facade";

import type { RelationshipEngineDataHolder } from "../../dataHolder.js";

import type { DocumentResult } from "./docRef.js";

/**
 * Resolves the document reference for a path that falls within a drafting document.
 *
 * When a new row is added via DetachedRepeat, a drafting child document is created
 * (`docAdded`) and tracked as `draftingDocumentRow` on the corresponding
 * `SelectedItemsDataHolder`. Since no link exists yet (it is finalized on commit),
 * neither graph-based nor CDD-based resolution can find the drafting document.
 * @internal
 */
export function resolveDraftingDoc(
	draftingDocs: RelationshipEngineDataHolder.DraftingDocumentRow[] | undefined,
	entityInstancePath: EntityInstancePath
): DocumentResult | undefined {
	if (!draftingDocs || draftingDocs.length === 0) {
		return undefined;
	}

	let bestMatch: (typeof draftingDocs)[number] | undefined;
	let bestMatchLength = 0;

	for (const pending of draftingDocs) {
		const prefixLength = pending.rowInstancePath.length;

		if (prefixLength > entityInstancePath.length || prefixLength <= bestMatchLength) {
			continue;
		}

		if (isPathPrefix(pending.rowInstancePath, entityInstancePath)) {
			bestMatch = pending;
			bestMatchLength = prefixLength;
		}
	}

	if (!bestMatch) {
		return undefined;
	}

	return {
		docRef: bestMatch.docRef,
		documentModelName: bestMatch.documentModelName,
		targetInstancePath: DocumentPath.toString(entityInstancePath.slice(bestMatchLength) as EntityInstancePath)
	};
}

function isPathPrefix(prefix: EntityInstancePath, fullPath: EntityInstancePath): boolean {
	for (let i = 0; i < prefix.length; i++) {
		const prefixSeg = prefix[i];
		const pathSeg = fullPath[i];

		if (prefixSeg.elementName !== pathSeg?.elementName || prefixSeg.index !== pathSeg?.index) {
			return false;
		}
	}

	return true;
}

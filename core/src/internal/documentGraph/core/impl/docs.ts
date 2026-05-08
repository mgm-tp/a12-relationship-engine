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
import { type GroupInstance } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";

import { assertCondition, assertObject } from "../../../shared/assertion.js";

import { type DocumentGraph } from "../documentGraph.js";
import { type DgChange } from "../slices.js";
import { type DeepReadonly, type DocRef } from "../utilityTypes.js";

export function addDocument(
	document: GroupInstance,
	docRef: DocRef,
	documentModelName: string,
	dg: DeepReadonly<DocumentGraph>
): [DeepReadonly<DocumentGraph>, DgChange[]] {
	const newDg = setDocumentInDG(document, docRef, documentModelName, dg);
	const change: DgChange = {
		kind: "docAdded",
		docRef
	};
	return [newDg, [change]];
}

export function changeDocument(
	document: GroupInstance,
	docRef: DocRef,
	dg: DeepReadonly<DocumentGraph>
): [DeepReadonly<DocumentGraph>, DgChange[]] {
	const currentDocument = dg.documents.byDocRef[docRef];
	assertObject(currentDocument, "The document must already exist in the document graph.");
	assertCondition(currentDocument.loadingState === "loaded", "The document must already be in loading state 'loaded'.");
	const newDg = setDocumentInDG(document, docRef, currentDocument.documentModelName, dg);
	const change: DgChange = {
		kind: "docChanged",
		docRef
	};
	return [newDg, [change]];
}

function setDocumentInDG(
	document: GroupInstance,
	docRef: DocRef,
	documentModelName: string,
	dg: DeepReadonly<DocumentGraph>
): DeepReadonly<DocumentGraph> {
	return {
		...dg,
		documents: {
			...dg.documents,
			byDocRef: {
				...dg.documents.byDocRef,
				[docRef]: {
					docRef,
					document,
					documentModelName,
					loadingState: "loaded"
				}
			}
		}
	};
}

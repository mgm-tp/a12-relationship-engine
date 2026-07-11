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

import type { ReferencedModel } from "@com.mgmtp.a12.client/client-core";
import type { EntityInstancePath, FieldInstanceValue } from "@com.mgmtp.a12.kernel/kernel-md-facade";

import { DocumentUtils } from "../../utils/documentUtils.js";
import type { Changelog, DocumentGraph } from "../../state.js";
import { documentLens } from "../lenses/documentGraphLenses.js";

import { findDocumentModel } from "./shared/findDocumentModel.js";

/** @internal */
export function isFieldPatch(change: Changelog.DocChanged): change is Changelog.DocChanged & {
	path: EntityInstancePath;
	value: FieldInstanceValue;
} {
	return Array.isArray(change.path) && Object.prototype.hasOwnProperty.call(change, "value");
}

/** @internal */
export function applyDocChanged(
	documentGraph: DocumentGraph,
	change: Changelog.DocChanged,
	modelsInScene: ReferencedModel.Instance[]
): DocumentGraph {
	const existingDocument = documentGraph.documents.byDocRef[change.docRef];

	if (!existingDocument || existingDocument.loadingState !== "loaded") {
		return documentGraph;
	}

	const documentModel = findDocumentModel(modelsInScene, change.documentModelName);

	if (!documentModel) {
		return documentGraph;
	}

	if (change.document !== undefined) {
		const updatedDocumentNode: DocumentGraph.Document = { ...existingDocument, document: change.document };

		return documentLens(change.docRef).set(updatedDocumentNode)(documentGraph);
	}

	if (!isFieldPatch(change)) {
		return documentGraph;
	}

	const updatedDocumentBody = DocumentUtils.setField(
		existingDocument.document,
		change.path,
		change.value,
		documentModel
	);

	const updatedDocumentNode: DocumentGraph.Document = { ...existingDocument, document: updatedDocumentBody };

	return documentLens(change.docRef).set(updatedDocumentNode)(documentGraph);
}

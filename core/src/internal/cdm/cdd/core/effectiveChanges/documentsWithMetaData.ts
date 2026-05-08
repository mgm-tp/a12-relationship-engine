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

import { assertCondition, assertObject, assertUnreachable } from "../../../../shared/assertion.js";
import { isDocumentRelatedChange } from "../../../../documentGraph/core/changeLog/changeLogImpl.js";
import { type DocumentGraph } from "../../../../documentGraph/core/documentGraph.js";
import { type DgChangeLog } from "../../../../documentGraph/core/slices.js";
import { type DeepReadonly } from "../../../../documentGraph/core/utilityTypes.js";

/**
 * @internal
 */
export type DocumentMutation = "added" | "removed" | "modified";

/**
 * @internal
 */
export interface DocumentWithMutationMetadata {
	readonly document: {
		docRef: string;
		content: {};
		documentModelName: string;
	};
	readonly mutation: DocumentMutation;
}

/**
 * @internal
 *
 * Reduces all document-related changes in the change log to a single mutation
 * per document.
 * During consolidation additions always precede modifications, i.e. if a
 * document was first added and then modified later on, the resulting mutation
 * is "added" with the document state aggregating all modifications.
 *
 * Example change log
 * - docChanged docRef/1
 * - docAdded   docRef/3
 * - docChanged docRef/2
 * - docChanged docRef/2
 * - docChanged docRef/2
 * - docChanged docRef/1
 * - docChanged docRef/3
 * - docChanged docRef/3
 *
 * Result:
 * - docRef/1 "modified"
 * - docRef/2 "modified"
 * - docRef/3 "added"
 */
export function documentsWithMetaData(
	documentGraph: DeepReadonly<DocumentGraph>,
	changeLog: DgChangeLog
): DocumentWithMutationMetadata[] {
	const consolidatedChanges = changeLog.changes.filter(isDocumentRelatedChange).reduce(
		(acc, currentChange) => {
			const { docRef, kind } = currentChange;
			const actualDocument = documentGraph.documents.byDocRef[docRef];
			assertObject(
				actualDocument,
				`Cannot handle addition/change of document [docRef: ${docRef}] that is not part of the document graph!`
			);
			assertCondition(
				actualDocument.loadingState === "loaded",
				"An added or changed document must be in loadingState 'loaded'."
			);
			switch (kind) {
				case "docChanged":
					acc[docRef] = {
						document: {
							docRef,
							content: actualDocument.document,
							documentModelName: actualDocument.documentModelName
						},
						mutation: acc[docRef]?.mutation ?? "modified"
					};
					break;
				case "docAdded":
					assertCondition(
						acc[docRef] === undefined,
						`Cannot handle 'docAdded' change for document [${docRef}] that was already used in earlier changes.`
					);
					acc[docRef] = {
						document: {
							docRef,
							content: actualDocument.document,
							documentModelName: actualDocument.documentModelName
						},
						mutation: "added"
					};
					break;
				default:
					assertUnreachable(kind);
			}

			return acc;
		},
		{} as { [key: string]: DocumentWithMutationMetadata }
	);

	return Object.values(consolidatedChanges);
}

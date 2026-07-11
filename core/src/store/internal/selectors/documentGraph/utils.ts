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

import type { DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade";

import type { DocumentGraph } from "../../state.js";
import { modelNameFromDraftingDocRef } from "../../utils/linkIdAndDocRef.js";

export interface CdmMeta {
	relationship: string;
	targetDocumentModel: string;
	sourceRole: string;
	targetRole: string;
}

export interface RootDocumentContext {
	docRef: string;
	documentModel: DocumentModel;
	documentModelName: string;
}

export type LoadedDocument = Extract<DocumentGraph.Document, { loadingState: "loaded" }>;

/** @internal */
export function isLoadedDocument(entry: DocumentGraph.Document | undefined): entry is LoadedDocument {
	return entry?.loadingState === "loaded";
}

/** @internal */
export function isLinkDocRef(documentGraph: DocumentGraph | undefined, docRef: string): boolean {
	if (!documentGraph) {
		return false;
	}

	return Object.values(documentGraph.links.byId).some((link) => link.linkDocRef === docRef);
}

/** @internal */
export function getRelationshipMeta(group: DocumentModel.Group): CdmMeta | undefined {
	try {
		return extractCdmMetaFromGroup(group);
	} catch {
		return undefined;
	}
}

/** @internal */
export function extractCdmMetaFromGroup(group: DocumentModel.Group): CdmMeta {
	const result: Partial<CdmMeta> = {};

	for (const annotation of group.annotations || []) {
		if (annotation.name === "cdm.relationship") {
			result.relationship = annotation.value;
		} else if (annotation.name === "cdm.targetDocumentModel") {
			result.targetDocumentModel = annotation.value;
		} else if (annotation.name === "cdm.sourceRole") {
			result.sourceRole = annotation.value;
		} else if (annotation.name === "cdm.targetRole") {
			result.targetRole = annotation.value;
		}
	}

	if (!result.relationship || !result.targetDocumentModel || !result.sourceRole || !result.targetRole) {
		throw new Error(`Group ${group.name} is missing required annotations for relationship processing.`);
	}

	return result as CdmMeta;
}

/** @internal */
export function getModelName(docRef: string | undefined | null): string {
	if (!docRef) {
		return "";
	}

	return modelNameFromDraftingDocRef(docRef) ?? docRef.split("/")[0] ?? "";
}

/** @internal */
export function resolveRootDocumentModelName(
	rootEntry: DocumentGraph.Document | undefined,
	fallbackModelName: string
): string {
	if (isLoadedDocument(rootEntry)) {
		return rootEntry.documentModelName;
	}

	return fallbackModelName;
}

/** @internal */
export interface CreateRootDocumentContextArgs {
	documentGraph: DocumentGraph;
	rootDocRef: string | undefined;
	resolveDocumentModel: (modelId: string) => DocumentModel | undefined;
}

/** @internal */
export function createRootDocumentContext(context: CreateRootDocumentContextArgs): RootDocumentContext | undefined {
	const { documentGraph, rootDocRef, resolveDocumentModel } = context;

	if (!rootDocRef) {
		return undefined;
	}

	const entry = documentGraph.documents.byDocRef[rootDocRef];

	if (!isLoadedDocument(entry)) {
		return undefined;
	}

	const documentModel = resolveDocumentModel(entry.documentModelName);

	if (!documentModel) {
		return undefined;
	}

	return {
		docRef: rootDocRef,
		documentModel,
		documentModelName: documentModel.header.id
	};
}

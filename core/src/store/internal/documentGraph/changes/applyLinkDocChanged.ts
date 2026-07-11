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
import type { EntityInstancePath } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import type { ModelGraph } from "@com.mgmtp.a12.dataservices/dataservices-access";

import { linkLens } from "../lenses/documentGraphLenses.js";
import { DocumentUtils } from "../../utils/documentUtils.js";
import type { Changelog, DocumentGraph } from "../../state.js";
// eslint-disable-next-line no-restricted-imports
import { generateLinkDocDocRef } from "../../../../internal/documentGraph/core/impl/links.js";

import { findDocumentModel } from "./shared/findDocumentModel.js";
import { getLinkDocumentModelNameFromGraph } from "./shared/getLinkDocumentModelNameFromGraph.js";

/** @internal */
export function applyLinkDocChanged(
	documentGraph: DocumentGraph,
	change: Changelog.LinkDocChanged,
	modelsInScene: ReferencedModel.Instance[],
	modelGraph?: ModelGraph
): DocumentGraph {
	const existingLink = documentGraph.links.byId[change.linkId];

	if (!existingLink) {
		return documentGraph;
	}

	const linkDocRef = existingLink.linkDocRef ?? generateLinkDocDocRef(change.linkId);
	const existingLinkDocNode: DocumentGraph.Document | undefined = documentGraph.documents.byDocRef[linkDocRef];

	if (change.linkDocument) {
		return applyLinkDocumentReplacement(
			documentGraph,
			change,
			existingLink,
			linkDocRef,
			existingLinkDocNode,
			modelGraph
		);
	}

	if (!isFieldPatch(change)) {
		return documentGraph;
	}

	return applyLinkDocFieldPatch(documentGraph, change, modelsInScene, existingLink, linkDocRef, existingLinkDocNode);
}

function assembleLinkDocUpdate(
	documentGraph: DocumentGraph,
	linkId: string,
	existingLink: DocumentGraph.Link,
	linkDocRef: string,
	document: object,
	documentModelName: string
): DocumentGraph {
	const updatedLink: DocumentGraph.Link = { ...existingLink, linkDocRef };
	const updatedDocumentNode: DocumentGraph.Document = {
		docRef: linkDocRef,
		document,
		documentModelName,
		loadingState: "loaded"
	};

	return {
		...linkLens(linkId).set(updatedLink)(documentGraph),
		documents: {
			byDocRef: { ...documentGraph.documents.byDocRef, [linkDocRef]: updatedDocumentNode }
		}
	};
}

function applyLinkDocumentReplacement(
	documentGraph: DocumentGraph,
	change: Changelog.LinkDocChanged,
	existingLink: DocumentGraph.Link,
	linkDocRef: string,
	existingLinkDocNode: DocumentGraph.Document | undefined,
	modelGraph?: ModelGraph
): DocumentGraph {
	const documentModelName =
		existingLinkDocNode && existingLinkDocNode.loadingState === "loaded"
			? existingLinkDocNode.documentModelName
			: getLinkDocumentModelNameFromGraph(existingLink.linkRef.linkDescriptor.relationshipModel, modelGraph);

	if (!documentModelName || !change.linkDocument) {
		return documentGraph;
	}

	return assembleLinkDocUpdate(
		documentGraph,
		change.linkId,
		existingLink,
		linkDocRef,
		change.linkDocument,
		documentModelName
	);
}

function applyLinkDocFieldPatch(
	documentGraph: DocumentGraph,
	change: Changelog.LinkDocChanged & { documentModelName: string; path: EntityInstancePath },
	modelsInScene: ReferencedModel.Instance[],
	existingLink: DocumentGraph.Link,
	linkDocRef: string,
	existingLinkDocNode: DocumentGraph.Document | undefined
): DocumentGraph {
	const documentModelName =
		existingLinkDocNode && existingLinkDocNode.loadingState === "loaded"
			? existingLinkDocNode.documentModelName
			: change.documentModelName;
	const documentModel = findDocumentModel(modelsInScene, documentModelName);

	if (!documentModel) {
		return documentGraph;
	}

	const baseDocument: object =
		existingLinkDocNode && existingLinkDocNode.loadingState === "loaded" ? existingLinkDocNode.document : {};
	const updatedDocument = DocumentUtils.setField(baseDocument, change.path, change.value, documentModel);

	return assembleLinkDocUpdate(
		documentGraph,
		change.linkId,
		existingLink,
		linkDocRef,
		updatedDocument,
		documentModelName
	);
}

/** @internal */
export function isFieldPatch(change: Changelog.LinkDocChanged): change is Changelog.LinkDocChanged & {
	documentModelName: string;
	path: EntityInstancePath;
} {
	return (
		Array.isArray(change.path) &&
		typeof change.documentModelName === "string" &&
		Object.prototype.hasOwnProperty.call(change, "value")
	);
}

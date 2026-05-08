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

import { type Relationship } from "@com.mgmtp.a12.dataservices/dataservices-access";
import {
	type DocumentModel,
	type EntityInstancePath,
	type FieldInstanceValue
} from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/index.js";
import { type GroupInstance } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";

import { type DeepReadonly, type DocumentGraph } from "../../documentGraph/core/index.js";
import { removeLink } from "../../documentGraph/core/reducers.js";

import { CDD_DOC_REF, getCddDoc, LINK_ID } from "../cdmCommons/cddTechnical.js";
import { DOCUMENT_SERVICE } from "../cdmCommons/documentService.js";

import { type CdmData } from "./cdmData.js";
import { DocumentQuery } from "./documentQuery.js";
import { updateCdd } from "./updateCdd.js";

/** @internal */
export function removeLinkFromCdd(data: CdmData, linkRef: DeepReadonly<Relationship.LinkRef>): CdmData {
	const dataWithLinkRemovedAndUpdatedChangelog: CdmData = {
		...data,
		...removeLink(data, linkRef as Relationship.LinkRef)
	};

	const { cddState, documentGraph } = dataWithLinkRemovedAndUpdatedChangelog;
	const updatedDocumentGraph = removeLinkElementFromCddDocument(cddState, linkRef, documentGraph);

	return updateCdd(data, {
		...dataWithLinkRemovedAndUpdatedChangelog,
		documentGraph: updatedDocumentGraph
	});
}

function removeLinkElementFromCddDocument(
	cddState: CdmData["cddState"],
	linkRef: DeepReadonly<Relationship.LinkRef>,
	documentGraph: DeepReadonly<DocumentGraph>
): DeepReadonly<DocumentGraph> {
	const rootGroup = cddState.cdm.content.modelRoot;
	const cachedCdd = cddState.cachedCdd?.cdd;
	const cdm = cddState.cdm;
	if (!cachedCdd || !rootGroup || !cdm) {
		return documentGraph;
	}

	const cddDocument = getCddDoc(documentGraph);
	let removedPath;
	function visitor(visit: {
		path: EntityInstancePath;
		element?: GroupInstance | FieldInstanceValue;
		modelElement: DocumentModel.Element;
	}): void {
		const { path } = visit;

		if (!cachedCdd) {
			return;
		}
		const value = DOCUMENT_SERVICE.getAssignedObject(cachedCdd, path);
		if (isValidLinkElement(value, linkRef.id)) {
			removedPath = path;
		}
	}
	DocumentQuery.walk(cachedCdd as unknown as GroupInstance, rootGroup, visitor);
	if (!removedPath) {
		return documentGraph;
	}
	const pureValue = DOCUMENT_SERVICE.getAssignedObject(cddDocument, removedPath);
	if (!pureValue) {
		return documentGraph;
	}

	const updatedCdd = DOCUMENT_SERVICE.updateEntityInstance(cddDocument, removedPath, undefined, cdm);

	const byDocRef = { ...documentGraph.documents.byDocRef };
	const updatedByDocRef = {
		...byDocRef,
		[CDD_DOC_REF]: {
			...byDocRef[CDD_DOC_REF],
			document: updatedCdd
		}
	};

	return {
		...documentGraph,
		documents: {
			byDocRef: updatedByDocRef
		}
	};
}

function isValidLinkElement(value: unknown, linkId: string): value is { [LINK_ID]: string } {
	return !!value && typeof value === "object" && LINK_ID in value && value?.[LINK_ID] === linkId;
}

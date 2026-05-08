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
import { type DocumentDescriptor } from "@com.mgmtp.a12.formengine/formengine-core";
import {
	type DocumentModel,
	type EntityInstancePath,
	type GroupInstance
} from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";

import { assertCondition } from "../../../../shared/assertion.js";
import { DocumentUtils } from "../../../../shared/utils.js";
import { type DocRef } from "../../../../documentGraph/core/index.js";
import { T_DOC_REF } from "../../../cdmCommons/cddTechnical.js";
import { DOCUMENT_SERVICE } from "../../../cdmCommons/documentService.js";
import { isRelationshipGroup } from "../../../cdmCommons/relationshipGroup.js";
import {
	assertIsNonRepeatableGroup,
	findModelElementByPath,
	isNonRepeatableGroup,
	queryRootName
} from "../../../commons/modelUtils.js";
import { type CddSlice } from "../../redux/dhReducersImpl.js";

/**
 * @internal
 */
export function getNearestDocumentDescriptor(
	{ cddState }: CddSlice,
	documentPath: EntityInstancePath
): DocumentDescriptor {
	const cdd = cddState.cachedCdd?.cdd;
	if (!cdd) {
		throw new Error(`Invalid cachedCdd state`);
	}
	const [path, docRef] = getNearestDocRef(documentPath, cdd, cddState.cdm);

	const groupInstance = DOCUMENT_SERVICE.getAssignedObject(cdd, path) as GroupInstance;
	assertCondition(docRef !== undefined && typeof groupInstance.modelId === "string");

	return {
		documentId: docRef,
		documentModelName: groupInstance.modelId
	};
}

//#region ==== getDocRefByCddPath ====

/**
 * @internal
 *
 * Returns the value of the `t_docRef` field as referenced by the `documentPath` in the JSON `document`.
 */
export function getDocRefByCddPath(
	documentPath: EntityInstancePath,
	document: GroupInstance,
	documentModel: DocumentModel
): DocRef | undefined {
	const [, docRefOpt] = getNearestDocRef(documentPath, document, documentModel);
	return docRefOpt;
}

function getNearestDocRef(
	documentPath: EntityInstancePath,
	document: GroupInstance,
	documentModel: DocumentModel
): [EntityInstancePath, DocRef | undefined] {
	const docRefOpt = getDocRef(documentPath, document);
	if (docRefOpt !== undefined || documentPath.length === 0) {
		return [documentPath, docRefOpt];
	} else {
		// assert documentPath.length > 0
		// Only go to parent if the current element is NOT a relsh-representing group!
		const elementOpt = findModelElementByPath(documentModel, documentPath);
		if (elementOpt === undefined || (elementOpt.type === "Group" && isRelationshipGroup(elementOpt))) {
			return [documentPath, undefined];
		} else {
			// Remove last path segment and recursively work our way up to the root until we find a t_docRef field...
			const parentDocumentPath = documentPath.slice(0, documentPath.length - 1);
			return getNearestDocRef(parentDocumentPath, document, documentModel);
		}
	}
}

function getDocRef(path: EntityInstancePath, document: GroupInstance): DocRef | undefined {
	const obj = DOCUMENT_SERVICE.getAssignedObject(document, path);
	const _v = DocumentUtils.isGroupInstance(obj) ? obj[T_DOC_REF] : undefined;
	return typeof _v === "string" ? _v : undefined;
}

//#endregion

//#region ==== getDocRefBottomUp ====

/**
 * @internal
 *
 * Beginning at the path of the control or group in the document,
 * use the second `t_docRef` up in the hierarchy (thus, "bottom-up").
 */
export function getSourceDocRefFromTargetDocPath(
	targetDocPath: EntityInstancePath,
	document: GroupInstance,
	documentModel: DocumentModel
): DocRef | undefined {
	const [reducedTargetDocPath] = getNearestDocRef(targetDocPath, document, documentModel);
	if (reducedTargetDocPath.length >= 0) {
		const parentDocPath = reducedTargetDocPath.slice(0, reducedTargetDocPath.length - 1);
		const [, sourceDocRefOpt] = getNearestDocRef(parentDocPath, document, documentModel);
		return sourceDocRefOpt;
	} else {
		return undefined;
	}
}

//#endregion

//#region ==== getDocRefTopDown ====

/**
 * @internal
 *
 * Beginning at the current data context, find a unique group up down in the hierarchy (thus, "top-down")
 * that matches the binding configuration.
 */
export function getDocRefTopDown(
	documentPath: EntityInstancePath,
	relshName: string,
	document: GroupInstance,
	documentModel: DocumentModel
): DocRef | undefined {
	const path = getTargetPathTopDown(documentPath, relshName, documentModel);
	if (path !== undefined) {
		return getSourceDocRefFromTargetDocPath(path, document, documentModel);
	} else {
		return undefined;
	}
}

function getTargetPathTopDown(
	documentPath: EntityInstancePath,
	relshName: string,
	documentModel: DocumentModel
): EntityInstancePath | undefined {
	// in case of a non-cdm child activity, the documentModel will not contain specific annotations
	// to still be able to find the correct sourceDocRef, we just return the path to the "whole document" here
	if (!queryRootName(documentModel)) {
		return [];
	}

	const modelElement = findModelElementByPath(documentModel, documentPath);
	if (modelElement === undefined || modelElement.type !== "Group") {
		return undefined;
	}
	const nonRepeatableSubGroups = modelElement.elements.filter(isNonRepeatableGroup);
	const subgroupIdx = nonRepeatableSubGroups.findIndex(
		(g) => g.annotations?.find(({ name }) => name === "cdm.relationship")?.value === relshName
	);
	if (subgroupIdx >= 0) {
		return [...documentPath, { elementName: nonRepeatableSubGroups[subgroupIdx].name, index: 1 }];
	} else {
		// Recurse search into subgroups
		for (const subGroup of nonRepeatableSubGroups) {
			assertIsNonRepeatableGroup(subGroup);
			const path = [...documentPath, { elementName: subGroup.name, index: 1 }];
			const foundPath = getTargetPathTopDown(path, relshName, documentModel);
			if (foundPath !== undefined) {
				return foundPath;
			}
		}
		return undefined;
	}
}

//#endregion

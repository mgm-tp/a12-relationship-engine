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
 * @experimental
 */
import { type RelationshipModel } from "@com.mgmtp.a12.dataservices/dataservices-access";
import {
	type DocumentModel,
	type EntityInstancePath,
	type GroupInstance
} from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";

import { assertCondition, assertObjectType } from "../../shared/assertion.js";
import { DocumentUtils } from "../../shared/utils.js";

import { findModelElementByPath } from "../commons/modelUtils.js";

import { CDD_DOC_REF, LINKDOC_GROUPNAME, LINK_ID, T_DOC_REF } from "./cddTechnical.js";
import { DOCUMENT_SERVICE } from "./documentService.js";
import { dmGroup2RelationshipGroupInfo } from "./relationshipGroup.js";

interface ChangeLocation {
	/**
	 * Reference to the specific dg element of the changed field
	 * NOTE: for field changes of link documents, this will reference a dg link, not a document!
	 * For changes to "cdm-only" fields, this will be the constant `CDD_DOC_REF`
	 */
	readonly elementRef: string;
	/**
	 * Path to the changed field or group instance (relative to its specific document!)
	 */
	readonly pathToInstance: EntityInstancePath;
	/**
	 * For specific documents, its DM as defined by the CDM
	 * Otherwise, the CDM itself
	 */
	readonly documentModel: DocumentModel;
}

/**
 * - determines a dg document reference for a given field path by walking the document up to the root
 *   looking for a docRef property that holds the reference to it
 * - when such a docRef property is found, checks whether the field is inside
 *   a "relationship" group within that sub-document
 * - in that case, returns the link id
 *
 * ### NOTE about `relationshipModels`:
 *
 * RMs are passed here to be able to find the correct link document model
 *
 * ### NOTE about `documentModels`:
 *
 * All DMs that are used inside the CDM have to be passed here to be able to find out
 * whether a changed field belongs to a specific model or just the CDM.
 *
 * The current logic that collects these models depends on wrong behavior in services (A12S-4585).
 *
 * Currently, a CDM will contain all of its referenced (included) DMs in the modelgraph, which is wrong, because at runtime
 * the cdm is expanded (includes are resolved) and therefore no model references should exist.
 *
 * However, without a (runtime) CDM referencing its included models, the collection mechanism would not be able
 * to find them and therefore they would not "exist" here.
 *
 * Ideally, finding out whether a field is "cdm-only" or not can be read from just the CDM alone.
 * With A12-15613, changing to this approach might be possible.
 * @internal
 */
export function findChangeLocation(
	document: GroupInstance,
	pathToInstance: EntityInstancePath,
	cdm: DocumentModel,
	documentModels: DocumentModel[],
	relationshipModels: RelationshipModel[]
): ChangeLocation {
	let currentPath = pathToInstance;

	while (currentPath.length > 0) {
		const currentGroupInstance = DOCUMENT_SERVICE.getAssignedObject(document, currentPath);
		if (DocumentUtils.isGroupInstance(currentGroupInstance) && currentGroupInstance[T_DOC_REF] !== undefined) {
			// we have found an identifiable sub-document
			// however, we still have to find out whether the field was actually part of the embedded link doc
			const isLinkDocChange = refersToEmbeddedLinkDoc(currentPath);

			const relshGroupInstance = isLinkDocChange ? resolveGroupInstanceHavingLinkId(document, currentPath) : undefined;

			return isLinkDocChange && relshGroupInstance
				? createChangeLocation(relshGroupInstance, currentPath, true)
				: createChangeLocation(currentGroupInstance, currentPath);
		}
		currentPath = parentPath(currentPath);
	}

	return createChangeLocation(document, []);

	function createChangeLocation(
		groupInstance: GroupInstance,
		pathToDocument: EntityInstancePath,
		isLinkDocument?: boolean
	): ChangeLocation {
		// link DMs can only be found "indirectly" via their relationship model
		const matchingDM = isLinkDocument
			? findLinkDM(pathToDocument)
			: documentModels.find((dm) => groupInstance.modelId === dm.header.id);

		// `pathToInstance` refers to a changed instance in the cdd, but for finding the element here,
		// we need the path relative to the *specific* embedded document
		// Since `pathToInstance` equals <path to embedded document of cdd> + <relative path within embedded document>,
		// we can construct the relative path by removing the document path from the "full" `pathToInstance`
		const relativePathToInstance = pathToInstance.slice(pathToDocument.length);

		const existsInSpecificDM = matchingDM && findModelElementByPath(matchingDM, relativePathToInstance) !== undefined;

		return existsInSpecificDM
			? {
					elementRef: groupInstance[isLinkDocument ? LINK_ID : T_DOC_REF] as string,
					pathToInstance: relativePathToInstance,
					documentModel: matchingDM
				}
			: {
					elementRef: CDD_DOC_REF,
					pathToInstance,
					documentModel: cdm
				};
	}

	function findLinkDM(pathToDocument: EntityInstancePath): DocumentModel | undefined {
		// cdm-specific annotations exist on the parent group
		const pathToRelationshipGroup = pathToDocument.slice(0, -1);

		// access the annotations by finding the relationship group in the cdm
		const relationshipGroup = findModelElementByPath(cdm, pathToRelationshipGroup);
		assertCondition(relationshipGroup?.type === "Group");

		// extract the relsh model name to find its link document model
		const { relationship } = dmGroup2RelationshipGroupInfo(relationshipGroup);

		const matchingRM = relationshipModels.find((rm) => rm.header.id === relationship);
		return documentModels.find((dm) => dm.header.id === matchingRM?.content.linkDocumentModel);
	}
}

function refersToEmbeddedLinkDoc(path: EntityInstancePath): boolean {
	return path[path.length - 1].elementName === LINKDOC_GROUPNAME;
}

function parentPath(path: EntityInstancePath): EntityInstancePath {
	return path.length > 0 ? path.slice(0, -1) : path;
}

function resolveGroupInstanceHavingLinkId(document: GroupInstance, linkDocPath: EntityInstancePath): GroupInstance {
	const relshGroupInstance = DOCUMENT_SERVICE.getAssignedObject(document, parentPath(linkDocPath));
	assertObjectType(
		relshGroupInstance,
		DocumentUtils.isGroupInstance,
		"Expected to find a parent group instance for the link doc group instance."
	);
	assertCondition(relshGroupInstance[LINK_ID] !== undefined, "Expected the parent group instance to have the link id.");

	return relshGroupInstance;
}

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

import { type ModelGraph, type RelationshipModel } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { DocumentPath } from "@com.mgmtp.a12.formengine/formengine-core";
import {
	type DocumentModel,
	type EntityInstancePath,
	type GroupInstance
} from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";

import { DocumentUtils } from "../../shared/utils.js";
import { type ChangeDocumentArgs, changeDocument } from "../../documentGraph/core/reducers.js";

import { DOCUMENT_SERVICE } from "../cdmCommons/documentService.js";
import { findChangeLocation } from "../cdmCommons/findChangeLocation.js";
import { isLinkDocGroup } from "../cdmCommons/linkDocumentGroup.js";
import { isRelationshipGroup } from "../cdmCommons/relationshipGroup.js";
import { findModelElementByPath } from "../commons/modelUtils.js";

import { type CdmData } from "./cdmData.js";
import { findDocumentGraphDocument } from "./findDocumentGraphDocument.js";
import { unwrapCdmData } from "./unwrapCdmData.js";
import { updateCdd } from "./updateCdd.js";

/**
 * @experimental
 * @internal
 *
 * Moves the group instance in the dg document of the given data
 * and updates the cdd afterwards.
 */
export function moveGroupInstance(
	data: CdmData,
	path: EntityInstancePath,
	delta: number,
	documentModels: DocumentModel[],
	modelGraph: ModelGraph
): CdmData {
	const cdm = data.cddState.cdm;

	const modelElement = findModelElementByPath(cdm, path);
	if (!modelElement || modelElement.type !== "Group") {
		throw new Error(`Could not find group for path '${DocumentPath.toString(path)}'`);
	}

	if (isRelationshipGroup(modelElement)) {
		throw new Error("Moving relationship group instances is not supported.");
	}

	if (isLinkDocGroup(modelElement, path, cdm)) {
		throw new Error("Moving the link document group instance is not supported.");
	}

	const changeDocumentArgs = getChangeDocumentArgs(data, documentModels, modelGraph.relationshipModels, path, delta);

	const dataWithUpdatedDgAndChangelog: CdmData = {
		...data,
		...changeDocument(data, changeDocumentArgs)
	};

	// update cachedCdd
	return updateCdd(data, dataWithUpdatedDgAndChangelog);
}

function getChangeDocumentArgs(
	data: CdmData,
	documentModels: DocumentModel[],
	relationshipModels: RelationshipModel[],
	path: EntityInstancePath,
	delta: number
): ChangeDocumentArgs {
	const { cdm, cdd, documentGraph } = unwrapCdmData(data);

	const { elementRef, pathToInstance, documentModel } = findChangeLocation(
		cdd,
		path,
		cdm,
		documentModels,
		relationshipModels
	);
	const dgDocument = findDocumentGraphDocument(documentGraph, elementRef);

	return {
		document: moveGroupInstanceInDgDoc(dgDocument, pathToInstance, delta, documentModel),
		elementRef
	};
}

function moveGroupInstanceInDgDoc(
	dgDocument: GroupInstance,
	path: EntityInstancePath,
	delta: number,
	documentModel: DocumentModel
): GroupInstance {
	const rowIndex = path[path.length - 1].index - 1;
	if (rowIndex === undefined) {
		throw new Error("Expected that last segment in document path contains index");
	}

	const groupInstancesPath = DocumentUtils.getGroupInstancesPath(path);

	const groupInstances = DOCUMENT_SERVICE.getAssignedObject(dgDocument, groupInstancesPath);
	if (groupInstances !== null && DocumentUtils.isGroupInstances(groupInstances)) {
		const arrayWithOutMovedInstance = groupInstances.filter((_, index) => index !== rowIndex);
		const updatedGroupInstances = [
			...arrayWithOutMovedInstance.slice(0, rowIndex + delta),
			groupInstances[rowIndex],
			...arrayWithOutMovedInstance.slice(rowIndex + delta)
		];

		return DOCUMENT_SERVICE.updateEntityInstance(dgDocument, groupInstancesPath, updatedGroupInstances, documentModel);
	}

	return dgDocument;
}

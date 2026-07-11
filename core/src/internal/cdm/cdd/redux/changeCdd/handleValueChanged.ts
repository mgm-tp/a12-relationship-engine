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
import type { ModelGraph } from "@com.mgmtp.a12.dataservices/dataservices-access";
import type { DocumentModel, GroupInstance, EntityInstancePath } from "@com.mgmtp.a12.kernel/kernel-md-facade";

import { DocumentUtils } from "../../../../shared/utils.js";
import type { CdmData } from "../../../cddUtils/cdmData.js";
import type { ScdmDataHolderShape } from "../dhReducersImpl.js";
import { DOCUMENT_SERVICE } from "../../../cdmCommons/documentService.js";
import { setValue, type PresentRelationshipsCache } from "../../../cddUtils/setValue.js";
import { assertObject, assertCondition, assertObjectType } from "../../../../shared/assertion.js";

import type { HandleArgs } from "./handleArgs.js";

/**
 * @internal
 *
 * Handles a value change in the cdd by applying the equivalent document change
 * to the DG and updating the cdd afterwards
 *
 * This also works for attachments in the sense that the value changes for the
 * attachment fields can be handled.
 */
export function handleValueChanged(initialState: ScdmDataHolderShape, args: HandleArgs): ScdmDataHolderShape {
	const { document, documentModels, modelGraph, change, cache } = args;

	const initialData = initialState.data;

	if (!initialData) {
		return initialState;
	}

	assertCondition(
		change.type === "ValueChanged" || change.type === "GroupRemoved",
		"Change type doesn't fit handle function!"
	);
	const path = change.path;

	const cdmData: CdmData = {
		documentGraph: initialData.documentGraph,
		changeLog: initialData.changeLog,
		cddState: initialData.cddState
	};

	const updateValue =
		change.type === "GroupRemoved" ? undefined : DOCUMENT_SERVICE.getAssignedObject(document as GroupInstance, path);

	if (DocumentUtils.isGroupInstances(updateValue) && updateValue.length !== 0) {
		throw new Error("Can only handle case of removing all instances of a group.");
	}

	const updatedData = DocumentUtils.isGroupInstances(updateValue)
		? removeAllGroupInstances(cdmData, path, documentModels, modelGraph, cache)
		: setValue(cdmData, updateValue, path, documentModels, modelGraph, undefined, cache);

	return {
		...initialState,
		data: updatedData
	};
}

function removeAllGroupInstances(
	data: CdmData,
	path: EntityInstancePath,
	documentModels: DocumentModel[],
	modelGraph: ModelGraph,
	cache?: PresentRelationshipsCache
): CdmData {
	const cdd = data.cddState.cachedCdd?.cdd;
	assertObject(cdd, "Expected cachedCdd to exist.");

	const existingInstances = DOCUMENT_SERVICE.getAssignedObject(cdd, path);
	assertObjectType(existingInstances, DocumentUtils.isGroupInstances, "Expected group instances.");

	const removalPaths = [...Array(existingInstances.length).keys()].map((i) => [
		...path.slice(0, -1),
		{ elementName: path[path.length - 1].elementName, index: i + 1 }
	]);

	return removalPaths.reduce(
		(currentData, currentPath) =>
			setValue(currentData, undefined, currentPath, documentModels, modelGraph, undefined, cache),
		data
	);
}

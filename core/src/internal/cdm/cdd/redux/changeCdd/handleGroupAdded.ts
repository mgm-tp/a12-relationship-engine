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

import fastDeepEqual from "fast-deep-equal";

import { DocumentPath } from "@com.mgmtp.a12.formengine/formengine-core";
import { type GroupInstance } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";

import { assertCondition, assertObjectType } from "../../../../shared/assertion.js";
import { DocumentUtils } from "../../../../shared/utils.js";
import { addGroupInstance } from "../../../cddUtils/addGroupInstance.js";
import { type CdmData } from "../../../cddUtils/cdmData.js";
import { DOCUMENT_SERVICE } from "../../../cdmCommons/documentService.js";

import { type ScdmDataHolderShape } from "../dhReducersImpl.js";

import { type HandleArgs } from "./handleArgs.js";

/**
 * We can assume the following precondition is met:
 *
 * The added object cannot contain nested objects representing relationships
 *
 * Therefore, a single new document must be added and linked to the parent
 * document.
 *
 * Note: The FE document actually contains empty groups. They are removed
 * again because they might actually belong to sub-docs.
 */
/** @internal */
export function handleGroupAdded(initialState: ScdmDataHolderShape, args: HandleArgs): ScdmDataHolderShape {
	const { document, documentModels, modelGraph, change } = args;

	const initialData = initialState.data;
	if (!initialData) {
		return initialState;
	}

	assertCondition(change.type === "GroupAdded", "Change type doesn't fit handle function!");
	const path = change.path;

	const cdmData: CdmData = {
		documentGraph: initialData.documentGraph,
		changeLog: initialData.changeLog,
		cddState: initialData.cddState
	};

	// obtain new group instance from changed document
	const addedGroupInstance = DOCUMENT_SERVICE.getAssignedObject(document as GroupInstance, path);
	assertObjectType(
		addedGroupInstance,
		DocumentUtils.isGroupInstance,
		`group not found: ${DocumentPath.toString(path)}`
	);

	const updatedData = addGroupInstance(
		cdmData,
		addedGroupInstance,
		change.path,
		documentModels,
		modelGraph,
		args.cache
	);

	return {
		...initialState,
		data: {
			...updatedData
		},
		dirty: linksHaveChanged(initialData, updatedData) || initialState.dirty
	};
}

function linksHaveChanged(prevData: CdmData, nextData: CdmData): boolean {
	return !fastDeepEqual(prevData.documentGraph.links.byId, nextData.documentGraph.links.byId);
}

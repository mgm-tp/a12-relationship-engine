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

import { assertCondition } from "../../../../shared/assertion.js";
import { type CdmData } from "../../../cddUtils/cdmData.js";
import { moveGroupInstance } from "../../../cddUtils/moveGroupInstance.js";

import { type ScdmDataHolderShape } from "../dhReducersImpl.js";

import { type HandleArgs } from "./handleArgs.js";

/**
 * @internal
 *
 * Handles moving regular (non-relationship) group instances in cdm data
 */
export function handleGroupMoved(initialState: ScdmDataHolderShape, args: HandleArgs): ScdmDataHolderShape {
	const { documentModels, modelGraph, change } = args;

	const initialData = initialState.data;
	if (!initialData) {
		return initialState;
	}

	assertCondition(change.type === "GroupMoved", "Change type doesn't fit handle function!");

	const cdmData: CdmData = {
		documentGraph: initialData.documentGraph,
		changeLog: initialData.changeLog,
		cddState: initialData.cddState
	};

	const updatedData = moveGroupInstance(cdmData, change.path, change.delta, documentModels, modelGraph);

	return {
		...initialState,
		data: {
			...updatedData
		}
	};
}

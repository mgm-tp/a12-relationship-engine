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

import { assertCondition } from "../../../../shared/assertion.js";

import { type ScdmDataHolderShape } from "../dhReducersImpl.js";

import { type HandleArgs } from "./handleArgs.js";
import { handleValueChanged } from "./handleValueChanged.js";

/**
 * Handles a group removed change in the cdd by applying the equivalent document
 * change to the DG and updating the cdd afterwards.
 *
 * Note: A group removed change cannot occur for relationship-bound groups since
 * they are not rendered as form engine repeats but as relationship ui
 * components that not do fire "GroupRemoved" changes. That's why, these changes
 * can be handled like any other change to a document by apply the
 * handleValueChanged function.
 */
/** @internal */
export function handleGroupRemoved(initialState: ScdmDataHolderShape, args: HandleArgs): ScdmDataHolderShape {
	const { change } = args;

	assertCondition(change.type === "GroupRemoved", "Change type doesn't fit handle function!");

	const cdm = initialState.data?.cddState.cdm;
	if (cdm === undefined) {
		return initialState;
	}

	return handleValueChanged(initialState, {
		...args,
		change: { type: "GroupRemoved", path: change.path }
	});
}

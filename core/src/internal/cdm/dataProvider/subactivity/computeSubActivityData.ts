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
 * @module cdm/data-provider
 * @experimental
 */

import type { DgSlice, DgChangeLogSlice } from "../../../documentGraph/core/index.js";

import { dgForNewEntity } from "./dg-for-new-entity.js";

/** @internal */
export interface NewLinkDescriptorSpecs {
	readonly relationshipModel: string;
	readonly sourceDocRef: string;
	readonly sourceRole: string;
	readonly targetDocRef: string;
	readonly targetModel: string;
	readonly targetRole: string;
}

/**
 * @internal
 *
 * Computes the data that the sub activity of a CDM activity is initialized
 * with.
 *
 * If the sub activity is used to edit an already existing entity, the parent
 * data (document graph and change log) are simply copied into the sub activity.
 *
 * If the sub activity is used to create and link a new entity, the parent
 * data is extended with a new document and a link to that new document and then
 * copied into the sub activity.
 *
 * At this point, it is unknown whether or not the sub activity will again use
 * a CDM. That is why the CDD cannot be initialized here.
 *
 * Note: The parent activity data is only modified when the sub activity is
 * saved.
 */
export function computeSubActivityData(
	parentData: DgSlice & DgChangeLogSlice,
	addition?: NewLinkDescriptorSpecs
): DgSlice & DgChangeLogSlice {
	return addition
		? dgForNewEntity(
				parentData,
				addition.targetModel,
				addition.relationshipModel,
				addition.sourceDocRef,
				addition.sourceRole,
				addition.targetDocRef,
				addition.targetRole
			)
		: parentData;
}

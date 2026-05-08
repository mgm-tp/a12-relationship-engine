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

import { type DgChangeLogSlice, type DgSlice } from "../../../documentGraph/core/index.js";
import { addDocument, addLink } from "../../../documentGraph/core/reducers.js";

/**
 * @internal
 *
 * Extends the given document graph and change log with a new (empty) document
 * and a link to that new document.
 *
 * The given targetDocRef parameter specifies the internal reference to the new
 * document in the DG and the "right" side of the link to the new document.
 */
export function dgForNewEntity(
	parentData: DgSlice & DgChangeLogSlice,
	documentModelName: string,
	relationshipModel: string,
	sourceDocRef: string,
	sourceRole: string,
	targetDocRef: string,
	targetRole: string
): DgSlice & DgChangeLogSlice {
	const newDocument = {
		document: {},
		documentModelName,
		elementRef: targetDocRef
	};
	const newLink = {
		linkDescriptor: {
			relationshipModel: relationshipModel,
			entities: [
				{
					docRef: sourceDocRef,
					role: sourceRole
				},
				{
					docRef: targetDocRef,
					role: targetRole
				}
			]
		}
	};

	return addLink(addDocument(parentData, newDocument), newLink);
}

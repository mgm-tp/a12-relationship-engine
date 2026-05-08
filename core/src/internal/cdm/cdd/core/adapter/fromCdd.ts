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
import { type GroupInstance } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";

import { LINK_ID, T_DOC_REF } from "../../../cdmCommons/cddTechnical.js";

import { type CddState } from "../cddState.js";

/**
 * @internal
 */
export interface DocumentGraphReferences {
	linkIds: string[];
	docRefs: string[];
}

/**
 * @internal
 */
export function fromCdd(cddState: CddState): DocumentGraphReferences {
	const linkIds = new Set<string>();
	const docRefs = new Set<string>();

	findLinksAndDocsInGroupInstance(cddState.cachedCdd?.cdd as GroupInstance);

	return {
		linkIds: [...linkIds],
		docRefs: [...docRefs]
	};

	function findLinksAndDocsInGroupInstance(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		currentObject: any
	): void {
		if (!currentObject || typeof currentObject !== "object") {
			return;
		}
		for (const [key, value] of Object.entries(currentObject)) {
			if (key === T_DOC_REF) {
				docRefs.add(value as string);
			} else if (key === LINK_ID) {
				linkIds.add(value as string);
			} else if (typeof value !== "object") {
				// ignore primitive types since they can only be field instance values
				continue;
			} else {
				if (Array.isArray(value)) {
					// this must be a repeatable group or some other array
					for (const item of value) {
						findLinksAndDocsInGroupInstance(item);
					}
				} else {
					findLinksAndDocsInGroupInstance(value);
				}
			}
		}
	}
}

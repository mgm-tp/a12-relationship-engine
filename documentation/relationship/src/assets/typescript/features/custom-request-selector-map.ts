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

// tag::requestSelectorMap[]

import { Query } from "@com.mgmtp.a12.dataservices/dataservices-access";
import {
	createCddDataProvider,
	DefaultRequestSelectorMap,
	RelationshipFactories,
	type RequestSelectorMap
} from "@com.mgmtp.a12.relationshipengine/relationshipengine-core";

/**
 * Extend the default RequestSelectorMap with small tweaks.
 *
 * - Add a default sort to loadCandidates/loadLinks when none is provided.
 * - Keep all other behaviors (including locale resolution for document mutations) intact by
 *   spreading the DefaultRequestSelectorMap.
 */
export const CustomRequestSelectorMap: RequestSelectorMap = {
	...DefaultRequestSelectorMap,
	loadCandidates: (config) => {
		const customSort: Query.Order[] = config.sort?.length
			? config.sort
			: [
					{
						field: "/product/sku",
						direction: Query.Direction.DESC,
						ignoreCase: false,
						nullHandling: Query.NullHandling.NULLS_LAST
					}
				];
		return DefaultRequestSelectorMap.loadCandidates({ ...config, sort: customSort });
	},
	loadLinks: (config) => {
		let constraint = config.constraint;
		if (config.targetDocumentModel === "Contract-document") {
			const mustBeActive: Query.ExactMatchOperator = {
				operator: Query.OPERATORS.EXACT_MATCH_OPERATOR,
				field: "/contract/status",
				value: "ACTIVE"
			};
			constraint = constraint
				? { operator: Query.OPERATORS.AND_OPERATOR, operands: [constraint, mustBeActive] }
				: mustBeActive;
		}
		return DefaultRequestSelectorMap.loadLinks({ ...config, constraint });
	}
};
// end::requestSelectorMap[]

// tag::injectRelationship[]

// Provide the custom map to the Relationship data provider
RelationshipFactories.createRelationshipDataProvider({ requestSelectorMap: CustomRequestSelectorMap });
// end::injectRelationship[]

// tag::injectCdm[]

// Provide the same custom map to the CDM data provider
createCddDataProvider({ requestSelectorMap: CustomRequestSelectorMap });
// end::injectCdm[]

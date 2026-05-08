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

import { Query } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { type DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/index.js";
import {
	FieldBasedFiltering,
	SortingOrder,
	type OverviewModel
} from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import { type Locale } from "@com.mgmtp.a12.utils/utils-localization/lib/main/index.js";

import { type Relationship } from "../relationship/index.js";

// Temporary workaround to because the toOperators function shouldn't read an OverviewModel anyway
// The upcoming RE will support query model as a mandatory feature so this will be reworked soon
const EMPTY_OVERVIEW_MODEL: OverviewModel = {} as unknown as OverviewModel;

/** @internal */
export function createFilterOperand(
	linkQuery: Relationship.Query,
	documentModel: DocumentModel,
	locale: Locale
): Query.Operator | undefined {
	const filters = FieldBasedFiltering.toOperators(
		linkQuery.filter?.filters ?? {},
		{ overviewModel: EMPTY_OVERVIEW_MODEL, documentModel },
		locale
	);

	if (linkQuery.filter?.fulltext && linkQuery.filter.fulltext !== "") {
		filters.push({
			operator: Query.OPERATORS.SIMPLE_SEARCH_OPERATOR,
			value: linkQuery.filter?.fulltext
		});
	}

	if (filters.length === 0) {
		return undefined;
	}

	if (filters.length === 1) {
		return filters[0];
	}

	return {
		operator: Query.OPERATORS.AND_OPERATOR,
		operands: filters
	};
}

/** @internal */
export function createLinkConstraint(docRef: string): Query.Operator {
	return {
		operator: Query.OPERATORS.EXACT_MATCH_OPERATOR,
		field: "/__meta/docRef",
		value: docRef
	};
}

/** @internal */
export function createSortConstraint(sorting: Relationship.SortClause[]): Query.Order[] {
	return sorting.map((s) => ({
		field: s.path,
		direction: s.order === SortingOrder.ASC ? Query.Direction.ASC : Query.Direction.DESC,
		nullHandling: Query.NullHandling.NULLS_LAST,
		ignoreCase: true
	}));
}

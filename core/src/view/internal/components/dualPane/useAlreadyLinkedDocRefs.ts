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

import React from "react";
import { useSelector } from "react-redux";

import { Activity, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import { Links as OELinks } from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import { RelationshipEngineDataHolder } from "../../../../store/index.js";

const EMPTY_SET: ReadonlySet<string> = new Set<string>();

/**
 * Returns the set of candidate docRefs that are already linked via the server-provided OE Links.
 * @internal
 */
export function useAlreadyLinkedDocRefs(
	activityId: string,
	availableItemsDataHolderDescriptor: Activity.DataHolderDescriptor,
	relationshipName: string
): ReadonlySet<string> {
	const selector = React.useMemo(() => {
		return ActivitySelectors.activityPropById(activityId, function selectAlreadyLinked(activity) {
			const dataHolder = activity?.dataHolders
				.filter(Activity.DataHolder.hasDescriptor(availableItemsDataHolderDescriptor))
				.find(RelationshipEngineDataHolder.AvailableItemsDataHolder.isInstance);

			if (!dataHolder?.data?.links) {
				return EMPTY_SET;
			}

			const result = OELinks.getSourceDocRefsForRelationship(relationshipName)(dataHolder?.data?.links);

			return result.size > 0 ? result : EMPTY_SET;
		});
	}, [activityId, availableItemsDataHolderDescriptor, relationshipName]);

	return useSelector(selector) ?? EMPTY_SET;
}

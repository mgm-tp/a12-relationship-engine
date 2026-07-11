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
 * @module relationship
 */

import type { RelationshipJsonRpc2request } from "@com.mgmtp.a12.dataservices/dataservices-access";

import type { Relationship as RelationshipClientApi } from "../../../relationship.js";
import type { RequestSelectorMap } from "../../../../server-connectors/request-selector-map.js";

/* @internal */
export function createMutationRequests(
	mutations: RelationshipClientApi.Mutation[],
	activityId: string,
	state: object,
	requestSelectorMap: RequestSelectorMap
): LinkChangedRequest[] {
	/**
	 * In generation 1 only upperLimit is validated. When upperLimit = 1 and the user replaces a link,
	 * the ADD_LINK operation shouldn't be performed before the DELETE_LINK operations. Otherwise the server
	 * will return an "upperLimit reached" exception when performing the first operation.
	 *
	 * In further generations of the relationships feature this should be fixed on the server.
	 */
	return mutations
		.flatMap((m): LinkChangedRequest[] => {
			switch (m.mutationState) {
				case "added":
					return m.link.document
						? [
								requestSelectorMap.addLink({
									activityId,
									id: m.link.linkRef.id,
									linkRef: m.link.linkRef,
									linkDocument: m.link.document.relationship as object | undefined
								})(state)
							]
						: [];

				case "existing":
					return m.modified
						? [
								requestSelectorMap.modifyLink({
									activityId,
									id: m.link.linkRef.id,
									linkRef: m.link.linkRef,
									linkDocument: m.link.document.relationship as object | undefined
								})(state)
							]
						: [];

				case "removed":
					return [
						requestSelectorMap.deleteLink({
							activityId,
							id: m.link.linkRef.id,
							linkRef: m.link.linkRef
						})(state)
					];

				default:
					return [];
			}
		})
		.sort(byMethod);
}

/* @internal */
export type LinkChangedRequest =
	| RelationshipJsonRpc2request.DeleteLinkJsonRpc2request
	| RelationshipJsonRpc2request.ModifyLinkJsonRpc2request
	| RelationshipJsonRpc2request.AddLinkJsonRpc2request;

const ORDER: Record<LinkChangedRequest["method"], number> = {
	DELETE_LINK: 1,
	ADD_LINK: 2,
	MODIFY_LINK: 3
};

function byMethod(req1: LinkChangedRequest, req2: LinkChangedRequest): number {
	return ORDER[req1.method] - ORDER[req2.method];
}

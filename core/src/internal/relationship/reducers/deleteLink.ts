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
import { type Action } from "typescript-fsa";

import { type Activity } from "@com.mgmtp.a12.client/client-core";

import { type RelationshipActions } from "../actions.js";
import { type Relationship } from "../relationship.js";

/** @internal */
export function handleDeleteLink(
	dataHolder: Activity.DataHolder<Relationship.Mutation[]>,
	action: Action<RelationshipActions.Commands.DeleteLinkPayload>
): Activity.DataHolder<Relationship.Mutation[]> {
	const { link } = action.payload;

	const mutations = dataHolder.data ?? [];
	const mutationExists = mutations.some(linkMutationExists(link));

	const updatedMutations = mutationExists
		? mutations.map(applyChange(link))
		: [
				...mutations,
				{
					link,
					mutationState: "removed" as const,
					relinked: false,
					modified: false
				}
			];

	return {
		...dataHolder,
		data: updatedMutations,
		dirty: true
	};
}

function linkMutationExists(link: Relationship.LinkWithDocument): (mutation: Relationship.Mutation) => boolean {
	return (mutation) =>
		mutation.link.linkRef.id === link.linkRef.id &&
		(mutation.mutationState === "added" || mutation.mutationState === "existing");
}

function applyChange(link: Relationship.LinkWithDocument): (mutation: Relationship.Mutation) => Relationship.Mutation {
	return (mutation) =>
		linkMutationExists(link)(mutation)
			? {
					...mutation,
					mutationState: mutation.mutationState === "existing" ? "removed" : "withdrawn",
					relinked: false
				}
			: mutation;
}

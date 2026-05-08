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
import { type SagaIterator } from "redux-saga";
import { call, put, takeLatest } from "typed-redux-saga";
import { type Action } from "typescript-fsa";

import { ActivityActions } from "@com.mgmtp.a12.client/client-core";
import { type Relationship as RelationshipServerApi } from "@com.mgmtp.a12.dataservices/dataservices-access";

import { assertObject } from "../../shared/assertion.js";

import { RelationshipActions } from "../actions.js";
import { type Relationship } from "../relationship.js";
import { removeModelNameFromEntities } from "../shared.js";

import {
	createLinkDocument,
	findLinkDocumentModelName,
	findRelinkableLink,
	handleAddLink,
	isDuplicatesAllowed
} from "./addLink.js";

/** @internal */
export function* addLinkRequestedSaga(): SagaIterator<void> {
	yield* takeLatest(RelationshipActions.Events.addLinkRequested, handleAddLinkRequested);
}

function* handleAddLinkRequested(
	action: Action<RelationshipActions.Events.AddLinkRequestedPayLoad>
): SagaIterator<void> {
	const { activityId, instanceId } = action.payload;

	const candidate: Relationship.Candidate = {
		...(action.payload.candidate as Relationship.Candidate),
		linkRef: {
			...action.payload.candidate.linkRef,
			linkDescriptor: removeModelNameFromEntities(action.payload.candidate.linkRef.linkDescriptor)
		} as RelationshipServerApi.LinkRef
	};

	const linkDocumentModelName = yield* call(findLinkDocumentModelName, candidate);
	if (!linkDocumentModelName) {
		yield* call(handleAddLink, action);
		return;
	}

	try {
		const duplicatesAllowed = yield* call(isDuplicatesAllowed, candidate.linkRef.linkDescriptor.relationshipModel);
		let linkDocument: object | undefined;
		if (duplicatesAllowed) {
			linkDocument = yield* call(createLinkDocument, activityId, candidate);
		} else {
			const relinkableLink = yield* call(findRelinkableLink, activityId, candidate);
			linkDocument = relinkableLink
				? (relinkableLink.document.relationship as object)
				: yield* call(createLinkDocument, activityId, candidate);
		}

		assertObject(linkDocument);
		const editLink: Relationship.LinkWithDocument = {
			document: {
				...candidate.document,
				relationship: linkDocument
			},
			linkRef: {
				linkDescriptor: candidate.linkRef.linkDescriptor,
				id: "TMP_EDIT_LINK"
			}
		};

		yield* put(
			RelationshipActions.Commands.setEditLink({
				activityId,
				instanceId,
				link: editLink
			})
		);
	} catch (error) {
		yield* put(ActivityActions.error({ activityId, error, operationType: "loading" }));
	}
}

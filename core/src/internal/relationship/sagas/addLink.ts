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
import { call, put, select, takeLatest } from "typed-redux-saga";
import { type Action } from "typescript-fsa";

import {
	type Activity,
	ActivityActions,
	NEW_INSTANCE_IDENTIFIER,
	ModelSelectors
} from "@com.mgmtp.a12.client/client-core";

import { RelationshipActions } from "../actions.js";
import { Relationship } from "../relationship.js";
import { RelationshipSelectors } from "../selectors.js";
import { type RelationshipDocument } from "../ui/components/api.js";

/** @internal */
export function* addLinkSaga(): SagaIterator<void> {
	yield* takeLatest(RelationshipActions.Events.linkAdded, handleAddLink);
}

/** @internal */
export function* handleAddLink(
	action: Action<RelationshipActions.Events.AddLinkRequestedPayLoad | RelationshipActions.Events.LinkAddedPayload>
): SagaIterator<void> {
	const { activityId, candidate, instanceId } = action.payload;

	try {
		const {
			linkRef: {
				linkDescriptor: { relationshipModel: relationshipName }
			}
		} = candidate;

		const duplicatesAllowed = yield* call(isDuplicatesAllowed, relationshipName);

		if (duplicatesAllowed) {
			yield* call(createLink, activityId, instanceId, candidate as Relationship.Candidate);
		} else {
			const mutations = yield* select(
				RelationshipSelectors.mutations({
					activityId,
					relationship: relationshipName
				})
			);
			if (mutations === undefined) {
				throw new Error(`Mutations for relationship ${relationshipName} cannot be found.`);
			}

			const relinkableLink = yield* call(findRelinkableLink, activityId, candidate as Relationship.Candidate);
			if (relinkableLink) {
				yield* put(
					RelationshipActions.Commands.relinkLink({
						activityId,
						link: relinkableLink
					})
				);
				yield* put(
					RelationshipActions.Commands.modifyLink({
						activityId,
						link: {
							...relinkableLink,
							document: candidate.document as RelationshipDocument
						}
					})
				);
			} else {
				yield* call(createLink, activityId, instanceId, candidate as Relationship.Candidate);
			}
		}
	} catch (error) {
		yield* put(ActivityActions.error({ activityId, error, operationType: "loading" }));
	}
}

/** @internal */
export function* isDuplicatesAllowed(relationshipName: string): SagaIterator<boolean> {
	const model = yield* select(ModelSelectors.modelByName(relationshipName, Relationship.isRelationshipModel));

	if (model === undefined) {
		throw new Error(`No relationship model node can be found for ${relationshipName}`);
	}

	return model.content.duplicatesAllowed;
}

/** @internal */
export function* findRelinkableLink(
	activityId: string,
	candidate: Relationship.Candidate
): SagaIterator<Relationship.LinkWithDocument | undefined> {
	const {
		linkRef: {
			linkDescriptor: { relationshipModel: relationshipName }
		}
	} = candidate;

	const mutations = yield* select(
		RelationshipSelectors.mutations({
			activityId,
			relationship: relationshipName
		})
	);
	if (mutations === undefined) {
		throw new Error(`Mutations for relationship ${relationshipName} cannot be found.`);
	}

	const relinkableMutation = mutations.find(
		(mutation) =>
			(mutation.mutationState === "removed" || mutation.mutationState === "withdrawn") &&
			Relationship.isLinkDescriptorEqual(mutation.link.linkRef.linkDescriptor, candidate.linkRef.linkDescriptor)
	);

	return relinkableMutation && relinkableMutation.link;
}

function* createLink(activityId: string, instanceId: string, candidate: Relationship.Candidate): SagaIterator<void> {
	const linkDocument =
		candidate.document.relationship !== undefined
			? candidate.document.relationship
			: yield* call(createLinkDocument, activityId, candidate);

	const baseDocument = { ...candidate.document };
	const document = linkDocument ? { ...baseDocument, relationship: linkDocument } : baseDocument;

	yield* put(
		RelationshipActions.Commands.addLink({
			activityId,
			instanceId,
			candidate: { ...candidate, document }
		})
	);
}

/** @internal */
export function* createLinkDocument(
	activityId: string,
	candidate: Relationship.Candidate
): SagaIterator<Activity.Data.Document | undefined> {
	const linkDocumentModelName = yield* call(findLinkDocumentModelName, candidate);
	if (!linkDocumentModelName) {
		return undefined;
	}
	return { id: NEW_INSTANCE_IDENTIFIER, modelId: linkDocumentModelName };
}

/** @internal */
export function* findLinkDocumentModelName(candidate: Relationship.Candidate): SagaIterator<string | null> {
	const {
		linkRef: {
			linkDescriptor: { relationshipModel: relationshipName }
		}
	} = candidate;

	const model = yield* select(ModelSelectors.modelByName(relationshipName, Relationship.isRelationshipModel));

	if (model === undefined) {
		throw new Error(`No relationship model node can be found for ${relationshipName}`);
	}

	return model.content.linkDocumentModel ?? null;
}

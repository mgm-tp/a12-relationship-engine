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

import type { FormActivity } from "@com.mgmtp.a12.formengine/formengine-core";
import type { Action } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";
import { type Activity, NEW_INSTANCE_IDENTIFIER } from "@com.mgmtp.a12.client/client-core";

import type { RelationshipActions } from "../actions.js";
import { DocumentProcessors } from "../platform/document-processor.js";
import { Relationship as RelationshipClientApi } from "../relationship.js";

import { handleSetLinks } from "./setLinks.js";
import { handleSetLinkPage } from "./setLinkPage.js";
import { handleSetCandidates } from "./setCandidates.js";
import { handleSetCandidatePage } from "./setCandidatePage.js";

/**
 * Updates dataholders after a document was changed/created
 *
 * - Update the default dataholder if needed
 * - Update candidate/link dataholders with new server data
 * - Reset mutation dataholder
 *
 * @internal
 */
export function handleDataSaved(
	dhs: Activity.DataHolder[],
	{ payload }: Action<RelationshipActions.Commands.DataSavedPayload>,
	defaultDh?: Activity.DataHolder
): Activity.DataHolder[] {
	return dhs.map((dh) =>
		defaultDh === dh
			? applyDocumentChangeToDefaultDh(dh, payload)
			: RelationshipClientApi.CandidateDataHolder.isInstance(dh)
				? setCandidates(dh, payload)
				: RelationshipClientApi.LinkDataHolder.isInstance(dh)
					? setLinks(dh, payload)
					: RelationshipClientApi.MutationDataHolder.isInstance(dh)
						? { ...dh, data: [], dirty: false }
						: dh
	);
}

function applyDocumentChangeToDefaultDh(
	dh: Activity.DataHolder,
	{ documentId, documentModel }: RelationshipActions.Commands.DataSavedPayload
): Activity.DataHolder {
	return {
		...dh,
		loadingState: "loaded",
		error: undefined, // reset error in case we stay in the form
		busy: false,
		data: documentId
			? {
					...dh.data,
					document: {
						...DocumentProcessors.postLoad((dh.data as FormActivity.Data.SingleDocumentData).document, documentModel),
						id: documentId
					}
				}
			: dh.data
	};
}

function setCandidates(
	dh: Activity.DataHolder<RelationshipClientApi.CandidateInstance>,
	savePayload: RelationshipActions.Commands.DataSavedPayload
): Activity.DataHolder<RelationshipClientApi.CandidateInstance> {
	const { candidatePayloads, setPagePayloads } = savePayload;
	const payload = candidatePayloads?.find((p) =>
		RelationshipClientApi.CandidateDataHolder.isInstanceById(p.instanceId)(dh)
	);

	const updatedDh = updateSourceEntityDocRefIfNotSet(dh, savePayload);
	const newCandidatesDh = payload ? handleSetCandidates(updatedDh, payload) : updatedDh;

	const pagePayload = setPagePayloads?.find((p) =>
		RelationshipClientApi.CandidateDataHolder.isInstanceById(p.instanceId)(dh)
	);

	return pagePayload?.type === "candidate" ? handleSetCandidatePage(newCandidatesDh, pagePayload) : newCandidatesDh;
}

function setLinks(
	dh: Activity.DataHolder<RelationshipClientApi.LinkInstance>,
	savePayload: RelationshipActions.Commands.DataSavedPayload
): Activity.DataHolder<RelationshipClientApi.LinkInstance> {
	const { linkPayloads, setPagePayloads } = savePayload;
	const payload = linkPayloads?.find((p) => RelationshipClientApi.LinkDataHolder.isInstanceById(p.instanceId)(dh));

	const updatedDh = updateSourceEntityDocRefIfNotSet(dh, savePayload);
	const newLinksDh = payload ? handleSetLinks(updatedDh, payload) : updatedDh;

	const pagePayload = setPagePayloads?.find((p) =>
		RelationshipClientApi.LinkDataHolder.isInstanceById(p.instanceId)(dh)
	);

	return pagePayload?.type === "link" ? handleSetLinkPage(newLinksDh, pagePayload) : newLinksDh;
}

function updateSourceEntityDocRefIfNotSet<T extends Pick<RelationshipClientApi.LinkInstance, "sourceEntity">>(
	dh: Activity.DataHolder<T>,
	savePayload: RelationshipActions.Commands.DataSavedPayload
) {
	if (dh.data && dh.data.sourceEntity.docRef === NEW_INSTANCE_IDENTIFIER && savePayload.documentId) {
		return {
			...dh,
			data: {
				...dh.data,
				sourceEntity: {
					...dh.data.sourceEntity,
					docRef: savePayload.documentId
				}
			}
		};
	}

	return dh;
}

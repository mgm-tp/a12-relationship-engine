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

import { put, race, take, select, type SagaGenerator } from "typed-redux-saga";

import { ActivityActions, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";

import type { Changelog } from "../../../../store/index.js";
import { ModelSelectors } from "../../../../store/index.js";
import { ThumbnailSelectors } from "../../../../store/index.js";
import { buildOpenLinkFormAction } from "../../../../store/index.js";
import { RelationshipEngineActions } from "../../../../store/index.js";
import { RelationshipEngineDataHolder } from "../../../../store/index.js";

/**
 * For each `linkAdded` entry in `missing`, opens the link document form dialog at save time
 * and waits for the user to confirm or cancel.
 *
 * Entries are processed in order. If the user cancels any dialog the whole sequence is
 * aborted and `"cancelled"` is returned; the changelog is left untouched so the user can
 * retry the save. Returns `"confirmed"` once every entry has been filled.
 *
 * @internal
 */
export function* promptLinkDocumentForm(
	activityId: string,
	missing: Changelog.LinkAdded[]
): SagaGenerator<"confirmed" | "cancelled"> {
	for (const entry of missing) {
		const result = yield* promptSingleLinkDocument(activityId, entry);

		if (result === "cancelled") {
			return "cancelled";
		}
	}

	return "confirmed";
}

function* promptSingleLinkDocument(
	activityId: string,
	entry: Changelog.LinkAdded
): SagaGenerator<"confirmed" | "cancelled"> {
	const entities = entry.linkRef.linkDescriptor.entities;
	const relationshipName = entry.linkRef.linkDescriptor.relationshipModel;

	// Find a data holder for this relationship to get the link form model configuration.
	const dataHolder = yield* select(
		ActivitySelectors.activityPropById(activityId, (a) =>
			a.dataHolders
				.filter(
					(dh) =>
						RelationshipEngineDataHolder.AvailableItemsDataHolder.isInstance(dh) ||
						RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance(dh)
				)
				.find(
					(dh) =>
						RelationshipEngineDataHolder.Slices.isInstance(dh.slices) &&
						dh.slices.uiConfiguration.relationshipName === relationshipName &&
						entities.find((e) => e.docRef === dh.slices.sourceEntity.docRef)
				)
		)
	);

	if (!dataHolder || !RelationshipEngineDataHolder.Slices.isInstance(dataHolder.slices)) {
		// No data holder found for this relationship — skip (no form can be shown).
		return "confirmed";
	}

	const linkFormModels = yield* select(ModelSelectors.linkFormModels(activityId, dataHolder.descriptor));

	if (!linkFormModels) {
		// No link form configured for this relationship — skip.
		return "confirmed";
	}

	const { formModel, documentModel } = linkFormModels;

	const sourceRole = dataHolder.slices.sourceEntity.role;
	const sourceEntity = entry.linkRef.linkDescriptor.entities.find((e) => e.role === sourceRole);
	const targetEntity = entry.linkRef.linkDescriptor.entities.find((e) => e.role !== sourceRole);

	if (!sourceEntity || !targetEntity) {
		// Malformed linkRef — skip.
		return "confirmed";
	}

	const thumbnails = yield* select(ThumbnailSelectors.thumbnails(activityId));

	// Open the link form dialog. We pass `linkId: entry.linkId` so
	// DynamicLinkFormDataProvider dispatches a `linkDocChanged` (not a new `linkAdded`).
	yield* put(
		buildOpenLinkFormAction({
			activityId,
			formModel,
			documentModel,
			sourceDocRef: sourceEntity.docRef,
			sourceRole: sourceEntity.role,
			relationshipName,
			targetDocRef: targetEntity.docRef,
			targetRole: targetEntity.role,
			linkId: entry.linkId,
			singleSelection: true,
			thumbnails
		})
	);

	// After ActivityActions.create is reduced, find the newly created child activity.
	// We match by initiatingActivityId + dynamicLinkForm + selectedLinkId.
	const childActivity = yield* select((state) => {
		const activities = ActivitySelectors.activities()(state);

		return Object.values(activities).find(
			(a) =>
				a !== undefined &&
				a.initiatingActivityId === activityId &&
				a.descriptor.dynamicLinkForm === "true" &&
				a.descriptor.selectedLinkId === entry.linkId
		);
	});

	const childActivityId = childActivity?.id;

	// Wait for either the link doc being confirmed (addChangeLog linkDocChanged dispatched to
	// parent) or the dialog being cancelled.
	const { cancelled } = yield* race({
		confirmed: take(
			(a: unknown) =>
				RelationshipEngineActions.Commands.addChangeLog.match(a) &&
				a.payload.activityId === activityId &&
				a.payload.change.kind === "linkDocChanged" &&
				a.payload.change.linkId === entry.linkId
		),
		cancelled: take((a: unknown) => ActivityActions.cancel.match(a) && a.payload.activityId === childActivityId)
	});

	return cancelled ? "cancelled" : "confirmed";
}

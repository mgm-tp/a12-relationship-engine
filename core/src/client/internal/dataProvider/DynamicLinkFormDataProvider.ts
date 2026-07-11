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

import { put, select, type SagaGenerator } from "typed-redux-saga";

import { ModelPath } from "@com.mgmtp.a12.base/base-model-api";
import type { DataProvider } from "@com.mgmtp.a12.client/client-core";
import { THUMBNAIL_SLICE } from "@com.mgmtp.a12.client/client-core/a12internal";
import { FormEngineSelectors } from "@com.mgmtp.a12.formengine/formengine-core";
import { Activity, ActivityActions, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";

import { LinkSelectors } from "../../../store/index.js";
import { ModelSelectors } from "../../../store/index.js";
import { ChangelogSelectors } from "../../../store/index.js";
import { nextDraftingLinkId } from "../../../store/index.js";
import { RelationshipEngineActions } from "../../../store/index.js";
import { RelationshipEngineDataHolder } from "../../../store/index.js";

class RelationshipEngineDynamicLinkFormDataProvider implements DataProvider {
	name = "RelationshipEngineDynamicLinkFormDataProvider";
	canHandle(config: DataProvider.CanHandleConfig): boolean {
		const activity = config.activities[config.activityId];

		return activity?.descriptor.dynamicLinkForm === "true" && config.operation === "save";
	}
	*provideData(config: DataProvider.ProvideDataConfig): SagaGenerator<void> {
		const activity = yield* select(ActivitySelectors.activityById(config.activityId));
		const models = yield* select(FormEngineSelectors.models(config.activityId));
		const data = Activity.findDefaultDataHolder(activity)?.data as Record<string, object>;

		if (
			!activity ||
			!models ||
			!("document" in data) ||
			config.operation !== "save" ||
			!activity.initiatingActivityId
		) {
			return;
		}

		const parentActivityId = activity.initiatingActivityId;
		const changelog = yield* select(ChangelogSelectors.changelog(parentActivityId));

		const relationshipName = activity.descriptor.relationshipName;
		const sourceDocRef = activity.descriptor.sourceDocRef;
		const targetDocRef = activity.descriptor.targetDocRef;
		const sourceRole = activity.descriptor.sourceRole;
		const targetRole = activity.descriptor.targetRole;
		const selectedLinkId = activity.descriptor.selectedLinkId;
		const groupPath = activity.descriptor.groupPath;

		if (!changelog || !relationshipName || !sourceDocRef || !targetDocRef || !sourceRole || !targetRole) {
			throw new Error(`Missing crucial information for the link form instance`);
		}

		yield* put(config.details.saving.done({}));

		if (selectedLinkId) {
			const [foundLinkRef] = yield* select(LinkSelectors.findLinkById(parentActivityId, selectedLinkId));

			if (!foundLinkRef) {
				throw new Error(`Selected link with id ${selectedLinkId} not found in parent activity ${parentActivityId}`);
			}

			yield* put(
				RelationshipEngineActions.Commands.addChangeLog({
					activityId: parentActivityId,
					change: {
						kind: "linkDocChanged",
						linkId: selectedLinkId,
						linkRef: foundLinkRef,
						linkDocument: data.document
					}
				})
			);

			const parentActivity = yield* select(ActivitySelectors.activityById(parentActivityId));
			const affectedDataHolders = parentActivity?.dataHolders
				?.filter(RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance)
				.filter((holder) => holder.slices.uiConfiguration.relationshipName === relationshipName);

			if (affectedDataHolders && affectedDataHolders.length > 0) {
				yield* put(
					ActivityActions.loadData({
						activityId: parentActivityId,
						dataHolderDescriptors: affectedDataHolders.map((holder) => holder.descriptor)
					})
				);
			}

			const editChildThumbnails = Activity.findDefaultDataHolder(activity)?.slices[THUMBNAIL_SLICE] as
				| Record<string, string>
				| undefined;

			if (editChildThumbnails && Object.keys(editChildThumbnails).length > 0) {
				yield* put(
					RelationshipEngineActions.Commands.setThumbnails({
						activityId: parentActivityId,
						thumbnails: editChildThumbnails
					})
				);
			}

			return;
		}

		const excludeMode = yield* select(ModelSelectors.isExcludeMode(parentActivityId, relationshipName));
		let targetDocument: object | undefined;
		let targetDocumentModelName: string | undefined;

		if (excludeMode) {
			const parentActivity = yield* select(ActivitySelectors.activityById(parentActivityId));
			const availableHolder = parentActivity?.dataHolders
				?.filter(RelationshipEngineDataHolder.AvailableItemsDataHolder.isInstance)
				.find((h) => h.slices.uiConfiguration.relationshipName === relationshipName);
			const candidateDoc = availableHolder?.data?.documents.find((d) => d?.id === targetDocRef);
			targetDocument = candidateDoc ? (candidateDoc as object) : undefined;
			targetDocumentModelName = candidateDoc ? (candidateDoc as { modelId?: string }).modelId : undefined;
		}

		yield* put(
			RelationshipEngineActions.Events.linkAdded({
				activityId: parentActivityId,
				linkRef: {
					id: nextDraftingLinkId(relationshipName, changelog),
					linkDescriptor: {
						relationshipModel: relationshipName,
						entities: [
							{ role: sourceRole, docRef: sourceDocRef },
							{ role: targetRole, docRef: targetDocRef }
						]
					}
				},
				linkDocument: data.document,
				docRef: targetDocRef,
				groupPath: groupPath ? ModelPath.fromString(groupPath) : undefined,
				targetDocument,
				targetDocumentModelName
			})
		);

		const addChildThumbnails = Activity.findDefaultDataHolder(activity)?.slices[THUMBNAIL_SLICE] as
			| Record<string, string>
			| undefined;

		if (addChildThumbnails && Object.keys(addChildThumbnails).length > 0) {
			yield* put(
				RelationshipEngineActions.Commands.setThumbnails({
					activityId: parentActivityId,
					thumbnails: addChildThumbnails
				})
			);
		}
	}
}

/**
 * @internal
 */
export function createRelationshipEngineDynamicLinkFormDataProvider() {
	return new RelationshipEngineDynamicLinkFormDataProvider();
}

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

import type { SagaGenerator } from "typed-redux-saga";
import { put, call, select, takeEvery } from "typed-redux-saga";

import type { Action } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";
import { type Activity, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";

import { LinkSelectors } from "../selectors/link.js";
import { ModelSelectors } from "../selectors/model.js";
import { RelationshipEngineActions } from "../actions.js";
import { ThumbnailSelectors } from "../selectors/thumbnail.js";
import { ChangelogSelectors } from "../selectors/changelog.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";
import { nextDraftingLinkId } from "../utils/linkIdAndDocRef.js";
import { buildOpenLinkFormAction } from "../utils/openLinkFormActivity.js";

import { reloadAndPropagate } from "./helpers/reloadAndPropagate.js";
import { enforceSingleSelection } from "./helpers/enforceSingleSelection.js";
import { selectSourceDocRef, selectDropdownDataHolder } from "./helpers/dropdownUtils.js";

export function* dropdownItemSelectedSaga(): SagaGenerator<void> {
	yield* takeEvery(RelationshipEngineActions.Events.dropdownItemSelected, handleDropdownItemSelected);
}

function* handleDropdownItemSelected(
	action: Action<RelationshipEngineActions.Events.DropdownItemSelectedPayload>
): SagaGenerator<void> {
	const { activityId, instanceId, selectedDocRef } = action.payload;

	const dropdownHolder = yield* call(selectDropdownDataHolder, activityId, instanceId);

	if (!dropdownHolder) {
		return;
	}

	const { uiConfiguration, sourceEntity } = dropdownHolder.slices;
	const { relationshipName, targetRole } = uiConfiguration;
	const sourceRole = sourceEntity.role;

	const sourceDocRef = yield* call(selectSourceDocRef, activityId, dropdownHolder);

	if (!sourceDocRef) {
		return;
	}

	const changelogParams = { relationshipModel: relationshipName, targetRole, sourceDocRef };
	const pendingAdded = yield* select(ChangelogSelectors.pendingAdded(activityId, changelogParams));
	const persistedDocRef = dropdownHolder.data?.selectedItem?.docRef;

	const linkFormModels = yield* select(ModelSelectors.linkFormModelByName(uiConfiguration.component.linkFormModel));

	if (selectedDocRef && linkFormModels !== undefined) {
		const thumbnails = yield* select(ThumbnailSelectors.thumbnails(activityId));

		yield* put(
			buildOpenLinkFormAction({
				activityId,
				formModel: linkFormModels.formModel,
				documentModel: linkFormModels.documentModel,
				sourceDocRef,
				sourceRole,
				relationshipName,
				targetDocRef: selectedDocRef,
				targetRole,
				singleSelection: true,
				thumbnails
			})
		);

		return;
	}

	const deleteLinkByDocRef = function* (docRef: string): SagaGenerator<void> {
		const [foundLinkRef] = yield* select(
			LinkSelectors.findLink(activityId, {
				relationshipModel: relationshipName,
				source: { role: sourceRole, docRef: sourceDocRef },
				target: { role: targetRole, docRef }
			})
		);

		if (!foundLinkRef) {
			return;
		}

		yield* put(
			RelationshipEngineActions.Commands.addChangeLog({
				activityId,
				change: { kind: "linkDeleted", linkId: foundLinkRef.id, linkRef: foundLinkRef }
			})
		);
	};

	// Remove pending additions (other than the newly selected one)
	for (const addedDocRef of pendingAdded) {
		if (addedDocRef !== selectedDocRef) {
			yield* call(deleteLinkByDocRef, addedDocRef);
		}
	}

	// Remove persisted selection if not already covered by pending
	if (persistedDocRef && !pendingAdded.includes(persistedDocRef) && persistedDocRef !== selectedDocRef) {
		yield* call(deleteLinkByDocRef, persistedDocRef);
	}

	// Resolve affected selected items data holders for the reload pipeline
	const affectedLinksDataHolders = yield* select(
		ActivitySelectors.activityPropById(activityId, (a) =>
			a.dataHolders
				.filter(RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance)
				.filter((dh) => dh.slices.uiConfiguration.relationshipName === relationshipName)
		)
	);

	if (selectedDocRef && !pendingAdded.includes(selectedDocRef)) {
		const existingChangelog = yield* select(ChangelogSelectors.changelog(activityId));
		const newLinkId = nextDraftingLinkId(relationshipName, existingChangelog);
		const groupPath = yield* select(ModelSelectors.groupPath(activityId, dropdownHolder.descriptor));

		const entities: Array<{ role: string; docRef: string }> = [];

		if (sourceRole && sourceDocRef) {
			entities.push({ role: sourceRole, docRef: sourceDocRef });
		}

		entities.push({ role: targetRole, docRef: selectedDocRef });

		const linkRef = {
			id: newLinkId,
			linkDescriptor: { relationshipModel: relationshipName, entities }
		};

		// In exclude mode, snapshot the target document for drafting-link rendering
		const excludeMode = yield* select(ModelSelectors.isExcludeMode(activityId, relationshipName));
		const selectedItem = excludeMode
			? dropdownHolder.data?.availableItems.find((item) => item.docRef === selectedDocRef)
			: undefined;
		const targetDocument = selectedItem?.document;
		const targetDocumentModelName = selectedItem?.documentModelName;

		yield* put(
			RelationshipEngineActions.Commands.addChangeLog({
				activityId,
				change: {
					kind: "linkAdded",
					linkId: newLinkId,
					linkRef,
					targetDocument,
					targetDocumentModelName
				}
			})
		);

		// Enforce single selection after writing the new linkAdded entry
		yield* call(enforceSingleSelection, activityId, linkRef);

		// In exclude mode, skip reloading SelectedItems data holders
		const dataHoldersToReload = excludeMode ? [] : (affectedLinksDataHolders ?? []);

		yield* call(reloadAndPropagate, activityId, dataHoldersToReload, {
			groupPath,
			relationshipName,
			docRef: selectedDocRef
		});
	} else {
		// Clear case (no new selection) — run pipeline for changelog deletions above
		yield* call(reloadAndPropagate, activityId, (affectedLinksDataHolders ?? []) as Activity.DataHolder[], {});
	}
}

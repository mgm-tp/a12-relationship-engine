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

import { put, select } from "typed-redux-saga";
import type { SagaGenerator } from "typed-redux-saga";

import { ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import type { Relationship as RelationshipApi } from "@com.mgmtp.a12.dataservices/dataservices-access";

import { LinkSelectors } from "../../selectors/link.js";
import { RelationshipEngineActions } from "../../actions.js";
import { ChangelogSelectors } from "../../selectors/changelog.js";
import { RelationshipEngineDataHolder } from "../../dataHolder.js";
import { DocumentGraphSelectors } from "../../selectors/documentGraph.js";

/**
 * Enforces single-selection constraints for dropdown-based relationships.
 *
 * After a linkAdded changelog entry is written, this helper checks whether
 * the activity has a dropdown data holder (indicating a single-selection
 * relationship). If so, it removes all other pending additions and the
 * persisted selection by writing linkDeleted changelog entries.
 *
 */
export function* enforceSingleSelection(activityId: string, linkRef: RelationshipApi.LinkRef): SagaGenerator<void> {
	const dropdownHolder = (yield* select(
		ActivitySelectors.activityPropById(activityId, (activity) =>
			activity.dataHolders.find(RelationshipEngineDataHolder.DropdownSelectionDataHolder.isInstance)
		)
	)) as RelationshipEngineDataHolder.DropdownSelectionDataHolder | undefined;

	if (!dropdownHolder) {
		return;
	}

	const { uiConfiguration, sourceEntity } = dropdownHolder.slices;
	const { relationshipName, targetRole } = uiConfiguration;
	const sourceRole = sourceEntity.role;

	const sourceDocRef =
		dropdownHolder.slices.sourceEntity.docRef ??
		(yield* select(DocumentGraphSelectors.rootDocRef(activityId))) ??
		((yield* select(ActivitySelectors.activityPropById(activityId, (activity) => activity?.descriptor.instance))) as
			| string
			| undefined);

	if (!sourceDocRef) {
		return;
	}

	const justAddedTarget = linkRef.linkDescriptor.entities.find((e) => e.role === targetRole)?.docRef;

	if (!justAddedTarget) {
		return;
	}

	const changelogParams = { relationshipModel: relationshipName, targetRole, sourceDocRef };
	const pendingAdded = yield* select(ChangelogSelectors.pendingAdded(activityId, changelogParams));

	// Remove all other pending additions (enforce single-selection)
	for (const addedDocRef of pendingAdded) {
		if (addedDocRef !== justAddedTarget) {
			const [existingLinkRef] = yield* select(
				LinkSelectors.findLink(activityId, {
					relationshipModel: relationshipName,
					source: { role: sourceRole, docRef: sourceDocRef },
					target: { role: targetRole, docRef: addedDocRef }
				})
			);

			if (!existingLinkRef) {
				continue; // No persisted link found — nothing to delete
			}

			yield* put(
				RelationshipEngineActions.Commands.addChangeLog({
					activityId,
					change: { kind: "linkDeleted", linkId: existingLinkRef.id, linkRef: existingLinkRef }
				})
			);
		}
	}

	// Remove persisted selection if it's not the just-added target
	const persistedDocRef = dropdownHolder.data?.selectedItem?.docRef;

	if (persistedDocRef && !pendingAdded.includes(persistedDocRef) && persistedDocRef !== justAddedTarget) {
		const [existingLinkRef] = yield* select(
			LinkSelectors.findLink(activityId, {
				relationshipModel: relationshipName,
				source: { role: sourceRole, docRef: sourceDocRef },
				target: { role: targetRole, docRef: persistedDocRef }
			})
		);

		if (existingLinkRef) {
			yield* put(
				RelationshipEngineActions.Commands.addChangeLog({
					activityId,
					change: { kind: "linkDeleted", linkId: existingLinkRef.id, linkRef: existingLinkRef }
				})
			);
		}
	}
}

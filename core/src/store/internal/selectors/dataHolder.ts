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

import type { Selector } from "@com.mgmtp.a12.client/client-core";
import { Activity, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import type { EntityInstancePath } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import { FormActivity, type DocumentDescriptor } from "@com.mgmtp.a12.formengine/formengine-core";

import { RelationshipEngineDataHolder } from "../dataHolder.js";

import { ModelSelectors } from "./model.js";
import { createSelector } from "./selector.js";
import { DocumentGraphSelectors } from "./documentGraph.js";

/** @internal */
export namespace DataHolderSelectors {
	/** Selects the default data holder for the activity. */
	export function defaultDataHolder(activityId: string): Selector<Activity.DataHolder | undefined> {
		return (state) => defaultDataHolderReselect(state, activityId);
	}

	const defaultDataHolderReselect = (state: object, activityId: string) =>
		ActivitySelectors.activityPropById(activityId, Activity.findDefaultDataHolder)(state);

	/** Selects the changelog data holder for the activity. */
	export function changelogDataHolder(
		activityId: string
	): Selector<RelationshipEngineDataHolder.ChangelogDataHolder | undefined> {
		return (state) => changelogDataHolderReselect(state, activityId);
	}

	const changelogDataHolderReselect = (state: object, activityId: string) =>
		ActivitySelectors.activityPropById(activityId, (activity) =>
			activity.dataHolders?.find(RelationshipEngineDataHolder.ChangelogDataHolder.isInstance)
		)(state);

	/** Selects the document graph data holder for the activity. */
	export function documentGraphDataHolder(
		activityId: string
	): Selector<RelationshipEngineDataHolder.DocumentGraphDataHolder | undefined> {
		return (state) => documentGraphDataHolderReselect(state, activityId);
	}

	const documentGraphDataHolderReselect = (state: object, activityId: string) =>
		ActivitySelectors.activityPropById(activityId, (activity) =>
			activity.dataHolders?.find(RelationshipEngineDataHolder.DocumentGraphDataHolder.isInstance)
		)(state);

	/** Selects all available-items data holders for the activity. */
	export function availableItemsDataHolders(
		activityId: string
	): Selector<RelationshipEngineDataHolder.AvailableItemsDataHolder[]> {
		return (state) => availableItemsDataHoldersReselect(state, activityId);
	}

	const availableItemsDataHoldersReselect = createSelector(
		[
			(state: object, activityId: string) =>
				ActivitySelectors.activityPropById(activityId, (activity) => activity.dataHolders ?? [])(state) ?? []
		],
		(dataHolders) =>
			dataHolders.filter(
				RelationshipEngineDataHolder.AvailableItemsDataHolder.isInstance as (
					dataHolder: Activity.DataHolder
				) => dataHolder is RelationshipEngineDataHolder.AvailableItemsDataHolder
			)
	);

	/** Selects all selected-items data holders for the activity. */
	export function selectedItemsDataHolders(
		activityId: string
	): Selector<RelationshipEngineDataHolder.SelectedItemsDataHolder[]> {
		return (state) => selectedItemsDataHoldersReselect(state, activityId);
	}

	const selectedItemsDataHoldersReselect = createSelector(
		[
			(state: object, activityId: string) =>
				ActivitySelectors.activityPropById(activityId, (activity) => activity.dataHolders ?? [])(state) ?? []
		],
		(dataHolders) =>
			dataHolders.filter(
				RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance as (
					dataHolder: Activity.DataHolder
				) => dataHolder is RelationshipEngineDataHolder.SelectedItemsDataHolder
			)
	);

	/** Selects all relationship instance data holders (available + selected items) for the activity. */
	export function relationshipInstanceDataHolders(
		activityId: string
	): Selector<RelationshipEngineDataHolder.InstanceDataHolder[]> {
		return (state) => relationshipInstanceDataHoldersReselect(state, activityId);
	}

	const relationshipInstanceDataHoldersReselect = createSelector(
		[
			(state: object, activityId: string) =>
				ActivitySelectors.activityPropById(activityId, (activity) => activity.dataHolders ?? [])(state) ?? []
		],
		(dataHolders) =>
			dataHolders.filter(
				(dataHolder): dataHolder is RelationshipEngineDataHolder.InstanceDataHolder =>
					RelationshipEngineDataHolder.AvailableItemsDataHolder.isInstance(dataHolder) ||
					RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance(dataHolder)
			)
	);

	interface DocumentDescriptorResult extends DocumentDescriptor {
		document: object;
	}

	export function documentDescriptor(activityId: string, documentPath: EntityInstancePath) {
		return (state: object): DocumentDescriptorResult | undefined => {
			const isCdm = ModelSelectors.isCdmActivity(activityId)(state);

			if (isCdm) {
				const result = DocumentGraphSelectors.docRef(activityId, documentPath)(state);

				if (result !== undefined) {
					const document = DocumentGraphSelectors.documentByRef(activityId, result.docRef)(state);

					if (!document) {
						return undefined;
					}

					return {
						documentId: result.docRef,
						documentModelName: result.documentModelName,
						document
					};
				}
			}

			const data = ActivitySelectors.data(activityId)(state);

			if (!FormActivity.Data.SingleDocumentData.isInstance(data) || !data.document) {
				return undefined;
			}

			return {
				documentId: data.document.id,
				documentModelName: data.document.modelId,
				document: data.document
			};
		};
	}
}

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

import { ModelPath } from "@com.mgmtp.a12.base/base-model-api";
import type { Selector } from "@com.mgmtp.a12.client/client-core";
import { ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import {
	type DocumentModel,
	DocumentServiceFactory,
	type EntityInstancePath
} from "@com.mgmtp.a12.kernel/kernel-md-facade";

import { DocumentUtils } from "../utils/documentUtils.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";

import { ModelSelectors } from "./model.js";
import { createSelector } from "./selector.js";
import { ChangelogSelectors } from "./changelog.js";
import { DocumentGraphSelectors } from "./documentGraph.js";

/** @internal */
export namespace DropdownSelectors {
	/**
	 * Item representation for dropdown selection with resolved label.
	 */
	export interface DropDownItem {
		readonly label: string;
		readonly docRef: string;
	}

	/**
	 * Selects the dropdown data holder for a given instance ID.
	 */
	export function dataHolder(
		activityId: string,
		instanceId: string
	): Selector<RelationshipEngineDataHolder.DropdownSelectionDataHolder | undefined> {
		return (state) => dataHolderReselect(state, activityId, instanceId);
	}

	const dataHolderReselect = (state: object, activityId: string, instanceId: string) =>
		ActivitySelectors.activityPropById(activityId, (activity) =>
			activity.dataHolders?.find(
				(dh): dh is RelationshipEngineDataHolder.DropdownSelectionDataHolder =>
					RelationshipEngineDataHolder.DropdownSelectionDataHolder.isInstance(dh) &&
					dh.descriptor.instanceId === instanceId
			)
		)(state);

	/**
	 * @internal Meta state of the dropdown (excludes items — read those via the narrow selectors).
	 */
	export interface DropdownMetaState {
		readonly availableItemsFullCount: number;
		readonly isLoading: boolean;
		readonly searchText: string | undefined;
		readonly pageNumber: number;
		readonly sourceRole: string;
	}

	/**
	 * Selects the meta state (counts, loading, pagination, source role); items are exposed via {@link availableItems} / {@link selectedItem}.
	 */
	export function meta(activityId: string, instanceId: string): Selector<DropdownMetaState> {
		return (state) => metaReselect(state, activityId, instanceId);
	}

	const metaReselect = createSelector(
		[(state: object, activityId: string, instanceId: string) => dataHolderReselect(state, activityId, instanceId)],
		(dh): DropdownMetaState => {
			if (!dh) {
				return {
					availableItemsFullCount: 0,
					isLoading: false,
					searchText: undefined,
					pageNumber: 0,
					sourceRole: ""
				};
			}

			const { data, slices } = dh;

			return {
				availableItemsFullCount: data?.availableItemsFullCount ?? 0,
				isLoading: slices.isLoading,
				searchText: slices.searchText,
				pageNumber: slices.pageNumber,
				sourceRole: slices.sourceEntity.role
			};
		}
	);

	/**
	 * Selects the available dropdown items with resolved labels.
	 *
	 * Resolution path:
	 * - base items come from the data holder (empty when not yet loaded);
	 * - changelog-added items are merged in even when `data === undefined` so pre-seeded selections are visible before the first search;
	 * - labels are resolved via the query model's element path.
	 */
	export function availableItems(
		activityId: string,
		instanceId: string,
		queryModelName: string
	): Selector<ReadonlyArray<DropDownItem>> {
		return (state) => {
			const dataHolder = dataHolderReselect(state, activityId, instanceId);

			if (!dataHolder) {
				return [];
			}

			const base = dataHolder.data ? availableItemsReselect(state, activityId, instanceId, queryModelName) : [];
			const { slices } = dataHolder;
			const { relationshipName, targetRole } = slices.uiConfiguration;
			const lifecycle = ChangelogSelectors.lifecycleStates(activityId, {
				relationshipModel: relationshipName,
				sourceDocRef: slices.sourceEntity.docRef ?? undefined,
				targetRole
			})(state);

			if (lifecycle.added.length === 0) {
				return base;
			}

			const queryModels = ModelSelectors.queryModels(queryModelName)(state);
			let fieldPath: string | undefined;

			if (queryModels) {
				fieldPath = resolveElementPath(queryModels.documentModel, slices.elementRef);
			}

			return mergeChangelogAddedItems(base, lifecycle.added, state, activityId, fieldPath);
		};
	}

	const availableItemsReselect = createSelector(
		[
			(state: object, activityId: string, instanceId: string) => dataHolderReselect(state, activityId, instanceId),
			(state: object, _activityId: string, _instanceId: string, queryModelName: string) =>
				ModelSelectors.queryModels(queryModelName)(state),
			(state: object, activityId: string) => (docRef: string) =>
				DocumentGraphSelectors.documentByRef(activityId, docRef)(state)
		],
		(dh, queryModels, getDoc) => {
			if (!dh?.data) {
				return [] as ReadonlyArray<DropDownItem>;
			}

			const { data, slices } = dh;
			const { elementRef } = slices;

			let fieldPath: string | undefined;

			if (queryModels) {
				fieldPath = resolveElementPath(queryModels.documentModel, elementRef);
			}

			return data.availableItems.map(function toAvailableItem(item): DropDownItem {
				const liveDoc = getDoc(item.docRef);
				const effectiveDoc = liveDoc ?? item.document;

				return {
					docRef: item.docRef,
					label: extractLabelFromDocument(effectiveDoc, fieldPath)
				};
			});
		}
	);

	function mergeChangelogAddedItems(
		base: ReadonlyArray<DropDownItem>,
		added: readonly string[],
		state: object,
		activityId: string,
		fieldPath: string | undefined
	): ReadonlyArray<DropDownItem> {
		const existingDocRefs = new Set(base.map((c) => c.docRef));
		const extras: DropDownItem[] = [];

		for (const addedDocRef of added) {
			if (existingDocRefs.has(addedDocRef)) {
				continue;
			}

			const doc = DocumentGraphSelectors.documentByRef(activityId, addedDocRef)(state);

			if (!doc) {
				continue;
			}

			extras.push({ docRef: addedDocRef, label: extractLabelFromDocument(doc, fieldPath) });
		}

		return extras.length === 0 ? base : [...extras, ...base];
	}

	/**
	 * Selects the effective selected item, accounting for changelog additions and removals; reference is stable when nothing dropdown-relevant changes.
	 */
	export function selectedItem(
		activityId: string,
		instanceId: string,
		queryModelName: string
	): Selector<DropDownItem | undefined> {
		return (state) => {
			const dataHolder = dataHolderReselect(state, activityId, instanceId);

			if (!dataHolder) {
				return undefined;
			}

			const { slices } = dataHolder;
			const { relationshipName, targetRole } = slices.uiConfiguration;
			const lifecycle = ChangelogSelectors.lifecycleStates(activityId, {
				relationshipModel: relationshipName,
				sourceDocRef: slices.sourceEntity.docRef ?? undefined,
				targetRole
			})(state);

			const persisted = persistedSelectedItemReselect(state, activityId, instanceId, queryModelName);
			const items = availableItems(activityId, instanceId, queryModelName)(state);

			return resolveEffectiveSelectedItem(persisted, lifecycle, items);
		};
	}

	const persistedSelectedItemReselect = createSelector(
		[
			(state: object, activityId: string, instanceId: string) => dataHolderReselect(state, activityId, instanceId),
			(state: object, _activityId: string, _instanceId: string, queryModelName: string) =>
				ModelSelectors.queryModels(queryModelName)(state),
			(state: object, activityId: string) => (docRef: string) =>
				DocumentGraphSelectors.documentByRef(activityId, docRef)(state)
		],
		(dh, queryModels, getDoc): DropDownItem | undefined => {
			const rawSelected = dh?.data?.selectedItem;

			if (!rawSelected) {
				return undefined;
			}

			const elementRef = dh?.slices.elementRef ?? "";

			let fieldPath: string | undefined;

			if (queryModels) {
				fieldPath = resolveElementPath(queryModels.documentModel, elementRef);
			}

			const liveDoc = getDoc(rawSelected.docRef);
			const effectiveDoc = liveDoc ?? rawSelected.document;

			return {
				docRef: rawSelected.docRef,
				label: extractLabelFromDocument(effectiveDoc, fieldPath, queryModels?.documentModel)
			};
		}
	);

	function resolveEffectiveSelectedItem(
		persistedItem: DropDownItem | undefined,
		lifecycle: ChangelogSelectors.LifecycleSets,
		availableItemsList: ReadonlyArray<DropDownItem>
	): DropDownItem | undefined {
		// Pending additions take priority — use the most recently added target
		if (lifecycle.added.length > 0) {
			const lastAdded = lifecycle.added[lifecycle.added.length - 1];

			return availableItemsList.find((c) => c.docRef === lastAdded);
		}

		// If the persisted selection was removed or withdrawn, clear it
		if (
			persistedItem &&
			(lifecycle.removed.includes(persistedItem.docRef) || lifecycle.withdrawn.includes(persistedItem.docRef))
		) {
			return undefined;
		}

		return persistedItem;
	}

	function extractLabelFromDocument(document: object, modelPath?: string, documentModel?: DocumentModel): string {
		if (!modelPath) {
			return "";
		}

		const entityInstancePath: EntityInstancePath = ModelPath.fromString(modelPath).map(({ elementName }) => ({
			elementName,
			index: 0
		}));
		const value = DocumentUtils.getField(document, entityInstancePath, documentModel);

		if (typeof value === "string") {
			return value;
		}

		return String(value);
	}

	/**
	 * Resolves an elementRef to a field path via the kernel's DocumentModelSearchService (matching OverviewEngine).
	 */
	const documentServiceFactory = new DocumentServiceFactory();
	export function resolveElementPath(documentModel: DocumentModel, elementRef: string): string | undefined {
		const searchService = documentServiceFactory.getDocumentModelSearchService(documentModel);
		const modelPath = searchService.getPathById(elementRef);

		if (!modelPath) {
			return undefined;
		}

		return ModelPath.toString(modelPath);
	}
}

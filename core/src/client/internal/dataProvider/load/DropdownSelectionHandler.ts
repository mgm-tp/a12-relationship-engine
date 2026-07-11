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

import { call, select, type SagaGenerator } from "typed-redux-saga";

import { ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import type { Activity, DataProvider } from "@com.mgmtp.a12.client/client-core";
import { QueryBuilder, QueryIntrospection } from "@com.mgmtp.a12.querymodel/querymodel-core";
import { executeQueryPlan, type QueryExecutionPlan } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import type {
	Query,
	Relationship,
	QueryJsonRpc2Request,
	QueryJsonRpc2Response
} from "@com.mgmtp.a12.dataservices/dataservices-access";

import { isValidLink } from "../../utils.js";
import { buildQueryId } from "../queryId.js";
import type { DataProviderHandler } from "../types.js";
import { ModelSelectors } from "../../../../store/index.js";
import { sourceDocRefVariableKey } from "../queryVariables.js";
import { DropdownSelectors } from "../../../../store/index.js";
import { ChangelogSelectors } from "../../../../store/index.js";
import { ParentLinkDescriptor } from "../../../../store/index.js";
import { DocumentGraphSelectors } from "../../../../store/index.js";
import { RelationshipEngineDataHolder } from "../../../../store/index.js";
import type { RelationshipEngineActions } from "../../../../store/index.js";
import {
	type RequestSelectorMap as RERequestSelectorMap,
	DefaultRequestSelectorMap as REDefaultRequestSelectorMap
} from "../../requestSelectorMap.js";

/**
 * Handler for dropdown selection data loading operations.
 *
 * Supports two modes via the `dropdownLoadMode` extra payload on `ActivityActions.loadData`:
 * - **Initialization (no payload):** loads only the selected item via `queryLinks` RSM
 * - **Available items loading (`dropdownLoadMode: "availableItems"`):** loads available documents
 *   via `queryCandidates` RSM, with search filtering and pagination
 */
export class DropdownSelectionHandler implements DataProviderHandler {
	readonly name = "DropdownSelectionHandler";
	private readonly requestSelectorMap: RERequestSelectorMap;

	constructor(requestSelectorMap?: RERequestSelectorMap) {
		this.requestSelectorMap = requestSelectorMap ?? REDefaultRequestSelectorMap;
	}

	canHandle(dataHolders: Activity.DataHolder[]): DataProviderHandler.CanHandleResult {
		const handled: Activity.DataHolder[] = [];
		const remaining: Activity.DataHolder[] = [];

		for (const dataHolder of dataHolders) {
			if (RelationshipEngineDataHolder.DropdownSelectionDataHolder.isInstance(dataHolder)) {
				handled.push(dataHolder);
			} else {
				remaining.push(dataHolder);
			}
		}

		return { handled, remaining };
	}

	/**
	 * Loads dropdown data by building plans and executing them via the shared batched RPC.
	 */
	*handle(params: DataProvider.LoadConfig): SagaGenerator<RelationshipEngineActions.Commands.UpdatedDataHolder[]> {
		const plans = yield* call([this, this.planFor], params);

		return yield* call(executeQueryPlan, params.activityId, plans);
	}

	/**
	 * Produces Plan objects for all dropdown data holders in params.
	 *
	 * Three load paths exist:
	 * - **Available items (on-demand):** triggered via `dropdownLoadMode: "availableItems"`.
	 *   Lazy; never runs on init.
	 * - **Parent-link preload (init only):** when the activity descriptor identifies this
	 *   dropdown as the parent-link source, preload the pending added docRefs as available
	 *   items so they appear immediately. When this runs, the selected-item plan is skipped
	 *   (no selection can exist data-wise in this case).
	 * - **Selected item (init only):** runs on init to resolve the current selection,
	 *   including the "fake" temporal link used by the Autocomplete component.
	 */
	*planFor(params: DataProvider.LoadConfig): SagaGenerator<QueryExecutionPlan[]> {
		if (!params.dataHolders || params.dataHolders.length === 0) {
			return [];
		}

		const isAvailableItemsLoad = isDropdownLoadPayload(params.details);
		const plans: QueryExecutionPlan[] = [];

		for (const dataHolder of params.dataHolders) {
			if (!RelationshipEngineDataHolder.DropdownSelectionDataHolder.isInstance(dataHolder)) {
				continue;
			}

			if (isAvailableItemsLoad) {
				const plan = yield* call([this, this.planForAvailableItems], params.activityId, dataHolder);

				if (plan) {
					plans.push(plan);
				}

				continue;
			}

			const parentLinkPlan = yield* call([this, this.planForParentLinkPreload], params.activityId, dataHolder);

			if (parentLinkPlan) {
				plans.push(parentLinkPlan);
				continue;
			}

			const selectedPlan = yield* call([this, this.planForSelectedItem], params.activityId, dataHolder);

			if (selectedPlan) {
				plans.push(selectedPlan);
				continue;
			}
		}

		return plans;
	}

	/**
	 * Produces a Plan for loading the selected item of a dropdown data holder.
	 * Returns undefined if no selectedItemQueryModel is configured.
	 */
	*planForSelectedItem(
		activityId: string,
		dataHolder: RelationshipEngineDataHolder.DropdownSelectionDataHolder
	): SagaGenerator<QueryExecutionPlan | undefined> {
		const { slices } = dataHolder;
		const { selectedItemQueryModel } = slices;

		if (!selectedItemQueryModel) {
			return undefined;
		}

		const rootDocRef = yield* select(DocumentGraphSelectors.rootDocRef(activityId));
		const activityInstanceDocRef = yield* select(
			ActivitySelectors.activityPropById(activityId, (activity) => activity?.descriptor.instance)
		);
		const sourceDocRef = slices.sourceEntity.docRef ?? rootDocRef ?? activityInstanceDocRef;

		const queryModels = yield* select(ModelSelectors.queryModels(selectedItemQueryModel));

		if (!queryModels) {
			const fallbackPlan: QueryExecutionPlan = {
				id: buildQueryId(
					slices.uiConfiguration.relationshipName,
					slices.uiConfiguration.targetRole,
					"dropdown",
					`selected_${dataHolder.descriptor.instanceId}`
				),
				dataHolder,
				requests: [],
				// eslint-disable-next-line require-yield
				applyResponse: function* () {
					return [
						createDropdownUpdate(dataHolder, { availableItems: [], availableItemsFullCount: 0 })
					] as RelationshipEngineActions.Commands.UpdatedDataHolder[];
				}
			};

			return fallbackPlan;
		}

		const { queryModel } = queryModels;
		const queryContent = queryModel.content;
		const queryId = buildQueryId(
			slices.uiConfiguration.relationshipName,
			slices.uiConfiguration.targetRole,
			"dropdown",
			`selected_${dataHolder.descriptor.instanceId}`
		);

		const baseRequest = yield* select(
			this.requestSelectorMap.queryLinks({
				activityId,
				id: queryId,
				targetDocumentModel: queryContent.targetDocumentModel,
				paging: { pageSize: queryContent.paging.pageSize, pageNumber: 0 },
				constraint: queryContent.constraint,
				sort: queryContent.sort,
				links: queryContent.links,
				fields: queryContent.fields,
				context: "dropdown"
			})
		);

		const sourceDMForSelected = yield* select(
			ModelSelectors.sourceDocumentModelName(slices.uiConfiguration.relationshipName, slices.sourceEntity.role)
		);
		const variables: Record<string, string | number> =
			sourceDMForSelected && sourceDocRef ? { [sourceDocRefVariableKey(sourceDMForSelected)]: sourceDocRef } : {};
		const replaced = QueryIntrospection.replaceVariables(baseRequest.params.query, variables);

		const request: QueryJsonRpc2Request = {
			...baseRequest,
			params: {
				...baseRequest.params,
				query: {
					...baseRequest.params.query,
					constraint: replaced.constraint,
					links: replaced.links
				}
			}
		};

		return {
			id: queryId,
			dataHolder,
			requests: [request],
			// eslint-disable-next-line require-yield
			applyResponse: function* (responses) {
				try {
					if (responses.length === 0) {
						return [
							createDropdownUpdate(dataHolder, {
								availableItems: [],
								availableItemsFullCount: 0,
								selectedItem: dataHolder.data?.selectedItem
							})
						] satisfies RelationshipEngineActions.Commands.UpdatedDataHolder[];
					}

					const queryResponse = responses[0] as QueryJsonRpc2Response;
					const entries = queryResponse.result.entries as QueryJsonRpc2Response.DocumentEntry[] | undefined;
					const responseLinks = queryResponse.result.links as QueryJsonRpc2Response.Link[] | undefined;
					const links = parseResponseLinks(responseLinks);

					const selectedItem: RelationshipEngineDataHolder.DropdownSelectionDataHolder.DocumentItem | undefined =
						entries && entries.length > 0 ? entries[0] : undefined;

					return [
						createDropdownUpdate(dataHolder, {
							availableItems: [],
							availableItemsFullCount: 0,
							selectedItem,
							links
						})
					] satisfies RelationshipEngineActions.Commands.UpdatedDataHolder[];
				} catch {
					return [
						createDropdownUpdate(dataHolder, {
							availableItems: [],
							availableItemsFullCount: 0,
							selectedItem: dataHolder.data?.selectedItem
						})
					] satisfies RelationshipEngineActions.Commands.UpdatedDataHolder[];
				}
			}
		};
	}

	/**
	 * Produces a Plan for loading available items of a dropdown data holder.
	 * Returns undefined if no availableItemsQueryModel is configured.
	 */
	*planForAvailableItems(
		activityId: string,
		dataHolder: RelationshipEngineDataHolder.DropdownSelectionDataHolder,
		extraConstraint?: Query.Operator
	): SagaGenerator<QueryExecutionPlan | undefined> {
		const { slices } = dataHolder;
		const { availableItemsQueryModel, searchText, pageNumber } = slices;

		if (!availableItemsQueryModel) {
			return undefined;
		}

		const rootDocRef = yield* select(DocumentGraphSelectors.rootDocRef(activityId));
		const activityInstanceDocRef = yield* select(
			ActivitySelectors.activityPropById(activityId, (activity) => activity?.descriptor.instance)
		);
		const sourceDocRef = slices.sourceEntity.docRef ?? rootDocRef ?? activityInstanceDocRef;

		const queryModels = yield* select(ModelSelectors.queryModels(availableItemsQueryModel));

		if (!queryModels) {
			throw new Error(
				`No query model found for available items of dropdown data holder ${dataHolder.descriptor.instanceId}`
			);
		}

		const { queryModel } = queryModels;
		const queryContent = queryModel.content;
		const queryId = buildQueryId(
			slices.uiConfiguration.relationshipName,
			slices.uiConfiguration.targetRole,
			"dropdown",
			`available_${dataHolder.descriptor.instanceId}`
		);

		const baseRequest = yield* select(
			this.requestSelectorMap.queryCandidates({
				activityId,
				id: queryId,
				targetDocumentModel: queryContent.targetDocumentModel,
				paging: { pageSize: queryContent.paging.pageSize, pageNumber: pageNumber ?? 0 },
				constraint: queryContent.constraint,
				sort: queryContent.sort,
				links: queryContent.links,
				fields: queryContent.fields,
				context: extraConstraint ? "dropdown-inherited-init" : "dropdown"
			})
		);

		const sourceDMForAvailable = yield* select(
			ModelSelectors.sourceDocumentModelName(slices.uiConfiguration.relationshipName, slices.sourceEntity.role)
		);
		const variablesForAvailable: Record<string, string | number> =
			sourceDMForAvailable && sourceDocRef ? { [sourceDocRefVariableKey(sourceDMForAvailable)]: sourceDocRef } : {};
		const replaced = QueryIntrospection.replaceVariables(baseRequest.params.query, variablesForAvailable);
		const resolvedPath = DropdownSelectors.resolveElementPath(queryModels.documentModel, slices.elementRef);
		const searchFields = resolvedPath ? [resolvedPath] : undefined;
		const processedConstraint = QueryBuilder.and(
			replaced.constraint,
			QueryBuilder.simpleSearch(searchText, searchFields),
			extraConstraint
		).build();
		const processedLinks = replaced.links;

		const request: QueryJsonRpc2Request = {
			...baseRequest,
			params: {
				...baseRequest.params,
				query: {
					...baseRequest.params.query,
					constraint: processedConstraint,
					links: processedLinks
				}
			}
		};

		return {
			id: queryId,
			dataHolder,
			requests: [request],
			// eslint-disable-next-line require-yield
			applyResponse: function* (responses) {
				try {
					if (responses.length === 0) {
						return [
							createDropdownUpdate(dataHolder, {
								availableItems: [],
								availableItemsFullCount: 0,
								selectedItem: dataHolder.data?.selectedItem
							})
						] satisfies RelationshipEngineActions.Commands.UpdatedDataHolder[];
					}

					const queryResponse = responses[0] as QueryJsonRpc2Response;
					const entries = queryResponse.result.entries as QueryJsonRpc2Response.DocumentEntry[] | undefined;
					const responseLinks = queryResponse.result.links as QueryJsonRpc2Response.Link[] | undefined;
					const links = parseResponseLinks(responseLinks);

					const availableItems: RelationshipEngineDataHolder.DropdownSelectionDataHolder.DocumentItem[] = entries ?? [];

					const result = [
						createDropdownUpdate(dataHolder, {
							availableItems,
							availableItemsFullCount: queryResponse.result.fullSize,
							links,
							selectedItem: dataHolder.data?.selectedItem
						})
					] satisfies RelationshipEngineActions.Commands.UpdatedDataHolder[];

					return result;
				} catch {
					return [
						createDropdownUpdate(dataHolder, {
							availableItems: [],
							availableItemsFullCount: 0,
							selectedItem: dataHolder.data?.selectedItem
						})
					] satisfies RelationshipEngineActions.Commands.UpdatedDataHolder[];
				}
			}
		};
	}
	/**
	 * Produces a Plan that preloads available items restricted to the parent-link's
	 * pending added docRefs. Returns undefined when the data holder is not the
	 * parent-link source or no pending entries exist.
	 */
	*planForParentLinkPreload(
		activityId: string,
		dataHolder: RelationshipEngineDataHolder.DropdownSelectionDataHolder
	): SagaGenerator<QueryExecutionPlan | undefined> {
		const activityDescriptor = yield* select(
			ActivitySelectors.activityPropById(activityId, (activity) => activity?.descriptor)
		);

		const { relationshipName, targetRole } = dataHolder.slices.uiConfiguration;

		const isParentLinkDropdown =
			ParentLinkDescriptor.isAssignableFrom(activityDescriptor) &&
			activityDescriptor.parentRelationshipName === relationshipName &&
			activityDescriptor.parentRelationshipRole === targetRole;

		if (!isParentLinkDropdown) {
			return undefined;
		}

		const sourceDocRef = dataHolder.slices.sourceEntity.docRef || undefined;
		const lifecycleStates = yield* select(
			ChangelogSelectors.lifecycleStates(activityId, { relationshipModel: relationshipName, targetRole, sourceDocRef })
		);

		if (lifecycleStates.added.length === 0) {
			return undefined;
		}

		const extraConstraint = QueryBuilder.or(
			...lifecycleStates.added.map((ref) => QueryBuilder.exactMatch("/__meta/docRef", ref))
		).build();

		return yield* call([this, this.planForAvailableItems], activityId, dataHolder, extraConstraint);
	}
}

/**
 * Creates a new DropdownSelectionHandler instance.
 */
export function createDropdownSelectionHandler(): DropdownSelectionHandler {
	return new DropdownSelectionHandler();
}

/**
 * Extra payload passed via ActivityActions.loadData to signal
 * what kind of dropdown loading the handler should perform.
 */
interface DropdownLoadDataPayload {
	readonly dropdownLoadMode: "availableItems";
}

function isDropdownLoadPayload(details: unknown): details is DropdownLoadDataPayload {
	return (
		typeof details === "object" &&
		details !== null &&
		"dropdownLoadMode" in details &&
		(details as DropdownLoadDataPayload).dropdownLoadMode === "availableItems"
	);
}

function parseResponseLinks(
	responseLinks: QueryJsonRpc2Response.Link[] | undefined
): RelationshipEngineDataHolder.DropdownSelectionDataHolder.DropdownLinkData[] {
	if (!responseLinks) {
		return [];
	}

	const childLinks = responseLinks.filter(function isChildLink(link) {
		return link.type === "CHILD" && isValidLink(link);
	});
	const linkDocs = responseLinks.filter(function isLinkDoc(link) {
		return link.type === "LINK";
	});

	return childLinks.map(function buildDropdownLinkData(child) {
		const linkRef: Relationship.LinkRef = {
			id: child.linkId,
			linkDescriptor: {
				relationshipModel: child.relationshipModel,
				entities: [
					{ role: child.sourceRole, docRef: child.sourceDocRef },
					{ role: child.targetRole, docRef: child.targetDocRef }
				]
			}
		};
		const linkDoc = linkDocs.find(function matchesLinkId(l) {
			return l.linkId === child.linkId;
		});

		return {
			linkRef,
			linkDocument: linkDoc ? (linkDoc.document ?? {}) : undefined
		};
	});
}

function createDropdownUpdate(
	dataHolder: RelationshipEngineDataHolder.DropdownSelectionDataHolder,
	data: Partial<RelationshipEngineDataHolder.DropdownSelectionDataHolder.Data>
): RelationshipEngineActions.Commands.UpdatedDataHolder {
	return {
		descriptor: dataHolder.descriptor,
		data: { ...data, links: data.links ?? [] },
		slices: { ...dataHolder.slices, isLoading: false }
	};
}

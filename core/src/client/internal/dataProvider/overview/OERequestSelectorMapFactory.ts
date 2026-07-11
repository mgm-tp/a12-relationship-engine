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

import type { Activity } from "@com.mgmtp.a12.client/client-core";
import { ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import { Query } from "@com.mgmtp.a12.dataservices/dataservices-access";
import type { DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import { QueryBuilder, QueryIntrospection } from "@com.mgmtp.a12.querymodel/querymodel-core";
import {
	type RequestSelectorMap as OERequestSelectorMap,
	DefaultRequestSelectorMap as DefaultOERequestSelectorMap
} from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import { sourceDocRefVariableKey } from "../queryVariables.js";
import { ModelSelectors, ChangelogSelectors, RelationshipEngineDataHolder } from "../../../../store/index.js";
import {
	type RequestSelectorMap as RERequestSelectorMap,
	DefaultRequestSelectorMap as REDefaultRequestSelectorMap
} from "../../requestSelectorMap.js";

/**
 * Creates an Overview Engine RequestSelectorMap customized for Relationship Engine.
 *
 * This factory creates a RequestSelectorMap that overrides `loadListDocuments` to:
 * 1. Delegate base request building to the RE-level {@link RERequestSelectorMap}
 * 2. Replace placeholders in constraints (e.g., `${context.sourceDocRef}`)
 * 3. Add selectingItems for link queries (OR them into the constraint)
 *
 * User customizations on the RE RSM are applied first (in the base request),
 * then RE-specific processing augments the result.
 */
export function createOERelationshipRequestSelectorMap(
	reRequestSelectorMap?: RERequestSelectorMap
): OERequestSelectorMap {
	const reRsm = reRequestSelectorMap ?? REDefaultRequestSelectorMap;

	return {
		...DefaultOERequestSelectorMap,
		loadListDocuments: (config) => (state) => {
			const { activityId, query, documentModel, overviewModel } = config;

			const activity = ActivitySelectors.activityById(activityId)(state);
			const dataHolders = activity?.dataHolders ?? [];

			const dataHolder = findMatchingDataHolder(dataHolders, overviewModel.header.id);

			if (!dataHolder || !RelationshipEngineDataHolder.Slices.isInstance(dataHolder.slices)) {
				return DefaultOERequestSelectorMap.loadListDocuments(config)(state);
			}

			const { uiConfiguration, sourceEntity } = dataHolder.slices;
			const sourceDocRef = sourceEntity.docRef ?? "";
			const { relationshipName, targetRole } = uiConfiguration;
			const isSelectedQuery = RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance(dataHolder);
			const isAvailableQuery = RelationshipEngineDataHolder.AvailableItemsDataHolder.isInstance(dataHolder);

			// Use the RE RSM to build a base request, then extract and process its constraint.
			// This ensures user customizations on the RE RSM are applied first.
			const targetDocumentModel = query.targetDocumentModel ?? documentModel.header.id;
			const excludeMode =
				isAvailableQuery && !!relationshipName && ModelSelectors.isExcludeMode(activityId, relationshipName)(state);
			const { links: projectedLinks, fields: projectedFields } = buildProjectedQueryConfig({
				links: query.links,
				fields: query.fields,
				excludeMode
			});
			const baseRequestConfig = {
				activityId,
				id: query.id,
				targetDocumentModel,
				paging: { pageSize: query.paging.pageSize, pageNumber: query.paging.pageNumbers[0] ?? 0 },
				constraint: query.constraint,
				sort: query.sort,
				links: projectedLinks,
				fields: projectedFields,
				exclude: query.exclude
			};

			const baseRequest = isAvailableQuery
				? reRsm.queryCandidates(baseRequestConfig)(state)
				: reRsm.queryLinks({ ...baseRequestConfig, context: "dualPane" })(state);

			const sourceDM = ModelSelectors.sourceDocumentModelName(
				uiConfiguration.relationshipName,
				sourceEntity.role
			)(state);
			const variables = sourceDM && sourceDocRef ? { [sourceDocRefVariableKey(sourceDM)]: sourceDocRef } : {};
			const replaced = QueryIntrospection.replaceVariables(baseRequest.params.query, variables);
			let processedConstraint = replaced.constraint;
			const processedLinks = replaced.links;

			if (isSelectedQuery && relationshipName) {
				const selectingEntries = ChangelogSelectors.selectingDocs(activityId, {
					relationshipModel: relationshipName,
					targetRole
				})(state);

				if (selectingEntries && selectingEntries.length > 0) {
					processedConstraint = addSelectingEntriesToConstraint(processedConstraint, selectingEntries);
				}
			}

			const projectionName = computeProjectionName(documentModel);

			return query.paging.pageNumbers.map((pageNumber) => ({
				jsonrpc: "2.0",
				method: "QUERY",
				id: query.id,
				params: {
					query: {
						projectionName,
						targetDocumentModel,
						paging: { pageSize: query.paging.pageSize, pageNumber },
						constraint: processedConstraint,
						sort: query.sort,
						fields: projectedFields,
						links: processedLinks,
						exclude: query.exclude
					}
				}
			}));
		}
	};
}

interface ProjectedQueryConfigParams {
	readonly links: Query.QueryLink[] | undefined;
	readonly fields: string[] | undefined;
	readonly excludeMode: boolean;
}

interface ProjectedQueryConfigResult {
	readonly links: Query.QueryLink[] | undefined;
	readonly fields: string[] | undefined;
}

function buildProjectedQueryConfig(params: ProjectedQueryConfigParams): ProjectedQueryConfigResult {
	const { links, fields, excludeMode } = params;

	const strippedLinks = links?.map(function stripLinkDocumentFields({ linkDocumentFields: _, ...rest }) {
		return rest;
	});

	const strippedFields = excludeMode ? undefined : fields;

	return { links: strippedLinks, fields: strippedFields };
}

function findMatchingDataHolder(
	dataHolders: Activity.DataHolder[],
	overviewModelId: string
): Activity.DataHolder | undefined {
	return dataHolders.find((dh) => {
		if (!RelationshipEngineDataHolder.Slices.isInstance(dh.slices)) {
			return false;
		}

		const { uiConfiguration } = dh.slices;
		const component = uiConfiguration.component;

		if (!component) {
			return false;
		}

		if (RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance(dh)) {
			const linkModel = component.selectedItemsOverviewModel;
			const editLinkModel = component.editConfiguration?.selectedItemsOverviewModel;

			return linkModel === overviewModelId || editLinkModel === overviewModelId;
		}

		if (RelationshipEngineDataHolder.AvailableItemsDataHolder.isInstance(dh)) {
			const availableModel =
				component.availableItemsOverviewModel ?? component.editConfiguration?.availableItemsOverviewModel;

			return availableModel === overviewModelId;
		}

		return false;
	});
}

/**
 * Adds selectingItems to the constraint using OR logic.
 * This ensures items being added in the dialog also appear in the link list.
 */
function addSelectingEntriesToConstraint(
	constraint: Query.Operator | undefined,
	selectingEntries: string[]
): Query.Operator | undefined {
	const selectingOrConstraint = QueryBuilder.or(
		...selectingEntries.map((docRef) => QueryBuilder.exactMatch("/__meta/docRef", docRef))
	).build();

	if (!selectingOrConstraint || !constraint) {
		return constraint ?? selectingOrConstraint;
	}

	const injected = injectSelectingEntriesAtHasOperator(constraint, selectingOrConstraint);

	if (injected.replaced) {
		return injected.constraint;
	}

	// Fallback: if no `has` operator was found, OR the entire constraint with selectingEntries
	return QueryBuilder.or(constraint, selectingOrConstraint).build();
}

/**
 * Inject selectingEntries at the `has` operator level, so that outer constraints
 * (e.g. simple_search) still apply to both linked items and selectingEntries.
 * We replace `has(...)` with `OR(has(...), selectingEntries)` inside the tree.
 */
function injectSelectingEntriesAtHasOperator(
	constraint: Query.Operator,
	selectingOrConstraint: Query.Operator
): { replaced: boolean; constraint: Query.Operator } {
	if (Query.HasOperator.isInstance(constraint)) {
		return {
			replaced: true,
			constraint: QueryBuilder.or(constraint, selectingOrConstraint).build() as Query.Operator
		};
	}

	if (Query.AndOperator.isInstance(constraint) || Query.OrOperator.isInstance(constraint)) {
		let anyReplaced = false;
		const newOperands = constraint.operands.map((operand) => {
			const result = injectSelectingEntriesAtHasOperator(operand, selectingOrConstraint);

			if (result.replaced) {
				anyReplaced = true;
			}

			return result.constraint;
		});

		if (anyReplaced) {
			return {
				replaced: true,
				constraint: { ...constraint, operands: newOperands }
			};
		}
	}

	if (Query.NotOperator.isInstance(constraint)) {
		const result = injectSelectingEntriesAtHasOperator(constraint.operand, selectingOrConstraint);

		if (result.replaced) {
			return {
				replaced: true,
				constraint: { ...constraint, operand: result.constraint }
			};
		}
	}

	return { replaced: false, constraint };
}

function computeProjectionName(documentModel: DocumentModel): "cdd" | "document" {
	return isCdm(documentModel) ? "cdd" : "document";
}

function isCdm(documentModel: DocumentModel): boolean {
	return documentModel.header.annotations?.some((a) => a.name === "cdm.queryRoot") ?? false;
}

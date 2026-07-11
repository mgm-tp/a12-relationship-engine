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

import type { ModelReference } from "@com.mgmtp.a12.base/base-model-api";
import type { QueryModel } from "@com.mgmtp.a12.querymodel/querymodel-core";
import type { Query } from "@com.mgmtp.a12.dataservices/dataservices-access";

import { QUERY_MODEL_VERSION } from "../constants.js";
import { OverviewModel } from "../../../../../models/overview-model.js";
import type { RelationshipUiModel } from "../../relationship-ui-model.js";
import { getModelReferences } from "../model-accessors/header-accessors.js";
import { isOverviewModel, isRelationshipModel } from "../model-accessors/type-guards.js";

import type { BindingResult, EnrichmentContext, DropDownUpgradeResult } from "./types.js";

function getBindingModel(binding: BindingResult): RelationshipUiModel {
	return binding.relationshipUiModel ?? binding.ruModel;
}

function getBindingPageSizes(
	binding: BindingResult
): ReadonlyArray<{ readonly overviewModelId: string; readonly pageSize: number }> {
	return binding.migrations?.pageSizes ?? binding.pageSizeMigrations;
}

function getBindingRelationshipName(binding: BindingResult): string {
	return binding.relationshipName ?? binding.ruModel.content.relationshipName;
}

function getBindingTargetRole(binding: BindingResult): string {
	return binding.targetRole ?? binding.ruModel.content.targetRole;
}

interface RelationshipSourceContext {
	readonly sourceRole: string;
	readonly sourceDocumentModelId: string;
}

/** Extracts the base name from a RuM header ID by stripping the `_RuM` suffix. */
function baseNameFromRuMId(headerId: string): string {
	return headerId.replace(/_RuM$/, "");
}

/** Finds the migrated page size for an overview model. */
function findPageSize(
	pageSizes: ReadonlyArray<{ readonly overviewModelId: string; readonly pageSize: number }>,
	overviewModelId: string
): number | undefined {
	const match = pageSizes.find((ps) => ps.overviewModelId === overviewModelId);

	return match?.pageSize;
}

/** Resolves the source role/document pair used in dropdown query constraints. */
function resolveSourceRoleFromRelationship(
	context: EnrichmentContext,
	relationshipName: string,
	targetRole: string
): RelationshipSourceContext | undefined {
	const relationshipModel = context.resolveModel(relationshipName);

	if (!relationshipModel || !isRelationshipModel(relationshipModel)) {
		return undefined;
	}

	const characteristics = relationshipModel.content.entityCharacteristics;

	if (characteristics.length < 2 || !characteristics.some((characteristic) => characteristic.role === targetRole)) {
		return undefined;
	}

	const sourceCharacteristic = characteristics.find((characteristic) => characteristic.role !== targetRole);

	if (sourceCharacteristic === undefined) {
		return undefined;
	}

	return {
		sourceRole: sourceCharacteristic.role,
		sourceDocumentModelId: sourceCharacteristic.documentModel
	};
}

/** Resolves an overview model's document model reference from the header model reference. */
function resolveDocumentModelId(context: EnrichmentContext, overviewModelId: string): string | undefined {
	const overviewModel = context.resolveModel(overviewModelId);

	if (!overviewModel || !isOverviewModel(overviewModel)) {
		return undefined;
	}

	const docModelRef = getModelReferences(overviewModel).find(
		(ref) =>
			ref.purpose === "document-model-for-overview" &&
			ref.modelType === "document" &&
			typeof ref.reference === "string" &&
			ref.reference.length > 0
	);

	if (docModelRef?.reference) {
		return docModelRef.reference;
	}

	return undefined;
}

function readOverviewColumnElementRef(column: OverviewModel.Column): string | undefined {
	return OverviewModel.ReferenceColumn.isAssignableFrom(column) ||
		OverviewModel.LinkColumn.Reference.isAssignableFrom(column)
		? column.elementRef
		: undefined;
}

/** Falls back to the first overview column's elementRef when the binding does not provide one. */
function extractElementRefFromOverviewModel(context: EnrichmentContext, overviewModelId: string): string | undefined {
	const overviewModel = context.resolveModel(overviewModelId);

	if (!overviewModel || !isOverviewModel(overviewModel)) {
		return undefined;
	}

	const columns = overviewModel.content.columns;

	if (!Array.isArray(columns) || columns.length === 0) {
		return undefined;
	}

	return readOverviewColumnElementRef(columns[0]);
}

/** Builds the `${Doc, [/__meta/docRef]}` placeholder for legacy query references. */
function buildSourceDocumentPlaceholder(documentModelId: string): string {
	return `\${${documentModelId}, [/__meta/docRef]}`;
}

/** Creates the exact-match docRef constraint used in legacy dropdown queries. */
function buildExactMatchConstraint(
	documentModelId: string
): Query.DocRefExactMatchOperator & { readonly value: string } {
	return {
		operator: "exact_match",
		field: "/__meta/docRef",
		value: buildSourceDocumentPlaceholder(documentModelId)
	};
}

/** Creates a relationship link entry for legacy dropdown query content. */
function buildQueryLink(
	relationshipModel: string,
	sourceRole: string,
	sourceDocumentModelId: string
): NonNullable<QueryModel.Content["links"]>[number] {
	return {
		relationshipModel,
		targetRole: sourceRole,
		maxDepth: 1,
		constraint: buildExactMatchConstraint(sourceDocumentModelId)
	};
}

function buildDropdownQueryHeader(
	queryId: string,
	targetDocumentModel: string,
	relationshipName: string,
	rolesAnnotations: EnrichmentContext["rolesAnnotations"]
) {
	return {
		id: queryId,
		modelType: "query" as const,
		modelVersion: QUERY_MODEL_VERSION,
		annotations: [...(rolesAnnotations ?? [])],
		modelReferences: [
			{
				purpose: "document-model-for-query",
				modelType: "document",
				alias: "DM",
				reference: targetDocumentModel
			},
			{
				purpose: "relationship-model-for-query",
				modelType: "relationship",
				alias: "RM",
				reference: relationshipName
			}
		]
	};
}

function createAvailableQueryModel(
	queryId: string,
	targetDocumentModel: string,
	pageSize: number,
	relationshipName: string,
	sourceContext: RelationshipSourceContext | undefined,
	rolesAnnotations: EnrichmentContext["rolesAnnotations"]
): QueryModel {
	const links: NonNullable<QueryModel.Content["links"]> = sourceContext
		? [buildQueryLink(relationshipName, sourceContext.sourceRole, sourceContext.sourceDocumentModelId)]
		: [];

	return {
		header: buildDropdownQueryHeader(queryId, targetDocumentModel, relationshipName, rolesAnnotations),
		content: {
			targetDocumentModel,
			projectionName: "document",
			paging: {
				pageNumber: 0,
				pageSize
			},
			links
		}
	};
}

/** Creates the selected-item dropdown query while preserving the legacy top-level has constraint. */
function createSelectedQueryModel(
	queryId: string,
	targetDocumentModel: string,
	relationshipName: string,
	sourceContext: RelationshipSourceContext | undefined,
	rolesAnnotations: EnrichmentContext["rolesAnnotations"]
): QueryModel {
	const links: NonNullable<QueryModel.Content["links"]> = sourceContext
		? [buildQueryLink(relationshipName, sourceContext.sourceRole, sourceContext.sourceDocumentModelId)]
		: [];

	const hasConstraint: Query.HasOperator | undefined = sourceContext
		? {
				operator: "has",
				relationshipModel: relationshipName,
				targetRole: sourceContext.sourceRole,
				constraint: buildExactMatchConstraint(sourceContext.sourceDocumentModelId),
				maxDepth: 1
			}
		: undefined;

	return {
		header: buildDropdownQueryHeader(queryId, targetDocumentModel, relationshipName, rolesAnnotations),
		content: {
			targetDocumentModel,
			projectionName: "document",
			paging: {
				pageNumber: 0,
				pageSize: 1
			},
			links,
			...(hasConstraint ? { constraint: hasConstraint } : {})
		}
	};
}

/** Checks whether a binding still needs dropdown query generation. */
function shouldUpgradeBinding(binding: BindingResult): boolean {
	const component = getBindingModel(binding).content.component;

	if (component.componentType !== "DropDownSelection") {
		return false;
	}

	const hasOverviewRef = typeof component.availableItemsOverviewModel === "string";
	const hasQueryRef = typeof component.availableItemsQueryModel === "string";

	return hasOverviewRef && !hasQueryRef;
}

function buildDropDownQueryModelReferences(
	existingRefs: readonly ModelReference[],
	availableOverviewId: string,
	selectedOverviewId: string | undefined,
	availableQueryId: string,
	selectedQueryId: string
): ModelReference[] {
	const staleOverviewIds = new Set<string>([
		availableOverviewId,
		...(selectedOverviewId !== undefined ? [selectedOverviewId] : [])
	]);
	const preservedRefs = existingRefs.filter(
		(ref) => !(ref.modelType === "overview" && staleOverviewIds.has(ref.reference))
	);

	const queryRefs: ModelReference[] = [
		{ purpose: "availableItemsQuery", modelType: "query", reference: availableQueryId },
		{ purpose: "selectedItemQuery", modelType: "query", reference: selectedQueryId }
	];

	const dedupedRefs = new Map<string, ModelReference>();

	for (const ref of [...preservedRefs, ...queryRefs]) {
		dedupedRefs.set(`${ref.purpose}::${ref.modelType}::${ref.reference}`, ref);
	}

	return [...dedupedRefs.values()];
}

function upgradeSingleBinding(
	binding: BindingResult,
	context: EnrichmentContext
): { binding: BindingResult; queryModels: readonly QueryModel[] } {
	const bindingModel = getBindingModel(binding);
	const component = bindingModel.content.component;
	const {
		componentType: _componentType,
		availableItemsOverviewModel: _availableItemsOverviewModel,
		selectedItemsOverviewModel: _selectedItemsOverviewModel,
		availableItemsQueryModel: _availableItemsQueryModel,
		selectedItemQueryModel: _selectedItemQueryModel,
		elementRef: componentElementRef,
		...preservedComponentProps
	} = component;

	const availableOverviewId =
		typeof component.availableItemsOverviewModel === "string" ? component.availableItemsOverviewModel : "";
	const selectedOverviewId =
		typeof component.selectedItemsOverviewModel === "string" ? component.selectedItemsOverviewModel : undefined;
	const bindingElementRef = binding.elementRef;

	// Resolve document model IDs from overview models
	const availableDocumentModel = resolveDocumentModelId(context, availableOverviewId);
	const selectedDocumentModel =
		selectedOverviewId === undefined ? undefined : resolveDocumentModelId(context, selectedOverviewId);
	const targetDocumentModel = availableDocumentModel ?? selectedDocumentModel;

	if (!targetDocumentModel) {
		// Cannot resolve document model — return binding unchanged
		return { binding, queryModels: [] };
	}

	// Resolve source relationship role and source document model for placeholder wiring.
	const sourceContext = resolveSourceRoleFromRelationship(
		context,
		getBindingRelationshipName(binding),
		getBindingTargetRole(binding)
	);

	// Determine candidate page size (GAP-14)
	const pageSize = findPageSize(getBindingPageSizes(binding), availableOverviewId) ?? 50;

	// Generate query IDs
	const baseName = baseNameFromRuMId(bindingModel.header.id);
	const availableQueryId = `${baseName}-available-query`;
	const selectedQueryId = `${baseName}-selected-query`;

	// Create query models
	const relationshipName = getBindingRelationshipName(binding);
	const availableQuery = createAvailableQueryModel(
		availableQueryId,
		targetDocumentModel,
		pageSize,
		relationshipName,
		sourceContext,
		context.rolesAnnotations
	);
	const selectedQuery = createSelectedQueryModel(
		selectedQueryId,
		targetDocumentModel,
		relationshipName,
		sourceContext,
		context.rolesAnnotations
	);

	// Build updated component configuration
	const overviewElementRef = extractElementRefFromOverviewModel(context, availableOverviewId);
	const updatedComponent: RelationshipUiModel.ComponentConfiguration = {
		...preservedComponentProps,
		componentType: "DropDownSelection",
		availableItemsQueryModel: availableQueryId,
		selectedItemQueryModel: selectedQueryId,
		availableItemsOverviewModel: undefined,
		selectedItemsOverviewModel: undefined,
		elementRef: bindingElementRef ?? componentElementRef ?? overviewElementRef ?? ""
	};

	const updatedBinding: BindingResult = {
		...binding,
		relationshipUiModel: {
			...bindingModel,
			header: {
				...bindingModel.header,
				modelReferences: buildDropDownQueryModelReferences(
					bindingModel.header.modelReferences ?? [],
					availableOverviewId,
					selectedOverviewId,
					availableQueryId,
					selectedQueryId
				)
			},
			content: {
				...bindingModel.content,
				component: updatedComponent
			}
		}
	};

	return { binding: updatedBinding, queryModels: [availableQuery, selectedQuery] };
}

/** Upgrades dropdown bindings from overview references to generated query references. */
export function upgradeDropdownBindings(
	bindings: readonly BindingResult[],
	context: EnrichmentContext
): DropDownUpgradeResult {
	const allQueryModels: QueryModel[] = [];
	const updatedBindings: BindingResult[] = [];

	for (const binding of bindings) {
		if (!shouldUpgradeBinding(binding)) {
			updatedBindings.push(binding);

			continue;
		}

		const result = upgradeSingleBinding(binding, context);

		updatedBindings.push(result.binding);
		allQueryModels.push(...result.queryModels);
	}

	return {
		updatedBindings,
		additionalQueryModels: allQueryModels
	};
}

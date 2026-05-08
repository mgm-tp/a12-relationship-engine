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

import { all, call, type SagaGenerator, select } from "typed-redux-saga";

import { type Activity, LocaleSelectors, ModelSelectors } from "@com.mgmtp.a12.client/client-core";
import { Query, type RelationshipModel } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { collectFieldsProjection } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import { type Locale } from "@com.mgmtp.a12.utils/utils-localization/lib/main/index.js";

import { A12InternalConstants } from "../../../../shared/constants.js";
import { TABLE_LIST } from "../../../constants.js";
import { Relationship as RelationshipClientApi } from "../../../relationship.js";
import { RelationshipSelectors } from "../../../selectors.js";
import { type RequestSelectorMap } from "../../../../server-connectors/request-selector-map.js";
import {
	createFilterOperand,
	createLinkConstraint,
	createSortConstraint
} from "../../../../server-connectors/queryApiRequestBuilder.js";

import { type InstanceDocumentModel, type LoadRequestResult, type RequestConfig } from "./types.js";

/* @internal */
export function* createLoadRequests(params: {
	activityId: string;
	dataHolders: Activity.DataHolder[];
	forSave?: boolean;
	requestSelectorMap: RequestSelectorMap;
}): SagaGenerator<LoadRequestResult> {
	const { activityId, dataHolders, forSave, requestSelectorMap } = params;
	const locale = yield* select(LocaleSelectors.locale());
	const [candidateInstances, linkInstances] = dataHolders.reduce(
		(tuple, dh) => {
			return RelationshipClientApi.CandidateDataHolder.isInstance(dh) && dh.data
				? [tuple[0].concat(dh.data), tuple[1]]
				: RelationshipClientApi.LinkDataHolder.isInstance(dh) && dh.data
					? [tuple[0], tuple[1].concat(dh.data)]
					: tuple;
		},
		[[], []] as [RelationshipClientApi.CandidateInstance[], RelationshipClientApi.LinkInstance[]]
	);

	// filter candidateInstances to avoid requesting candidate overview for readonly TableList (A12C-2945)
	const filteredCandidateInstances = candidateInstances.filter(
		(instance) =>
			!(instance.uiConfiguration.components.length === 1 && instance.uiConfiguration.components[0].name === TABLE_LIST)
	);

	const candidateModelsAndFields = yield* all(
		filteredCandidateInstances.map((instance) => {
			return call(collectModelsAndFieldsInfo, activityId, instance, "candidate" as const);
		})
	);

	const linkModelsAndFields = yield* all(
		linkInstances.map((instance) =>
			call(collectModelsAndFieldsInfo, activityId, instance, "link" as const, instance.componentName)
		)
	);

	const candidateRequests = yield* call(createCandidateRequest, {
		filteredCandidateInstances,
		candidateModelsAndFields,
		linkModelsAndFields,
		locale,
		forSave,
		activityId,
		requestSelectorMap
	});

	const linkRequests = yield* call(createLinkRequest, {
		linkInstances,
		linkModelsAndFields,
		locale,
		forSave,
		activityId,
		requestSelectorMap
	});

	return {
		candidateInstances: filteredCandidateInstances,
		candidateResultDocumentModels: candidateModelsAndFields,
		candidateRequests,
		linkInstances,
		linkResultDocumentModels: linkModelsAndFields,
		linkRequests
	};
}

interface FieldsProjection {
	fields?: string[];
	linkFields?: string[];
}

type ModelsAndFieldsInfo = InstanceDocumentModel & FieldsProjection;
interface LinkRequestParams {
	linkInstances: RelationshipClientApi.LinkInstance[];
	linkModelsAndFields: ModelsAndFieldsInfo[];
	locale: Locale;
	forSave?: boolean;
	activityId: string;
	requestSelectorMap: RequestSelectorMap;
}
interface CandidateRequestParams extends Omit<LinkRequestParams, "linkInstances"> {
	filteredCandidateInstances: RelationshipClientApi.CandidateInstance[];
	candidateModelsAndFields: ModelsAndFieldsInfo[];
	activityId: string;
}

function* createLinkRequest(params: LinkRequestParams): SagaGenerator<RequestConfig[]> {
	const { linkInstances, linkModelsAndFields, forSave, locale, activityId, requestSelectorMap } = params;
	const state = yield* select();
	const sourceRoleModelNames = yield* all(linkInstances.map((instance) => call(getSourceRoleModelName, instance)));

	return linkInstances.map(({ id, uiConfiguration, sourceEntity, linkQuery, linkPagination }) => {
		const modelAndFields = linkModelsAndFields.find((model) => model.instanceId === id);
		if (modelAndFields === undefined) {
			throw new Error(`No result document model found for instance ${id}`);
		}
		const { model: documentModel, fields, linkFields } = modelAndFields;

		const sourceRoleModelName = sourceRoleModelNames.find((item) => item.id === id)?.sourceRoleModelName;
		if (sourceRoleModelName === undefined) {
			throw new Error(`No source role document model found for instance ${id}`);
		}

		const requestId = "load_link_" + id;
		const additionalConfig: RequestConfig["additionalConfig"] = {
			relationshipModel: uiConfiguration.relationshipName,
			sourceEntity,
			targetRole: uiConfiguration.targetRole
		};

		const filterOperand = createFilterOperand(linkQuery, documentModel, locale);
		const sourceDocRef = calculateSourceDocRef(sourceEntity.docRef, forSave);
		const linkOperand = sourceDocRef
			? {
					operator: Query.OPERATORS.HAS_OPERATOR,
					relationshipModel: uiConfiguration.relationshipName,
					targetRole: sourceEntity.role,
					constraint: createLinkConstraint(sourceDocRef),
					maxDepth: 1
				}
			: undefined;
		const operands = [filterOperand, linkOperand].filter((o): o is Query.Operator => Boolean(o));
		const linkConstraint = operands.length > 1 ? { operator: Query.OPERATORS.AND_OPERATOR, operands } : operands[0];

		const sort = createSortConstraint(linkQuery.sorts ?? []);
		const links = [
			{
				relationshipModel: uiConfiguration.relationshipName,
				targetRole: uiConfiguration.targetRole,
				constraint: linkConstraint,
				maxDepth: 1,
				fields,
				linkFields
			}
		];

		const request = requestSelectorMap.loadLinks({
			id: requestId,
			activityId,
			targetDocumentModel: sourceRoleModelName,
			paging: { pageNumber: linkPagination.pageNumber, pageSize: linkPagination.pageSize },
			constraint: createLinkConstraint(sourceDocRef ?? ""),
			sort,
			links,
			exclude: true
		})(state);

		return { id, type: "link", request, additionalConfig };
	});
}

function* createCandidateRequest(params: CandidateRequestParams): SagaGenerator<RequestConfig[]> {
	const { filteredCandidateInstances } = params;
	return yield* all(
		filteredCandidateInstances.map(
			(candidateInstance): SagaGenerator<RequestConfig> => createSingleCandidateRequest(params, candidateInstance)
		)
	);
}

function* createSingleCandidateRequest(
	params: CandidateRequestParams,
	candidateInstance: RelationshipClientApi.CandidateInstance
): SagaGenerator<RequestConfig> {
	const { candidateModelsAndFields, forSave, locale, activityId, requestSelectorMap } = params;
	const state = yield* select();
	const { id, uiConfiguration, sourceEntity, candidateQuery, candidatePagination } = candidateInstance;
	const modelAndFields = candidateModelsAndFields.find(({ instanceId }) => instanceId === id);
	if (modelAndFields === undefined) {
		throw new Error(`No result document model found for instance ${id}`);
	}

	const { model: documentModel, fields, linkFields } = modelAndFields;

	const requestId = "load_candidate_" + id;
	const additionalConfig: RequestConfig["additionalConfig"] = {
		relationshipModel: uiConfiguration.relationshipName,
		sourceEntity,
		targetRole: uiConfiguration.targetRole
	};

	const calculatedFieldsProjections = yield* call(
		calculateFieldsProjectionForCandidate,
		{ fields, linkFields },
		params,
		candidateInstance
	);

	const filterOperand = createFilterOperand(candidateQuery, documentModel, locale);
	const sortClauses = candidateQuery.sorts?.length
		? candidateQuery.sorts
		: [{ path: "/__meta/createdAt", order: Query.Direction.DESC }];
	const sort = createSortConstraint(sortClauses);
	const sourceDocRef = calculateSourceDocRef(sourceEntity.docRef, !!forSave);
	const links = [
		{
			relationshipModel: uiConfiguration.relationshipName,
			targetRole: sourceEntity.role,
			constraint: createLinkConstraint(sourceDocRef ?? ""),
			maxDepth: 1
		}
	];

	const request = requestSelectorMap.loadCandidates({
		id: requestId,
		activityId,
		targetDocumentModel: documentModel.header.id,
		paging: { pageNumber: candidatePagination.pageNumber, pageSize: candidatePagination.pageSize },
		constraint: filterOperand,
		sort,
		links,
		fields: calculatedFieldsProjections?.fields
	})(state);

	return { id, type: "candidate", request, additionalConfig };
}
function* calculateFieldsProjectionForCandidate(
	fieldsProjections: FieldsProjection,
	params: CandidateRequestParams,
	candidateInstance: RelationshipClientApi.CandidateInstance
): SagaGenerator<FieldsProjection | undefined> {
	if (!fieldsProjections) {
		return undefined;
	}
	const { linkModelsAndFields, activityId } = params;
	const {
		id,
		uiConfiguration: { components }
	} = candidateInstance;
	const mainComponent = components[0];

	const linkFields = [];

	if (mainComponent.name === TABLE_LIST && components.length > 1) {
		const linkModelsAndFieldForTableList = yield* call(
			collectModelsAndFieldsInfo,
			activityId,
			candidateInstance,
			"link" as const,
			mainComponent.name
		);

		let linkModelsAndFieldForDualPane = linkModelsAndFields.find(({ instanceId }) => instanceId === id);
		if (!linkModelsAndFieldForDualPane) {
			linkModelsAndFieldForDualPane = yield* call(
				collectModelsAndFieldsInfo,
				activityId,
				candidateInstance,
				"link" as const,
				components[1].name
			);
		}
		linkFields.push(
			...(linkModelsAndFieldForTableList?.fields ?? []),
			...(linkModelsAndFieldForDualPane?.fields ?? [])
		);
	} else {
		let linkModelsAndField = linkModelsAndFields.find(({ instanceId }) => instanceId === id);
		if (!linkModelsAndField) {
			linkModelsAndField = yield* call(
				collectModelsAndFieldsInfo,
				activityId,
				candidateInstance,
				"link" as const,
				mainComponent.name
			);
		}
		linkFields.push(...(linkModelsAndField?.fields ?? []));
	}

	return {
		fields: fieldsProjections.fields ? Array.from(new Set([...fieldsProjections.fields, ...linkFields])) : undefined,
		linkFields: linkFields.length > 0 ? Array.from(new Set(linkFields)) : undefined
	};
}

function* collectModelsAndFieldsInfo(
	activityId: string,
	instance: RelationshipClientApi.LinkInstance | RelationshipClientApi.CandidateInstance,
	use: "candidate" | "link",
	componentName?: string
): SagaGenerator<ModelsAndFieldsInfo> {
	const componentConfig =
		instance.uiConfiguration.components.find((component) => {
			if (componentName && component.name !== componentName) {
				return false;
			}
			return component.models.some((model) => model.use === use);
		}) ?? instance.uiConfiguration.components[0];

	const overviewModelSelectorConfig = {
		activityId,
		componentConfig,
		resultDocumentModelType: use
	};

	const overviewModels = yield* select(RelationshipSelectors.overviewModels(overviewModelSelectorConfig));

	if (overviewModels === undefined || overviewModels.loadingState !== "loaded") {
		throw new Error(
			`Cannot find overview model for ${use} specified in Relationship UI config "${instance.uiConfiguration.name}"`
		);
	}

	let targetFields = collectFieldsProjection(overviewModels.overviewModel, overviewModels.documentModel);

	if (use === "link") {
		targetFields = targetFields
			?.filter((field) => field.startsWith(`/${A12InternalConstants.TARGET_GROUP_NAME}`))
			.map((field) => field.replace(`/${A12InternalConstants.TARGET_GROUP_NAME}`, ""));
	}

	return {
		model: overviewModels.documentModel,
		instanceId: instance.id,
		fields: targetFields
	};
}

function* getSourceRoleModelName(linkInstance: RelationshipClientApi.LinkInstance): SagaGenerator<{
	id: string;
	sourceRoleModelName?: string;
	hasLinkDocument?: boolean;
}> {
	const { relationshipName, targetRole } = linkInstance.uiConfiguration;
	const relationshipModel = yield* select(
		ModelSelectors.modelByName(relationshipName, RelationshipClientApi.isRelationshipModel)
	);
	if (relationshipModel === undefined) {
		return {
			id: linkInstance.id
		};
	}
	const sourceRoleModelName = (relationshipModel as RelationshipModel).content.entityCharacteristics.find(
		(entity) => entity.role !== targetRole
	)?.documentModel;
	return {
		id: linkInstance.id,
		sourceRoleModelName
	};
}

function calculateSourceDocRef(docRef: string | null, forSave: boolean = false) {
	return docRef || (forSave ? A12InternalConstants.SPEL_CREATED_DOC_REF : undefined);
}

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
 * @experimental
 */

import { type Action } from "typescript-fsa";

import { type ModelPath } from "@com.mgmtp.a12.base/base-model-api/lib/main/model/index.js";
import {
	Activity,
	ActivityActions,
	ActivitySelectors,
	LocaleSelectors,
	ModelSelectors
} from "@com.mgmtp.a12.client/client-core";
import { type Relationship as RelationshipServerApi } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { FormModel } from "@com.mgmtp.a12.formengine/formengine-core";
import {
	type DocumentModel,
	type EntityInstancePath,
	type GroupInstance
} from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";
import { type Locale, type Localizable } from "@com.mgmtp.a12.utils/utils-localization/lib/main/index.js";
import { THUMBNAIL_SLICE } from "@com.mgmtp.a12.client/client-core/lib/core/activity/a12-internal/thumbnails/slice.js";

import { assertCondition, assertObject } from "../../../../shared/assertion.js";
import {
	getDocRefByCddPath,
	getDocRefTopDown,
	getSourceDocRefFromTargetDocPath
} from "../../../../cdm/cdd/core/index.js";
import { CddSelectors } from "../../../../cdm/cdd/redux/index.js";
import { isScdmDataHolderShape } from "../../../../cdm/cdd/redux/dhReducersImpl.js";
import { newDocRef } from "../../../../cdm/cdd/redux/newDocRef.js";
import { type RelationshipGroupInformation } from "../../../../cdm/cdmCommons/relationshipAnnotations.js";
import { otherEntity } from "../../../../cdm/commons/relationshipModelUtils.js";
import { computeSubActivityData } from "../../../../cdm/dataProvider/subactivity/computeSubActivityData.js";
import { DUAL_PANE_SELECTION } from "../../../constants.js";
import { createEntityDisplayLabelLocalizable, createUiConfigurationKey } from "../../../localization.js";
import { PaginationUtils } from "../../../paginationUtils.js";
import { Relationship } from "../../../relationship.js";
import { RelationshipSelectors } from "../../../selectors.js";
import { getBindingConfiguration } from "../../../../shared/BindingConfiguration.js";

import { type AdapterCandidate, type OwnProps as CommonOwnProps, type Items } from "../adapter/adapter.js";
import { type AdapterLink } from "../adapter/adapterLinkSelectors.js";

/**
 * @internal
 * Props for Relationship UI component
 */
export type OwnProps<TplType, FormModelElemType extends { id: string } = { id: string }> = CommonOwnProps<TplType> &
	ScdmProps<FormModelElemType>;

/**
 * Additional props for SCDM components.
 */
export interface ScdmProps<FormModelElemType extends { id: string } = { id: string }> {
	// annotations from CDM or BC
	// Note: Is now duplicated in BC
	readonly config: Pick<RelationshipGroupInformation, "relationship" | "targetRole">;

	readonly formModel: FormModel;

	// the element to which the relsh UI is bound to
	readonly formModelElement: FormModelElemType;

	// path to element
	readonly formModelElementPath: ModelPath;

	// document model
	readonly cdm: DocumentModel;

	// Form Engine's current location inside document
	readonly dataContext: EntityInstancePath;
}

/** @internal */
export interface StateProps {
	readonly candidates: Items<AdapterCandidate[]>;
	readonly links: Items<AdapterLink[]>;
	readonly linkModels: Relationship.OverviewModels;

	readonly maxNumberOfLinks?: number;

	readonly label?: Localizable;
	readonly locale: Locale;
	readonly localizableKeyPrefix: string;

	readonly disabled?: boolean;
	readonly targetRole?: string;

	readonly modificationConfiguration?: Relationship.ModificationConfiguration;

	readonly relationship?: string;

	createActivityForNewEntity?(modelName: string): Action<ActivityActions.PushPayload>;
	createActivityForExistingEntity?(docRef: string, linkId?: string): Action<ActivityActions.PushPayload>;
}

/** @internal */
export function mapStateToAdapterProps<T>(state: {}, ownProps: OwnProps<T>): StateProps {
	const { activityId, cdm, config, dataContext, formModel, formModelElement, instanceId, readonly } = ownProps;

	const locale = LocaleSelectors.locale()(state);

	const emptyStateProps: StateProps = {
		candidates: { loadingState: "missing" },
		links: { loadingState: "missing" },
		linkModels: { loadingState: "missing" },
		localizableKeyPrefix: "dummy",
		locale
	};

	const activity = ActivitySelectors.activityById(activityId)(state);
	if (!activity) {
		return emptyStateProps;
	}

	const relshModel = ModelSelectors.modelGraph()(state).relationshipModels.find(
		(rm) => rm.header.id === config.relationship
	);
	if (relshModel === undefined) {
		return emptyStateProps;
	}

	const targetEntityCharacteristic = relshModel.content.entityCharacteristics.find(
		(e) => e.role === ownProps.config.targetRole
	);

	const cdd = (CddSelectors.cdd(activityId)(state)?.document || {}) as GroupInstance;
	const relationshipName = relshModel.header.id;

	const sourceDocRef: string | undefined = findSourceDocRef(cdd, cdm, formModelElement, dataContext, relationshipName);

	const bindingDetails = getBindingDetails(formModel, formModelElement.id);

	const { modificationConfiguration, targetRole } = bindingDetails;

	let createActivityForNewEntity: ((modelName: string) => Action<ActivityActions.PushPayload>) | undefined;
	let createActivityForExistingEntity:
		| ((docRef: string, linkId: string) => Action<ActivityActions.PushPayload>)
		| undefined;

	if (activity && modificationConfiguration && relshModel && targetRole && sourceDocRef) {
		const sourceEntity = otherEntity(relshModel, targetRole);
		assertObject(sourceEntity);

		const defaultDH = Activity.findDefaultDataHolder(activity);

		if (defaultDH && isScdmDataHolderShape(defaultDH.data)) {
			const { documentGraph, changeLog } = defaultDH.data;

			createActivityForNewEntity = (modelName: string) => {
				const instance = newDocRef(modelName);
				const data = computeSubActivityData(
					{ documentGraph, changeLog },
					{
						relationshipModel: relshModel.header.id,
						sourceDocRef,
						sourceRole: sourceEntity.role,
						targetDocRef: instance,
						targetModel: modelName,
						targetRole
					}
				);

				const activityDescriptor = subActivityDescriptor(
					modificationConfiguration,
					activity.descriptor,
					modelName,
					instance
				);

				return ActivityActions.create({
					initiatingActivityId: activityId,
					activityDescriptor,
					data,
					loadingState: "missing",
					slices: { [THUMBNAIL_SLICE]: defaultDH.slices[THUMBNAIL_SLICE] }
				});
			};

			createActivityForExistingEntity = (docRef: string, linkId?: string) => {
				const data = computeSubActivityData({ documentGraph, changeLog });

				const targetDoc = data.documentGraph.documents.byDocRef[docRef];
				assertCondition(targetDoc.loadingState === "loaded");
				const model = targetDoc.documentModelName;

				const activityDescriptor = {
					...subActivityDescriptor(modificationConfiguration, activity.descriptor, model, docRef),
					selectedLinkId: linkId
				};

				return ActivityActions.create({
					initiatingActivityId: activityId,
					activityDescriptor,
					data,
					loadingState: "missing",
					slices: {
						[THUMBNAIL_SLICE]: defaultDH.slices[THUMBNAIL_SLICE],
						uiState: readonly ? { readonly } : undefined
					}
				});
			};
		}
	}

	const rawLinks = sourceDocRef
		? CddSelectors.links(activityId, config.relationship, sourceDocRef, targetRole)(state)
		: undefined;
	const links: Items<AdapterLink[]> =
		rawLinks !== undefined
			? {
					loadingState: "loaded",
					data: rawLinks.map((rawLink) => ({
						document: rawLink.link.document,
						linkRef: rawLink.link.linkRef,
						mutation: rawLink.mutationState,
						relinked: false,
						visible: true
					}))
				}
			: {
					loadingState: "missing"
				};

	const rawCandidates = CddSelectors.cddCandidates(activityId, instanceId)(state) ?? [];

	// NOTE: When enable pagination, the candidate.linkRef.id should be used to check whether it is already linked or not.
	const addLinkAllowed = (candidate: RelationshipServerApi.Candidate) =>
		relshModel.content.duplicatesAllowed ||
		(rawLinks !== undefined &&
			!rawLinks.some(
				({ link, mutationState }) =>
					Relationship.isLinkDescriptorEntityEqual(
						targetEntityCharacteristic?.role ?? "",
						link.linkRef.linkDescriptor,
						candidate.linkRef.linkDescriptor
					) &&
					mutationState !== "removed" &&
					mutationState !== "withdrawn"
			));

	const paginatedCandidates = paginateCandidates(
		state,
		activityId,
		instanceId,
		ownProps.componentConfiguration.id,
		rawCandidates
	);

	const candidates =
		sourceDocRef !== undefined
			? {
					loadingState: "loaded" as const,
					data: paginatedCandidates.map((rawCandidate) => ({
						...rawCandidate,
						addLinkAllowed: addLinkAllowed(rawCandidate),
						// set correct source docRef
						linkRef: {
							...rawCandidate.linkRef,
							linkDescriptor: {
								...rawCandidate.linkRef.linkDescriptor,
								entities: rawCandidate.linkRef.linkDescriptor.entities.map((e) =>
									e.role === bindingDetails.targetRole
										? e
										: {
												...e,
												docRef: sourceDocRef
											}
								)
							}
						}
					}))
				}
			: {
					loadingState: "missing" as const
				};

	const linkModels = modelsSelector(
		activityId,
		formModel,
		formModelElement.id,
		ownProps.componentConfiguration,
		"link"
	)(state);

	const maxNumberOfLinks =
		typeof targetEntityCharacteristic?.linkConstraints.multiplicity.upperLimit === "number"
			? targetEntityCharacteristic?.linkConstraints.multiplicity.upperLimit
			: undefined;

	const disabled = ownProps.disabled || [candidates, links].some((e) => e.loadingState !== "loaded");

	return {
		links,
		candidates,
		linkModels,
		maxNumberOfLinks,
		locale,
		localizableKeyPrefix: createUiConfigurationKey(bindingDetails.name, ownProps.componentConfiguration.id),
		label:
			targetEntityCharacteristic &&
			createEntityDisplayLabelLocalizable(relshModel.header.id, targetEntityCharacteristic),
		disabled,
		modificationConfiguration: bindingDetails.modificationConfiguration,
		relationship: bindingDetails.relationshipName,
		targetRole: bindingDetails.targetRole,
		createActivityForNewEntity,
		createActivityForExistingEntity
	};
}

function subActivityDescriptor(
	modificationConfiguration: Relationship.ModificationConfiguration,
	parentAD: Activity.Descriptor,
	model: string,
	instance: string
): Activity.Descriptor {
	return (
		modificationConfiguration.activityDescriptor ?? {
			...(modificationConfiguration.extendParentActivityDescriptor ? parentAD : {}),
			model,
			instance
		}
	);
}

/**
 * @internal
 *
 * Candidates are loaded only once per entity. Therefore they must be
 * altered so that they contain the correct source document.
 *
 * There are 4 cases and for each case the source document must be
 * determined in a different way:
 *
 * 1. A to-many Relsh component is bound to a repeat. In this case the
 *    source document can be derived from the "current row" aka data context
 *    plus potential to-1 linked documents.
 *
 * 2. A to-1 Relsh component is bound to a control. In this case the source
 *    document can be derived from the field's location in the CDD.
 *
 * 3a. A uniquely identifiable to-1 Relsh component is bound to a custom screen element.
 *    In this case the source document can be derived from the data context
 *    and the Relsh name.
 *
 * 3b. Like 3a but there are multiple components using the same Relsh. In
 *    this case the source document can be derived if the path to the target
 *    entity in the CDD is provided in the binding conf.
 *
 */
export function findSourceDocRef(
	cdd: GroupInstance,
	cdm: DocumentModel,
	formModelElement: { id: string },
	dataContext: EntityInstancePath,
	relationshipName: string
): string | undefined {
	let sourceDocRef: string | undefined;
	if (FormModel.DetachedRepeat.isInstance(formModelElement)) {
		const pathToBoundGroupInCdd = formModelElement.groupPath;
		const pathToParentGroup =
			pathToBoundGroupInCdd.length > 0 ? pathToBoundGroupInCdd.slice(0, -1) : pathToBoundGroupInCdd;
		sourceDocRef = getDocRefByCddPath(extendPathInContext(pathToParentGroup), cdd, cdm);
	} else if (FormModel.Control.isInstance(formModelElement)) {
		const pathToFieldInCdd = formModelElement.elementPath;
		sourceDocRef = getSourceDocRefFromTargetDocPath(extendPathInContext(pathToFieldInCdd), cdd, cdm);
	} else if (FormModel.CustomScreenElement.isInstance(formModelElement)) {
		const modelPathOfTargetEntity = undefined; // lookup in new BC property;
		sourceDocRef =
			modelPathOfTargetEntity !== undefined
				? getSourceDocRefFromTargetDocPath(extendPathInContext(modelPathOfTargetEntity), cdd, cdm)
				: getDocRefTopDown(dataContext, relationshipName, cdd, cdm);
	}
	return sourceDocRef;

	function extendPathInContext(path: ModelPath): EntityInstancePath {
		return [...dataContext, ...path.slice(dataContext.length).map((e) => ({ ...e, index: 1 }))];
	}
}

/** @internal */
export const modelsSelector =
	(
		activityId: string,
		formModel: FormModel,
		formModelElement: string,
		componentConfig: Relationship.ComponentConfiguration,
		resultDocumentModelType: "link" | "candidate"
	): ((state: object) => Relationship.OverviewModels) =>
	(state: object) => {
		const bindingConfig = getBindingConfiguration(formModel);
		const binding = bindingConfig?.find((b) => b.elementId === formModelElement);
		if (binding === undefined) {
			throw new Error(`Binding not found: "${formModelElement}"`);
		}
		const models = Relationship.UiConfiguration.isInstance(binding.details)
			? RelationshipSelectors.overviewModels({
					activityId,
					componentConfig,
					resultDocumentModelType
				})(state)
			: undefined;

		if (models === undefined) {
			throw new Error(`Incomplete details of binding "${formModelElement}"`);
		}

		return models;
	};

/** @internal */
export function getBindingDetails(formModel: FormModel, formModelElement: string): Relationship.UiConfiguration {
	const bindingConfig = getBindingConfiguration(formModel);
	const binding = bindingConfig?.find((b) => b.elementId === formModelElement);
	if (binding === undefined) {
		throw new Error(`Binding not found: "${formModelElement}"`);
	}
	if (Relationship.UiConfiguration.isInstance(binding.details)) {
		return binding.details;
	}
	throw new Error(`Incomplete details of binding "${formModelElement}"`);
}

function paginateCandidates(
	state: object,
	activityId: string,
	instanceId: string,
	componentId: string,
	rawCandidates: RelationshipServerApi.Candidate[]
): RelationshipServerApi.Candidate[] {
	const componentName = RelationshipSelectors.componentName(state, activityId, instanceId, componentId);

	const candidatePagination = RelationshipSelectors.candidateDataHolder(
		activityId,

		instanceId
	)(state)?.data?.candidatePagination;

	if (componentName === DUAL_PANE_SELECTION && candidatePagination) {
		return paginateDualPaneCandidates(rawCandidates, candidatePagination);
	}

	return rawCandidates;
}

/**
 * Select the candidates of the current page based on pagination information
 */
function paginateDualPaneCandidates(
	candidates: RelationshipServerApi.Candidate[],

	pagination: Relationship.Pagination
): RelationshipServerApi.Candidate[] {
	const sliceIndices = PaginationUtils.getSlices(pagination);

	if (!sliceIndices) {
		return candidates;
	}

	const startIndex = sliceIndices.startIndex - pagination.offset;

	const endIndex = sliceIndices.endIndex - pagination.offset;

	return candidates.slice(startIndex, endIndex);
}

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
import { FormEngineSelectors } from "@com.mgmtp.a12.formengine/formengine-core";
import type { LocalizedModelText } from "@com.mgmtp.a12.utils/utils-localization";
import { isOverviewModel } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import type { ModelPath, Model as BaseModel } from "@com.mgmtp.a12.base/base-model-api";
import type { RelationshipModel } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { isQueryModel, type QueryModel } from "@com.mgmtp.a12.querymodel/querymodel-core";
import { Activity, ActivityMap, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import { Model, ModelSelectors as ClientModelSelectors } from "@com.mgmtp.a12.client/client-core";
import type { DocumentModel, IGeneratedCodeAccessor } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import { isFormModel, type FormModel, isFormModelDetachedRepeat } from "@com.mgmtp.a12.formengine/formengine-core";

import { parseInstanceId } from "../utils/instanceId.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";
import { isRelationshipUiModel } from "../../../models/index.js";
import type { RelationshipUiModel } from "../../../models/index.js";
import { findFormElementByUiModelId } from "../utils/formModelLookup.js";

import { createSelector } from "./selector.js";

/** @internal */
export namespace ModelSelectors {
	/** Bundle of a form model with document model and validator provider. */
	export interface LinkFormModels {
		readonly formModel: FormModel;
		readonly documentModel: DocumentModel;
		readonly validatorProvider: IGeneratedCodeAccessor;
	}

	/** Selects link form models for a data holder descriptor. */
	export function linkFormModels(
		activityId: string,
		dataHolderDescriptor: Activity.DataHolderDescriptor
	): Selector<LinkFormModels | undefined> {
		return (state) => linkFormModelsReselect(state, activityId, dataHolderDescriptor);
	}

	const linkFormModelsReselect = createSelector(
		[
			(state: object) => ClientModelSelectors.modelGraph()(state),
			(state: object) => ClientModelSelectors.models()(state),
			(state: object, activityId: string, dataHolderDescriptor: Activity.DataHolderDescriptor) =>
				ActivitySelectors.activityPropById(activityId, (a) =>
					a.dataHolders
						.filter(
							(dh) =>
								RelationshipEngineDataHolder.AvailableItemsDataHolder.isInstance(dh) ||
								RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance(dh)
						)
						.find(Activity.DataHolder.hasDescriptor(dataHolderDescriptor))
				)(state)
		],
		(modelGraph, models, dataHolder): LinkFormModels | undefined => {
			const linkFormModelName = dataHolder?.slices.uiConfiguration.component?.linkFormModel;

			if (!linkFormModelName) {
				return undefined;
			}

			const match = modelGraph.genericModels?.find((gm) => gm.type === "form" && gm.modelId === linkFormModelName);

			if (!match) {
				return undefined;
			}

			const formModelRaw = models[match.modelId];

			if (!isFormModel(formModelRaw)) {
				return undefined;
			}

			const formModel = formModelRaw;

			const documentModelName = getDocumentModelReference(formModel);

			if (!documentModelName) {
				return undefined;
			}

			const docModelRaw = models[documentModelName];

			if (!Model.isDocumentAndValidationModel(docModelRaw)) {
				return undefined;
			}

			const { generatedCodeAccessor: validatorProvider } = docModelRaw;

			return { formModel, documentModel: docModelRaw, validatorProvider };
		}
	);

	/** Looks up link form models by explicit model name, without requiring a data holder. */
	export function linkFormModelByName(linkFormModelName: string | undefined): Selector<LinkFormModels | undefined> {
		return (state) => linkFormModelByNameReselect(state, linkFormModelName);
	}

	const linkFormModelByNameReselect = createSelector(
		[
			(state: object) => ClientModelSelectors.modelGraph()(state),
			(state: object) => ClientModelSelectors.models()(state),
			(_state: object, linkFormModelName: string | undefined) => linkFormModelName
		],
		(modelGraph, models, linkFormModelName): LinkFormModels | undefined => {
			if (!linkFormModelName) {
				return undefined;
			}

			const match = modelGraph.genericModels?.find((gm) => gm.type === "form" && gm.modelId === linkFormModelName);

			if (!match) {
				return undefined;
			}

			const formModelRaw = models[match.modelId];

			if (!isFormModel(formModelRaw)) {
				return undefined;
			}

			const formModel = formModelRaw;

			const documentModelName = getDocumentModelReference(formModel);

			if (!documentModelName) {
				return undefined;
			}

			const docModelRaw = models[documentModelName];

			if (!Model.isDocumentAndValidationModel(docModelRaw)) {
				return undefined;
			}

			const { generatedCodeAccessor: validatorProvider } = docModelRaw;

			return { formModel, documentModel: docModelRaw, validatorProvider };
		}
	);

	/** Root document model of the form; returns `undefined` when not yet loaded. */
	export interface RootDocumentModel {
		readonly documentModel: DocumentModel;
		readonly validatorProvider: IGeneratedCodeAccessor;
	}

	/** Selects the root document model for an activity. */
	export function rootDocumentModel(activityId: string): Selector<RootDocumentModel | undefined> {
		return (state) => rootDocumentModelReselect(state, activityId);
	}

	const rootDocumentModelReselect = createSelector(
		[
			(state: object) => ClientModelSelectors.models()(state),
			(state: object, activityId: string) => ClientModelSelectors.modelDescriptorsByActivityId(activityId)(state)
		],
		(models, modelDescriptors): RootDocumentModel | undefined => {
			const formModelDescriptor = modelDescriptors.find(({ modelType }) => modelType === "form");

			if (!formModelDescriptor) {
				return undefined;
			}

			const formModelRaw = models[formModelDescriptor.name];

			if (!isFormModel(formModelRaw)) {
				return undefined;
			}

			const formModel = formModelRaw;

			const documentModelName = getDocumentModelReference(formModel);

			if (!documentModelName) {
				return undefined;
			}

			const docModelRaw = models[documentModelName];

			if (!Model.isDocumentAndValidationModel(docModelRaw)) {
				return undefined;
			}

			const { generatedCodeAccessor: validatorProvider, ...documentModel } = docModelRaw;

			return { documentModel, validatorProvider };
		}
	);

	/** Bundle of a query model with document model; returns `undefined` when not yet loaded. */
	export interface QueryModels {
		readonly queryModel: QueryModel;
		readonly documentModel: DocumentModel;
		readonly validatorProvider: IGeneratedCodeAccessor;
	}

	/** Selects a QueryModels bundle by query model name. */
	export function queryModels(queryModelName: string): Selector<QueryModels | undefined> {
		return (state) => queryModelsReselect(state, queryModelName);
	}

	const queryModelsReselect = createSelector(
		[
			(state: object) => ClientModelSelectors.models()(state),
			(_state: object, queryModelName: string) => queryModelName
		],
		(models, queryModelName): QueryModels | undefined => {
			const queryModelRaw = models[queryModelName];

			if (!isQueryModel(queryModelRaw)) {
				return undefined;
			}

			const queryModel = queryModelRaw;

			const documentModelName = getDocumentModelReference(queryModel);

			if (!documentModelName) {
				return undefined;
			}

			const docModelRaw = models[documentModelName];

			if (!Model.isDocumentAndValidationModel(docModelRaw)) {
				return undefined;
			}

			const { generatedCodeAccessor: validatorProvider } = docModelRaw;

			return { documentModel: docModelRaw, validatorProvider, queryModel };
		}
	);

	function getDocumentModelReference({ header }: BaseModel): string | undefined {
		const ref = header.modelReferences?.find((x) => x.modelType === "document");

		return ref?.reference;
	}

	/** Selects a relationship model by name from the model graph. */
	export function relationshipModel(relationshipName: string): Selector<RelationshipModel | undefined> {
		return (state) => relationshipModelReselect(state, relationshipName);
	}

	const relationshipModelReselect = createSelector(
		[
			(state: object) => ClientModelSelectors.modelGraph()(state),
			(_state: object, relationshipName: string) => relationshipName
		],
		(graph, relationshipName): RelationshipModel | undefined =>
			graph.relationshipModels.find((rm) => rm.header.id === relationshipName)
	);

	/**
	 * Resolves the source document model name for a given relationship and source role.
	 *
	 * Looks up the relationship model and finds the entity characteristics entry matching
	 * the given source role, returning its document model name.
	 */
	export function sourceDocumentModelName(relationshipName: string, sourceRole: string): Selector<string | undefined> {
		return (state) => sourceDocumentModelNameReselect(state, relationshipName, sourceRole);
	}

	const sourceDocumentModelNameReselect = createSelector(
		[
			(state: object, relationshipName: string) => relationshipModelReselect(state, relationshipName),
			(_state: object, _relationshipName: string, sourceRole: string) => sourceRole
		],
		(relModel, sourceRole): string | undefined =>
			relModel?.content.entityCharacteristics.find((ec) => ec.role === sourceRole)?.documentModel
	);

	/** Selects the group path for a data holder; resolves DetachedRepeat or dropdown paths. */
	export function groupPath(
		activityId: string,
		dataHolderDescriptor: Activity.DataHolderDescriptor
	): Selector<ModelPath | undefined> {
		return (state) => groupPathReselect(state, activityId, dataHolderDescriptor);
	}

	const groupPathReselect = createSelector(
		[
			(state: object, activityId: string, dataHolderDescriptor: Activity.DataHolderDescriptor) =>
				ActivitySelectors.activityPropById(activityId, (a) =>
					a.dataHolders
						.filter(
							(dh) =>
								RelationshipEngineDataHolder.AvailableItemsDataHolder.isInstance(dh) ||
								RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance(dh) ||
								RelationshipEngineDataHolder.DropdownSelectionDataHolder.isInstance(dh)
						)
						.find(Activity.DataHolder.hasDescriptor(dataHolderDescriptor))
				)(state),
			(state: object, activityId: string) => FormEngineSelectors.models(activityId)(state)?.formModel,
			(state: object, activityId: string) => rootDocumentModelReselect(state, activityId)
		],
		(dataHolder, formModel, rootDocModel): ModelPath | undefined => {
			if (!dataHolder) {
				return undefined;
			}

			const uiModelName = parseInstanceId(dataHolder.slices.id)?.uiModelName;

			if (!formModel || !uiModelName) {
				return undefined;
			}

			const boundElement = findFormElementByUiModelId(formModel, uiModelName);

			if (isFormModelDetachedRepeat(boundElement)) {
				return boundElement.groupPath;
			}

			if (RelationshipEngineDataHolder.DropdownSelectionDataHolder.isInstance(dataHolder)) {
				return resolveDropdownGroupPath(rootDocModel, dataHolder.slices.uiConfiguration.relationshipName);
			}

			return undefined;
		}
	);

	function resolveDropdownGroupPath(
		rootDocModel: RootDocumentModel | undefined,
		relationshipName: string
	): ModelPath | undefined {
		if (!rootDocModel) {
			return undefined;
		}

		const documentModel = rootDocModel.documentModel;
		const isCdm = documentModel.header.annotations?.some((a) => a.name === "cdm.queryRoot") ?? false;

		if (!isCdm) {
			return [{ elementName: documentModel.content.modelRoot.name }];
		}

		return findGroupPathByRelationship(documentModel.content.modelRoot, relationshipName, []);
	}

	function findGroupPathByRelationship(
		group: DocumentModel.Group,
		relationshipName: string,
		currentPath: ModelPath
	): ModelPath | undefined {
		for (const element of group.elements) {
			if (element.type !== "Group") {
				continue;
			}

			const childGroup = element as DocumentModel.Group;
			const cdmRelationship = childGroup.annotations?.find((a) => a.name === "cdm.relationship")?.value;
			const childPath = [...currentPath, { elementName: childGroup.name }];

			if (cdmRelationship === relationshipName) {
				return childPath;
			}

			const found = findGroupPathByRelationship(childGroup, relationshipName, childPath);

			if (found) {
				return found;
			}
		}

		return undefined;
	}

	/** Returns `true` when the SelectedItemsOverview query model carries `exclude: true`. */
	export function isExcludeMode(activityId: string, relationshipModel: string): Selector<boolean> {
		return (state) => isExcludeModeReselect(state, activityId, relationshipModel);
	}

	const isExcludeModeReselect = createSelector(
		[
			(state: object, activityId: string, relationshipModelName: string) =>
				ActivitySelectors.activityPropById(activityId, (a) =>
					a.dataHolders
						.filter(RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance)
						.find((dh) => dh.slices.uiConfiguration.relationshipName === relationshipModelName)
				)(state),
			(state: object) => ClientModelSelectors.models()(state)
		],
		(dataHolder, models): boolean => {
			if (!dataHolder || !RelationshipEngineDataHolder.Slices.isInstance(dataHolder.slices)) {
				return false;
			}

			const overviewModelName = dataHolder.slices.uiConfiguration.component?.selectedItemsOverviewModel;

			if (!overviewModelName) {
				return false;
			}

			const overviewModelRaw = models[overviewModelName];

			if (!overviewModelRaw || Model.Error.isInstance(overviewModelRaw) || !isOverviewModel(overviewModelRaw)) {
				return false;
			}

			const queryModelRef = overviewModelRaw.header.modelReferences?.find(
				(ref) => ref.purpose === "query-model-for-overview" && ref.modelType === "query"
			);

			if (!queryModelRef) {
				return false;
			}

			const queryModelRaw = models[queryModelRef.reference];

			return isQueryModel(queryModelRaw) && queryModelRaw.content.exclude === true;
		}
	);

	/** Selects the multilingual form element title for a relationship UI model. */
	export function formElementTitle(activityId: string, uiModelId: string): Selector<LocalizedModelText | undefined> {
		return (state) => formElementTitleReselect(state, activityId, uiModelId);
	}

	const formElementTitleReselect = createSelector(
		[
			(state: object, activityId: string) => FormEngineSelectors.models(activityId)(state)?.formModel,
			(_state: object, _activityId: string, uiModelId: string) => uiModelId
		],
		(formModel, uiModelId): LocalizedModelText | undefined => {
			if (!formModel) {
				return undefined;
			}

			return getFormElementTitle(findFormElementByUiModelId(formModel, uiModelId));
		}
	);

	function getFormElementTitle(
		element: FormModel.BasicScreenElement | FormModel.Screen | undefined
	): LocalizedModelText | undefined {
		const title = getTitle(element);

		if (!isMultilingualLabel(title)) {
			return undefined;
		}

		const localizedText = title.multilingualText.text;

		return localizedText?.some((entry) => entry.text.length > 0) ? localizedText : undefined;
	}

	function getTitle(
		element: FormModel.BasicScreenElement | FormModel.Screen | undefined
	): FormModel.BasicScreenElement["title"] | FormModel.Screen["title"] | undefined {
		return element?.title;
	}

	function isMultilingualLabel(title: unknown): title is FormModel.MultilingualLabel {
		return (
			typeof title === "object" && title !== null && (title as { readonly type?: unknown }).type === "Multilingual"
		);
	}

	/** Selects relationship UI models referenced from an activity's form model. */
	export function uiModels(activityId: string): Selector<RelationshipUiModel[]> {
		return (state) => uiModelsReselect(state, activityId);
	}

	/** @internal */
	const RELATIONSHIP_UI_MODEL_TYPE = "relationship-ui";
	const uiModelsReselect = createSelector(
		[
			(state: object, activityId: string) => ClientModelSelectors.modelDescriptorsByActivityId(activityId)(state),
			(state: object) => ClientModelSelectors.models()(state)
		],
		(modelDescriptors, models): RelationshipUiModel[] => {
			const formModelDescriptor = modelDescriptors.find(({ modelType }) => modelType === "form");

			if (!formModelDescriptor) {
				return [];
			}

			const formModelRaw = models[formModelDescriptor.name];

			if (!isFormModel(formModelRaw)) {
				return [];
			}

			const uiModelRefs =
				formModelRaw.header.modelReferences?.filter(
					(ref) => ref.modelType === RELATIONSHIP_UI_MODEL_TYPE && ref.purpose === "relationship-ui"
				) ?? [];

			const result: RelationshipUiModel[] = [];

			for (const ref of uiModelRefs) {
				const model = models[ref.reference];

				if (isRelationshipUiModel(model)) {
					result.push(model);
				}
			}

			return result;
		}
	);

	/** Selects a single relationship UI model by its model name. */
	export function uiModelByName(modelName: string): Selector<RelationshipUiModel | undefined> {
		return (state) => uiModelByNameReselect(state, modelName);
	}

	const uiModelByNameReselect = (state: object, modelName: string): RelationshipUiModel | undefined =>
		ClientModelSelectors.modelByName(modelName, isRelationshipUiModel)(state);

	/** Selects the model path for a relationship name within the CDM document model. */
	export function groupPathByRelationship(
		activityId: string,
		relationshipName: string
	): Selector<ModelPath | undefined> {
		return (state) => groupPathByRelationshipReselect(state, activityId, relationshipName);
	}

	const groupPathByRelationshipReselect = (
		state: object,
		activityId: string,
		relationshipName: string
	): ModelPath | undefined => resolveDropdownGroupPath(rootDocumentModelReselect(state, activityId), relationshipName);

	/**
	 * Returns `true` when the activity uses CDM (Composed Document Model) functionality.
	 *
	 * An activity is considered a CDM activity when it has an instance descriptor set AND either:
	 * - its form model references a document model listed in the model graph's `composeDocumentModels`, or
	 * - its initiating (parent) activity already has CDM state initialised in its default data holder.
	 */
	export function isCdmActivity(activityId: string): Selector<boolean> {
		return (state) => isCdmActivityReselect(state, activityId);
	}

	const isCdmActivityReselect = createSelector(
		[
			(state: object, activityId: string) => ActivitySelectors.activityById(activityId)(state),
			(state: object, activityId: string) => {
				const activity = ActivitySelectors.activityById(activityId)(state);

				return activity?.initiatingActivityId
					? ActivitySelectors.activityById(activity.initiatingActivityId)(state)
					: undefined;
			},
			(state: object, activityId: string) => resolveCdmName(state, activityId)
		],
		(activity, initiatingActivity, maybeCdmName): boolean => {
			if (!activity) {
				return false;
			}

			return (
				activity.descriptor.instance !== undefined &&
				(maybeCdmName !== undefined || isParentCdmActivity(initiatingActivity))
			);
		}
	);

	/** Returns `true` when the given activity initiated the currently open dynamic link form. */
	export function isLinkFormRegionOwner(activityId: string): Selector<boolean> {
		return (state) => isLinkFormRegionOwnerReselect(state, activityId);
	}

	const isLinkFormRegionOwnerReselect = createSelector(
		[
			(state: object, activityId: string) => activityId,
			(state: object) => ActivityMap.toList(ActivitySelectors.activities()(state))
		],
		// Strict direct-initiator match only: ancestor matching (e.g. via `ActivitySelectors.initiatingPath`)
		// would also match the parent Screen that is a non-direct ancestor of the link-form activity,
		// recreating the exact duplication this selector exists to prevent.
		(activityId, activities): boolean =>
			activities.some((a) => a.descriptor.dynamicLinkForm === "true" && a.initiatingActivityId === activityId)
	);

	function resolveCdmName(state: object, activityId: string): string | undefined {
		const modelDescriptors = ClientModelSelectors.modelDescriptorsByActivityId(activityId)(state);
		const models = ClientModelSelectors.models()(state);
		const modelGraph = ClientModelSelectors.modelGraph()(state);

		const formModelDescriptor = modelDescriptors.find(({ modelType }) => modelType === "form");

		if (!formModelDescriptor) {
			return undefined;
		}

		const formModelRaw = models[formModelDescriptor.name];

		if (!isFormModel(formModelRaw)) {
			return undefined;
		}

		const documentModelName = getDocumentModelReference(formModelRaw);

		if (!documentModelName) {
			return undefined;
		}

		return modelGraph.composeDocumentModels?.some((cdm) => cdm.modelId === documentModelName)
			? documentModelName
			: undefined;
	}

	function isParentCdmActivity(activity: Activity | undefined): boolean {
		if (activity === undefined) {
			return false;
		}

		const data = Activity.findDefaultDataHolder(activity)?.data;

		return typeof data === "object" && data !== null && "cddState" in data;
	}
}

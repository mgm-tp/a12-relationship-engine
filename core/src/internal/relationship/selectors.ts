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
import {
	type Activity,
	ActivitySelectors,
	type ApplicationModel,
	Model,
	ModelSelectors,
	type Selector,
	ViewSelectors
} from "@com.mgmtp.a12.client/client-core";
import { type Relationship as RelationshipServerApi } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { isFormModel } from "@com.mgmtp.a12.formengine/formengine-core";
import { isOverviewModel } from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import { assertCondition } from "../shared/assertion.js";
import { InternalModelSelectors } from "../shared/selectors.js";

import { BindingsSelectors } from "./bindings.js";
import { ComponentName, DEFAULT_PAGE_SIZE, TABLE_LIST } from "./constants.js";
import { Relationship } from "./relationship.js";

/**
 * All relationship related selectors.
 */
export namespace RelationshipSelectors {
	/** Selects mutations for a given activity id, relationship, and source entry */
	export function mutations(params: {
		activityId: string;
		relationship: string;
		sourceEntity?: RelationshipServerApi.LinkEntitySpec;
	}): Selector<Relationship.Mutation[] | undefined> {
		const { activityId, relationship, sourceEntity } = params;

		return (state) => {
			const activity = ActivitySelectors.activityById(activityId)(state);
			if (activity === undefined) {
				return undefined;
			}

			const { dataHolders = [] } = activity;
			const foundDataHolder = dataHolders.find(Relationship.MutationDataHolder.isInstance);

			if (foundDataHolder === undefined) {
				return undefined;
			}

			const mutationValues = foundDataHolder.data || [];
			const relationshipMutations = mutationValues.filter(
				(m) => m.link.linkRef.linkDescriptor.relationshipModel === relationship
			);
			return sourceEntity
				? relationshipMutations.filter(initMutationFilterBySource(sourceEntity))
				: relationshipMutations;
		};
	}

	function initMutationFilterBySource(
		sourceEntity: RelationshipServerApi.LinkEntitySpec
	): (mutation: Relationship.Mutation) => boolean {
		return (mutation) =>
			mutation.link.linkRef.linkDescriptor.entities.some(
				(e) => e.docRef === sourceEntity.docRef && e.role === sourceEntity.role
			);
	}

	/** Selects relationship instance for a given activity id and instance id. */
	export function relationshipInstance(
		activityId: string,
		instanceId: string
	): Selector<Relationship.Instance | undefined> {
		return (state) => {
			const activity = ActivitySelectors.activityById(activityId)(state);
			if (activity === undefined) {
				return undefined;
			}
			const { dataHolders = [] } = activity;
			const linkDH = dataHolders.find(Relationship.LinkDataHolder.isInstanceById(instanceId));
			const candidateDH = dataHolders.find(Relationship.CandidateDataHolder.isInstanceById(instanceId));
			if (!candidateDH && linkDH?.data?.uiConfiguration.components[0].name === TABLE_LIST) {
				return (
					linkDH &&
					linkDH.data && {
						...linkDH.data,
						candidates: [],
						candidateQuery: {
							page: { limit: undefined, offset: undefined }
						},
						candidatePagination: {
							pageSize: DEFAULT_PAGE_SIZE,
							pageNumber: 0,
							fullCount: 0,
							offset: 0,
							limit: 0
						}
					}
				);
			}
			return (
				linkDH &&
				linkDH.data &&
				candidateDH &&
				candidateDH.data && {
					...linkDH.data,
					...candidateDH.data
				}
			);
		};
	}

	/** Selects the mutation data holder for a given activity id. */
	export function mutationDataHolder(
		activityId: string
	): Selector<Activity.DataHolder<Relationship.Mutation[]> | undefined> {
		return (state) => {
			const activity = ActivitySelectors.activityById(activityId)(state);
			if (activity === undefined) {
				return undefined;
			}
			const { dataHolders = [] } = activity;
			return dataHolders.find(Relationship.MutationDataHolder.isInstance);
		};
	}

	/** Selects the relationship candidate data holder for a given activity id and instance id. */
	export function candidateDataHolder(
		activityId: string,
		instanceId: string
	): Selector<Activity.DataHolder<Relationship.CandidateInstance> | undefined> {
		return (state) => {
			const activity = ActivitySelectors.activityById(activityId)(state);
			if (activity === undefined) {
				return undefined;
			}
			const { dataHolders = [] } = activity;
			return dataHolders.find(Relationship.CandidateDataHolder.isInstanceById(instanceId));
		};
	}

	/** Selects the relationship link data holder for a given activity id and instance id. */
	export function linkDataHolder(
		state: object,
		activityId: string,
		instanceId: string
	): Activity.DataHolder<Relationship.LinkInstance> | undefined {
		const activity = ActivitySelectors.activityById(activityId)(state);

		return activity?.dataHolders?.find(Relationship.LinkDataHolder.isInstanceById(instanceId));
	}
	/** Selects all relationship link data holders for a given activity id. */
	export function linkDataHolders(state: object, activityId: string): Activity.DataHolder<Relationship.LinkInstance>[] {
		const activity = ActivitySelectors.activityById(activityId)(state);

		return activity?.dataHolders?.filter(Relationship.LinkDataHolder.isInstance) ?? [];
	}
	/**
	 * Selects all relationship link data holders for a given activity id and sourceId for the desired components
	 * @internal
	 */
	export function relevantLinkDataHolders(
		state: object,
		activityId: string,
		sourceInstanceId: string,
		componentNames: string[]
	): Activity.DataHolder<Relationship.LinkInstance>[] {
		const sourceEntity = RelationshipSelectors.sourceEntity(state, activityId, sourceInstanceId);
		return RelationshipSelectors.linkDataHolders(state, activityId).filter((dataHolder) => {
			const instanceId = dataHolder.descriptor.instanceId as string;

			const componentName = RelationshipSelectors.componentName(state, activityId, instanceId);
			if (componentName === undefined || !componentNames.includes(componentName)) {
				return false;
			}

			const componentSourceEntity = RelationshipSelectors.sourceEntity(state, activityId, instanceId);
			return isLinkEntitySpecEquals(sourceEntity, componentSourceEntity);
		});
	}

	function isLinkEntitySpecEquals(
		entity1: RelationshipServerApi.LinkEntitySpec | undefined,
		entity2: RelationshipServerApi.LinkEntitySpec | undefined
	): boolean {
		return !!entity1 && !!entity2 && entity1.docRef === entity2.docRef && entity1.role === entity2.role;
	}

	/** @internal */
	export function sourceEntity(
		state: object,
		activityId: string,
		instanceId: string
	): RelationshipServerApi.LinkEntitySpec | undefined {
		return linkDataHolder(state, activityId, instanceId)?.data?.sourceEntity;
	}

	/** @internal */
	export function componentName(
		state: object,
		activityId: string,
		instanceId: string,
		componentId?: string
	): ComponentName | undefined {
		const componentDataHolder =
			RelationshipSelectors.linkDataHolder(state, activityId, instanceId) ??
			RelationshipSelectors.candidateDataHolder(activityId, instanceId)(state);

		const components = componentDataHolder?.data?.uiConfiguration.components;
		if (!components) {
			return undefined;
		}

		const componentName = !componentId ? components[0].name : components.find(({ id }) => id === componentId)?.name;

		assertCondition(ComponentName.isInstance(componentName), "Component name is not valid");

		return componentName;
	}
	/**
	 * Selects an {@link Relationship.OverviewModels} bundle for candidates or links by a given
	 * activity id and component configuration.
	 */
	export function overviewModels(config: {
		readonly activityId: string;
		readonly componentConfig: Relationship.ComponentConfiguration;
		readonly resultDocumentModelType: "candidate" | "link";
	}): Selector<Relationship.OverviewModels> {
		return (state) => {
			/*
			 * Note: We can't use RelationshipSelectors.overviewModelDescriptor
			 * selector here since it internally uses the
			 * BindingsSelectors.bindingConfiguration selector which currently
			 * contains a "hack" that prevents it from returning binding configs
			 * for scdm activities.
			 */
			const modelDescriptor = config.componentConfig.models.find(
				(m) =>
					m.use === config.resultDocumentModelType &&
					ModelSelectors.modelByName(m.name, isOverviewModel)(state) !== undefined
			);
			if (modelDescriptor === undefined) {
				return { loadingState: "error" };
			}

			const overviewModel = ModelSelectors.modelByName(modelDescriptor.name, isOverviewModel)(state);
			if (overviewModel === undefined) {
				const error = ModelSelectors.modelErrorByName(modelDescriptor.name)(state);
				return { loadingState: error !== undefined ? "error" : "loading" };
			}

			const documentAndValidationModel = ModelSelectors.modelByName(
				InternalModelSelectors.getDocumentModelReference(overviewModel),
				Model.isDocumentAndValidationModel
			)(state);

			if (documentAndValidationModel === undefined) {
				const error = ModelSelectors.modelErrorByName(InternalModelSelectors.getDocumentModelReference(overviewModel))(
					state
				);
				return { loadingState: error !== undefined ? "error" : "loading" };
			}

			const { generatedCodeAccessor: validatorProvider } = documentAndValidationModel;
			return {
				loadingState: "loaded",
				documentModel: documentAndValidationModel,
				validatorProvider,
				overviewModel
			};
		};
	}

	/**
	 * Selects a {@link Relationship.FormModels} bundle for links by a given activity id and
	 * component configuration.
	 */
	export function formModels(
		componentConfig: Relationship.ComponentConfiguration
	): Selector<Relationship.FormModels | undefined> {
		return (state) => {
			const modelName = selectLinkFormModelName({
				componentConfig
			})(state);
			if (modelName === undefined) {
				return undefined;
			}

			const formModel = ModelSelectors.modelByName(modelName, isFormModel)(state);
			if (formModel === undefined) {
				const error = ModelSelectors.modelErrorByName(modelName)(state);
				return { loadingState: error !== undefined ? "error" : "loading" };
			}

			const documentAndValidationModel = ModelSelectors.modelByName(
				InternalModelSelectors.getDocumentModelReference(formModel),
				Model.isDocumentAndValidationModel
			)(state);

			if (documentAndValidationModel === undefined) {
				const error = ModelSelectors.modelErrorByName(InternalModelSelectors.getDocumentModelReference(formModel))(
					state
				);
				return { loadingState: error !== undefined ? "error" : "loading" };
			}

			const { generatedCodeAccessor: validatorProvider } = documentAndValidationModel;
			return {
				loadingState: "loaded",
				documentModel: documentAndValidationModel,
				validatorProvider,
				formModel
			};
		};
	}

	interface CollectAllDirectivesParam {
		readonly sceneChange?: ApplicationModel.SceneChange;
		readonly cases?: ReadonlyArray<CollectAllDirectivesParam>;
	}
	function collectAllDirectives({
		cases = [],
		sceneChange: { onEnter = [], onExit = [] } = {}
	}: CollectAllDirectivesParam = {}): ApplicationModel.Directive[] {
		return [...onEnter, ...onExit, ...cases.map(collectAllDirectives).flat()];
	}

	export function relationshipBindings({
		activityId
	}: {
		readonly activityId: string;
	}): Selector<Relationship.UiConfigurationBinding[]> {
		return (state) => {
			const relationshipBindingConfigurations: Relationship.UiConfigurationBinding[][] = [];

			const bindingConfigurationsFromAppModelScene = getBindingConfigurationsFromAppModelScene(state, activityId);
			relationshipBindingConfigurations.push(...bindingConfigurationsFromAppModelScene);

			const bindingConfigurationFromFormModel = BindingsSelectors.bindingConfiguration({
				activityId
			})(state);
			if (bindingConfigurationFromFormModel) {
				relationshipBindingConfigurations.push(bindingConfigurationFromFormModel);
			}

			return relationshipBindingConfigurations.flat();
		};
	}

	function getBindingConfigurationsFromAppModelScene(
		state: object,
		activityId: string
	): Relationship.UiConfigurationBinding[][] {
		const result: Relationship.UiConfigurationBinding[][] = [];
		const sceneReference = ViewSelectors.sceneReferenceByActivityId(activityId)(state);
		if (sceneReference !== undefined) {
			const scene = InternalModelSelectors.sceneByReference(sceneReference)(state);
			const directives = collectAllDirectives(scene);

			for (const directive of directives) {
				if (directive.type !== "VIEW_ADD") {
					continue;
				}

				const { bindings = [] }: { readonly bindings?: object[] } = directive.configuration || {};
				result.push(bindings.filter(Model.Binding.isInstance).filter(Relationship.UiConfigurationBinding.isInstance));
			}
		}

		return result;
	}

	/** @internal */
	export function boundModelElement(
		state: object,
		activityId: string,
		modelElementId: string
	): Relationship.UiConfigurationBinding | undefined {
		const bindings = relationshipBindings({ activityId })(state);
		return bindings.find((binding) => binding.elementId === modelElementId);
	}

	/** @internal */
	export function selectLinkFormModelName({
		componentConfig
	}: {
		readonly componentConfig: Relationship.ComponentConfiguration;
	}): Selector<string | undefined> {
		return (state) => {
			const models = ModelSelectors.modelGraph()(state).genericModels;
			const form = models?.find(
				({ modelId, type }) =>
					type === "form" && componentConfig.models.find((model) => model.name === modelId && model.use === "link")
			);
			return form?.modelId;
		};
	}
}

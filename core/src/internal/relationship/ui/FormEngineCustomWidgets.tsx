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

import React, { useContext, useRef } from "react";
import { useSelector } from "react-redux";

import { type ModelPath } from "@com.mgmtp.a12.base/base-model-api/lib/main/model/index.js";
import { ActivitySelectors, ViewViews } from "@com.mgmtp.a12.client/client-core";
import {
	ModelSelectors,
	UiStateSelectors,
	type FormModel,
	FormModelPath,
	DefaultFormModelMap,
	Enablements,
	type FormModelMap
} from "@com.mgmtp.a12.formengine/formengine-core";
import { type DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";
import { DocumentServiceFactory } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/facade.js";
import { addPrefix } from "@com.mgmtp.a12.widgets/widgets-core";

import { CddSelectors } from "../../cdm/cdd/redux/index.js";
import { isRelationshipGroup } from "../../cdm/cdmCommons/relationshipGroup.js";
import { getBindingConfiguration } from "../../shared/BindingConfiguration.js";

import { type Relationship } from "../relationship.js";
import { RelationshipSelectors } from "../selectors.js";
import { type RelationshipViews } from "../views.js";

import RelationshipEngineConnected, { DOCUMENT_GRAPH_ADAPTERS } from "./engine/RelationshipEngine.js";

export const RelationshipFormModelMap: Pick<FormModelMap, "Control" | "CustomScreenElement" | "DetachedRepeat"> = {
	Control: { component: CustomControl },
	CustomScreenElement: { component: CustomScreenElement },
	DetachedRepeat: { component: CustomDetachedRepeat }
};

export interface WithComponentProvider {
	componentProvider?: RelationshipViews.ComponentProvider;
}

export type CreateRelationshipFormModelMapType = WithComponentProvider;

export function createRelationshipFormModelMap(
	params: CreateRelationshipFormModelMapType
): typeof RelationshipFormModelMap {
	const { componentProvider } = params;

	return {
		Control: {
			component: function CustomControlWithComponentProvider(
				props: FormModelMap.FormModelComponentProps<FormModel.Control>
			) {
				return <CustomControl {...props} componentProvider={componentProvider} />;
			}
		},
		CustomScreenElement: {
			component: function CustomSectionWithComponentProvider(
				props: FormModelMap.FormModelComponentProps<FormModel.CustomScreenElement>
			) {
				return <CustomScreenElement {...props} componentProvider={componentProvider} />;
			}
		},
		DetachedRepeat: {
			component: function CustomDetachedRepeatWithComponentProvider(
				props: FormModelMap.FormModelComponentProps<FormModel.DetachedRepeat>
			) {
				return <CustomDetachedRepeat {...props} componentProvider={componentProvider} />;
			}
		}
	};
}

/**
 * Custom hook to determine whether a relationship binding exists for the given form model element id.
 */
export function useIsBoundModelElement(modelElementId: string): boolean {
	const { activityId } = useContext(ViewViews.ActivityContext) ?? {};
	return useSelector(
		(state) => !!activityId && RelationshipSelectors.boundModelElement(state, activityId, modelElementId) !== undefined
	);
}

/**
 * Custom hook that returns the relationship binding for the given `modelElementId`
 *
 * If the form activity does not exist anymore and we still re-render here, the binding
 * of the previous render is used to prevent flickering in the UI.
 */
function useBinding(modelElementId: string, activityId: string): Relationship.UiConfigurationBinding | undefined {
	const binding = useSelector((state) => RelationshipSelectors.boundModelElement(state, activityId, modelElementId));
	const bindingRef = useRef(binding);

	const exists = useSelector((s) => ActivitySelectors.activityById(activityId)(s) !== undefined);

	return exists ? binding : bindingRef.current;
}

function CustomScreenElement(
	props: FormModelMap.FormModelComponentProps<FormModel.CustomScreenElement> & WithComponentProvider
): React.ReactNode {
	const {
		config: { renderOptions, parentPath },
		modelElement
	} = props;
	const { activityId } = useContext(ViewViews.ActivityContext) ?? {};

	const formModel = ModelSelectors.formModel()(renderOptions.state);
	const binding = useBinding(modelElement.id, activityId ?? "");
	const isCddActivity = useSelector((state) => CddSelectors.isCddActivity(state, activityId ?? ""));

	const dataContext = UiStateSelectors.currentScreenLocation()(renderOptions.state).path;
	const isHidden = Enablements.isHidden({ state: renderOptions.state, formModelElement: modelElement, dataContext });

	const specificProps =
		isCddActivity && binding
			? {
					adapters: DOCUMENT_GRAPH_ADAPTERS,
					components: binding.details.components,
					config: {
						relationship: binding.details.relationshipName,
						targetRole: binding.details.targetRole
					},
					formModel: formModel,
					formModelElement: modelElement,
					formModelElementPath: FormModelPath.extend(parentPath, {
						id: modelElement.id
					}),
					dataContext,
					disabled: renderOptions.state.ui.disabled,
					cdm: renderOptions.state.models.documentModel
				}
			: {};

	const MARGIN_BOTTOM_SM = addPrefix("-u-margin-b-sm");

	return activityId && binding ? (
		<div className={MARGIN_BOTTOM_SM}>
			<RelationshipEngineConnected
				{...specificProps}
				activityId={activityId}
				instanceId={modelElement.id}
				componentProvider={props.componentProvider}
				readonly={renderOptions.state.ui.readonly}
				hidden={isHidden}
			/>
		</div>
	) : (
		<DefaultFormModelMap.CustomScreenElement.component {...props} />
	);
}

function CustomControl(
	props: FormModelMap.FormModelComponentProps<FormModel.Control> & WithComponentProvider
): React.ReactNode {
	const { activityId } = useContext(ViewViews.ActivityContext) ?? {};
	const isBoundModelElement = useIsBoundModelElement(props.modelElement.id);

	// not supporting Control with Index here for the hidden evaluation
	const dataContext = UiStateSelectors.currentScreenLocation()(props.config.renderOptions.state).path;
	const isHidden = Enablements.isHidden({
		state: props.config.renderOptions.state,
		formModelElement: props.modelElement,
		dataContext
	});

	// plain relsh component
	if (activityId && isBoundModelElement) {
		return (
			<RelationshipEngineConnected
				activityId={activityId}
				instanceId={props.modelElement.id}
				componentProvider={props.componentProvider}
				readonly={props.config.renderOptions.state.ui.readonly}
				hidden={isHidden}
			/>
		);
	}

	const formModel = ModelSelectors.formModel()(props.config.renderOptions.state);
	const binding = getBinding(formModel, props.modelElement.id);

	// CDM relsh component
	if (activityId && binding) {
		const formModel = ModelSelectors.formModel()(props.config.renderOptions.state);

		return (
			<RelationshipEngineConnected
				activityId={activityId}
				instanceId={props.modelElement.id}
				adapters={DOCUMENT_GRAPH_ADAPTERS}
				components={binding.details.components}
				config={{
					relationship: binding.details.relationshipName,
					targetRole: binding.details.targetRole
				}}
				formModel={formModel}
				formModelElement={props.modelElement}
				formModelElementPath={FormModelPath.extend(props.config.parentPath, {
					name: props.modelElement.id
				})}
				dataContext={dataContext}
				readonly={props.config.renderOptions.state.ui.readonly}
				disabled={props.config.renderOptions.state.ui.disabled}
				hidden={isHidden}
				cdm={props.config.renderOptions.state.models.documentModel}
				componentProvider={props.componentProvider}
			/>
		);
	}

	// regular FE component
	return <DefaultFormModelMap.Control.component {...props} />;
}

function CustomDetachedRepeat(
	props: FormModelMap.FormModelComponentProps<FormModel.DetachedRepeat> & WithComponentProvider
): React.ReactNode {
	const { activityId } = useContext(ViewViews.ActivityContext) ?? {};

	const cdmElement = findDocumentModelElement(
		props.modelElement.groupPath,
		ModelSelectors.documentModel()(props.config.renderOptions.state)
	);

	const formModel = ModelSelectors.formModel()(props.config.renderOptions.state);
	const binding = getBinding(formModel, props.modelElement.id);
	const shouldRenderCdmRepeat = cdmElement.type === "Group" && isRelationshipGroup(cdmElement) && binding;

	// CDM relsh component
	if (activityId && shouldRenderCdmRepeat) {
		const dataContext = UiStateSelectors.currentScreenLocation()(props.config.renderOptions.state).path;
		const isHidden = Enablements.isHidden({
			state: props.config.renderOptions.state,
			formModelElement: props.modelElement,
			dataContext
		});

		return (
			<RelationshipEngineConnected
				activityId={activityId}
				instanceId={props.modelElement.id}
				adapters={DOCUMENT_GRAPH_ADAPTERS}
				components={binding.details.components}
				config={{
					relationship: binding.details.relationshipName,
					targetRole: binding.details.targetRole
				}}
				formModel={formModel}
				formModelElement={props.modelElement}
				formModelElementPath={FormModelPath.extend(props.config.parentPath, {
					name: props.modelElement.name
				})}
				dataContext={dataContext}
				readonly={props.config.renderOptions.state.ui.readonly}
				disabled={props.config.renderOptions.state.ui.disabled}
				hidden={isHidden}
				cdm={props.config.renderOptions.state.models.documentModel}
				componentProvider={props.componentProvider}
			/>
		);
	}
	return <DefaultFormModelMap.DetachedRepeat.component {...props} />;
}

function findDocumentModelElement(path: ModelPath, documentModel: DocumentModel): DocumentModel.Element {
	if (path.length === 0) {
		return documentModel.content.modelRoot;
	}

	const element = new DocumentServiceFactory().getDocumentModelSearchService(documentModel).getByPath(path);

	if (element === undefined) {
		throw new Error("Can not find the document element with path: " + path.join("."));
	}
	return element;
}

function getBinding(formModel: FormModel, formModelElementId: string): Relationship.UiConfigurationBinding | undefined {
	const bindingConfiguration = getBindingConfiguration(formModel);

	return bindingConfiguration?.find((b) => b.elementId === formModelElementId);
}

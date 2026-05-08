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

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { type Activity, ActivityActions, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";

import { isScdmDataHolderShape, type ScdmDataHolderShape } from "../../../cdm/cdd/redux/dhReducersImpl.js";
import { RelationshipActions } from "../../actions.js";
import { type Relationship } from "../../relationship.js";
import { RelationshipSelectors } from "../../selectors.js";

import { ListAdapter } from "../components/adapter/List.js";
import { MultiSelectionAdapter } from "../components/adapter/MultiSelection.js";
import { SingleSelectionAdapter } from "../components/adapter/SingleSelection.js";
import { DropDownSelection } from "../components/DropDownSelection.js";
import { DualPaneSelection } from "../components/DualPaneSelection.js";
import { type ScdmProps } from "../components/scdm_adapter/scdm_adapter.js";
import { ScdmListAdapter } from "../components/scdm_adapter/scdm_List.js";
import { ScdmMultiSelectionAdapter } from "../components/scdm_adapter/scdm_MultiSelection.js";
import { ScdmSingleSelectionAdapter } from "../components/scdm_adapter/scdm_SingleSelection.js";
import { LinkTableTemplate as TableList } from "../components/TableList.js";
import { useThumbnails } from "../components/useThumbnails.js";

import { type Component, type ComponentProvider } from "./componentProvider.js";

export interface Adapters {
	[type: string]: React.ComponentType<any> | undefined;
}

export type RelationshipEngineProps = CommonProps & Partial<FallbackProps> & Partial<ScdmProps>;

interface CommonProps {
	readonly activityId: string;

	/** Relationship instance id / form element ID */
	readonly instanceId: string;

	/** Disables the Relationship Engine. */
	readonly disabled?: boolean;

	/** renders the Relationship Engine readonly */
	readonly readonly?: boolean;

	/** hides the Relationship Engine. */
	readonly hidden?: boolean;

	/** Component provider for customizing or providing new components. */
	readonly componentProvider?: ComponentProvider;
}

interface FallbackProps {
	readonly components: Relationship.ComponentConfiguration[];
	readonly adapters: Adapters;
}

type CompleteRelationshipEngineProps = CommonProps &
	FallbackProps & {
		onBeginEdit(): void;
		onFinishEdit(cancel: boolean): void;
		hasChanges?(): boolean;
	};

function RelationshipEngine(props: RelationshipEngineProps): React.ReactNode {
	const dispatch = useDispatch();

	const [backup, setBackup] = useState<
		Activity.DataHolder<Relationship.Mutation[]> | ScdmDataHolderShape["data"] | undefined
	>(undefined);

	const instance = useSelector(RelationshipSelectors.relationshipInstance(props.activityId, props.instanceId));
	const mutationDataHolder = useSelector(RelationshipSelectors.mutationDataHolder(props.activityId));
	const defaultData = useSelector(ActivitySelectors.data(props.activityId));
	const thumbnails = useThumbnails();

	const onBeginEdit = () => {
		if (mutationDataHolder) {
			setBackup(mutationDataHolder);
		} else if (isScdmDataHolderShape(defaultData)) {
			setBackup(defaultData);
		}
	};

	const hasChanges = () => (mutationDataHolder ?? defaultData) !== backup;

	const onFinishEdit = (cancel: boolean) => {
		if (backup && cancel) {
			if (isScdmDataHolderShape(backup)) {
				dispatch(
					ActivityActions.setData({
						activityId: props.activityId,
						data: backup
					})
				);
			} else {
				dispatch(
					RelationshipActions.Commands.resetMutations({
						activityId: props.activityId,
						mutationsDataHolder: backup
					})
				);
			}
		}
		setBackup(undefined);
	};

	if (props.hidden) {
		return null;
	}

	const components = props.components ?? instance?.uiConfiguration.components;

	if (components === undefined || components.length === 0) {
		return null;
	}

	const adapters = props.adapters ?? RELATIONSHIP_ADAPTERS;

	const completeProps = {
		...props,
		onBeginEdit,
		hasChanges,
		onFinishEdit,
		components,
		adapters,
		thumbnails
	};

	const componentProvider: ComponentProvider = componentProviderFactory(completeProps);

	return (
		<RelationshipComponent
			{...completeProps}
			componentProvider={componentProvider}
			componentConfiguration={components[0]}
		/>
	);
}

const componentProviderFactory = (props: CompleteRelationshipEngineProps) => {
	return (configuration: Relationship.ComponentConfiguration) => {
		const customComponent = props.componentProvider && props.componentProvider(configuration);

		const component = customComponent || defaultComponentProvider(configuration);

		if (component && configuration.name === "TableList") {
			return {
				...component,
				componentProps: {
					...buildTableListComponentProps(configuration, props),
					...component.componentProps
				}
			};
		}
		return component;
	};
};

const defaultComponentProvider = (config: Relationship.ComponentConfiguration): Component | undefined => {
	switch (config.name) {
		case "DualPaneSelection":
			return { type: "MultiSelection", component: DualPaneSelection };
		case "TableList": {
			return { type: "List", component: TableList };
		}
		case "DropDownSelection":
			return { type: "SingleSelection", component: DropDownSelection };
		default:
			return undefined;
	}
};

const editComponentProvider = (
	sourceConfiguration: Relationship.ComponentConfiguration,
	engineProps: CompleteRelationshipEngineProps
) => {
	if (sourceConfiguration.props === undefined || sourceConfiguration.props.editComponent === undefined) {
		return undefined;
	}

	const componentConfiguration = engineProps.components.find(
		(component) => sourceConfiguration.props !== undefined && sourceConfiguration.props.editComponent === component.id
	);

	if (componentConfiguration === undefined) {
		return undefined;
	}

	return {
		RelationshipComponent,
		componentProps: {
			...engineProps,
			componentConfiguration,
			componentProvider: componentProviderFactory(engineProps),
			instanceId: `${engineProps.instanceId}_${componentConfiguration.name}`
		}
	};
};

const buildTableListComponentProps = (
	config: Relationship.ComponentConfiguration,
	engineProps: CompleteRelationshipEngineProps
) => {
	const editComponent = editComponentProvider(config, engineProps);
	return {
		editComponent: editComponent?.RelationshipComponent,
		editComponentProps: editComponent?.componentProps,
		onBeginEdit: engineProps.onBeginEdit,
		hasChanges: engineProps.hasChanges,
		onFinishEdit: engineProps.onFinishEdit,
		editDialogWidth: config.props?.editDialogWidth,
		editDialogTitle: config.props?.editDialogTitle,
		editDialogCancelButtonLabel: config.props?.editDialogCancelButtonLabel,
		editDialogCloseButtonLabel: config.props?.editDialogCloseButtonLabel
	};
};

/** @internal */
export interface RelationshipComponentProps extends CompleteRelationshipEngineProps {
	readonly componentProvider: ComponentProvider;
	readonly componentConfiguration: Relationship.ComponentConfiguration;
}

/** @internal */
export function RelationshipComponent(props: RelationshipComponentProps): React.ReactNode {
	const relationshipComponent = props.componentProvider(props.componentConfiguration);

	if (relationshipComponent === undefined) {
		throw new Error(`Relationship component ${props.componentConfiguration.name} not found.`);
	}

	const baseComponentProps = {
		templateComponentProps: {
			...props.componentConfiguration.props,
			...relationshipComponent.componentProps
		},
		...props
	};

	const AdapterComponent = props.adapters[relationshipComponent.type];
	return AdapterComponent ? (
		<AdapterComponent TemplateComponent={relationshipComponent.component} {...baseComponentProps} />
	) : null;
}

export const RELATIONSHIP_ADAPTERS: Adapters = {
	List: ListAdapter,
	SingleSelection: SingleSelectionAdapter,
	MultiSelection: MultiSelectionAdapter
};

export const DOCUMENT_GRAPH_ADAPTERS: Adapters = {
	List: ScdmListAdapter,
	SingleSelection: ScdmSingleSelectionAdapter,
	MultiSelection: ScdmMultiSelectionAdapter
};

export default RelationshipEngine;

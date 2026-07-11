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

import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import { DefaultComponentMap as OEDefaultComponentMap } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import { OverviewEngineActions, Events as OverviewEvents } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import {
	addPrefix,
	LayoutGrid,
	ContentBox,
	ButtonGroup,
	InputElements,
	ProgressIndicator,
	type LayoutGridProps,
	type ContentBoxProps
} from "@com.mgmtp.a12.widgets/widgets-core";

import { Button } from "../shared/Button.js";
import type { RelationshipUiModel } from "../../../../models/index.js";
import { RelationshipEngineEvents } from "../../../../models/index.js";
import type { RelationshipEngineDataHolder } from "../../../../store/index.js";
import { useSelectedItemsRowStyling } from "../shared/useSelectedItemsRowStyling.js";
import { useResolveRelationshipLabel } from "../shared/useResolveRelationshipLabel.js";
import { useAvailableItemsRowStyling } from "../shared/useAvailableItemsRowStyling.js";
// eslint-disable-next-line no-restricted-imports
import { normalizeCssLength } from "../../../../internal/relationship/ui/components/util.js";
import { useSelectedItemsRowActionStyling } from "../shared/useSelectedItemsRowActionStyling.js";
import { useAvailableItemsRowActionStyling } from "../shared/useAvailableItemsRowActionStyling.js";
import { ModelSelectors, ChangelogSelectors, serializeInstanceId } from "../../../../store/index.js";
// eslint-disable-next-line no-restricted-imports
import { useRelationshipEngineContext } from "../../../internal/context/RelationshipEngineContext.js";
// eslint-disable-next-line no-restricted-imports
import { RelationshipEngineComponentContextProvider } from "../../../internal/context/ComponentContext.js";

import { LinkPaneHeading } from "./LinkPaneHeading.js";
import { useAlreadyLinkedDocRefs } from "./useAlreadyLinkedDocRefs.js";

export namespace DualPane {
	export interface Props {
		uiModel: RelationshipUiModel;
		activityId: string;
		/**
		 * When DualPane is used inside an edit dialog (e.g., from TableList),
		 * this should be the parent component's instanceId so data holders can be shared.
		 * FIXME: This is not the intended behavior
		 */
		parentInstanceId?: string;
	}
}

export function DualPane(props: DualPane.Props) {
	const dispatch = useDispatch();
	const { activityId, uiModel, parentInstanceId } = props;
	const { content } = uiModel;
	const component = content.component;
	const label = useResolveRelationshipLabel(uiModel, activityId);
	// Use parentInstanceId if provided (e.g., when used inside TableList edit dialog),
	// otherwise calculate instanceId from the uiModel
	const instanceId = React.useMemo(
		() => parentInstanceId ?? serializeInstanceId(uiModel.header.id, component.componentType),
		[parentInstanceId, component.componentType, uiModel.header.id]
	);

	const selectedItemsDataHolderDescriptor = React.useMemo(() => {
		return {
			type: "selected",
			feature: "relationship",
			instanceId
		} satisfies RelationshipEngineDataHolder.SelectedItemsDataHolder["descriptor"];
	}, [instanceId]);

	const availableItemsDataHolderDescriptor = React.useMemo(() => {
		return {
			type: "available",
			feature: "relationship",
			instanceId
		} satisfies RelationshipEngineDataHolder.AvailableItemsDataHolder["descriptor"];
	}, [instanceId]);

	const availableItemsDataHolderLoadingStateSelector = React.useCallback(
		(state: object) => {
			return ActivitySelectors.dataHolderByDescriptor(activityId, availableItemsDataHolderDescriptor)(state)
				?.loadingState;
		},
		[activityId, availableItemsDataHolderDescriptor]
	);
	const availableItemsDataHolderLoadingState = useSelector(availableItemsDataHolderLoadingStateSelector);

	const selectedItemsDataHolderLoadingStateSelector = React.useCallback(
		(state: object) => {
			return ActivitySelectors.dataHolderByDescriptor(activityId, selectedItemsDataHolderDescriptor)(state)
				?.loadingState;
		},
		[activityId, selectedItemsDataHolderDescriptor]
	);
	const selectedItemsDataHolderLoadingState = useSelector(selectedItemsDataHolderLoadingStateSelector);

	const availableItemsOverviewModelName =
		component.availableItemsOverviewModel ?? component.editConfiguration?.availableItemsOverviewModel;
	const { selectedItemsOverviewModel } = component;

	const excludeMode = useSelector(ModelSelectors.isExcludeMode(activityId, content.relationshipName));

	const availableItemsLifecycle = useSelector(
		ChangelogSelectors.lifecycleStates(activityId, {
			relationshipModel: content.relationshipName,
			targetRole: content.targetRole
		})
	);

	const selectedItemsLifecycle = useSelector(
		excludeMode
			? ChangelogSelectors.lifecycleStatesByLink(activityId, {
					relationshipModel: content.relationshipName,
					targetRole: content.targetRole
				})
			: ChangelogSelectors.lifecycleStates(activityId, {
					relationshipModel: content.relationshipName,
					targetRole: content.targetRole
				})
	);

	const alreadyLinked = useAlreadyLinkedDocRefs(
		activityId,
		availableItemsDataHolderDescriptor,
		content.relationshipName
	);

	const availableItemsRowStyling = useAvailableItemsRowStyling(availableItemsLifecycle, alreadyLinked, excludeMode);
	const selectedItemsRowStyling = useSelectedItemsRowStyling(activityId, selectedItemsLifecycle, excludeMode);

	const OverviewEngine = useRelationshipEngineContext((ctx) => ctx.componentMap.OverviewEngine);
	const widgetMap = useRelationshipEngineContext((ctx) => ctx.widgetMap);

	// Extract OE-relevant widgets from RE WidgetMap (strip RE-specific entries)
	const oeWidgetMap = React.useMemo(() => {
		const { Autocomplete: _autocomplete, ...oeWidgets } = widgetMap;

		return { ...oeWidgets, ContentBox: CustomContentBox };
	}, [widgetMap]);

	const availableItemsComponentMap = React.useMemo(() => {
		return { ...OEDefaultComponentMap };
	}, []);

	const selectedItemsComponentMap = React.useMemo(() => {
		return {
			...OEDefaultComponentMap,
			Heading: LinkPaneHeading
		};
	}, []);

	const availableItemsRowActionStyling = useAvailableItemsRowActionStyling(
		availableItemsLifecycle,
		alreadyLinked,
		excludeMode
	);
	const selectedItemsRowActionStyling = useSelectedItemsRowActionStyling(selectedItemsLifecycle, excludeMode);

	const buttons = component.buttons ?? [];
	const addButton = buttons.find((b) => b.event === RelationshipEngineEvents.ADD_DOCUMENT);

	const handleAddClick = React.useCallback(() => {
		dispatch(
			OverviewEngineActions.event({
				activityId,
				dataHolderDescriptor: selectedItemsDataHolderDescriptor,
				engineAction: OverviewEvents.onEventButtonClicked({ event: RelationshipEngineEvents.ADD_DOCUMENT })
			})
		);
	}, [dispatch, activityId, selectedItemsDataHolderDescriptor]);

	const columnHeight: LayoutGridProps.ColumnHeight | undefined = React.useMemo(() => {
		const height = uiModel.content.component.height;

		if (height !== undefined) {
			const normalizedHeight = normalizeCssLength(height);

			return { lg: normalizedHeight, md: normalizedHeight, sm: normalizedHeight, xs: normalizedHeight };
		}

		return undefined;
	}, [uiModel.content.component.height]);

	const defaultColumnSize: LayoutGridProps.ColumnSize = React.useMemo(() => ({ lg: 6, md: 6, sm: 6 }), []);

	return (
		<>
			<InputElements.Label label={label} />
			<LayoutGrid.Grid noGutter className={addPrefix("-u-background-grey-light")}>
				<LayoutGrid.Row>
					<LayoutGrid.Column size={defaultColumnSize} height={columnHeight}>
						<RelationshipEngineComponentContextProvider
							activityId={activityId}
							uiModel={uiModel}
							dataHolderDescriptor={availableItemsDataHolderDescriptor}
							instanceId={instanceId}>
							<OverviewEngine
								embedded
								name={`candidate_${instanceId}`}
								activityId={props.activityId}
								dataHolderDescriptor={availableItemsDataHolderDescriptor}
								overviewModelName={availableItemsOverviewModelName}
								paneType="candidate"
								uiModel={uiModel}
								rowStyling={availableItemsRowStyling}
								componentMap={availableItemsComponentMap}
								widgetMap={oeWidgetMap}
								rowActionStyling={availableItemsRowActionStyling}
							/>
						</RelationshipEngineComponentContextProvider>
						{availableItemsDataHolderLoadingState === "loading" && <ProgressIndicator />}
					</LayoutGrid.Column>
					<LayoutGrid.Column size={defaultColumnSize} height={columnHeight}>
						<RelationshipEngineComponentContextProvider
							activityId={activityId}
							uiModel={uiModel}
							dataHolderDescriptor={selectedItemsDataHolderDescriptor}
							instanceId={instanceId}>
							<OverviewEngine
								embedded
								name={`link_${instanceId}`}
								activityId={props.activityId}
								dataHolderDescriptor={selectedItemsDataHolderDescriptor}
								overviewModelName={selectedItemsOverviewModel}
								paneType="link"
								uiModel={uiModel}
								rowStyling={selectedItemsRowStyling}
								componentMap={selectedItemsComponentMap}
								widgetMap={oeWidgetMap}
								rowActionStyling={selectedItemsRowActionStyling}
							/>
						</RelationshipEngineComponentContextProvider>
						{selectedItemsDataHolderLoadingState === "loading" && <ProgressIndicator />}
					</LayoutGrid.Column>
				</LayoutGrid.Row>
				{addButton && (
					<LayoutGrid.Row>
						<ButtonGroup alignment="right">
							<Button buttonElement={addButton} onClick={handleAddClick} />
						</ButtonGroup>
					</LayoutGrid.Row>
				)}
			</LayoutGrid.Grid>
		</>
	);
}

const CustomContentBox = (props: ContentBoxProps) => {
	return <ContentBox {...props} className="-u-padding-b-base" />;
};

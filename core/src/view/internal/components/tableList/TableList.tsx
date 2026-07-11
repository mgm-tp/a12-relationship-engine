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
import type { ContentBoxProps } from "@com.mgmtp.a12.widgets/widgets-core";
import type { TableBody } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import { ContentBox, ButtonGroup, InputElements, ProgressIndicator } from "@com.mgmtp.a12.widgets/widgets-core";
import { DefaultComponentMap as OEDefaultComponentMap } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import { OverviewEngineActions, Events as OverviewEvents } from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import { ModelSelectors } from "../../../../store/index.js";
import { ChangelogSelectors } from "../../../../store/index.js";
import { serializeInstanceId } from "../../../../store/index.js";
import type { RelationshipUiModel } from "../../../../models/index.js";
import { RelationshipEngineEvents } from "../../../../models/index.js";
import type { RelationshipEngineDataHolder } from "../../../../store/index.js";
import { useSelectedItemsRowStyling } from "../shared/useSelectedItemsRowStyling.js";
import { useResolveRelationshipLabel } from "../shared/useResolveRelationshipLabel.js";
// eslint-disable-next-line no-restricted-imports
import { normalizeCssLength } from "../../../../internal/relationship/ui/components/util.js";
import { useSelectedItemsRowActionStyling } from "../shared/useSelectedItemsRowActionStyling.js";
// eslint-disable-next-line no-restricted-imports
import { useRelationshipEngineContext } from "../../../internal/context/RelationshipEngineContext.js";
// eslint-disable-next-line no-restricted-imports
import {
	useRelationshipEngineComponentContext,
	RelationshipEngineComponentContextProvider
} from "../../../internal/context/ComponentContext.js";

export namespace TableList {
	export interface Props {
		uiModel: RelationshipUiModel;
		activityId: string;
	}
}
export function TableList(props: TableList.Props) {
	const { activityId, uiModel } = props;
	const { content } = uiModel;
	const component = content.component;
	const label = useResolveRelationshipLabel(uiModel, activityId);
	const dispatch = useDispatch();
	const instanceId = React.useMemo(
		() => serializeInstanceId(uiModel.header.id, component.componentType),
		[component.componentType, uiModel.header.id]
	);

	const selectedItemsDataHolderDescriptor = React.useMemo(() => {
		return {
			type: "selected",
			feature: "relationship",
			instanceId
		} satisfies RelationshipEngineDataHolder.SelectedItemsDataHolder["descriptor"];
	}, [instanceId]);

	const selectedItemsDataHolderLoadingStateSelector = React.useCallback(
		(state: object) => {
			return ActivitySelectors.dataHolderByDescriptor(activityId, selectedItemsDataHolderDescriptor)(state)
				?.loadingState;
		},
		[activityId, selectedItemsDataHolderDescriptor]
	);
	const selectedItemsDataHolderLoadingState = useSelector(selectedItemsDataHolderLoadingStateSelector);

	const Button = useRelationshipEngineContext((ctx) => ctx.componentMap.Button);
	const OverviewEngine = useRelationshipEngineContext((ctx) => ctx.componentMap.OverviewEngine);
	const widgetMap = useRelationshipEngineContext((ctx) => ctx.widgetMap);

	// Extract OE-relevant widgets from RE WidgetMap (strip RE-specific entries)
	const oeWidgetMap = React.useMemo(() => {
		const { Autocomplete: _autocomplete, ...oeWidgets } = widgetMap;

		return { ...oeWidgets, ContentBox: CustomContentBox };
	}, [widgetMap]);

	const oeComponentMap = React.useMemo(() => {
		return {
			...OEDefaultComponentMap,
			TableBody: CustomTableBody
		};
	}, []);

	const excludeMode = useSelector(ModelSelectors.isExcludeMode(activityId, content.relationshipName));

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

	const selectedItemsRowActionStyling = useSelectedItemsRowActionStyling(selectedItemsLifecycle, excludeMode);
	const selectedItemsRowStyling = useSelectedItemsRowStyling(activityId, selectedItemsLifecycle, excludeMode);

	// Cherry-pick add/edit buttons from the UI model
	const buttons = component.buttons ?? [];
	const editButton = buttons.find((b) => b.event === RelationshipEngineEvents.OPEN_EDIT_MODAL);
	const addButton = buttons.find((b) => b.event === RelationshipEngineEvents.ADD_DOCUMENT);

	const handleEditClick = React.useCallback(() => {
		dispatch(
			OverviewEngineActions.event({
				activityId,
				dataHolderDescriptor: selectedItemsDataHolderDescriptor,
				engineAction: OverviewEvents.onEventButtonClicked({ event: RelationshipEngineEvents.OPEN_EDIT_MODAL })
			})
		);
	}, [dispatch, activityId, selectedItemsDataHolderDescriptor]);

	const handleAddClick = React.useCallback(() => {
		dispatch(
			OverviewEngineActions.event({
				activityId,
				dataHolderDescriptor: selectedItemsDataHolderDescriptor,
				engineAction: OverviewEvents.onEventButtonClicked({ event: RelationshipEngineEvents.ADD_DOCUMENT })
			})
		);
	}, [dispatch, activityId, selectedItemsDataHolderDescriptor]);

	return (
		<>
			<InputElements.Label label={label} />
			<RelationshipEngineComponentContextProvider
				activityId={activityId}
				uiModel={uiModel}
				dataHolderDescriptor={selectedItemsDataHolderDescriptor}
				instanceId={instanceId}>
				<div
					data-role="relationship-engine-table-list"
					className={"-u-flex -u-flex-col"}
					style={{ height: component.height !== undefined ? normalizeCssLength(component.height) : "auto" }}>
					<OverviewEngine
						embedded
						name={`link_${instanceId}`}
						activityId={activityId}
						dataHolderDescriptor={selectedItemsDataHolderDescriptor}
						overviewModelName={component.selectedItemsOverviewModel}
						paneType="tableList"
						uiModel={uiModel}
						componentMap={oeComponentMap}
						widgetMap={oeWidgetMap}
						rowActionStyling={selectedItemsRowActionStyling}
						rowStyling={selectedItemsRowStyling}
					/>
					{(editButton || addButton) && (
						<ButtonGroup alignment="right" className={"-u-margin-t-sm"}>
							{editButton && <Button buttonElement={editButton} onClick={handleEditClick} />}
							{addButton && <Button buttonElement={addButton} onClick={handleAddClick} />}
						</ButtonGroup>
					)}
					{selectedItemsDataHolderLoadingState === "loading" && <ProgressIndicator />}
				</div>
			</RelationshipEngineComponentContextProvider>
		</>
	);
}

const CustomContentBox = (props: ContentBoxProps) => {
	return <ContentBox {...props} className="-u-padding-0" />;
};

function CustomTableBody(props: TableBody.Props) {
	const { activityId, uiModel } = useRelationshipEngineComponentContext();
	const excludeMode = useSelector(ModelSelectors.isExcludeMode(activityId, uiModel.content.relationshipName));
	const lifecycle = useSelector(
		excludeMode
			? ChangelogSelectors.lifecycleStatesByLink(activityId, {
					relationshipModel: uiModel.content.relationshipName,
					targetRole: uiModel.content.targetRole
				})
			: ChangelogSelectors.lifecycleStates(activityId, {
					relationshipModel: uiModel.content.relationshipName,
					targetRole: uiModel.content.targetRole
				})
	);
	const data = props.data.filter(function filterRemovedRows(row) {
		const matchKey = excludeMode ? row.linkId : row.id;

		if (matchKey === undefined) {
			return true;
		}

		return !lifecycle.removed.includes(matchKey);
	});

	return <OEDefaultComponentMap.TableBody data={data} />;
}

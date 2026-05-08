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

import React, { useCallback, useContext, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { type Dispatch } from "redux";

import { ActivitySelectors, ModelSelectors, type View } from "@com.mgmtp.a12.client/client-core";
import { defaultVariantSelectionMapper } from "@com.mgmtp.a12.client/client-core/heterogeneity";
import { EventNames } from "@com.mgmtp.a12.crud/crud-core";
import {
	OverviewActivity,
	OverviewEngineActions,
	OverviewEngineFactories,
	defaultMapDispatchToEventHandlers,
	type OverviewModel
} from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import { LocalizerContext } from "@com.mgmtp.a12.utils/utils-localization-react/lib/main/index.js";
import { LoggerFactory } from "@com.mgmtp.a12.utils/utils-logging";

import { CopiedCRUDActions } from "./copiedCrudActions.js";
import { selectRowReadonly } from "./showcaseOverviewActions.js";
import { useDocumentModelType } from "./useDocumentModelType.js";
import { VariantSelectionModal } from "./variantSelectionModal.js";

const logger = LoggerFactory.getLogger("ShowcaseOverview");

interface ShowcaseOverviewViewProps extends View {
	readonly eventHandlers?: {
		onEventButtonClick?(eventName: string): void;
	};
}

/**
 * This is a copy of the crud overview with following customizations:
 *
 * * rows can have a button with the event 'open-readonly' to open the document in a readonly form
 *
 * It supports the usual crud functionality via the default CRUD sagas by dispatching clones of CRUDActions.
 */
export function ShowcaseOverviewView(props: ShowcaseOverviewViewProps): React.ReactNode {
	const dispatch = useDispatch();

	const { localizer } = useContext(LocalizerContext);
	const modelGraph = useSelector(ModelSelectors.modelGraph());
	const data = useSelector(ActivitySelectors.data(props.activityId));

	const [showVariantSelection, setShowVariantSelection] = useState(false);

	const dmType = useDocumentModelType(props.activityId, modelGraph);

	const engineDispatch: Dispatch = useCallback(
		(action) => {
			dispatch(OverviewEngineActions.event({ activityId: props.activityId, engineAction: action }));
			return action;
		},
		[dispatch, props.activityId]
	);
	const defaultEvents = useMemo(() => defaultMapDispatchToEventHandlers(engineDispatch), [engineDispatch]);

	const variants =
		dmType?.subTypes && dmType.subTypes.length > 0 ? defaultVariantSelectionMapper(modelGraph, localizer)(dmType) : [];

	const handlers: Partial<OverviewEngineFactories.ViewComponentProps> = useMemo(
		() => ({
			eventHandlers: {
				onEventButtonClick(eventName: string, button?: OverviewModel.Button) {
					const matchesOverviewAdd = eventName.endsWith(EventNames.OVERVIEW_ADD);

					if (variants.length > 0 && matchesOverviewAdd) {
						setShowVariantSelection(true);
					} else {
						props.eventHandlers?.onEventButtonClick?.(eventName);

						if (matchesOverviewAdd) {
							logger.log("Overview CRUD event", eventName);

							if (!dmType?.modelId) {
								throw new Error("Expected document model to exist");
							}

							dispatch(
								CopiedCRUDActions.createNewDocument({
									activityId: props.activityId,
									model: dmType.modelId
								})
							);
						} else {
							defaultEvents.onEventButtonClick?.(eventName, button);
						}
					}
				},
				onRowClick(params: { documentId: string; customEvent?: string }) {
					const { documentId, customEvent } = params;
					if (customEvent) {
						logger.warn(
							`Event '${customEvent}' has been fired onDocumentClick, ` + `but cannot be handled by the CRUD extension.`
						);
					} else {
						dispatch(CopiedCRUDActions.selectRow({ activityId: props.activityId, instanceId: documentId }));
					}
				},
				onRowButtonClick(params: { documentId: string; rowActionModel: OverviewModel.Button }) {
					const { documentId: instance, rowActionModel: rowAction } = params;
					if (rowAction?.event.endsWith(EventNames.OVERVIEW_DELETE)) {
						logger.log("Overview CRUD event", rowAction.event, instance);
						dispatch(
							CopiedCRUDActions.deleteRow({
								activityId: props.activityId,
								instanceId: instance
							})
						);
					} else if (rowAction?.event === "open-readonly") {
						if (!OverviewActivity.Data.DocumentListData.isInstance(data)) {
							throw new Error(`Invalid document list.`);
						}
						const document = data?.documents.find((d) => d?.id === instance);

						if (document === undefined) {
							throw new Error(`Could not find document with id ${instance}.`);
						}
						dispatch(
							selectRowReadonly({
								activityId: props.activityId,
								instanceId: instance
							})
						);
					} else {
						logger.warn(
							`Event '${rowAction?.event}' has been fired onDocumentButtonClick, ` +
								`but cannot be handled by the CRUD extension.`
						);
					}
				}
			}
		}),
		[data, defaultEvents, dispatch, dmType?.modelId, props.activityId, props.eventHandlers, variants.length]
	);

	return (
		<>
			<OverviewEngineFactories.ViewComponent {...props} {...handlers} />
			{showVariantSelection && (
				<VariantSelectionModal
					variants={variants}
					onClose={() => setShowVariantSelection(false)}
					onSelect={(model) => {
						setShowVariantSelection(false);
						logger.log("create heterogeneous document", model);
						dispatch(
							CopiedCRUDActions.createNewDocument({
								activityId: props.activityId,
								model
							})
						);
					}}
				/>
			)}
		</>
	);
}

ShowcaseOverviewView.handleProgressIndicator = OverviewEngineFactories.ViewComponent.handleProgressIndicator;

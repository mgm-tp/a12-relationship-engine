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

import { ModelSelectors, type View } from "@com.mgmtp.a12.client/client-core";
import {
	defaultVariantSelectionMapper,
	VariantSelection,
	type VariantSelectionProps
} from "@com.mgmtp.a12.client/client-core/heterogeneity";
import {
	OverviewEngineActions,
	OverviewEngineFactories,
	defaultMapDispatchToEventHandlers,
	type OverviewModel
} from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import { localizableFromLocalizationTreeMap } from "@com.mgmtp.a12.utils/utils-localization/lib/main/index.js";
import { LocalizerContext } from "@com.mgmtp.a12.utils/utils-localization-react/lib/main/index.js";
import { LoggerFactory } from "@com.mgmtp.a12.utils/utils-logging";
import {
	Button as ButtonWidget,
	ActionContentbox,
	ContentBoxElements,
	Icon,
	ModalOverlay
} from "@com.mgmtp.a12.widgets/widgets-core";

import { CRUDActions } from "../actions.js";
import { EventNames } from "../events.js";
import { DEFAULT_TRANSLATIONS, RESOURCE_KEYS } from "../languages/index.js";
import { assertObject } from "../utils/assertion.js";
import { useDocumentModelType } from "../utils/use-document-model-type.js";

const logger = LoggerFactory.getLogger("extensions/crud");

interface CRUDOverviewViewProps extends View {
	readonly eventHandlers?: {
		onEventButtonClick?(eventName: string): void;
	};
}

/** @internal */
export function CRUDOverviewView(props: CRUDOverviewViewProps): React.ReactNode {
	const dispatch = useDispatch();

	const { localizer } = useContext(LocalizerContext);
	const modelGraph = useSelector(ModelSelectors.modelGraph());

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
					} else if (matchesOverviewAdd) {
						props.eventHandlers?.onEventButtonClick?.(eventName);

						logger.log("Overview CRUD event", eventName);
						assertObject(dmType?.modelId, "Expected document model to exist");

						dispatch(
							CRUDActions.createNewDocument({
								activityId: props.activityId,
								model: dmType.modelId
							})
						);
					} else {
						defaultEvents.onEventButtonClick?.(eventName, button);
					}
				},
				onRowClick(params: { documentId: string; customEvent?: string }) {
					const { customEvent, documentId } = params;
					if (!customEvent) {
						dispatch(
							CRUDActions.selectRow({
								activityId: props.activityId,
								instanceId: documentId
							})
						);
					} else {
						defaultEvents.onRowClick?.(params);
					}
				},
				onRowButtonClick(params: { documentId: string; rowActionModel: OverviewModel.Button }) {
					const { documentId, rowActionModel: rowAction } = params;
					if (rowAction?.event.endsWith(EventNames.OVERVIEW_DELETE)) {
						logger.log("Overview CRUD event", rowAction.event, documentId);
						dispatch(
							CRUDActions.deleteRow({
								instanceId: documentId,
								activityId: props.activityId
							})
						);
					} else {
						defaultEvents.onRowButtonClick?.(params);
					}
				}
			}
		}),
		[defaultEvents, dispatch, dmType?.modelId, props.activityId, props.eventHandlers, variants.length]
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
							CRUDActions.createNewDocument({
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

CRUDOverviewView.handleProgressIndicator = OverviewEngineFactories.ViewComponent.handleProgressIndicator;

interface VariantSelectionModalProps extends VariantSelectionProps {
	onClose(): void;
}

function VariantSelectionModal(props: VariantSelectionModalProps): React.ReactNode {
	const { localizer } = useContext(LocalizerContext);

	return (
		<ModalOverlay closeOnEsc closeOnOutsideClick onClose={props.onClose}>
			<ActionContentbox
				headingElements={
					<ContentBoxElements.Title
						text={localizer(
							localizableFromLocalizationTreeMap(RESOURCE_KEYS.crud.variant.selection.title, DEFAULT_TRANSLATIONS)
						)}
						ariaLevel={1}
					/>
				}
				headingButtons={[
					<ContentBoxElements.HeadingAddon key="cancel">
						<ButtonWidget onClick={props.onClose} icon={<Icon>close</Icon>} invert />
					</ContentBoxElements.HeadingAddon>
				]}>
				<VariantSelection variants={props.variants} onSelect={props.onSelect} />
			</ActionContentbox>
		</ModalOverlay>
	);
}

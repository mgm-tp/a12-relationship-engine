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

import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useMemo, useContext, useCallback } from "react";

import { LocaleSelectors } from "@com.mgmtp.a12.client/client-core";
import { AriaLevelContext } from "@com.mgmtp.a12.formengine/formengine-core";
import { LocalizerContext } from "@com.mgmtp.a12.utils/utils-localization-react";
import { ButtonGroup, ModalOverlay, ActionContentbox, ContentBoxElements } from "@com.mgmtp.a12.widgets/widgets-core";

import type { DualPane } from "../dualPane/DualPane.js";
import type { Dialog } from "../../../../store/index.js";
import { ModelSelectors } from "../../../../store/index.js";
import { serializeInstanceId } from "../../../../store/index.js";
import type { RelationshipUiModel } from "../../../../models/index.js";
import { RelationshipEngineEvents } from "../../../../models/index.js";
import { RelationshipEngineActions } from "../../../../store/index.js";
import { RESOURCE_KEYS, createLocalizable, pickLocalizedText } from "../../languages/index.js";
// eslint-disable-next-line no-restricted-imports
import { useRelationshipEngineContext } from "../../../internal/context/RelationshipEngineContext.js";

import { resolveDialogContainerStyle } from "./utils.js";

export namespace EditDualPaneDialog {
	export interface Props {
		readonly dialog: Dialog.Edit;
	}
}

/**
 * Dialog for editing a TableList link in a modal.
 */
export function EditDualPaneDialog({ dialog }: EditDualPaneDialog.Props): React.ReactElement | null {
	const { activityId, instanceId } = dialog;
	const dispatch = useDispatch();
	const { localizer } = useContext(LocalizerContext);
	const { language } = useSelector(LocaleSelectors.locale());
	const Button = useRelationshipEngineContext((ctx) => ctx.componentMap.Button);

	const uiModels = useSelector(ModelSelectors.uiModels(activityId));

	const uiModel = useMemo(() => {
		return uiModels.find((b) => {
			const bInstanceId = serializeInstanceId(b.header.id, b.content.component.componentType);

			return bInstanceId === instanceId;
		});
	}, [uiModels, instanceId]);

	const handleClose = useCallback(() => {
		dispatch(RelationshipEngineActions.Events.editModalConfirmed({ activityId, checkpointId: dialog.checkpointId }));
	}, [dispatch, activityId, dialog.checkpointId]);

	const handleCancel = useCallback(() => {
		dispatch(RelationshipEngineActions.Events.editModalCancelled({ activityId, checkpointId: dialog.checkpointId }));
	}, [dispatch, activityId, dialog.checkpointId]);

	const editConfig = uiModel?.content.component.editConfiguration;

	const dualPaneProps: DualPane.Props | undefined = useMemo(() => {
		if (!uiModel || !editConfig) {
			return undefined;
		}

		const dualPaneComponent: RelationshipUiModel.ComponentConfiguration = {
			componentType: "DualPaneSelection",
			selectedItemsOverviewModel: editConfig.selectedItemsOverviewModel,
			availableItemsOverviewModel: editConfig.availableItemsOverviewModel,
			linkFormModel: uiModel?.content.component.linkFormModel,
			height: editConfig.height
		};

		return {
			uiModel: {
				...uiModel,
				content: {
					...uiModel.content,
					component: dualPaneComponent
				}
			},
			activityId: activityId,
			parentInstanceId: instanceId
		};
	}, [uiModel, editConfig, activityId, instanceId]);

	const dialogTitle = useMemo(() => {
		if (editConfig?.dialogTitle && editConfig.dialogTitle.length > 0) {
			return pickLocalizedText(editConfig.dialogTitle, language);
		}

		return localizer(createLocalizable(RESOURCE_KEYS.relationshipengine.dialog.title));
	}, [editConfig?.dialogTitle, language, localizer]);

	const buttons = uiModel?.content.component.buttons ?? [];
	const closeButtonElement = buttons.find((b) => b.event === RelationshipEngineEvents.SUBMIT_EDIT_MODAL);
	const cancelButtonElement = buttons.find((b) => b.event === RelationshipEngineEvents.CANCEL_EDIT_MODAL);

	const containerAttributes = React.useMemo(() => {
		return {
			style: resolveDialogContainerStyle(
				editConfig?.dialogWidth,
				editConfig?.dialogMaxWidth,
				editConfig?.dialogMaxHeight
			)
		};
	}, [editConfig?.dialogMaxHeight, editConfig?.dialogMaxWidth, editConfig?.dialogWidth]);

	const DualPane = useRelationshipEngineContext((ctx) => ctx.componentMap.DualPane);

	if (!dualPaneProps) {
		return null;
	}

	const footer = (
		<ContentBoxElements.Footer>
			<ButtonGroup alignment="right">
				{cancelButtonElement && <Button buttonElement={cancelButtonElement} onClick={handleCancel} />}
				{closeButtonElement && <Button buttonElement={closeButtonElement} onClick={handleClose} />}
			</ButtonGroup>
		</ContentBoxElements.Footer>
	);

	return (
		<ModalOverlay containerAttributes={containerAttributes} onClose={handleClose} closeOnEsc closeOnOutsideClick>
			<ActionContentbox headingElements={<ContentBoxElements.Title text={dialogTitle} ariaLevel={1} />} footer={footer}>
				<AriaLevelContext.Provider value={{ ariaLevel: 2 }}>
					<DualPane {...dualPaneProps} />
				</AriaLevelContext.Provider>
			</ActionContentbox>
		</ModalOverlay>
	);
}

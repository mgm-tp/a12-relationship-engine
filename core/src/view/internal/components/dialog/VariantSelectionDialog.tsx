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

import { ModelSelectors } from "@com.mgmtp.a12.client/client-core";
import { LocalizerContext } from "@com.mgmtp.a12.utils/utils-localization-react";
import { VariantSelection, defaultVariantSelectionMapper } from "@com.mgmtp.a12.client/client-core/heterogeneity";
import {
	Icon,
	ModalOverlay,
	ActionContentbox,
	ContentBoxElements,
	Button as ButtonWidget
} from "@com.mgmtp.a12.widgets/widgets-core";

import type { Dialog } from "../../../../store/index.js";
import { RelationshipEngineActions } from "../../../../store/index.js";
import { RESOURCE_KEYS, createLocalizable } from "../../languages/index.js";

export namespace VariantSelectionDialog {
	export interface Props {
		readonly dialogState: Dialog.VariantSelection;
	}
}

/**
 * Dialog component for selecting a variant/subtype when creating a new entity.
 * Uses the VariantSelection component from client-core.
 */
export const VariantSelectionDialog: React.FC<VariantSelectionDialog.Props> = React.memo(
	function VariantSelectionDialog({ dialogState }) {
		const { localizer } = useContext(LocalizerContext);
		const dispatch = useDispatch();

		const handleClose = useCallback(() => {
			dispatch(
				RelationshipEngineActions.Events.dialogClosed({
					activityId: dialogState.context.activityId
				})
			);
		}, [dispatch, dialogState.context.activityId]);

		const handleSelect = useCallback(
			(documentModelId: string) => {
				dispatch(
					RelationshipEngineActions.Events.dialogConfirmed({
						activityId: dialogState.context.activityId,
						selectedDocumentModelId: documentModelId
					})
				);
			},
			[dispatch, dialogState.context.activityId]
		);

		const modelGraph = useSelector(ModelSelectors.modelGraph());
		const variants = useMemo(() => {
			const targetDocumentModel = modelGraph.documentModels.find(
				(dm) => dm.modelId === dialogState.targetDocumentModelId
			);

			if (!targetDocumentModel) {
				return [];
			}

			return defaultVariantSelectionMapper(modelGraph, localizer)(targetDocumentModel);
		}, [modelGraph, localizer, dialogState.targetDocumentModelId]);

		return (
			<ModalOverlay closeOnEsc closeOnOutsideClick onClose={handleClose}>
				<ActionContentbox
					headingElements={
						<ContentBoxElements.Title
							text={localizer(createLocalizable(RESOURCE_KEYS.relationshipengine.variant.selection.title))}
							ariaLevel={1}
						/>
					}
					headingButtons={[
						<ContentBoxElements.HeadingAddon key="cancel">
							<ButtonWidget onClick={handleClose} icon={<Icon>close</Icon>} invert />
						</ContentBoxElements.HeadingAddon>
					]}>
					<VariantSelection variants={variants} onSelect={handleSelect} />
				</ActionContentbox>
			</ModalOverlay>
		);
	}
);

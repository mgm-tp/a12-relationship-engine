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

import { useState, useContext, useCallback } from "react";

import { LocalizerContext } from "@com.mgmtp.a12.utils/utils-localization-react";
import {
	Icon,
	ModalNotification,
	ContentBoxElements,
	Button as BaseButton,
	ButtonGroup as BaseButtonGroup
} from "@com.mgmtp.a12.widgets/widgets-core";

import type { RelationshipUiModel } from "../../../../models/index.js";
import { RESOURCE_KEYS, createLocalizable, pickLocalizedText } from "../../languages/index.js";

export namespace Button {
	export interface Props {
		/** The UI model button element to render. */
		readonly buttonElement: RelationshipUiModel.ButtonElement;
		/** Handler called when the button is confirmed/clicked. */
		readonly onClick: () => void;
		/** Whether the button is disabled. */
		readonly disabled?: boolean;
	}
}

/**
 * Renders a single `ButtonElement` from the UI model, resolving all
 * localized text fields, icon, styling, and an optional confirmation dialog
 * before invoking the action.
 *
 * Exposed via `ComponentMap.ButtonElement` so consumers can override the
 * default rendering behavior.
 */
export function Button({ buttonElement, onClick, disabled }: Button.Props) {
	const [confirmationVisible, setConfirmationVisible] = useState(false);
	const { localizer, locale } = useContext(LocalizerContext);

	const label = buttonElement.label ? pickLocalizedText(buttonElement.label, locale.language) : undefined;
	const description = buttonElement.description
		? pickLocalizedText(buttonElement.description, locale.language)
		: undefined;

	const icon = buttonElement.icon ? (
		<Icon iconTheme={buttonElement.icon.theme ?? "outlined"}>{buttonElement.icon.name}</Icon>
	) : undefined;

	const className = buttonElement.styles?.join(" ");

	const handleClick = useCallback(() => {
		if (buttonElement.confirmation) {
			setConfirmationVisible(true);
		} else {
			onClick();
		}
	}, [buttonElement.confirmation, onClick]);

	const handleConfirm = useCallback(() => {
		setConfirmationVisible(false);
		onClick();
	}, [onClick]);

	const handleCancel = useCallback(() => {
		setConfirmationVisible(false);
	}, []);

	const okLabel = localizer(createLocalizable(RESOURCE_KEYS.relationshipengine.dialog.confirmation.ok));
	const cancelLabel = localizer(createLocalizable(RESOURCE_KEYS.relationshipengine.dialog.confirmation.cancel));

	return (
		<>
			<BaseButton
				label={buttonElement.labelHidden ? undefined : label}
				title={description ?? (buttonElement.labelHidden ? label : undefined)}
				icon={icon}
				primary={buttonElement.primary}
				destructive={buttonElement.destructive}
				labelHidden={buttonElement.labelHidden}
				className={className}
				disabled={disabled}
				onClick={handleClick}
			/>
			{confirmationVisible && buttonElement.confirmation && (
				<ConfirmationDialog
					confirmation={buttonElement.confirmation}
					okLabel={okLabel}
					cancelLabel={cancelLabel}
					onConfirm={handleConfirm}
					onCancel={handleCancel}
				/>
			)}
		</>
	);
}

interface ConfirmationDialogProps {
	readonly confirmation: RelationshipUiModel.ButtonConfirmation;
	readonly okLabel: string | undefined;
	readonly cancelLabel: string | undefined;
	readonly onConfirm: () => void;
	readonly onCancel: () => void;
}

function ConfirmationDialog({ confirmation, okLabel, cancelLabel, onConfirm, onCancel }: ConfirmationDialogProps) {
	const { locale } = useContext(LocalizerContext);
	const title = confirmation.title ? pickLocalizedText(confirmation.title, locale.language) : undefined;
	const message = confirmation.message ? pickLocalizedText(confirmation.message, locale.language) : undefined;

	const footer = (
		<ContentBoxElements.Footer>
			<BaseButtonGroup alignment="right">
				<BaseButton secondary label={cancelLabel} onClick={onCancel} />
				<BaseButton primary label={okLabel} onClick={onConfirm} />
			</BaseButtonGroup>
		</ContentBoxElements.Footer>
	);

	return (
		<ModalNotification title={title} footer={footer} onClose={onCancel} closeOnEsc>
			{message && <p>{message}</p>}
		</ModalNotification>
	);
}

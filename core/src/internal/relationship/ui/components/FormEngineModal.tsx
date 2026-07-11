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

import React, { useContext } from "react";

import { addPrefix, ModalOverlay } from "@com.mgmtp.a12.widgets/widgets-core";
import { LocalizerContext } from "@com.mgmtp.a12.utils/utils-localization-react";
import type { DocumentModel, IGeneratedCodeAccessor } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import {
	Events,
	Commands,
	DataSelectors,
	type FormModel,
	UiStateSelectors
} from "@com.mgmtp.a12.formengine/formengine-core";

import { StandaloneFormEngine } from "./StandaloneFormEngine.js";

export interface FormEngineModalProps {
	readonly formModel: FormModel;
	readonly documentModel: DocumentModel;
	readonly validatorProvider: IGeneratedCodeAccessor;
	readonly document: object;
	readonly readonly?: boolean;
	onCancel(): void;
	onSubmit(documentJson: object): void;
}

/**
 * @internal
 *
 * This Form Engine Modal opens a complete "vanilla" Form Engine - detached from
 * the store. This is only a temporary solution.
 *
 * The concept of opening a modal dialog shall be changed to opening a
 * sub-activity instead. (ticket currently unknown).
 *
 * When doing so, the Form Engine should also be connected to the store.
 */
function FormEngineModal(props: FormEngineModalProps): React.ReactNode {
	const { locale } = useContext(LocalizerContext);

	return (
		<ModalOverlay onClose={props.onCancel} closeOnEsc closeOnOutsideClick>
			<div className={addPrefix("-u-height-full -u-width-full")}>
				<StandaloneFormEngine
					documentModel={props.documentModel}
					validatorProvider={props.validatorProvider}
					formModel={props.formModel}
					state={{
						locale,
						document: props.document,
						readonly: props.readonly
					}}
					additionalMiddlewares={[
						(api) => (next) => (action) => {
							const result = next(action);

							if (Events.eventButton.match(action)) {
								const eventName = action.payload.name;

								if (eventName === "event_cancel") {
									props.onCancel();
								} else if (eventName === "event_submit" || eventName === "event_save") {
									api.dispatch(Commands.validateFull());
									const messages = UiStateSelectors.messages()(api.getState());

									if (Object.keys(messages).length === 0) {
										const document = DataSelectors.document()(api.getState());
										props.onSubmit(document);
									}
								}
							}

							return result;
						}
					]}
				/>
			</div>
		</ModalOverlay>
	);
}

export default FormEngineModal as React.ComponentType<FormEngineModalProps>;

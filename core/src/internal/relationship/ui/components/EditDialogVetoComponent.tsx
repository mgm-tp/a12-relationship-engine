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

import { LocalizerContext } from "@com.mgmtp.a12.utils/utils-localization-react/lib/main/index.js";
import { Button, ButtonGroup, ModalNotification } from "@com.mgmtp.a12.widgets/widgets-core";

import {
	descriptorTableListEditDialogVetoAbort,
	descriptorTableListEditDialogVetoDiscard,
	descriptorTableListEditDialogVetoMessage,
	descriptorTableListEditDialogVetoTitle
} from "../../localization.js";

/**
 * @internal
 */
export interface EditDialogVetoProps {
	readonly onDiscard: () => void;
	readonly onAbort: () => void;
}

/**
 * @internal
 */
export function EditDialogVetoComponent(props: EditDialogVetoProps): React.ReactNode {
	const localizer = useContext(LocalizerContext).localizer;

	const vetoDialog = (
		<ModalNotification
			title={localizer(descriptorTableListEditDialogVetoTitle())}
			variant="warning"
			closeOnEsc
			onClose={props.onDiscard}
			footer={
				<ButtonGroup alignment="right">
					<Button label={localizer(descriptorTableListEditDialogVetoAbort())} onClick={props.onAbort} />
					<Button
						label={localizer(descriptorTableListEditDialogVetoDiscard())}
						onClick={props.onDiscard}
						primary
						destructive
					/>
				</ButtonGroup>
			}>
			<p>{localizer(descriptorTableListEditDialogVetoMessage())}</p>
		</ModalNotification>
	);

	return <div>{vetoDialog}</div>;
}

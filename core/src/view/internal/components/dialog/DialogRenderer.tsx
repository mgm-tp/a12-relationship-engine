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
import { useSelector } from "react-redux";

import { Dialog } from "../../../../store/index.js";
import { UiStateSelectors } from "../../../../store/index.js";

import { EditDualPaneDialog } from "./EditDualPaneDialog.js";
import { VariantSelectionDialog } from "./VariantSelectionDialog.js";

export namespace DialogRenderer {
	export interface Props {
		readonly activityId: string;
	}
}

/**
 * Renders the appropriate dialog based on the current dialog state.
 * Similar pattern to tree-engine's DialogsRenderer component.
 */
export const DialogRenderer: React.FC<DialogRenderer.Props> = React.memo(function DialogRenderer({ activityId }) {
	const dialogState = useSelector(UiStateSelectors.dialog(activityId));

	if (!dialogState) {
		return null;
	}

	if (Dialog.VariantSelection.isAssignableFrom(dialogState)) {
		return <VariantSelectionDialog dialogState={dialogState} />;
	}

	if (Dialog.Edit.isAssignableFrom(dialogState)) {
		return <EditDualPaneDialog dialog={dialogState} />;
	}

	return null;
});

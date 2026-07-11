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

import { useRef } from "react";
import { useSelector } from "react-redux";

import { ActivitySelectors } from "@com.mgmtp.a12.client/client-core";

import { ModelSelectors } from "../../store/index.js";
import type { RelationshipUiModel } from "../../models/index.js";

/**
 * @internal
 * Custom hook that returns the relationship UI model by its model name.
 *
 * If the form activity does not exist anymore and we still re-render here, the UI model
 * of the previous render is used to prevent flickering in the UI.
 */
export function useRelationshipUiModel(
	uiModelName: string = "",
	activityId: string = ""
): RelationshipUiModel | undefined {
	const uiModel = useSelector(ModelSelectors.uiModelByName(uiModelName));
	const uiModelRef = useRef(uiModel);

	const exists = useSelector((s) => ActivitySelectors.activityById(activityId)(s) !== undefined);

	return exists ? uiModel : uiModelRef.current;
}

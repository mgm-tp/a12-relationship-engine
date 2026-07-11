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

import React, { useContext } from "react";

import { ViewViews } from "@com.mgmtp.a12.client/client-core";
import type { FormModel } from "@com.mgmtp.a12.formengine/formengine-core";
import { Enablements, type FormModelMap, DefaultFormModelMap } from "@com.mgmtp.a12.formengine/formengine-core";

import { getRelationshipUiModelRef } from "../../models/index.js";

import { useRelationshipUiModel } from "./shared.js";
import { useRelationshipEngineContext } from "./context/RelationshipEngineContext.js";

/** @internal */
export function CustomScreenElement(
	props: FormModelMap.FormModelComponentProps<FormModel.CustomScreenElement>
): React.ReactNode {
	const { modelElement, config } = props;
	const { activityId } = useContext(ViewViews.ActivityContext) ?? {};
	const uiModelName = React.useMemo(() => getRelationshipUiModelRef(modelElement), [modelElement]);
	const uiModel = useRelationshipUiModel(uiModelName, activityId);
	const DualPane = useRelationshipEngineContext((ctx) => ctx.componentMap.DualPane);
	const DropDown = useRelationshipEngineContext((ctx) => ctx.componentMap.DropDown);
	const TableList = useRelationshipEngineContext((ctx) => ctx.componentMap.TableList);

	if (!uiModel) {
		return <DefaultFormModelMap.CustomScreenElement.component {...props} />;
	}

	if (Enablements.isHidden({ formModelElement: modelElement, dataContext: [], state: config.renderOptions.state })) {
		return null;
	}

	if (!activityId) {
		return null;
	}

	const component = uiModel.content.component;

	if (component.componentType === "DualPaneSelection") {
		return <DualPane uiModel={uiModel} activityId={activityId} />;
	}

	if (component.componentType === "DropDownSelection") {
		return <DropDown uiModel={uiModel} activityId={activityId} />;
	}

	if (component.componentType === "TableList") {
		return <TableList uiModel={uiModel} activityId={activityId} />;
	}

	return (
		<div style={{ border: "solid 2px blue", padding: 6, textAlign: "center" }}>
			Unknown component: <strong>{component.componentType}</strong>
		</div>
	);
}

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

// tag::customFormModelMap[]

import React from "react";

import { type FormModel, DefaultFormModelMap, type FormModelMap } from "@com.mgmtp.a12.formengine/formengine-core";
import { RelationshipFormModelMap } from "@com.mgmtp.a12.relationshipengine/relationshipengine-core";

export const CustomFormModelMap: FormModelMap = {
	...DefaultFormModelMap,
	...RelationshipFormModelMap,
	Screen: { component: CustomScreen },
	CustomScreenElement: { component: CustomScreenElement }
};

function CustomScreen(props: FormModelMap.FormModelComponentProps<FormModel.Screen>): React.ReactNode {
	// render custom screen conditionally
	const condition = props.modelElement.id === "customScreen";

	if (condition) {
		return <div>Custom screen</div>;
	}

	// fallback to the Screen from the DefaultFormModelMap
	return <DefaultFormModelMap.Screen.component {...props} />;
}

function CustomScreenElement(
	props: FormModelMap.FormModelComponentProps<FormModel.CustomScreenElement>
): React.ReactNode {
	// render custom screen element conditionally
	const condition = props.modelElement.id === "customScreenElement";

	if (condition) {
		return <div>Custom screen element</div>;
	}

	// The RelationshipFormModelMap already provides a custom screen element,
	// so it has to be returned (instead of the one from the DefaultFormModelMap)
	return <RelationshipFormModelMap.CustomScreenElement.component {...props} />;
}
// end::customFormModelMap[]

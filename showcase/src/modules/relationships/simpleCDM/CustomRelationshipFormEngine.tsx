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

import { ActivitySelectors, type View } from "@com.mgmtp.a12.client/client-core";
import {
	FormEngineActions,
	FormEngineStateAdapter,
	FormEngineViews,
	DefaultFormModelMap,
	type FormModelMap
} from "@com.mgmtp.a12.formengine/formengine-core";
import {
	type RelationshipViews,
	DualPaneSelection,
	cddActivityStateAdapter,
	createRelationshipFormModelMap,
	TableList
} from "@com.mgmtp.a12.relationshipengine/relationshipengine-core";

const CustomFormModelMap: FormModelMap = {
	...DefaultFormModelMap,
	...createRelationshipFormModelMap({
		componentProvider: (config) => {
			if (config.name === "DualPaneSelection") {
				return { type: "MultiSelection", component: CustomDualPane };
			}
			if (config.name === "TableList") {
				return { type: "List", component: CustomTableList };
			}
			return undefined;
		}
	})
};

export function CustomRelationshipFormEngine(props: View): React.ReactNode {
	const stateProps = useSelector((state) => {
		const activity = ActivitySelectors.activityById(props.activityId)(state);
		if (!activity) {
			return {};
		}
		const adaptedState = cddActivityStateAdapter(activity)(state);
		return FormEngineStateAdapter.mapStateToProps(adaptedState, {
			...props,
			formModelMap: CustomFormModelMap
		});
	});
	const dispatch = useDispatch();

	const dispatchProps = FormEngineActions.mapDispatchToProps(dispatch, props);

	return <FormEngineViews.FormEngineTpl {...props} {...stateProps} {...dispatchProps} />;
}

function CustomDualPane(props: RelationshipViews.MultiSelectionProps) {
	const assignments = React.useMemo(() => {
		if (props.assignments.loadingState !== "loaded") {
			return props.assignments;
		}
		return { ...props.assignments, data: [...props.assignments.data].sort(sortFunction) };
	}, [props.assignments]);

	return (
		<>
			<h3>Customized DualPane - Selected items are sorted DESC</h3>
			<DualPaneSelection {...props} assignments={assignments} />
		</>
	);
}

function CustomTableList(props: RelationshipViews.ListProps) {
	const assignments = React.useMemo(() => {
		if (props.items.loadingState !== "loaded") {
			return props.items;
		}
		return { ...props.items, data: [...props.items.data].sort(sortFunction) };
	}, [props.items]);

	return (
		<>
			<h3>Customized TableList - Selected items are sorted DESC</h3>
			<TableList {...props} items={assignments} />
		</>
	);
}

interface Item {
	documentJson: any | undefined;
}

const sortFunction = (a1: Item, a2: Item) => {
	const a1Name = a1.documentJson?.target?.businessPartner?.name;
	const a2Name = a2.documentJson?.target?.businessPartner?.name;
	if (a1Name === a2Name) {
		return 0;
	}
	if (a1Name > a2Name) {
		return -1;
	}
	return 1;
};

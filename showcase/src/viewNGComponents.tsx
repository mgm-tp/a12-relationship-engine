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

import type { JSX, ComponentType } from "react";

import { CRUDViews } from "@com.mgmtp.a12.crud/crud-core";
import { FormEngineViews } from "@com.mgmtp.a12.formengine/formengine-core";
import { type View, FrameFactories, type ViewNGProps } from "@com.mgmtp.a12.client/client-core";

import { CustomRelationshipFormEngine } from "./modules/relationships/simpleCDM/CustomRelationshipFormEngine.js";

const ProgressComponent = FrameFactories.createProgressComponentProvider()([], "");

/**
 * Wraps a {@link View}-based component with a progress indicator and exposes it as a viewNG
 * component, so it can be referenced directly from a `DynamicConfiguration` flow.
 *
 * NG layouts do not automatically wrap views with a `ProgressComponent`, hence the explicit
 * wrapper here.
 */
function withProgressIndicator(Component: ComponentType<View>): ComponentType<ViewNGProps> {
	const componentName = Component.displayName ?? Component.name;

	function WithProgressIndicator(props: ViewNGProps): JSX.Element {
		return (
			<ProgressComponent activityId={props.activityId}>
				<Component {...props} name={componentName} />
			</ProgressComponent>
		);
	}

	WithProgressIndicator.displayName = `withProgressIndicator(${componentName})`;

	return WithProgressIndicator;
}

/**
 * Which Relationship Engine architecture the `RelationshipFormEngine` view renders with.
 *
 * - `new`: composable `FormEngineWithRelationshipEngineView` (paired with
 *   `RelationshipEngineFactories.createDataProviders()`).
 * - `legacy`: `FormEngineView` / `LegacyRelationshipFormEngineView` (paired with the old
 *   `createCddDataProvider` / `RelationshipFactories.createRelationshipDataProvider`).
 *
 * The view and the data providers must come from the same architecture, otherwise bindings
 * (dropdown, dual pane, table list) cannot resolve their candidate data.
 */
export type RelationshipEngineArch = "new" | "legacy";

function relationshipFormEngineView(arch: RelationshipEngineArch): ComponentType<View> {
	return arch === "legacy"
		? (props) => <CRUDViews.FormEngineView {...props} />
		: (props) => <CRUDViews.FormEngineWithRelationshipEngineView {...props} />;
}

function createViewComponents(arch: RelationshipEngineArch) {
	return {
		ShowcaseOverview: (props) => <CRUDViews.OverviewEngineView {...props} />,
		OverviewCRUD: (props) => <CRUDViews.OverviewEngineView {...props} />,
		RelationshipFormEngine: relationshipFormEngineView(arch),
		FormEngine: (props) => <FormEngineViews.FormEngine {...props} />,
		SortedRelationshipFormEngine: (props) => <CustomRelationshipFormEngine {...props} />
	} satisfies { [name: string]: ComponentType<View> };
}

export type ViewNGComponents = Record<keyof ReturnType<typeof createViewComponents>, ComponentType<ViewNGProps>>;

export function createViewNGComponents(arch: RelationshipEngineArch): ViewNGComponents {
	const viewComponents = createViewComponents(arch);

	return Object.fromEntries(
		Object.entries(viewComponents).map(([name, Component]) => [name, withProgressIndicator(Component)])
	) as ViewNGComponents;
}

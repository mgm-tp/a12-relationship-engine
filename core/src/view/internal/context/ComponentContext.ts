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

import React from "react";

import { createContext, useContextSelector } from "@com.mgmtp.a12.widgets/widgets-core";

import type { RelationshipUiModel } from "../../../models/index.js";
import type { RelationshipEngineDataHolder } from "../../../store/index.js";

/**
 * Component-level context shared between a top-level RE component (DualPane, TableList)
 * and its internal subtree. Avoids prop drilling of common values into customizable
 * sub-components (e.g. custom TableBody, custom Heading replacements).
 */
export interface RelationshipEngineComponentContext {
	/** Activity ID owning this component instance. */
	readonly activityId: string;
	/** Serialized instance ID for this component. */
	readonly instanceId: string;
	/** UI model driving this component. */
	readonly uiModel: RelationshipUiModel;
	/** Descriptor for the selected-items (link) data holder. */
	readonly dataHolderDescriptor:
		| RelationshipEngineDataHolder.SelectedItemsDataHolder["descriptor"]
		| RelationshipEngineDataHolder.AvailableItemsDataHolder["descriptor"];
}

const ComponentContext = createContext<RelationshipEngineComponentContext>({} as RelationshipEngineComponentContext);
ComponentContext.displayName = "RelationshipEngineComponentContext";

export namespace RelationshipEngineComponentContextProvider {
	export interface Props extends RelationshipEngineComponentContext {
		readonly children: React.ReactNode;
	}
}

/**
 * Provides component-level context to a subtree of RE components.
 * Must be rendered by top-level components (DualPane, TableList) once per instance.
 * @internal
 */
export function RelationshipEngineComponentContextProvider(
	props: RelationshipEngineComponentContextProvider.Props
): React.ReactNode {
	const { activityId, uiModel, dataHolderDescriptor: linkDataHolderDescriptor, instanceId, children } = props;
	const value = React.useMemo<RelationshipEngineComponentContext>(
		() => ({ activityId, uiModel, dataHolderDescriptor: linkDataHolderDescriptor, instanceId }),
		[activityId, uiModel, linkDataHolderDescriptor, instanceId]
	);

	return React.createElement(ComponentContext.Provider, { value }, children);
}

export function useRelationshipEngineComponentSelector<T>(selector: (ctx: RelationshipEngineComponentContext) => T): T {
	return useContextSelector(ComponentContext, selector);
}

/**
 * Hook to access the component-level RE context.
 * Must be called within a subtree wrapped by `RelationshipEngineComponentContextProvider`.
 */
export function useRelationshipEngineComponentContext(): RelationshipEngineComponentContext {
	return useContextSelector(ComponentContext, (ctx) => ctx);
}

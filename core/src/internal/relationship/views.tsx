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
import type * as ComponentApi from "./ui/components/api.js";
import type * as Provider from "./ui/engine/componentProvider.js";
import Engine, { type RelationshipEngineProps as EngineProps } from "./ui/engine/RelationshipEngine.js";

/**
 *  All relationship related views and components.
 */
export namespace RelationshipViews {
	/** Props of {@link RelationshipViews.RelationshipEngine}. */
	export type RelationshipEngineProps = EngineProps;

	/**
	 * An engine interpreting a relationship UI configuration from the store.
	 * The configuration is retrieved from the given instance.
	 */
	export const RelationshipEngine = Engine;

	/**
	 * Component provider for customizing existing or providing new components.
	 * Customization is considered experimental at the moment.
	 */
	export type ComponentProvider = Provider.ComponentProvider;

	/**
	 * A wrapper adding loading state information to a data object of type T.
	 * The data object can only be accessed if the data is "loaded"
	 */
	export type Items<T> = ComponentApi.Items<T>;

	/**
	 * List component API that has to be fulfilled for customizing it
	 * with {@link RelationshipViews.ComponentProvider}.
	 */
	export type ListComponent = Provider.ListComponent;

	/** Props of {@link RelationshipViews.ListComponent}. */
	export type ListProps = ComponentApi.ListProps;

	/** An item of the {@link RelationshipViews.ListComponent} that is used by {@link RelationshipViews.ListProps}. */
	export type ListItem = ComponentApi.ListItem;

	/**
	 * Multi selection component API that has to be fulfilled for customizing it
	 * with {@link RelationshipViews.ComponentProvider}.
	 */
	export type MultiSelectionComponent = Provider.MultiSelectionComponent;

	/** Props of {@link RelationshipViews.MultiSelectionComponent}. */
	export type MultiSelectionProps = ComponentApi.MultiSelectionProps;

	/**
	 * An item of the {@link RelationshipViews.MultiSelectionComponent} that is used by
	 * {@link RelationshipViews.MultiSelectionProps}.
	 */
	export type MultiSelectionItem = ComponentApi.MultiSelectionItem;

	/**
	 * Single selection component API that has to be fulfilled for customizing it
	 * with {@link RelationshipViews.ComponentProvider}.
	 */
	export type SingleSelectionComponent = Provider.SingleSelectionComponent;

	/** Props of {@link RelationshipViews.SingleSelectionComponent}. */
	export type SingleSelectionProps = ComponentApi.SingleSelectionProps;

	/**
	 * An item of the {@link RelationshipViews.SingleSelectionComponent} that is used by
	 * {@link RelationshipViews.SingleSelectionProps}.
	 */
	export type SingleSelectionItem = ComponentApi.SingleSelectionItem;
}

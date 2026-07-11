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

import deepEqual from "fast-deep-equal";
import { connect, useDispatch } from "react-redux";
import React, { useRef, useEffect, useContext, type ComponentType } from "react";

import { LocalizerContext } from "@com.mgmtp.a12.utils/utils-localization-react";
import { FlyoutMenu, SlidingMenu, type MenuItem } from "@com.mgmtp.a12.widgets/widgets-core";
import {
	type Locale,
	type Localizer,
	localizableFromModel,
	type LocalizedModelText
} from "@com.mgmtp.a12.utils/utils-localization";
import {
	ActivityMap,
	type Activity,
	ModelSelectors,
	type FrameViews,
	LocaleSelectors,
	ApplicationModel,
	ActivitySelectors,
	ApplicationActions
} from "@com.mgmtp.a12.client/client-core";

interface MainMenuItem {
	readonly label: string;
	readonly initialActivity?: ApplicationModel.InitialActivity;
	readonly active: boolean;
	readonly children?: MainMenuItem[];
}

/**
 * A custom main menu component.
 *
 * It has its own model in the form of a "global" menu. This allows to define
 * the order (and nesting) of menu items. Menu items are either "container"
 * items which are used defining the menu structure. Or they are "module"
 * items, which reference module menus (from the app model).
 *
 * On selection of a menu item, starts a new activity using the menu state as
 * descriptor.
 *
 * Also cancels any other running top level activity.
 */
function MainMenuComponent(props: FrameViews.MainMenuProps & StateProps): React.ReactNode {
	const dispatch = useDispatch();
	const localizer = useContext(LocalizerContext).localizer;

	function mapToWidgetItem({ label, active, initialActivity, children }: MainMenuItem): MenuItem {
		return {
			label,
			selected: active,
			onClick: initialActivity
				? () => {
						props.onMenuItemClick();

						if (Object.keys(initialActivity.descriptor).length > 0) {
							dispatch(ApplicationActions.startMainActivityRequested(initialActivity));
						}
					}
				: undefined,
			children: children ? children.map(mapToWidgetItem) : undefined
		};
	}

	const convertedMenu = convertMenuTree(mainMenu, props.appModel);
	const items = convertedMenu
		.map((menuItem) => createMenuItem(menuItem, [], props, localizer))
		.filter(notUndefined)
		.map(mapToWidgetItem);

	/**
	 * Focus the sliding menu wrapper when the menu gets opened
	 */
	const slidingMenuWrapper = useRef<HTMLElement | null>(null);
	useEffect(() => {
		if (props.expanded === true) {
			setTimeout(() => slidingMenuWrapper.current?.focus(), 300);
		}
	}, [props.expanded]);

	/**
	 * Focus the trigger element (e.g. the sandwich button) when
	 * the user tabs out of the menu
	 */
	function handleTabOut(event: React.KeyboardEvent<HTMLElement>): void {
		event.preventDefault();

		if (props.triggerElement && props.triggerElement !== null) {
			props.triggerElement.current?.focus();
		}
	}

	return props.mobileMode ? (
		<SlidingMenu.MainWrapper expanded={props.expanded}>
			<SlidingMenu
				items={items}
				useAs="main"
				onTabOut={(e) => handleTabOut(e)}
				wrapperRef={(r) => {
					slidingMenuWrapper.current = r;
				}}
			/>
		</SlidingMenu.MainWrapper>
	) : (
		<FlyoutMenu type="horizontal" items={items} useAs="main" />
	);
}

interface StateProps {
	topLevelActivities: Activity.Descriptor[];
	appModel: ApplicationModel;
	locale: Locale;
}

function areStatePropsEqual(prevProps: StateProps, curProps: StateProps): boolean {
	return (
		prevProps.appModel === curProps.appModel &&
		prevProps.locale === curProps.locale &&
		prevProps.topLevelActivities.length === curProps.topLevelActivities.length &&
		prevProps.topLevelActivities.every((prevAct, index) =>
			Descriptor.equal(prevAct, curProps.topLevelActivities[index])
		)
	);
}

export namespace Descriptor {
	/**
	 * @internal
	 */
	export function equal(d1: Activity.Descriptor, d2: Activity.Descriptor): boolean {
		const k1 = Object.keys(d1);
		const k2 = Object.keys(d2);

		return k1.length === k2.length && k1.every((p1) => d1[p1] === d2[p1]);
	}
}

export const MainMenu: ComponentType<FrameViews.MainMenuProps> = connect<
	StateProps,
	{},
	FrameViews.MainMenuProps,
	object
>(
	function mapStateToProps(state: object) {
		return {
			appModel: ModelSelectors.applicationModel()(state),
			topLevelActivities: ActivityMap.toList(ActivitySelectors.topLevelActivities()(state)).map((a) => a.descriptor),
			locale: LocaleSelectors.locale()(state)
		};
	},
	undefined,
	undefined,
	{
		areStatePropsEqual
	}
)(MainMenuComponent);

function notUndefined<T>(obj: T | undefined): obj is T {
	return obj !== undefined;
}

function createMenuItem(
	treeItem: ApplicationModel.Menu,
	path: ApplicationModel.Menu[],
	state: StateProps,
	localizer: Localizer
): MainMenuItem | undefined {
	const children = treeItem.children
		? treeItem.children.map((child) => createMenuItem(child, [...path, child], state, localizer)).filter(notUndefined)
		: undefined;

	const initialActivity = treeItem.initialActivity;
	const active =
		state.topLevelActivities.some((activity) => deepEqual(activity, initialActivity?.descriptor)) ||
		(children !== undefined && children.some((child) => child.active));

	const key = [ApplicationModel.getKey(state.appModel), [...path, treeItem].map((entry) => entry.name)].join(".");
	const label = localizer(localizableFromModel(key, treeItem.label)) ?? "";

	return { label, initialActivity, active, children };
}

interface ContainerMenu {
	readonly name: string;
	readonly label: LocalizedModelText;
	readonly children?: MenuTree[];
}

function isContainerMenu(obj: MenuTree): obj is ContainerMenu {
	return !("module" in obj);
}

interface ModuleMenu {
	readonly module: string;
}

type MenuTree = ModuleMenu | ContainerMenu;

/** Replaces menus referencing modules with the menu definition inside of those modules */
function convertMenuTree(inputMenu: MenuTree[], appModel: ApplicationModel): ApplicationModel.Menu[] {
	return inputMenu
		.map((menuItem) => {
			if (isContainerMenu(menuItem)) {
				const { name, label } = menuItem;

				if (menuItem.children === undefined) {
					return { name, label };
				}

				const children = menuItem.children !== undefined ? convertMenuTree(menuItem.children, appModel) : undefined;

				// Drop empty menu entries that are caused due to missing permissions of the user
				if (children !== undefined && children.length === 0) {
					return undefined;
				}

				return { name, label, children };
			} else {
				return appModel.content.modules.find((m) => m.name === menuItem.module)?.menu;
			}
		})
		.filter(notUndefined);
}

// the initial menu structure that refers to modules either directly or indirectly
const mainMenu: MenuTree[] = [
	{
		name: "data-handling",
		label: [
			{ locale: "en", text: "Data Handling" },
			{ locale: "de", text: "Datenverarbeitung" }
		],
		children: [{ module: "data_handling.crud" }]
	},
	{
		name: "relationships",
		label: [
			{ locale: "en", text: "Relationships" },
			{ locale: "de", text: "Relationships" }
		],
		children: [
			{ module: "relationships.form" },
			{ module: "relationships.standalone" },
			{ module: "relationships.scdm" }
		]
	}
];

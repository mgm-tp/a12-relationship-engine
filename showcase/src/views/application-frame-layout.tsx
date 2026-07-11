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

import { Locale } from "@com.mgmtp.a12.utils/utils-localization";
import { Model, FrameViews } from "@com.mgmtp.a12.client/client-core";
import { LocalizerContext } from "@com.mgmtp.a12.utils/utils-localization-react";
import { Icon, List, PopUpMenu, HeaderTrigger, GlobalMessageBox } from "@com.mgmtp.a12.widgets/widgets-core";

import { MainMenu } from "../main-menu.js";

import { THEMES, THEME_KEY, LOCALE_KEY, useShowcaseContext } from "../context.js";

declare const __VERSION__: string;
const version = typeof __VERSION__ !== "undefined" ? __VERSION__ : "Unknown version";

export const ApplicationFrameLayout: React.FC<FrameViews.LayoutProps> = (props) => {
	const locales = useShowcaseContext((context) => context.locales);

	const settingItem: FrameViews.HeaderItemProps = {
		orientation: "rightSlots-left",
		item: (
			<PopUpMenu
				triggerElement={
					<HeaderTrigger>
						<Icon>info</Icon>
						<span>{version}</span>
						<Icon>arrow_drop_down</Icon>
					</HeaderTrigger>
				}>
				<List>
					<List.SubHeader fill>Locale</List.SubHeader>
					{locales.map((item) => (
						<LocaleItem locale={item} key={Locale.toString(item)} />
					))}
					<List.SubHeader fill>Theme</List.SubHeader>
					{Object.keys(THEMES).map((item) => (
						<ThemeItem key={item} theme={item} />
					))}
				</List>
			</PopUpMenu>
		)
	};

	const errors = useSelector(ModelSlice.selectErrors());
	const errorModels = React.useMemo(() => errors?.map((error) => error.name).join(", "), [errors]);

	React.useEffect(() => {
		if (errors) {
			// eslint-disable-next-line no-console
			console.error(errors);
		}
	}, [errors]);

	return (
		<FrameViews.ApplicationFrameLayout
			{...props}
			mainMenuComponent={MainMenu}
			additionalHeaderItems={[settingItem]}
			globalMessageBox={
				errors && <GlobalMessageBox variant="error" content={`Invalid models found: ${errorModels}.`} />
			}
		/>
	);
};

const LocaleItem: React.FC<{ locale: Locale }> = ({ locale }) => {
	const { locale: currentLocale } = React.useContext(LocalizerContext);
	const setLocale = useShowcaseContext((context) => context.setLocale);

	const isCurrentLocale = React.useMemo(() => {
		return Locale.toString(locale) === Locale.toString(currentLocale);
	}, [currentLocale, locale]);

	const onClick = React.useCallback(() => {
		setLocale(locale);
		localStorage.setItem(LOCALE_KEY, Locale.toString(locale));
	}, [locale, setLocale]);

	return (
		<List.Item
			text={Locale.toString(locale)}
			meta={isCurrentLocale ? <Icon>check</Icon> : undefined}
			onClick={onClick}
		/>
	);
};

const ThemeItem: React.FC<{
	theme: string;
}> = React.memo(({ theme }) => {
	const currentTheme = useShowcaseContext((context) => context.theme);
	const setTheme = useShowcaseContext((context) => context.setTheme);
	const handleClick = React.useCallback(() => {
		setTheme(theme);
		localStorage.setItem(THEME_KEY, theme);
	}, [setTheme, theme]);

	return (
		<List.Item text={theme} onClick={handleClick} meta={currentTheme === theme ? <Icon>check</Icon> : undefined} />
	);
});

interface ModelSlice {
	models: ModelSlice.ModelMap;
}

export namespace ModelSlice {
	export function isInstance(slice: unknown): slice is ModelSlice {
		if (typeof slice !== "object" || slice === null) {
			return false;
		}

		return "models" in slice && ModelMap.isInstance(slice.models);
	}

	export interface ModelMap {
		readonly [id: string]: Model.Error | unknown | undefined;
	}

	export namespace ModelMap {
		export function isInstance(map: unknown): map is ModelMap {
			return typeof map === "object";
		}
	}

	export const selectErrors = () => {
		return (state: object) => {
			if (!("models" in state) || !ModelSlice.isInstance(state.models)) {
				return undefined;
			}

			const modelMap = state.models.models;
			const result = Object.entries(modelMap)
				.filter(([, details]) => {
					return Model.Error.isInstance(details);
				})
				.map(([model, details]) => {
					if (!Model.Error.isInstance(details)) {
						throw new Error("Invalid model error, expect an error.");
					}

					return { name: model, message: details.message };
				});

			if (result.length === 0) {
				return undefined;
			}

			return result;
		};
	};
}

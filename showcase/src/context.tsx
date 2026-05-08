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
import { createContext, useContextSelector } from "use-context-selector";

import {
	defaultDataFormats,
	defaultLocalizerFactory,
	defaultValueConversion,
	Locale
} from "@com.mgmtp.a12.utils/utils-localization/lib/main/index.js";
import { LocalizerContext } from "@com.mgmtp.a12.utils/utils-localization-react/lib/main/index.js";
import {
	type Container,
	type DefaultThemeType,
	compactTheme,
	defaultTheme,
	flatTheme,
	flatCompactTheme
} from "@com.mgmtp.a12.widgets/widgets-core";

import { SHOWCASE_RESOURCES } from "./config/resources.js";

const LOCALES: Locale[] = [
	{ language: "en", country: "US" },
	{ language: "de", country: "DE" },
	{ language: "fr", country: "FR" }
];

const EN_LOCALE = "en_US";

export const THEMES: { [key: string]: DefaultThemeType } = {
	Default: defaultTheme,
	Compact: compactTheme,
	Flat: flatTheme,
	"Flat Compact": flatCompactTheme
};

export const LOCALE_KEY = "locale";
export const THEME_KEY = "theme";

namespace ShowcaseContext {
	export interface Type {
		locales: Locale[];
		setLocale(locale: Locale): void;
		theme: string;
		setTheme(theme: string): void;
		enableDnd: boolean;
		setEnableDnd(dndConfiguration: boolean): void;
	}
}

const ShowcaseContext = createContext<ShowcaseContext.Type>({
	locales: [],
	setLocale: () => {},
	theme: "Default",
	setTheme: () => {},
	enableDnd: true,
	setEnableDnd: () => {}
});
ShowcaseContext.displayName = "ShowcaseContext";

export const ShowcaseContextProvider: React.FC<Container> = ({ children }) => {
	const [locale, setLocale] = React.useState<Locale>(
		Locale.fromString(localStorage.getItem(LOCALE_KEY) ?? EN_LOCALE) as Locale
	);
	const storedTheme = localStorage.getItem(THEME_KEY) ?? Object.keys(THEMES)[0];
	const [theme, setTheme] = React.useState(
		Object.keys(THEMES).includes(storedTheme) ? storedTheme : Object.keys(THEMES)[0]
	);

	const localizerContextValue = React.useMemo(() => {
		const dataFormats = defaultDataFormats(locale);
		const conversion = defaultValueConversion(dataFormats);
		return {
			locale,
			dataFormats,
			conversion,
			localizer: defaultLocalizerFactory({
				locale,
				conversion,
				dataFormats,
				translationSource: SHOWCASE_RESOURCES
			})
		};
	}, [locale]);

	const [enableDnd, setEnableDnd] = React.useState<boolean>(true);

	const showcaseContextValue: ShowcaseContext.Type = React.useMemo(() => {
		return {
			locales: LOCALES,
			setLocale,
			theme,
			setTheme,
			enableDnd,
			setEnableDnd
		};
	}, [enableDnd, theme]);

	return (
		<ShowcaseContext.Provider value={showcaseContextValue}>
			<LocalizerContext.Provider value={localizerContextValue}>{children}</LocalizerContext.Provider>
		</ShowcaseContext.Provider>
	);
};

export function useShowcaseContext<T>(selector: (value: ShowcaseContext.Type) => T): T {
	return useContextSelector(ShowcaseContext, selector);
}

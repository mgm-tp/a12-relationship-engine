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
import { ThemeProvider, StyleSheetManager } from "styled-components";

import { addWrapper, type A12ApplicationConfig } from "@com.mgmtp.a12.client/client-core";
import { GlobalStyles, type Container, shouldForwardProp } from "@com.mgmtp.a12.widgets/widgets-core";

import { THEMES, useShowcaseContext, ShowcaseContextProvider } from "../../context.js";

export { THEMES, useShowcaseContext };

export const ThemeContextProvider: React.FC<Container> = ({ children }) => {
	const theme = useShowcaseContext((context) => context.theme);

	return (
		<StyleSheetManager shouldForwardProp={shouldForwardProp}>
			<ThemeProvider theme={THEMES[theme]}>
				<GlobalStyles />
				{children}
			</ThemeProvider>
		</StyleSheetManager>
	);
};

/**
 * Wraps the application with the ShowcaseContextProvider (outer) for theme state management
 */
export const withShowcaseContext = <T extends A12ApplicationConfig>(cfg: T) =>
	addWrapper<T>(ShowcaseContextProvider, "outer")(cfg);

/**
 * Wraps the application with the ThemeContextProvider for styled-components theming
 */
export const withTheme = <T extends A12ApplicationConfig>(cfg: T) => addWrapper<T>(ThemeContextProvider)(cfg);

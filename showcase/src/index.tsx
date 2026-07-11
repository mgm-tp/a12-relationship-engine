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

// These imports must stay at the top because they define globals
import "./config/dev.config.js";

import React from "react";
import { Provider } from "react-redux";
import * as ReactDOM from "react-dom/client";
import { ThemeProvider, StyleSheetManager } from "styled-components";

import "@com.mgmtp.a12.widgets/widgets-core/styles/basic.css";
import { loadDataServicesConfiguration } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { SizeContext, GlobalStyles, useWindowSize, shouldForwardProp } from "@com.mgmtp.a12.widgets/widgets-core";

import { Page } from "./page.js";
import { setup } from "./appsetup.js";
import { THEMES, useShowcaseContext, ShowcaseContextProvider } from "./context.js";

const { store, initialStoreActions } = setup();
loadDataServicesConfiguration(store);

const ResizablePage = () => {
	const { breakPoint } = useWindowSize();

	return (
		<SizeContext.Provider value={{ currentSize: breakPoint.size }}>
			<Page initialStoreActions={initialStoreActions} />
		</SizeContext.Provider>
	);
};

function StyledPage(): React.ReactNode {
	const theme = useShowcaseContext((context) => context.theme);

	return (
		<StyleSheetManager shouldForwardProp={shouldForwardProp}>
			<ThemeProvider theme={THEMES[theme]}>
				<GlobalStyles />
				<ResizablePage />
			</ThemeProvider>
		</StyleSheetManager>
	);
}

const mountPoint = document.createElement("div");
mountPoint.classList.add("base");
document.body.appendChild(mountPoint);

ReactDOM.createRoot(mountPoint).render(
	<Provider store={store}>
		<ShowcaseContextProvider>
			<StyledPage />
		</ShowcaseContextProvider>
	</Provider>
);

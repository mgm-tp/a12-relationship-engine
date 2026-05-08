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

import React, { useCallback, useContext, useEffect, useMemo } from "react";
import { DndProvider } from "react-dnd";
import { useDispatch, useSelector } from "react-redux";
import { type Dispatch } from "redux";
import { StyleSheetManager, ThemeProvider } from "styled-components";

import {
	ApplicationSelectors,
	FrameFactories,
	type FrameViews,
	NotificationViews,
	ViewViews
} from "@com.mgmtp.a12.client/client-core";
import { DirtyHandlingViews } from "@com.mgmtp.a12.client/client-core/dirtyHandling";
import { LocalizerContext } from "@com.mgmtp.a12.utils/utils-localization-react/lib/main/index.js";
import {
	A11YLanguageContext,
	type A11yDefinition,
	getA11yResource,
	DragAndDropUtils,
	defaultTheme,
	shouldForwardProp
} from "@com.mgmtp.a12.widgets/widgets-core";

import { createViewProvider } from "./containerFactory.js";
import { ApplicationFrameLayout } from "./views/application-frame-layout.js";

interface PageProps {
	initialStoreActions(dispatch: Dispatch): Promise<void>;
}

export function Page({ initialStoreActions }: PageProps): React.ReactNode {
	const { locale } = useContext(LocalizerContext);
	const busyState = useSelector(ApplicationSelectors.busy());

	const rootRegionRef = useMemo(() => [], []);
	const RegionUi = useMemo(() => FrameFactories.regionUiProvider(rootRegionRef), [rootRegionRef]);
	const progressComponentProvider = useMemo(() => FrameFactories.createProgressComponentProvider(), []);
	const viewProvider = useMemo(() => createViewProvider(), []);
	const a11yResource = useMemo<A11yDefinition>(() => {
		const SUPPORTED_LANGUAGES = ["en", "de"];
		return getA11yResource(SUPPORTED_LANGUAGES.includes(locale.language) ? locale.language : "en");
	}, [locale.language]);

	const dispatch = useDispatch();
	useEffect(() => {
		initialStoreActions(dispatch);
	}, [dispatch, initialStoreActions]);

	const layoutProvider: FrameViews.LayoutProvider = useCallback((name) => {
		if (name === "ApplicationFrame") {
			return {
				component: ApplicationFrameLayout
			};
		}
		return FrameFactories.layoutProvider(name);
	}, []);

	return (
		<DndProvider backend={DragAndDropUtils.DefaultDndBackend} options={DragAndDropUtils.DefaultDndBackendOptions}>
			<A11YLanguageContext.Provider value={a11yResource}>
				<StyleSheetManager shouldForwardProp={shouldForwardProp}>
					<ThemeProvider theme={defaultTheme}>
						<ViewViews.ProgressIndicator global progress={busyState ? "loading" : "none"}>
							<NotificationViews.Frame>
								<RegionUi
									regionReference={rootRegionRef}
									layoutProvider={layoutProvider}
									regionUiProvider={FrameFactories.regionUiProvider}
									viewProvider={viewProvider}
									progressComponentProvider={progressComponentProvider}
								/>
							</NotificationViews.Frame>
							<DirtyHandlingViews.VetoDialog />
						</ViewViews.ProgressIndicator>
					</ThemeProvider>
				</StyleSheetManager>
			</A11YLanguageContext.Provider>
		</DndProvider>
	);
}

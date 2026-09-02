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

import type { DynamicConfiguration } from "@com.mgmtp.a12.client/client-core";

import { MainMenuModule } from "./main-menu.js";

import type { ViewNGComponents } from "../viewNGComponents.js";

import { createOverviewModule } from "./overview/index.js";
import { ShowcaseConfigModule } from "./showcase-module.js";
import { createCRUDModule } from "./data_handling/crud/crud.js";
import { createFormModule } from "./relationships/form/index.js";
import { createSimpleCDMModule } from "./relationships/simpleCDM/index.js";
import { createStandaloneModule } from "./relationships/standalone/index.js";

/**
 * All {@link DynamicConfiguration}s of the showcase application. `ShowcaseConfigModule` contributes
 * the region tree, `MainMenuModule` the menu tree; the remaining modules contribute the flows that
 * render the scenes. The flows are parameterized by the view set so the legacy and composable
 * entries can render with their respective Relationship Engine architectures.
 */
export function createModules(views: ViewNGComponents): DynamicConfiguration[] {
	return [
		ShowcaseConfigModule,
		MainMenuModule,
		createOverviewModule(views),
		createFormModule(views),
		createStandaloneModule(views),
		createSimpleCDMModule(views),
		createCRUDModule(views)
	];
}

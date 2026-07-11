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

import { Autocomplete } from "@com.mgmtp.a12.widgets/widgets-core";
import { DefaultWidgetMap as OEDefaultWidgetMap } from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import type { WidgetMap } from "./widgetMap.js";
import type { ComponentMap } from "./componentMap.js";
import { Button as DefaultButton } from "./components/shared/Button.js";
import { OverviewEngine } from "./components/overviewEngine/OverviewEngine.js";
import { DualPane as DefaultDualPane } from "./components/dualPane/DualPane.js";
import { DropDown as DefaultDropDown } from "./components/dropdown/DropDown.js";
import { TableList as DefaultTableList } from "./components/tableList/TableList.js";

/**
 * @internal
 * Default component map with all built-in RE component implementations.
 */
export const DefaultComponentMap: ComponentMap = {
	DualPane: DefaultDualPane,
	TableList: DefaultTableList,
	DropDown: DefaultDropDown,
	OverviewEngine: OverviewEngine,
	Button: DefaultButton
};

/**
 * @internal
 * Default widget map that merges OE's defaults with RE-specific widgets.
 */
export const DefaultWidgetMap: WidgetMap = {
	...OEDefaultWidgetMap,
	Autocomplete
};

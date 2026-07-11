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

import type React from "react";

import type { Button as DefaultButton } from "./components/shared/Button.js";
import type { OverviewEngine } from "./components/overviewEngine/OverviewEngine.js";
import type { DualPane as DefaultDualPane } from "./components/dualPane/DualPane.js";
import type { DropDown as DefaultDropDown } from "./components/dropdown/DropDown.js";
import type { TableList as DefaultTableList } from "./components/tableList/TableList.js";

/**
 * Component map for Relationship Engine.
 * Allows replacing top-level RE components and the generic OverviewEngine wrapper.
 *
 * Usage: spread `DefaultComponentMap` and override specific entries.
 * @experimental
 */
export interface ComponentMap {
	/** The DualPane selection component. */
	readonly DualPane: React.ComponentType<DefaultDualPane.Props>;

	/** The TableList component. */
	readonly TableList: React.ComponentType<DefaultTableList.Props>;

	/** The Dropdown selection component. */
	readonly DropDown: React.ComponentType<DefaultDropDown.Props>;

	/**
	 * Generic OverviewEngine wrapper used inside DualPane and TableList.
	 * Props include `paneType` and UI model metadata so developers can
	 * identify which OE instance they are customizing.
	 */
	readonly OverviewEngine: React.ComponentType<OverviewEngine.Props>;

	/**
	 * Button renderer for a single `ButtonElement` from the UI model.
	 * Resolves localized text, icon, styles, and optional confirmation dialog.
	 * Override to customize button appearance or behavior across all RE components.
	 */
	readonly Button: React.ComponentType<DefaultButton.Props>;
}

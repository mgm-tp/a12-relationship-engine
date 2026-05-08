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

/** @internal */
export const DROP_DOWN_SELECTION = "DropDownSelection";

/** @internal */
export const DUAL_PANE_SELECTION = "DualPaneSelection";

/** @internal */
export const TABLE_LIST = "TableList";

/** @internal */
export const COMPONENT_NAMES = [DROP_DOWN_SELECTION, DUAL_PANE_SELECTION, TABLE_LIST] as const;

/** @internal */
export type ComponentName = (typeof COMPONENT_NAMES)[number];

/** @internal */
export namespace ComponentName {
	export function isInstance(value: unknown): value is ComponentName {
		return COMPONENT_NAMES.includes(value as ComponentName);
	}
}

/** @internal */
export const DEFAULT_PAGE_SIZE = 10;

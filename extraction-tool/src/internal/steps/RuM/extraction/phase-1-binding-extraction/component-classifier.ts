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

import type { ComponentKind } from "../types.js";
import type { ComponentConfiguration } from "../../../binding/binding-model.js";

/**
 * Thrown when `classifyComponent` cannot recognize any component type
 * from the given array of legacy component configurations.
 */
export class UnknownComponentTypeError extends Error {
	/**
	 * Creates an `UnknownComponentTypeError`.
	 *
	 * @param rawComponents - The original components array that could not be classified.
	 */
	constructor(readonly rawComponents: readonly ComponentConfiguration[]) {
		const names = rawComponents.map((c) => c.name).join(", ");
		super(`Unrecognized component type: ${names}`);
		this.name = "UnknownComponentTypeError";
	}
}

/**
 * Classifies an array of legacy component configurations into a `ComponentKind`
 * discriminated union.
 *
 * Auto-detection priority:
 * 1. `DropDownSelection` — first match wins (highest priority)
 * 2. `TableList` — if present, optionally with a nested `DualPaneSelection`
 * 3. `DualPaneSelection` — standalone dual pane
 * 4. Otherwise throws `UnknownComponentTypeError`
 *
 * @param components - Array of legacy component configurations.
 * @returns The classified `ComponentKind`.
 * @throws {UnknownComponentTypeError} If no known component type is found.
 */
export function classifyComponent(components: readonly ComponentConfiguration[]): ComponentKind {
	// Priority 1: DropDownSelection
	const dropDownComponent = components.find((c) => c.name === "DropDownSelection");

	if (dropDownComponent !== undefined) {
		return {
			kind: "DropDownSelection",
			component: dropDownComponent,
			candidatePageSize: dropDownComponent.candidatePageSize
		};
	}

	// Priority 2: TableList (with optional nested DualPaneSelection)
	const tableListComponent = components.find((c) => c.name === "TableList");

	if (tableListComponent !== undefined) {
		const dualPaneComponent = components.find((c) => c.name === "DualPaneSelection");

		return {
			kind: "TableList",
			component: tableListComponent,
			dualPaneComponent,
			linkPageSize: tableListComponent.linkPageSize
		};
	}

	// Priority 3: DualPaneSelection
	const dualPaneComponent = components.find((c) => c.name === "DualPaneSelection");

	if (dualPaneComponent !== undefined) {
		return {
			kind: "DualPaneSelection",
			component: dualPaneComponent,
			candidatePageSize: dualPaneComponent.candidatePageSize
		};
	}

	// No recognized component found
	throw new UnknownComponentTypeError([...components]);
}

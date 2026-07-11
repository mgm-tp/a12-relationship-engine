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

import { isBindingModel } from "../model-accessors/type-guards.js";

/**
 * Validates whether an unknown value is a valid UIConfigurationBinding
 * with all required fields present and components properly structured.
 *
 * Builds on the base `isBindingModel` type guard, adding per-component
 * validation that each entry has `name` and `models` fields.
 *
 * @param value - The raw value to validate (typically parsed from the
 *                `bindingConfiguration` annotation JSON).
 * @returns `true` if the value is a valid UIConfigurationBinding.
 */
export function isUiConfigurationBinding(value: unknown): boolean {
	if (!isBindingModel(value)) {
		return false;
	}

	const components: readonly unknown[] = value.details.components;

	for (const component of components) {
		if (!isValidComponentEntry(component)) {
			return false;
		}
	}

	return true;
}

function isValidComponentEntry(
	component: unknown
): component is { readonly name: string; readonly models: readonly unknown[] } {
	if (typeof component !== "object" || component === null) {
		return false;
	}

	if (!("name" in component) || typeof component.name !== "string" || component.name.length === 0) {
		return false;
	}

	if (!("models" in component) || !Array.isArray(component.models) || component.models.length === 0) {
		return false;
	}

	return true;
}

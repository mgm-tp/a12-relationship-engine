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
 * Utility helpers to serialize and deserialize relationship instance identifiers.
 *
 * Current convention (as used in initDataHolders): `${uiModelName}_${componentName}`.
 * We encapsulate it here to avoid scattering string concatenation logic so we can
 * evolve the format later (e.g. add versioning or change delimiter) in one place.
 * @internal
 */
export interface ParsedInstanceId {
	readonly uiModelName: string;
	readonly componentName: string;
}

const DELIMITER = "__"; // single source of truth for the delimiter

/**
 * Serializes UI model name and component name into an instance id string.
 * Performs minimal validation (no delimiter present in inputs) to keep parsing unambiguous.
 * @internal
 */
export function serializeInstanceId(uiModelName: string, componentName: string): string {
	if (uiModelName.includes(DELIMITER)) {
		throw new Error(`uiModelName must not contain '${DELIMITER}': ${uiModelName}`);
	}

	if (componentName.includes(DELIMITER)) {
		throw new Error(`componentName must not contain '${DELIMITER}': ${componentName}`);
	}

	return `${uiModelName}${DELIMITER}${componentName}`;
}

/**
 * Parses an instance id string back into its parts.
 * Returns undefined if the format doesn't match expected pattern.
 * @internal
 */
export function parseInstanceId(instanceId: string): ParsedInstanceId | undefined {
	const parts = instanceId.split(DELIMITER);

	if (parts.length !== 2 || parts[0].length === 0 || parts[1].length === 0) {
		return undefined;
	}

	return { uiModelName: parts[0], componentName: parts[1] };
}

/**
 * Type guard to check if a given instance id matches the expected pattern.
 * @internal
 */
export function isInstanceId(instanceId: string): boolean {
	return parseInstanceId(instanceId) !== undefined;
}

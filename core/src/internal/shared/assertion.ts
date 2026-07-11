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
 * @module shared
 * @internal
 */

/**
 * @internal
 * assertion function to produce compile-time errors
 *
 * this can be used e.g. in the default case of a switch-case to highlight the
 * appearance of a new enumeration value
 */
export function assertUnreachable(x: never, message?: string): never {
	throw new Error(message ?? "Unexpected value found: " + x);
}

/** @internal */
export function assertCondition(condition: boolean, message?: string): asserts condition {
	if (!condition) {
		throw new Error(message ?? "Generic assertion error - given condition is not met.");
	}
}

/** @internal */
export function assertNotNullish<T>(obj: T | null | undefined, message?: string): T {
	// eslint-disable-next-line eqeqeq
	assertCondition(obj != null, message);

	return obj;
}

/** @internal */
export function assertObject(reference: unknown, message?: string): asserts reference {
	if (reference === undefined || reference === null) {
		throw new Error(message ?? `Generic assertion error - given reference is '${reference}'.`);
	}
}

/** @internal */
export function assertObjectType<T>(
	reference: unknown,
	typeGuard: (x: unknown) => x is T,
	message = `Generic assertion error - given reference is '${reference}' does not fullfil type guard.`
): asserts reference is T {
	if (!typeGuard(reference)) {
		throw new Error(message);
	}
}

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
 * Shared type-narrowing utilities for extraction-use-case fixture helpers.
 *
 * These are intentionally minimal and throw early so fixture setup failures
 * are surfaced with clear messages rather than cryptic type errors.
 */

/** Narrows a value to a non-null Record; throws with a descriptive message if not. */
export function record(value: unknown): Record<string, unknown> {
	if (typeof value !== "object" || value === null) {
		throw new Error(`Expected value to be an object, got ${typeof value}`);
	}

	return value as Record<string, unknown>;
}

/** Returns the value as a Record if it is a non-null object, or undefined otherwise. */
export function optionalRecord(value: unknown): Record<string, unknown> | undefined {
	return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;
}

/** Type guard: true if and only if value is a non-null object. */
export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/** Returns overview content.rowActivation when present. */
export function getRowActivation(model: { readonly content?: unknown }): unknown {
	return isRecord(model.content) ? model.content.rowActivation : undefined;
}

/** Narrows value to a readonly array; throws with description if not an array. */
export function array(value: unknown, description: string): readonly unknown[] {
	if (!Array.isArray(value)) {
		throw new Error(`Expected ${description} to be an array, got ${typeof value}`);
	}

	return value;
}

/** Narrows value to a string; throws with description if not a string. */
export function string(value: unknown, description: string): string {
	if (typeof value !== "string") {
		throw new Error(`Expected ${description} to be a string, got ${typeof value}`);
	}

	return value;
}

/** Asserts exactly one element is present; throws with description if not. */
export function single<T>(values: readonly T[], description: string): T {
	if (values.length !== 1) {
		throw new Error(`Expected exactly one ${description}, found ${values.length}`);
	}

	return values[0];
}

/** Asserts value is defined; throws with description if undefined. */
export function must<T>(value: T | undefined, description: string): T {
	if (value === undefined) {
		throw new Error(`Expected ${description} to exist`);
	}

	return value;
}

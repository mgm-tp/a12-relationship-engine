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

import type { DecorationStep } from "./types.js";

/**
 * The required Phase 4 decoration sub-step order.
 */
export const DECORATION_STEP_ORDER: DecorationStep[] = [
	"pageSize",
	"rowActions",
	"rowActivation",
	"overviewLabels",
	"defaultLabels"
];

/**
 * The label ordering invariant is the critical constraint:
 * overviewLabels must run before defaultLabels.
 */
const LABEL_ORDER_INDEX: Record<string, number> = {
	overviewLabels: 0,
	defaultLabels: 1
};

/** Names of the label steps for error messages. */
const LABEL_STEP_NAMES: Record<string, string> = {
	overviewLabels: "overviewLabels (d)",
	defaultLabels: "defaultLabels (f)"
};

/**
 * Validates the ordering invariant between overviewLabels and defaultLabels.
 *
 * Explicit pane labels must be set before default fallback labels.
 * Other steps (pageSize, rowActions, rowActivation) are not subject to this check.
 *
 * @param steps - The ordered list of decoration steps to validate.
 * @returns true if the ordering invariant is satisfied.
 */
export function validateDecorationOrder(steps: DecorationStep[]): boolean {
	const relevantSteps = steps.filter((s) => s in LABEL_ORDER_INDEX);
	let lastIndex = -1;

	for (const step of relevantSteps) {
		const currentIndex = LABEL_ORDER_INDEX[step];

		if (currentIndex < lastIndex) {
			return false;
		}

		lastIndex = currentIndex;
	}

	return true;
}

/**
 * Enforces the ordering invariant by throwing if the sequence is invalid.
 *
 * @param steps - The ordered list of decoration steps to validate.
 * @throws Error if the label steps are out of order.
 */
export function enforceDecorationOrder(steps: DecorationStep[]): void {
	if (!validateDecorationOrder(steps)) {
		// Find the offending pair to produce a descriptive message
		const relevantSteps = steps.filter((s) => s in LABEL_ORDER_INDEX);
		let lastIndex = -1;
		let lastStep = "";

		for (const step of relevantSteps) {
			const currentIndex = LABEL_ORDER_INDEX[step];

			if (currentIndex < lastIndex) {
				throw new Error(
					`Decoration step ordering violation: ${LABEL_STEP_NAMES[step]} must not run before ${LABEL_STEP_NAMES[lastStep]}`
				);
			}

			lastIndex = currentIndex;
			lastStep = step;
		}
	}
}

/**
 * Returns the required decoration step order.
 *
 * Use this in the orchestrator to define the execution sequence.
 *
 * @returns The ordered list of decoration steps.
 */
export function getDecorationStepOrder(): DecorationStep[] {
	return DECORATION_STEP_ORDER;
}

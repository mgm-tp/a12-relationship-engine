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

import { queryHelpers, buildQueries, type Matcher, type MatcherOptions } from "@testing-library/react";

// Building custom queries based on data-role. See https://testing-library.com/docs/react-testing-library/setup#add-custom-queries
const queryAllByDataRole = (container: HTMLElement, id: Matcher, options?: MatcherOptions | undefined) =>
	queryHelpers.queryAllByAttribute("data-role", container, id, options);

const getMultipleError = (container: Element | null, dataRoleValue: string) =>
	`Found multiple elements with the data-role attribute of: ${dataRoleValue}`;
const getMissingError = (container: Element | null, dataRoleValue: string) =>
	`Unable to find an element with the data-role attribute of: ${dataRoleValue}`;

const [queryByDataRole, getAllByDataRole, getByDataRole, findAllByDataRole, findByDataRole] = buildQueries(
	queryAllByDataRole,
	getMultipleError,
	getMissingError
);

const getBySelector = (container: HTMLElement, selectors: string): HTMLElement => {
	const result = container.querySelector<HTMLElement>(selectors);

	if (!result) {
		throw queryHelpers.getElementError(`Unable to find an element by selectors: "${selectors}"`, container);
	}

	return result;
};

export * from "@testing-library/react";
export {
	queryAllByDataRole,
	queryByDataRole,
	getAllByDataRole,
	getByDataRole,
	findAllByDataRole,
	findByDataRole,
	getBySelector
};

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

import { addRequest } from "../index.js";

import { seederChance } from "./chance.js";

const BUNDLE_DOCUMENT_MODEL_NAME = "Bundle-document";

function generateBundle() {
	const chance = seederChance();
	const releaseDate = chance.date({ year: chance.integer({ min: 2005, max: 2024 }) }) as Date;

	return {
		Properties: {
			name: `${chance.word({ capitalize: true })} ${chance.pickone(["Bundle", "Pack", "Set", "Kit"])}`,
			price: chance.integer({ min: 50, max: 500 }),
			bundleDescription: chance.sentence({ words: 6 }),
			releaseDate: releaseDate.toISOString().substring(0, 10)
		}
	};
}

export function createBundles(size = 50) {
	return Array.from({ length: size }, (_, index) => addRequest(BUNDLE_DOCUMENT_MODEL_NAME, generateBundle(), index));
}

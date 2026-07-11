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

import assert from "node:assert";

import { test, describe } from "vitest";

import type { Multiplicity, RelationshipModel } from "@com.mgmtp.a12.dataservices/dataservices-access";

import { areMaxLinksAdded } from "../../../../../internal/relationship/ui/components/util.js";

describe("com.mgmtp.a12.relationshipengine-core.relationship-engine.areMaxLinksAdded", () => {
	interface TestCase {
		readonly description: string;
		readonly numberOfLinks: number;
		readonly targetMultiplicity: Multiplicity;
		readonly targetRole?: string;
		readonly expected: boolean;
	}

	const testCases: TestCase[] = [
		{
			description:
				"returns true when given a number of links, " +
				"a relationship model having the given target role " +
				"and number of links equals target multiplicity",
			numberOfLinks: 2,
			targetMultiplicity: { lowerLimit: 0, upperLimit: 2, unbounded: false },
			expected: true
		},
		{
			description:
				"returns true when given a number of links, " +
				"a relationship model having the given target role " +
				"and the number of links exceeds the target multiplicity",
			numberOfLinks: 3,
			targetMultiplicity: { lowerLimit: 0, upperLimit: 2, unbounded: false },
			expected: true
		},
		{
			description:
				"returns false when given a number of links, " +
				"a relationship model having the given target role " +
				"and number of links doesn't equal target multiplicity",
			numberOfLinks: 1,
			targetMultiplicity: { lowerLimit: 0, upperLimit: 2, unbounded: false },
			expected: false
		},
		{
			description: "returns false when given target multiplicity is unbounded",
			numberOfLinks: 1,
			targetMultiplicity: { lowerLimit: 0, unbounded: true },
			expected: false
		},
		{
			description: "returns false when the given relationship model has no entity for the given target role",
			numberOfLinks: 1,
			targetMultiplicity: { lowerLimit: 0, unbounded: true },
			targetRole: "non-existing-role",
			expected: false
		}
	];

	createTests(testCases);

	const defaultTargetRole = "target";

	function createTests(testCases: TestCase[]): void {
		for (const testCase of testCases) {
			test(testCase.description, () => {
				const relationshipModelMock = createRelationshipModelMock(defaultTargetRole, testCase.targetMultiplicity);
				const actual = areMaxLinksAdded(
					testCase.numberOfLinks,
					relationshipModelMock,
					testCase.targetRole ?? defaultTargetRole
				);
				assert.strictEqual(actual, testCase.expected);
			});
		}
	}

	function createRelationshipModelMock(targetRole: string, targetMultiplicity: Multiplicity): RelationshipModel {
		return {
			content: {
				entityCharacteristics: [{ role: targetRole, linkConstraints: { multiplicity: targetMultiplicity } }]
			}
		} as unknown as RelationshipModel;
	}
});

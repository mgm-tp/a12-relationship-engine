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

import { describe, test, expect } from "vitest";

import { ModelPath } from "@com.mgmtp.a12.base/base-model-api/lib/main/model/index.js";
import type { EngineStore } from "@com.mgmtp.a12.formengine/formengine-core";

import { isAttachmentStateEqual } from "../../../../internal/utils/are-state-props-equal.js";

interface TestCase {
	readonly condition: string;
	readonly oldState?: EngineStore.AttachmentState;
	readonly newState?: EngineStore.AttachmentState;
	readonly expected: boolean;
}

const testCases: TestCase[] = [
	{
		condition: "both states do not exist",
		expected: true
	},
	{
		condition: "only old state exists",
		oldState: {
			unassigned: ["a1"],
			thumbnails: { a1: "url1" },
			loading: ModelPath.fromString("/g1/f1")
		},
		expected: false
	},
	{
		condition: "only new state exists",
		newState: {
			unassigned: ["a1"],
			thumbnails: { a1: "url1" },
			loading: ModelPath.fromString("/g1/f1")
		},
		expected: false
	},
	{
		condition: "loading state is different",
		oldState: { loading: ModelPath.fromString("/g1/f1") },
		newState: { loading: ModelPath.fromString("/g2/f2") },
		expected: false
	},
	{
		condition: "unassigned ids are different",
		oldState: { unassigned: ["a1", "a2"] },
		newState: { unassigned: ["a3", "a4"] },
		expected: false
	},
	{
		condition: "thumbnails are different",
		oldState: { thumbnails: { a1: "url1" } },
		newState: { thumbnails: { a2: "url2" } },
		expected: false
	},
	{
		condition: "all properties are equal (compared by their values)",
		oldState: {
			loading: ModelPath.fromString("/g1/f1"),
			unassigned: ["a1", "a2"],
			thumbnails: { a1: "url1", a2: "url2" }
		},
		newState: {
			loading: ModelPath.fromString("/g1/f1"),
			unassigned: ["a1", "a2"],
			thumbnails: { a1: "url1", a2: "url2" }
		},
		expected: true
	}
];

describe("com.mgmtp.a12.client.lib.extensions.crud.internal", () => {
	describe("isAttachmentStateEqual", () => {
		testCases.forEach(({ condition, oldState, newState, expected }) => {
			test(`returns ${expected} when ${condition}`, () => {
				const actual = isAttachmentStateEqual(oldState, newState);
				expect(actual).equals(expected);
			});
		});
	});
});

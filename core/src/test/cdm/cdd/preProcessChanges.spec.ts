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

import {
	type Change,
	type Revert,
	DocumentPath,
	type GroupMoved,
	type ReadonlyObjectMap
} from "@com.mgmtp.a12.formengine/formengine-core";

import { preProcessChanges } from "../../../internal/cdm/cdd/redux/changeCdd/preProcessChanges.js";

describe("com.mgmtp.a12.client.extensions.cdm.cdd", () => {
	describe("preProcessChanges", () => {
		const testSpecs: TestSpec[] = [
			{
				description: "updates path of a single 'GroupAdded' change",
				inputChanges: createChangeMap([createChange("GroupAdded", "/root[1]/rep[0]")]),
				document: {
					root: {
						rep: [{ field: "foo" }]
					}
				},
				expectedChanges: [createChange("GroupAdded", "/root[1]/rep[1]")]
			},
			{
				description: "updates paths of multiple 'GroupAdded' changes with the same path",
				inputChanges: createChangeMap([
					createChange("GroupAdded", "/root[1]/rep[0]"),
					createChange("GroupAdded", "/root[1]/rep[0]")
				]),
				document: {
					root: {
						rep: [{ field: "foo" }, { field: "bar" }]
					}
				},
				expectedChanges: [createChange("GroupAdded", "/root[1]/rep[1]"), createChange("GroupAdded", "/root[1]/rep[2]")]
			},
			{
				description: "updates paths of multiple 'GroupAdded' changes with different paths",
				inputChanges: createChangeMap([
					createChange("GroupAdded", "/root[1]/repA[0]"),
					createChange("GroupAdded", "/root[1]/repB[0]")
				]),
				document: {
					root: {
						repA: [{ field: "foo" }, { field: "bar" }],
						repB: [{ field: "baz" }]
					}
				},
				expectedChanges: [
					createChange("GroupAdded", "/root[1]/repA[2]"),
					createChange("GroupAdded", "/root[1]/repB[1]")
				]
			},
			{
				description: "updates path of 'GroupAdded' change reported for copied row",
				inputChanges: createChangeMap([createChange("GroupAdded", "/root[1]/rep[1]")]),
				document: {
					root: {
						rep: [{ field: "foo" }, { field: "foo" }]
					}
				},
				expectedChanges: [createChange("GroupAdded", "/root[1]/rep[2]")]
			},
			{
				description: "sorts changes by path",
				inputChanges: createChangeMap([
					createChange("ValueChanged", "/c[1]/e[1]/b[1]"),
					createChange("ValueChanged", "/c[1]/d[1]/a[1]"),
					createChange("ValueChanged", "/c[1]/e[1]/a[1]"),
					createChange("ValueChanged", "/b[11]"),
					createChange("ValueChanged", "/a[1]/d[1]/a[1]"),
					createChange("ValueChanged", "/a[1]/b[1]/a[1]"),
					createChange("GroupRemoved", "/c[1]/d[1]"),
					createChange("GroupRemoved", "/c[1]"),
					createChange("ValueChanged", "/b[1]"),
					createChange("ValueChanged", "/b[2]"),
					createChange("ValueChanged", "/a[1]/d[1]"),
					createChange("ValueChanged", "/a[1]/b[1]")
				]),
				document: {},
				expectedChanges: [
					createChange("ValueChanged", "/b[1]"),
					createChange("ValueChanged", "/b[2]"),
					createChange("ValueChanged", "/b[11]"),
					createChange("GroupRemoved", "/c[1]"),
					createChange("ValueChanged", "/a[1]/b[1]"),
					createChange("ValueChanged", "/a[1]/d[1]"),
					createChange("GroupRemoved", "/c[1]/d[1]"),
					createChange("ValueChanged", "/a[1]/b[1]/a[1]"),
					createChange("ValueChanged", "/a[1]/d[1]/a[1]"),
					createChange("ValueChanged", "/c[1]/d[1]/a[1]"),
					createChange("ValueChanged", "/c[1]/e[1]/a[1]"),
					createChange("ValueChanged", "/c[1]/e[1]/b[1]")
				]
			},
			{
				description: "revert changes are sorted to the end",
				inputChanges: createChangeMap([
					createChange("ValueChanged", "/a[1]/d[1]/a[1]"),
					{ type: "Revert" },
					createChange("ValueChanged", "/b[2]"),
					createChange("ValueChanged", "/a[1]/d[1]")
				]),
				document: {},
				expectedChanges: [
					createChange("ValueChanged", "/b[2]"),
					createChange("ValueChanged", "/a[1]/d[1]"),
					createChange("ValueChanged", "/a[1]/d[1]/a[1]"),
					{ type: "Revert" }
				]
			}
		];

		for (const spec of testSpecs) {
			makeTest(spec);
		}
	});

	interface TestSpec {
		description: string;
		inputChanges: ReadonlyObjectMap<Change>;
		document: object;
		expectedChanges: Change[];
	}

	function makeTest(params: TestSpec): void {
		const { inputChanges, document, expectedChanges, description } = params;

		test(`${description}`, () => {
			const result = preProcessChanges(inputChanges, document);
			assert.deepStrictEqual(result, expectedChanges);
		});
	}

	/**
	 * For simplicity, "GroupMoved" and "Revert" changes cannot be created
	 */
	function createChange(
		type: Exclude<Change, GroupMoved | Revert>["type"],
		pathString: string
	): Exclude<Change, GroupMoved | Revert> {
		return {
			type,
			path: DocumentPath.fromString(pathString)
		};
	}

	function createChangeMap(changes: Change[]): ReadonlyObjectMap<Change> {
		return changes.reduce((acc, curr, index) => ({ ...acc, [index]: curr }), {});
	}
});

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

import { test, expect, describe } from "vitest";

import type { Change, ChangeLog } from "../../../../../internal/documentGraph/core/index.js";
import {
	trim,
	findMarker,
	clearMarker,
	newChangeLog
} from "../../../../../internal/documentGraph/core/changeLog/changeLogImpl.js";

/**
 * Tests for changelog marker operations. Uses an utility function makeLog to
 * generate test data.
 */
describe("com.mgmtp.a12.relationshipengine-core.extensions.documentGraph.changeLog", () => {
	describe("marker", () => {
		/** Test if a marker with a given ID is found correctly. */
		test("findMarker", () => {
			expect(findMarker(makeLog("x1", "m1", "x2", "m2", "x3"))?.id, "finds marker inside list").to.equal("m2");
			expect(findMarker(makeLog("x1", "m1", "x2", "m2"))?.id, "finds marker at end of list").to.equal("m2");
			expect(findMarker(makeLog("m1", "x1", "x2"))?.id, "finds marker at beginning of list").to.equal("m1");
			expect(findMarker(makeLog("m1"))?.id, "finds marker as only element").to.equal("m1");
			expect(findMarker(makeLog())?.id, "returns undefined for empty list").to.equal(undefined);
			expect(findMarker(makeLog("x1", "x2", "x3"))?.id, "returns undefined absent marker").to.equal(undefined);
		});

		/** Test if the last marker is removed correctly. */
		test("clearMarker", () => {
			expect(clearMarker(makeLog("x1", "m1", "x2", "m2", "x3")).changes, "clear marker inside list").to.deep.equal(
				makeLog("x1", "m1", "x2", "x3").changes
			);

			expect(clearMarker(makeLog("x1", "m1", "x2", "m2")).changes, "clear marker at end of list").to.deep.equal(
				makeLog("x1", "m1", "x2").changes
			);

			expect(clearMarker(makeLog("m1", "x1", "x2")).changes, "clear marker at beginning of list").to.deep.equal(
				makeLog("x1", "x2").changes
			);

			expect(clearMarker(makeLog("m1")).changes, "finds marker as only element").to.deep.equal(makeLog().changes);

			const logWithoutMarker = makeLog("x1");
			expect(clearMarker(logWithoutMarker).changes, "unchanged if given an absent marker").to.equal(
				logWithoutMarker.changes
			);

			const emptyLog = makeLog();
			expect(clearMarker(emptyLog).changes, "unchanged if given an empty log").to.equal(emptyLog.changes);
		});

		/** Test if log is trimmed correctly. */
		test("trim", () => {
			expect(trim(makeLog("x1", "m1", "x2", "m2", "x3")).changes, "trim marker inside list").to.deep.equal(
				makeLog("x1", "m1", "x2").changes
			);

			expect(trim(makeLog("x1", "m1", "x2", "m2")).changes, "trim marker at end of list").to.deep.equal(
				makeLog("x1", "m1", "x2").changes
			);

			expect(trim(makeLog("m1", "x1", "x2")).changes, "trim marker beginning of list").to.deep.equal(makeLog().changes);

			expect(trim(makeLog("m1")).changes, "trim marker as only element").to.deep.equal(makeLog().changes);

			const logWithoutMarker = makeLog("x1");
			expect(trim(logWithoutMarker).changes, "unchanged if given an absent marker").to.equal(logWithoutMarker.changes);

			const emptyLog = makeLog();
			expect(trim(emptyLog).changes, "unchanged if given an empty log").to.equal(emptyLog.changes);

			expect(trim(makeLog("x1", "m1")).changeCounter, "trim should increase the changeCounter by one").to.equal(1);
		});
	});
});

/**
 * Utility function to generate a test changelog with pre-filled changes.
 *
 * The changes are generated from a given list of strings.
 *
 * If a string s starts with "m", a marker is generated with s as id.
 *
 * Otherwise, a docChanged is generated as a generic placeholder for "any other
 * change". The docChanged is not used in the tests.
 *
 * Note: The change counter is not set because it is not used in the tests.
 */
function makeLog(...entries: string[]): ChangeLog<string> {
	const cl = newChangeLog<string>();

	for (const entry of entries) {
		const change: Change<string> =
			entry[0] === "m" ? { kind: "marker", id: entry, snapshot: entry } : { kind: "docChanged", docRef: entry };
		cl.changes.push(change);
	}

	return cl;
}

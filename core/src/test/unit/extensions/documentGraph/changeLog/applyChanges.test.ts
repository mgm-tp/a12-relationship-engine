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

import type { Change, DocumentGraph } from "../../../../../internal/documentGraph/core/index.js";
import { applyChanges, newChangeLog } from "../../../../../internal/documentGraph/core/changeLog/changeLogImpl.js";

describe("com.mgmtp.a12.relationshipengine-core.extensions.documentGraph.changeLog", () => {
	describe("applyChanges", () => {
		test("appends the given changes to the change log", () => {
			const changeLog = newChangeLog();

			const testChanges: Change<DocumentGraph>[] = [
				{
					docRef: "abc",
					kind: "docChanged"
				},
				{
					docRef: "def",
					kind: "docAdded"
				}
			];

			const updatedChangeLog = applyChanges(changeLog, testChanges);

			expect(updatedChangeLog.changeCounter, "change counter is 2 after applying changes once").to.be.equal(2);

			expect(updatedChangeLog.changes, "changes are added in the same order as passed to applyChanges").to.deep.equal(
				testChanges
			);
		});

		test("returns the same change log if no changes were passed", () => {
			const changeLog = newChangeLog();

			const testChanges: Change<DocumentGraph>[] = [];

			const updatedChangeLog = applyChanges(changeLog, testChanges);

			expect(updatedChangeLog.changeCounter, "change counter is 0 after applying no changes").to.be.equal(0);

			expect(updatedChangeLog.changes, "no changes were added").to.deep.equal([]);
		});

		test("collapses subsequent docAdded changes but still increases the change counter", () => {
			const logAfter1stChange = applyChanges(newChangeLog(), [
				{
					docRef: "abc",
					kind: "docChanged"
				}
			]);

			expect(logAfter1stChange.changeCounter).to.be.equal(1);
			expect(logAfter1stChange.changes.length).to.be.equal(1);

			const logAfter2ndChange = applyChanges(logAfter1stChange, [
				{
					docRef: "abc",
					kind: "docChanged"
				}
			]);

			expect(logAfter2ndChange.changeCounter, "the change counter is 2 after applying changes twice").to.be.equal(2);

			expect(
				logAfter2ndChange.changes.length,
				"there is only 1 change in the log after collapsing identical changes"
			).to.be.equal(1);

			expect(logAfter1stChange.changes[0], "the change in the log was not modified due to collapsing").to.be.deep.equal(
				logAfter2ndChange.changes[0]
			);
		});
	});
});

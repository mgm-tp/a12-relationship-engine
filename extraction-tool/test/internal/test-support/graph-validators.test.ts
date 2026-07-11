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

import { it, expect, describe } from "vitest";

import { buildModelIndex } from "./model-index.js";
import type { IndexedModel } from "./model-index.js";
import { assertReachability, assertDeletionSafety } from "./graph-validators.js";

function createModel(
	id: string,
	modelType: string,
	references: readonly string[] = [],
	contentReferences: readonly string[] = []
): IndexedModel {
	return {
		header: {
			id,
			modelType,
			modelReferences: references.map((reference) => ({
				purpose: "test-reference",
				modelType: "query",
				reference
			}))
		},
		content: {
			component: {
				queryModel: contentReferences[0]
			},
			links: contentReferences.slice(1).map((reference) => ({ reference }))
		},
		path: `${id}.json`
	};
}

describe("graph-validators", () => {
	it("passes when a generated artifact has an inbound reference", () => {
		const index = buildModelIndex([
			createModel("overview-a", "overview", ["query-a"]),
			createModel("query-a", "query")
		]);

		expect(() => assertReachability(index, ["query-a"])).not.toThrow();
	});

	it("fails when a generated artifact has no inbound reference", () => {
		const index = buildModelIndex([createModel("query-a", "query")]);

		expect(() => assertReachability(index, ["query-a"])).toThrow(
			"reachability invariant broken: generated artifact(s) have no inbound reference: query-a"
		);
	});

	it("passes when an orphan generated artifact is allowlisted", () => {
		const index = buildModelIndex([createModel("query-a", "query")]);

		expect(() => assertReachability(index, ["query-a"], ["query-a"])).not.toThrow();
	});

	it("fails when a surviving model references a deleted id", () => {
		const index = buildModelIndex([
			createModel("overview-a", "overview", [], ["deleted-document"]),
			createModel("deleted-document", "document")
		]);

		expect(() => assertDeletionSafety(index, ["deleted-document"])).toThrow(
			"deletion-safety invariant broken: surviving model(s) still reference deleted id(s): overview-a -> deleted-document"
		);
	});

	it("passes when a deleted id has no surviving inbound references", () => {
		const index = buildModelIndex([createModel("overview-a", "overview"), createModel("deleted-document", "document")]);

		expect(() => assertDeletionSafety(index, ["deleted-document"])).not.toThrow();
	});
});

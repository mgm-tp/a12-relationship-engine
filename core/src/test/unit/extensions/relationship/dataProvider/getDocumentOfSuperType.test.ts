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

import { type ModelGraph } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { type DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";

import { getDocumentModelOfSuperType } from "../../../../../internal/relationship/platform/getDocumentModelOfSuperType.js";

const modelGraph: ModelGraph = {
	documentModels: [
		{
			modelId: "Great-Grandparent",
			subTypes: ["Grandparent"],
			relations: []
		},
		{
			modelId: "Grandparent",
			subTypes: ["Parent"],
			relations: []
		},
		{
			modelId: "Parent",
			subTypes: ["Child"],
			relations: []
		},
		{
			modelId: "Child",
			subTypes: [],
			relations: []
		},
		{
			modelId: "Orphan",
			subTypes: [],
			relations: []
		}
	],
	composeDocumentModels: [],
	relationshipModels: []
};

describe("com.mgmtp.a12.client.lib.extensions.relationship.dataProvider", () => {
	describe("getDocumentModelOfSuperType", () => {
		test("returns undefined if given model has no super types", () => {
			const modelProvider = (id: string) => ({ header: { id } }) as DocumentModel;

			const result = getDocumentModelOfSuperType(modelProvider, modelGraph, "Orphan");
			expect(result?.header.id).to.equal(undefined);
		});

		describe("when the given model has a super type model", () => {
			test("that can provided, returns it", () => {
				const modelProvider = (id: string) => ({ header: { id } }) as DocumentModel;

				const result = getDocumentModelOfSuperType(modelProvider, modelGraph, "Child");
				expect(result?.header.id).to.equal("Parent");
			});

			describe("that can not be provided", () => {
				test("returns the closest providable super type", () => {
					const modelProvider = (id: string) =>
						id === "Great-Grandparent" ? ({ header: { id } } as DocumentModel) : undefined;

					const result = getDocumentModelOfSuperType(modelProvider, modelGraph, "Child");
					expect(result?.header.id).to.equal("Great-Grandparent");
				});

				test("returns undefined if no providable super type exists in the graph", () => {
					const modelProvider = () => undefined;

					const result = getDocumentModelOfSuperType(modelProvider, modelGraph, "Child");
					expect(result?.header.id).to.equal(undefined);
				});
			});
		});
	});
});

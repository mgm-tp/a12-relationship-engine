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

import { findDocumentModelType } from "../../../../internal/utils/use-document-model-type.js";

describe("com.mgmtp.a12.client.lib.extensions.crud.internal", () => {
	describe("findDocumentModelType", () => {
		describe("given an empty modelgraph", () => {
			test("returns just the reference as a dmType", () => {
				const EMPTY_MODEL_GRAPH: ModelGraph = {
					composeDocumentModels: [],
					documentModels: [],
					genericModels: [],
					relationshipModels: []
				};

				const dmType = findDocumentModelType("DM1", EMPTY_MODEL_GRAPH);

				expect(dmType).deep.equals({
					modelId: "DM1",
					relations: null,
					subTypes: null
				});
			});
		});

		describe("given a complete modelgraph", () => {
			const mockModelGraph: ModelGraph = {
				composeDocumentModels: [
					{
						modelId: "CDM1",
						displayLabels: [],
						rootDocumentModelId: "D1"
					}
				],
				documentModels: [
					{
						modelId: "D1",
						relations: ["relationD1"],
						subTypes: []
					},
					{
						modelId: "D2",
						relations: ["relationD2"],
						subTypes: []
					}
				],
				genericModels: [],
				relationshipModels: []
			};

			describe("Given models in store and their scopes match with the given activity", () => {
				describe("and a reference to a DM", () => {
					test("returns its matching dmType if it exists", () => {
						const dmType = findDocumentModelType("D2", mockModelGraph);

						expect(dmType).deep.equals({
							modelId: "D2",
							relations: ["relationD2"],
							subTypes: []
						});
					});

					test("returns just the reference as a dmType otherwise", () => {
						const dmType = findDocumentModelType("notInGraphDM", mockModelGraph);

						expect(dmType).deep.equals({
							modelId: "notInGraphDM",
							relations: null,
							subTypes: null
						});
					});
				});

				describe("and a reference to a CDM", () => {
					test("returns its root document model when both are found", () => {
						const dmType = findDocumentModelType("CDM1", mockModelGraph);

						expect(dmType).deep.equals({
							modelId: "D1",
							relations: ["relationD1"],
							subTypes: []
						});
					});

					test("returns just the reference as a dmType otherwise", () => {
						const dmType = findDocumentModelType("notInGraphCDM", mockModelGraph);

						expect(dmType).deep.equals({
							modelId: "notInGraphCDM",
							relations: null,
							subTypes: null
						});
					});
				});
			});
		});
	});
});

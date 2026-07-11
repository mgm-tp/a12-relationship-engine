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

import { flatten } from "../../../../internal/cdm/commons/utils.js";
import cdm from "../../testData/ContractCDM.json" with { type: "json" };
import { cdmToGraph } from "../../../../internal/cdm/dataProvider/smg/cdmToGraph.js";
import { deserializeDocumentModel } from "../../../../internal/cdm/commons/modelUtils.js";

describe("com.mgmtp.a12.relationshipengine-core.extensions.cdm.data-provider", () => {
	const dm = deserializeDocumentModel(cdm);

	describe(`cdmToGraph`, () => {
		const cdmGraph = cdmToGraph(dm, "");

		test("CDM_Graph should have root with name 'Contract-document'", () => {
			const rootModelName = cdmGraph.root.name;
			expect(rootModelName).to.equal("Contract-document");
		});

		test("Graph contains all relationships", () => {
			const relationshipMap = cdmGraph.relationships;
			const relationships = flatten(relationshipMap);
			expect(relationships).to.have.length(4);
		});
	});

	describe(`graphForSubCDM`, () => {
		const cdmGraph = cdmToGraph(dm, "/PolicyHolder");

		test("CDM_Graph should have root with name 'BusinessPartner'", () => {
			const rootModelName = cdmGraph.root.name;
			expect(rootModelName).to.equal("BusinessPartner-document");
		});

		test("Graph contains all relationships", () => {
			const relationshipMap = cdmGraph.relationships;
			const relationships = flatten(relationshipMap);
			expect(relationships).to.have.length(2);
		});
	});
});

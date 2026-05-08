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

import { fromCdd } from "../../../internal/cdm/cdd/core/adapter/fromCdd.js";
import { deserializeDocumentModel } from "../../../internal/cdm/commons/modelUtils.js";

import contractCDM from "../testData/ContractCDM.json" with { type: "json" };

import Contract24Cdd from "./Contract24Cdd.json" with { type: "json" };

describe("com.mgmtp.a12.relationshipengine-core.extensions.cdm.cdd", () => {
	describe("fromCdd", () => {
		test("returns the docRefs and linkDescriptors of all documents and links in the cdd", () => {
			const cdm = deserializeDocumentModel(contractCDM);

			const cddReferences = fromCdd({
				cdm,
				pendingUsages: [],
				rootDocRef: "Contract-document/24",
				cachedCdd: {
					cdd: Contract24Cdd,
					snapshotChangeCounter: 0
				}
			});

			expect(cddReferences).not.to.be.equal(undefined);

			expect(cddReferences.docRefs).to.include.members([
				"Contract-document/24",
				"BusinessPartner-document/21",
				"Address-document/13",
				"Address-document/14",
				"BusinessPartner-document/22",
				"Address-document/19",
				"BusinessPartner-document/23",
				"Address-document/20"
			]);

			expect(cddReferences.linkIds).to.include.members(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
		});
	});
});

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

import { toCdd } from "../../../internal/cdm/cdd/core/adapter/toCdd.js";
import { reduceCddState } from "../../../internal/cdm/cdd/core/impl/cddStateImpl.js";
import { deserializeDocumentModel } from "../../../internal/cdm/commons/modelUtils.js";
import { type DocumentGraph } from "../../../internal/documentGraph/core/index.js";
import dg from "../../mocks/scdm/loadDG/dg.json" with { type: "json" };

import contractCDM from "../testData/ContractCDM.json" with { type: "json" };

describe("com.mgmtp.a12.relationshipengine-core.extensions.cdm.cdd", () => {
	describe("reduceCddState", () => {
		const cdm = deserializeDocumentModel(contractCDM);
		const partialCddState = {
			rootDocRef: "Contract-document/24",
			cdm,
			pendingUsages: []
		};
		test("returns new cdd state with added cachedCdd and change counter if previous cdd state is undefined", () => {
			const newCddState = reduceCddState(dg as DocumentGraph, 3, undefined, partialCddState);

			const expectedCdd = toCdd(
				dg as DocumentGraph,
				partialCddState.rootDocRef,
				partialCddState.cdm.content?.modelRoot
			);

			expect(newCddState).to.be.deep.equal({
				...partialCddState,
				cachedCdd: {
					cdd: expectedCdd,
					snapshotChangeCounter: 3
				}
			});
		});

		test("returns new cdd state with updated cachedCdd and change counter if updated cdd state is undefined", () => {
			const previousCddState = {
				...partialCddState,
				cachedCdd: {
					cdd: {},
					snapshotChangeCounter: 1
				}
			};

			const newCddState = reduceCddState(dg as DocumentGraph, 3, previousCddState, undefined);

			const expectedCdd = toCdd(
				dg as DocumentGraph,
				previousCddState.rootDocRef,
				previousCddState.cdm.content?.modelRoot
			);

			expect(newCddState).to.be.deep.equal({
				...previousCddState,
				cachedCdd: {
					cdd: expectedCdd,
					snapshotChangeCounter: 3
				}
			});
		});

		test("returns previous cdd state if its change counter is equal to the new change counter", () => {
			const newChangeCounter = 7;
			const previousCddState = {
				...partialCddState,
				cachedCdd: {
					cdd: {},
					snapshotChangeCounter: newChangeCounter
				}
			};

			const newCddState = reduceCddState(dg as DocumentGraph, newChangeCounter, previousCddState, undefined);

			expect(newCddState).to.be.deep.equal(previousCddState);
		});
	});
});

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

import type { DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import { type Model, NEW_INSTANCE_IDENTIFIER } from "@com.mgmtp.a12.client/client-core";

import { createTestModels } from "../../../mocks/ModelsUtil.js";
import { toCdd } from "../../../../internal/cdm/cdd/core/adapter/toCdd.js";
import type { CddState } from "../../../../internal/cdm/cdd/core/cddState.js";
import { type CdmData, createEmptyCdmData } from "../../../../internal/cdm/cddUtils/cdmData.js";
import type { DgChangeLog, DeepReadonly, DocumentGraph } from "../../../../internal/documentGraph/core/index.js";

describe("com.mgmtp.a12.client.extensions.cdm.cdd", () => {
	describe("cddUtils.createInitialCdmData", () => {
		test("creates the initial cdmData structure", () => {
			const testModelDescriptors: Model.Descriptor[] = [
				{
					name: "ContractCDM",
					modelType: "document"
				}
			];
			const testModels = createTestModels(testModelDescriptors);

			const cdm = testModels[0] as DocumentModel;
			const documentGraph: DeepReadonly<DocumentGraph> = {
				documents: {
					byDocRef: {
						"cddDocument/0": {
							docRef: "cddDocument/0",
							document: {},
							documentModelName: "ContractCDM",
							loadingState: "loaded"
						},
						__NEW__: {
							docRef: "__NEW__",
							document: {},
							documentModelName: "Contract-document",
							loadingState: "loaded"
						}
					}
				},
				links: {
					byId: {},
					linkIdsByDocId: {}
				}
			};
			const changeLog: DgChangeLog = {
				changeCounter: 1,
				changes: [
					{
						docRef: "__NEW__",
						kind: "docAdded"
					}
				]
			};
			const cddState: CddState = {
				cdm,
				pendingUsages: [],
				rootDocRef: NEW_INSTANCE_IDENTIFIER,
				preProcessed: false,
				cachedCdd: {
					cdd: toCdd(documentGraph, NEW_INSTANCE_IDENTIFIER, cdm.content.modelRoot)
				},
				selectedLinkId: undefined
			};
			const expected: CdmData = {
				documentGraph,
				changeLog,
				cddState
			};

			assert.deepStrictEqual(createEmptyCdmData(cdm, "Contract-document", NEW_INSTANCE_IDENTIFIER), expected);
		});
	});
});

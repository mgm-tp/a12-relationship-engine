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

import { ModelPath } from "@com.mgmtp.a12.base/base-model-api/lib/main/model/index.js";

import { relshPathToModelPath } from "../../../internal/cdm/cdd/core/index.js";
import { deserializeDocumentModel } from "../../../internal/cdm/commons/modelUtils.js";

import contractCDM from "../testData/ContractCDM.json" with { type: "json" };

import TestModel from "./TestModel.json" with { type: "json" };

describe("com.mgmtp.a12.client.extensions.cdm", () => {
	describe("relshPathToModelPath", () => {
		describe("ContractCDM", () => {
			const modelRoot = deserializeDocumentModel(contractCDM).content.modelRoot;
			test("root", () => {
				const modelPath = relshPathToModelPath(modelRoot, "/");
				expect(modelPath).to.be.deep.eq([]);
			});
			test("top level relsh", () => {
				const modelPath = relshPathToModelPath(modelRoot, "/CoInsurer");
				expect(modelPath).to.be.deep.eq(ModelPath.fromString("CoInsurer"));
			});
			test("nested relsh", () => {
				const modelPath = relshPathToModelPath(modelRoot, "/CoInsurer/Location");
				expect(modelPath).to.be.deep.eq(ModelPath.fromString("CoInsurer/Location"));
			});
			test("non-existing, nested", () => {
				const modelPath = relshPathToModelPath(modelRoot, "/CoInsurer/XXX");
				expect(modelPath).to.be.deep.eq(undefined);
			});
			test("relshPath not starting with '/'", () => {
				const modelPath = relshPathToModelPath(modelRoot, "CoInsurer");
				expect(modelPath).to.be.deep.eq(ModelPath.fromString("CoInsurer"));
			});
			test("relshPath is empty", () => {
				const modelPath = relshPathToModelPath(modelRoot, "");
				expect(modelPath).to.be.deep.eq([]);
			});
		});

		describe("TestModel", () => {
			const modelRoot = deserializeDocumentModel(TestModel).content.modelRoot;
			test("top level relsh", () => {
				const modelPath = relshPathToModelPath(modelRoot, "/RelshTopLevelGroup_Relsh");
				expect(modelPath).to.be.deep.eq(ModelPath.fromString("RelshTopLevelGroup"));
			});
			test("nested relsh", () => {
				const modelPath = relshPathToModelPath(modelRoot, "/RelshTopLevelGroup_Relsh/RelshNestedGroup_Relsh");
				expect(modelPath).to.be.deep.eq(ModelPath.fromString("/RelshTopLevelGroup/RelshNestedGroup"));
			});
			test("mixed", () => {
				const modelPath = relshPathToModelPath(modelRoot, "/RelshNestedGroup_Relsh/RelshNestedGroup_Relsh");
				expect(modelPath).to.be.deep.eq(
					ModelPath.fromString(
						"/MixedTopLevelGroup/RegularNestedGroup/RelshNestedGroup/RegularNestedGroup/RelshNestedGroup"
					)
				);
			});
			test("non-existing, top level", () => {
				const modelPath = relshPathToModelPath(modelRoot, "/XXX");
				expect(modelPath).to.be.deep.eq(undefined);
			});
		});
	});
});

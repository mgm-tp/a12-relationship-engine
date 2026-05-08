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

import { describe, test, expect, beforeAll } from "vitest";

import {
	type DocumentModel,
	type EntityInstancePath,
	type GroupInstance
} from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";

import {
	collectRelshPathsForRelsh,
	getDocRefByCddPath,
	getDocRefTopDown,
	getSourceDocRefFromTargetDocPath
} from "../../../internal/cdm/cdd/core/index.js";
import { toCdd } from "../../../internal/cdm/cdd/core/adapter/toCdd.js";
import { type DeepReadonly, type DocumentGraph } from "../../../internal/documentGraph/core/index.js";
import { removeLink } from "../../../internal/documentGraph/core/impl/links.js";
import { readDocumentAndValidationModel } from "../../mocks/ModelsUtil.js";
import documentGraph from "../../mocks/scdm/loadDG/dg.json" with { type: "json" };

import policeHolderLinkRef from "./PoliceHolderLinkRef.json" with { type: "json" };
import policeHolderPostAddressLinkRef from "./PolicyHolderPostAddressLinkRef.json" with { type: "json" };

describe("com.mgmtp.a12.relationshipengine-core.extensions.cdm.cdd", () => {
	const nonRepeatIdx = 1;
	let contractCDM: DocumentModel;
	let dg: DeepReadonly<DocumentGraph>;
	let modelRoot: DocumentModel.Group;
	let cdd: GroupInstance;
	const rootDocRef = "Contract-document/24";

	beforeAll(() => {
		const { generatedCodeAccessor: _, ...model } = readDocumentAndValidationModel("ContractCDM");
		contractCDM = model;

		dg = documentGraph as DeepReadonly<DocumentGraph>;
		modelRoot = contractCDM.content.modelRoot;
		cdd = toCdd(dg, rootDocRef, modelRoot) as GroupInstance;
	});

	describe("getDocRefByCddPath", () => {
		test("Path to field in 1-relationship", () => {
			const path = [
				{ elementName: "PolicyHolder", index: nonRepeatIdx },
				{ elementName: "businessPartner", index: nonRepeatIdx },
				{ elementName: "id", index: nonRepeatIdx }
			];
			const docRef = getDocRefByCddPath(path, cdd, contractCDM);
			expect(docRef).to.be.eq("BusinessPartner-document/21");
		});
		test("Path to field in N-relationship", () => {
			const path = [
				{ elementName: "CoInsurer", index: 1 },
				{ elementName: "PostAddress", index: nonRepeatIdx },
				{ elementName: "address", index: nonRepeatIdx },
				{ elementName: "street", index: nonRepeatIdx }
			];
			const docRef = getDocRefByCddPath(path, cdd, contractCDM);
			expect(docRef).to.be.eq("Address/19");
		});

		test("Path to N-relationship", () => {
			const path = [{ elementName: "CoInsurer", index: 1 }];
			const docRef = getDocRefByCddPath(path, cdd, contractCDM);
			expect(docRef).to.be.eq("BusinessPartner-document/22");
		});
		test("Path to nested N-relationship", () => {
			const path = [
				{ elementName: "CoInsurer", index: 1 },
				{ elementName: "Location", index: 1 }
			];
			const docRef = getDocRefByCddPath(path, cdd, contractCDM);
			expect(docRef).to.be.eq("Address/19");
		});
	});

	describe("getDocRefTopDown", () => {
		test("Wiki Testcase #1.1a", () => {
			const path: EntityInstancePath = [];
			const relshName = "PolicyHolder";

			const docRef = getDocRefTopDown(path, relshName, cdd, contractCDM);
			expect(docRef).to.be.eq("Contract-document/24");
		});
		test("Wiki Testcase #1.1a without target", () => {
			const path: EntityInstancePath = [];
			const relshName = "PolicyHolder";

			const [dgWithoutTarget] = removeLink(policeHolderLinkRef, dg);
			const cddWithoutTarget = toCdd(dgWithoutTarget, rootDocRef, modelRoot) as GroupInstance;
			const docRef = getDocRefTopDown(path, relshName, cddWithoutTarget, contractCDM);
			expect(docRef).to.be.eq("Contract-document/24");
		});
		test("Wiki Testcase #1.1b", () => {
			const path: EntityInstancePath = [{ elementName: "PolicyHolder", index: nonRepeatIdx }];
			const relshName = "PostAddress";

			const docRef = getDocRefTopDown(path, relshName, cdd, contractCDM);
			expect(docRef).to.be.eq("BusinessPartner-document/21");
		});
		test("Wiki Testcase #1.1b without target", () => {
			const path: EntityInstancePath = [{ elementName: "PolicyHolder", index: nonRepeatIdx }];
			const relshName = "PostAddress";

			const [dgWithoutTarget] = removeLink(policeHolderPostAddressLinkRef, dg);
			const cddWithoutTarget = toCdd(dgWithoutTarget, rootDocRef, modelRoot) as GroupInstance;
			const docRef = getDocRefTopDown(path, relshName, cddWithoutTarget, contractCDM);
			expect(docRef).to.be.eq("BusinessPartner-document/21");
		});

		test("Wiki Testcase #1.2", () => {
			const path = [{ elementName: "CoInsurer", index: 2 }];
			const relshName = "PostAddress";

			const docRef = getDocRefTopDown(path, relshName, cdd, contractCDM);
			expect(docRef).to.be.eq("BusinessPartner-document/23");
		});

		test("Failure Case", () => {
			const path = [{ elementName: "CoInsurer", index: 2 }];
			const relshName = "XXXX";

			const docRef = getDocRefTopDown(path, relshName, cdd, contractCDM);
			expect(docRef).to.be.eq(undefined);
		});
	});

	describe("getDocRefBottomUp", () => {
		test("Wiki Testcase #2.1a", () => {
			const path = [
				{ elementName: "PolicyHolder", index: nonRepeatIdx },
				{ elementName: "businessPartner", index: nonRepeatIdx },
				{ elementName: "id", index: nonRepeatIdx }
			];
			const docRef = getSourceDocRefFromTargetDocPath(path, cdd, contractCDM);
			expect(docRef).to.be.eq("Contract-document/24");
		});
		test("Wiki Testcase #2.1a without target", () => {
			const path = [
				{ elementName: "PolicyHolder", index: nonRepeatIdx },
				{ elementName: "businessPartner", index: nonRepeatIdx },
				{ elementName: "id", index: nonRepeatIdx }
			];
			const [dgWithoutTarget] = removeLink(policeHolderLinkRef, dg);
			const cddWithoutTarget = toCdd(dgWithoutTarget, rootDocRef, modelRoot) as GroupInstance;
			const docRef = getSourceDocRefFromTargetDocPath(path, cddWithoutTarget, contractCDM);
			expect(docRef).to.be.eq("Contract-document/24");
		});
		test("Wiki Testcase #2.1b", () => {
			const path = [
				{ elementName: "PolicyHolder", index: nonRepeatIdx },
				{ elementName: "PostAddress", index: nonRepeatIdx },
				{ elementName: "address", index: nonRepeatIdx },
				{ elementName: "street", index: nonRepeatIdx }
			];
			const docRef = getSourceDocRefFromTargetDocPath(path, cdd, contractCDM);
			expect(docRef).to.be.eq("BusinessPartner-document/21");
		});
		test("Wiki Testcase #2.1b without target", () => {
			const path = [
				{ elementName: "PolicyHolder", index: nonRepeatIdx },
				{ elementName: "PostAddress", index: nonRepeatIdx },
				{ elementName: "address", index: nonRepeatIdx },
				{ elementName: "street", index: nonRepeatIdx }
			];
			const [dgWithoutTarget] = removeLink(policeHolderPostAddressLinkRef, dg);
			const cddWithoutTarget = toCdd(dgWithoutTarget, rootDocRef, modelRoot);

			const docRef = getSourceDocRefFromTargetDocPath(path, cddWithoutTarget, contractCDM);
			expect(docRef).to.be.eq("BusinessPartner-document/21");
		});

		test("Wiki Testcase #2.2", () => {
			const path = [
				{ elementName: "CoInsurer", index: 2 },
				{ elementName: "PostAddress", index: nonRepeatIdx },
				{ elementName: "address", index: nonRepeatIdx },
				{ elementName: "street", index: nonRepeatIdx }
			];
			const docRef = getSourceDocRefFromTargetDocPath(path, cdd, contractCDM);
			expect(docRef).to.be.eq("BusinessPartner-document/23");
		});

		test("Wiki Testcase #3.1a", () => {
			const path = [{ elementName: "PolicyHolder", index: nonRepeatIdx }];
			const docRef = getSourceDocRefFromTargetDocPath(path, cdd, contractCDM);
			expect(docRef).to.be.eq("Contract-document/24");
		});
		test("Wiki Testcase #3.1b", () => {
			const path = [
				{ elementName: "PolicyHolder", index: nonRepeatIdx },
				{ elementName: "PostAddress", index: nonRepeatIdx }
			];
			const docRef = getSourceDocRefFromTargetDocPath(path, cdd, contractCDM);
			expect(docRef).to.be.eq("BusinessPartner-document/21");
		});
		test("Wiki Testcase #3.2", () => {
			const path = [
				{ elementName: "CoInsurer", index: 2 },
				{ elementName: "PostAddress", index: nonRepeatIdx }
			];
			const docRef = getSourceDocRefFromTargetDocPath(path, cdd, contractCDM);
			expect(docRef).to.be.eq("BusinessPartner-document/23");
		});
	});

	describe("collectRelshPathsForRelsh Helper", () => {
		test("PostAddress with 2 usages", () => {
			const result = collectRelshPathsForRelsh(modelRoot, "PostAddress");
			expect(result).to.have.members(["CoInsurer/PostAddress", "PolicyHolder/PostAddress"]);
		});
		test("PolicyHolder", () => {
			const result = collectRelshPathsForRelsh(modelRoot, "PolicyHolder");
			expect(result).to.have.members(["PolicyHolder"]);
		});
		test("Non-existant Relsh", () => {
			const result = collectRelshPathsForRelsh(modelRoot, "XXX");
			expect(result).to.have.members([]);
		});
	});
});

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

import documentGraph from "../testData/dg.json" with { type: "json" };
import { toCdd } from "../../../internal/cdm/cdd/core/adapter/toCdd.js";
import { mergeInto } from "../../../internal/documentGraph/core/impl/dg.js";
import { addLink } from "../../../internal/documentGraph/core/impl/links.js";
import contractCDM from "../testData/ContractCDM.json" with { type: "json" };
import { deserializeDocumentModel } from "../../../internal/cdm/commons/modelUtils.js";
import { newChangeLog } from "../../../internal/documentGraph/core/changeLog/changeLogImpl.js";
import type { DeepReadonly, DocumentGraph } from "../../../internal/documentGraph/core/index.js";
import { linksWithMetaData } from "../../../internal/cdm/cdd/core/effectiveChanges/linksWithMetaData.js";

import facebookDg from "./dg-facebook.json" with { type: "json" };
import Contract24Cdd from "./Contract24Cdd.json" with { type: "json" };

describe("com.mgmtp.a12.relationshipengine-core.extensions.cdm.cdd", () => {
	const CONTRACT_ID = "Contract-document/24";
	const cdmRootGroup = deserializeDocumentModel(contractCDM).content.modelRoot;

	describe("setDG", () => {
		describe("Given the sample Cdd and subCdd with queryRoot=CoInsured", () => {
			test("should merge the DGs", () => {
				const dg = documentGraph as DeepReadonly<DocumentGraph>;
				const partialDg = facebookDg as DocumentGraph;
				const [mergedDg] = mergeInto({ dg, partialDg });

				const addedDocs = Object.keys(mergedDg.documents.byDocRef).length - Object.keys(dg.documents.byDocRef).length;
				expect(addedDocs, "addedDocs").to.be.eq(2);

				const addedLinks = Object.keys(mergedDg.links.byId).length - Object.keys(dg.links.byId).length;
				expect(addedLinks, "addedLinks").to.be.eq(2);

				// Note that added CoInsurer is NOT linked to root Contract/24! ==> use addLink test for that!
			});
		});
		describe("Given a Cdd with added subCdd", () => {
			test("should not add already existing docs and links", () => {
				const dg = documentGraph as DeepReadonly<DocumentGraph>;
				const partialDg1 = facebookDg as DocumentGraph;
				const [mergedDg1] = mergeInto({ dg, partialDg: partialDg1 });
				const partialDg = facebookDg as DocumentGraph;
				const [mergedDg] = mergeInto({ dg: mergedDg1, partialDg });

				const addedDocs =
					Object.keys(mergedDg.documents.byDocRef).length - Object.keys(mergedDg1.documents.byDocRef).length;
				expect(addedDocs, "addedDocs").to.be.eq(0);

				const addedLinks = Object.keys(mergedDg.links.byId).length - Object.keys(mergedDg1.links.byId).length;
				expect(addedLinks, "addedLinks").to.be.eq(0);

				// Note that added PolicyHolder is NOT linked to root Contract/24! ==> use addLink test for that!
			});
		});
	});
	describe("addLink", () => {
		describe("Given the sample DG and a sample link", () => {
			test("returns the DocumentGraph with link and proxy document", () => {
				const dg = documentGraph as DeepReadonly<DocumentGraph>;
				const linkDescriptor = {
					relationshipModel: "CoInsurer",
					entities: [
						{
							role: "contract",
							modelName: "Contract-document",
							docRef: CONTRACT_ID
						},
						{
							role: "businessPartner",
							modelName: "BusinessPartner-document",
							docRef: "BusinessPartner-document/24"
						}
					],
					predecessorLinkRef: null
				};
				const [mergedDg] = addLink(linkDescriptor, undefined, dg);

				const addedDocs = Object.keys(mergedDg.documents.byDocRef).length - Object.keys(dg.documents.byDocRef).length;
				expect(addedDocs, "addedDocs").to.be.eq(1);

				const addedLinkIdsOfContract =
					Object.keys(mergedDg.links.linkIdsByDocId[CONTRACT_ID] ?? []).length -
					Object.keys(dg.links.linkIdsByDocId[CONTRACT_ID] ?? []).length;
				expect(addedLinkIdsOfContract, "addedLinkIdsOfContract").to.be.eq(1);

				const numOfLinks = Object.values(mergedDg.links.byId).length;
				const newLink = Object.values(mergedDg.links.byId)[numOfLinks - 1];
				const linksOfTarget = mergedDg.links.linkIdsByDocId[CONTRACT_ID] ?? [];
				// new links should always be added at the end of the list
				expect(linksOfTarget[linksOfTarget.length - 1]).to.be.equal(newLink.linkRef.id);
			});
		});
	});
	describe("links", () => {
		describe("Given sample DG", () => {
			test("returns the links", () => {
				const dg = documentGraph as DeepReadonly<DocumentGraph>;
				const links = linksWithMetaData(dg, newChangeLog());
				expect(links.length).to.be.eq(10);
			});
		});
	});
	describe("toCdd", () => {
		describe("Given sample DG", () => {
			test("returns the hierarchical CDD", () => {
				const dg = documentGraph as DeepReadonly<DocumentGraph>;
				const cdd = toCdd(dg, CONTRACT_ID, cdmRootGroup);
				const cddJson = JSON.stringify(cdd, undefined, 4);
				const refJson = JSON.stringify(Contract24Cdd, undefined, 4);
				expect(cddJson).to.be.deep.eq(refJson);
			});
		});
	});
});

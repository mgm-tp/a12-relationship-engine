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

import { test, expect, describe, beforeEach } from "vitest";

import type { GroupInstance, EntityInstancePath } from "@com.mgmtp.a12.kernel/kernel-md-facade";

import { addGroupInstance } from "../../../../internal/cdm/cddUtils/addGroupInstance.js";
import { resetDocRefCounterForTesting } from "../../../../internal/cdm/cdd/redux/newDocRef.js";
import {
	type DgChangeLog,
	type DocumentGraph,
	resetAddedLinkIndexForTesting
} from "../../../../internal/documentGraph/core/index.js";

import { setupCddUtilsTestData } from "./testUtils.js";

describe("com.mgmtp.a12.client.extensions.cdm.cdd", () => {
	describe("cddUtils.addGroupInstance", () => {
		describe("given a path to a missing group instance and a defined group instance value", () => {
			test("updates the cdm data to contain the group instance and all contained values", () => {
				const { cdmData, documentModelsInScene, modelGraph } = setupCddUtilsTestData();

				const path: EntityInstancePath = [{ elementName: "businessPartner", index: 1 }];
				const value = {
					notes: [
						{
							note: "hello"
						}
					]
				};

				const expectedDg: DocumentGraph = {
					documents: {
						byDocRef: {
							"cddDocument/0": {
								docRef: "cddDocument/0",
								document: {},
								documentModelName: "NaturalPersonCDM",
								loadingState: "loaded"
							},
							__NEW__: {
								docRef: "__NEW__",
								document: {
									businessPartner: {
										notes: [
											{
												note: "hello"
											}
										]
									}
								},
								documentModelName: "NaturalPerson-document",
								loadingState: "loaded"
							}
						}
					},
					links: {
						byId: {},
						linkIdsByDocId: {}
					}
				};
				const expectedCl: DgChangeLog = {
					changes: [
						{
							kind: "docAdded",
							docRef: "__NEW__"
						},
						{
							kind: "docChanged",
							docRef: "__NEW__"
						}
					],
					changeCounter: 4
				};
				const expectedCdd: GroupInstance = {
					businessPartner: {
						notes: [
							{
								note: "hello"
							}
						]
					},
					t_docRef: "__NEW__",
					id: "__NEW__",
					modelId: "NaturalPerson-document"
				};

				const actual = addGroupInstance(cdmData, value, path, documentModelsInScene, modelGraph);

				expect(actual.documentGraph).toEqual(expectedDg);
				expect(actual.changeLog).toEqual(expectedCl);
				expect(actual.cddState.cachedCdd?.cdd).toEqual(expectedCdd);
			});
		});

		describe("given a path to a missing group instance and a defined empty group instance value", () => {
			test("updates the cdm data to contain the empty group instance", () => {
				const { cdmData, documentModelsInScene, modelGraph } = setupCddUtilsTestData();

				const path: EntityInstancePath = [{ elementName: "businessPartner", index: 1 }];
				const value = {};

				const expectedDg: DocumentGraph = {
					documents: {
						byDocRef: {
							"cddDocument/0": {
								docRef: "cddDocument/0",
								document: {},
								documentModelName: "NaturalPersonCDM",
								loadingState: "loaded"
							},
							__NEW__: {
								docRef: "__NEW__",
								document: {
									businessPartner: {}
								},
								documentModelName: "NaturalPerson-document",
								loadingState: "loaded"
							}
						}
					},
					links: {
						byId: {},
						linkIdsByDocId: {}
					}
				};
				const expectedCl: DgChangeLog = {
					changes: [
						{
							kind: "docAdded",
							docRef: "__NEW__"
						},
						{
							kind: "docChanged",
							docRef: "__NEW__"
						}
					],
					changeCounter: 2
				};
				const expectedCdd: GroupInstance = {
					businessPartner: {},
					t_docRef: "__NEW__",
					id: "__NEW__",
					modelId: "NaturalPerson-document"
				};

				const actual = addGroupInstance(cdmData, value, path, documentModelsInScene, modelGraph);

				expect(actual.documentGraph).toEqual(expectedDg);
				expect(actual.changeLog).toEqual(expectedCl);
				expect(actual.cddState.cachedCdd?.cdd).toEqual(expectedCdd);
			});
		});

		describe("given a path which points to field and some value", () => {
			beforeEach(() => {
				resetDocRefCounterForTesting();
				resetAddedLinkIndexForTesting();
			});
			test("throws an error", () => {
				const { cdmData, documentModelsInScene, modelGraph } = setupCddUtilsTestData();

				const path: EntityInstancePath = [
					{ elementName: "businessPartner", index: 1 },
					{ elementName: "id", index: 1 }
				];
				const value = "abc";

				expect(() => addGroupInstance(cdmData, value, path, documentModelsInScene, modelGraph)).toThrowError(
					`group not found: /businessPartner[1]/id[1]`
				);
			});
		});

		describe("given a path which doesn't point to an existing element and some value", () => {
			test("throws an error", () => {
				const { cdmData, documentModelsInScene, modelGraph } = setupCddUtilsTestData();

				const path: EntityInstancePath = [
					{ elementName: "businessPartner", index: 1 },
					{ elementName: "foobar", index: 1 }
				];
				const value = "abc";

				expect(() => addGroupInstance(cdmData, value, path, documentModelsInScene, modelGraph)).toThrowError(
					`group not found: /businessPartner[1]/foobar[1]`
				);
			});
		});
	});
});

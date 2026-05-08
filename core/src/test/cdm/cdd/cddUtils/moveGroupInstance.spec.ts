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

import { describe, test, expect, beforeEach } from "vitest";

import { type EntityInstancePath } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";

import { resetDocRefCounterForTesting } from "../../../../internal/cdm/cdd/redux/newDocRef.js";
import { moveGroupInstance } from "../../../../internal/cdm/cddUtils/moveGroupInstance.js";
import { DOCUMENT_SERVICE } from "../../../../internal/cdm/cdmCommons/documentService.js";
import { type DgDocument, type DocumentGraph } from "../../../../internal/documentGraph/core/documentGraph.js";
import { resetAddedLinkIndexForTesting } from "../../../../internal/documentGraph/core/impl/links.js";
import { type DgChangeLog } from "../../../../internal/documentGraph/core/slices.js";

import { setupCddUtilsTestData } from "./testUtils.js";

describe("com.mgmtp.a12.client.extensions.cdm.cdd", () => {
	describe("cddUtils.moveGroupInstance", () => {
		beforeEach(() => {
			resetDocRefCounterForTesting();
			resetAddedLinkIndexForTesting();
		});

		describe("given a path to a regular group instance and the move delta", () => {
			test("updates the dg, the cdd and the changelog to reflect the moved row", () => {
				const testDg: DocumentGraph = {
					documents: {
						byDocRef: {
							__NEW__: {
								docRef: "__NEW__",
								document: {
									businessPartner: { id: "abc", notes: [{ note: "note1" }, { note: "note2" }] }
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
				const { cdmData, documentModelsInScene, modelGraph } = setupCddUtilsTestData({
					partialDg: testDg
				});

				const path: EntityInstancePath = [
					{ elementName: "businessPartner", index: 1 },
					{ elementName: "notes", index: 2 }
				];
				const delta = -1;

				const actual = moveGroupInstance(cdmData, path, delta, documentModelsInScene, modelGraph);

				const actualDgDoc = actual.documentGraph.documents.byDocRef["__NEW__"];
				const expectedDgDoc: DgDocument = {
					docRef: "__NEW__",
					document: {
						businessPartner: { id: "abc", notes: [{ note: "note2" }, { note: "note1" }] }
					},
					documentModelName: "NaturalPerson-document",
					loadingState: "loaded"
				};
				expect(actualDgDoc).toEqual(expectedDgDoc);

				const expectedCl: DgChangeLog = {
					changes: [...cdmData.changeLog.changes, { kind: "docChanged", docRef: "__NEW__" }],
					changeCounter: cdmData.changeLog.changeCounter + 1
				};
				expect(actual.changeLog).toEqual(expectedCl);

				const actualCdd = actual.cddState.cachedCdd?.cdd;
				expect(actualCdd).not.toBeUndefined();

				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const actualCddValue = DOCUMENT_SERVICE.getAssignedObject(actualCdd!, path);
				expect(actualCddValue).toEqual({ note: "note1" });
			});
		});

		test("should throw an error when given a path to a non-existing group", () => {
			const { cdmData, documentModelsInScene, modelGraph } = setupCddUtilsTestData();

			const path: EntityInstancePath = [
				{ elementName: "hi", index: 1 },
				{ elementName: "there", index: 1 }
			];
			const delta = -1;

			expect(() => moveGroupInstance(cdmData, path, delta, documentModelsInScene, modelGraph)).toThrowError(
				new Error("Could not find group for path '/hi[1]/there[1]'")
			);
		});

		test("should throw an error when given a path to a field", () => {
			const { cdmData, documentModelsInScene, modelGraph } = setupCddUtilsTestData();

			const path: EntityInstancePath = [
				{ elementName: "businessPartner", index: 1 },
				{ elementName: "id", index: 1 }
			];
			const delta = -1;

			expect(() => moveGroupInstance(cdmData, path, delta, documentModelsInScene, modelGraph)).toThrowError(
				new Error("Could not find group for path '/businessPartner[1]/id[1]'")
			);
		});

		test("should throw an error when given a path to a relationship group", () => {
			const { cdmData, documentModelsInScene, modelGraph } = setupCddUtilsTestData();

			const path: EntityInstancePath = [{ elementName: "Location", index: 1 }];
			const delta = -1;

			expect(() => moveGroupInstance(cdmData, path, delta, documentModelsInScene, modelGraph)).toThrowError(
				new Error("Moving relationship group instances is not supported.")
			);
		});

		test("should throw an error when given a path to a link doc group", () => {
			const { cdmData, documentModelsInScene, modelGraph } = setupCddUtilsTestData();

			const path: EntityInstancePath = [
				{ elementName: "CoInsurer", index: 1 },
				{ elementName: "relationship", index: 1 }
			];
			const delta = -1;

			expect(() => moveGroupInstance(cdmData, path, delta, documentModelsInScene, modelGraph)).toThrowError(
				new Error("Moving the link document group instance is not supported.")
			);
		});
	});
});

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

import { addMissingPaths, collectMissingPaths, updatePending } from "../../../internal/cdm/cdd/core/impl/pending.js";
import { deserializeDocumentModel } from "../../../internal/cdm/commons/modelUtils.js";
import { type RelshPath } from "../../../internal/documentGraph/core/index.js";

import contractCDM from "../testData/ContractCDM.json" with { type: "json" };

describe("com.mgmtp.a12.relationshipengine-core.extensions.cdm.cdd", () => {
	const cdm = deserializeDocumentModel(contractCDM);
	describe("addMissingPaths", () => {
		describe("given a partial cdd state, a key and a list of relationship paths", () => {
			test("returns the cdd state if the path list is empty", () => {
				const partialCddState = {
					rootDocRef: "doc1",
					cdm,
					pendingUsages: []
				};
				const key = { relshName: "rm1", targetDocRef: "doc1" };
				const relshPaths: RelshPath[] = [];

				const newCddState = addMissingPaths(partialCddState, key, relshPaths);

				expect(newCddState).to.be.deep.equal(partialCddState);
			});

			test("returns an updated cdd state with missing paths", () => {
				const partialCddState = {
					rootDocRef: "doc1",
					cdm,
					pendingUsages: []
				};
				const key = { relshName: "rm1", targetDocRef: "doc1" };
				const relshPaths = ["p1", "p2", "p3"];

				const newCddState = addMissingPaths(partialCddState, key, relshPaths);

				expect(newCddState).to.be.deep.equal({
					...partialCddState,
					pendingUsages: [
						{
							key,
							relshUsages: relshPaths.map((relshPath) => ({ relshPath, loadingState: "missing" }))
						}
					]
				});
			});

			test("does not overwrite existing path entries with 'missing'", () => {
				const partialCddState = {
					rootDocRef: "doc1",
					cdm,
					pendingUsages: [
						{
							key: { relshName: "rm1", targetDocRef: "doc1" },
							relshUsages: [
								{ relshPath: "p1", loadingState: "loading" as const },
								{ relshPath: "p2", loadingState: "loading" as const }
							]
						}
					]
				};
				const key = { relshName: "rm1", targetDocRef: "doc1" };
				const relshPaths: RelshPath[] = ["p1", "p2", "p3", "p4"];

				const newCddState = addMissingPaths(partialCddState, key, relshPaths);

				expect(newCddState).to.be.deep.equal({
					...partialCddState,
					pendingUsages: [
						{
							key,
							relshUsages: [
								...partialCddState.pendingUsages[0].relshUsages,
								...relshPaths.slice(2).map((relshPath) => ({ relshPath, loadingState: "missing" }))
							]
						}
					]
				});
			});
		});
	});

	describe("updatePending", () => {
		describe("given a partial cdd state, a key, a relshpath and a loading state", () => {
			const partialCddState = {
				rootDocRef: "doc1",
				cdm,
				pendingUsages: [
					{
						key: { relshName: "rm1", targetDocRef: "doc1" },
						relshUsages: [
							{ relshPath: "p1", loadingState: "loading" as const },
							{ relshPath: "p2", loadingState: "loading" as const },
							{ relshPath: "p3", loadingState: "missing" as const }
						]
					}
				]
			};
			const key = { relshName: "rm1", targetDocRef: "doc1" };

			test("does nothing if no pendingUsage exists for given key", () => {
				const otherKey = { relshName: "rm2", targetDocRef: "doc1" };
				const newCddState = updatePending(partialCddState, otherKey, "p1", "error");
				expect(newCddState).to.be.deep.equal(partialCddState);
			});
			test("does nothing if relshpath entry does not exist", () => {
				const newCddState = updatePending(partialCddState, key, "p0", "error");
				expect(newCddState).to.be.deep.equal(partialCddState);
			});
			test("removes relshpath entry if loading state = 'error'", () => {
				const relshPath = "p1";
				const newCddState = updatePending(partialCddState, key, relshPath, "error");
				expect(newCddState).to.be.deep.equal({
					...partialCddState,
					pendingUsages: [
						{
							key,
							relshUsages: partialCddState.pendingUsages[0].relshUsages.filter((p) => p.relshPath !== relshPath)
						}
					]
				});
			});
			test("removes relshpath entry if loading state = 'loaded'", () => {
				const relshPath = "p2";
				const newCddState = updatePending(partialCddState, key, relshPath, "loaded");
				expect(newCddState).to.be.deep.equal({
					...partialCddState,
					pendingUsages: [
						{
							key,
							relshUsages: partialCddState.pendingUsages[0].relshUsages.filter((p) => p.relshPath !== relshPath)
						}
					]
				});
			});
			test("updates relshpath entry if loading state = 'missing'", () => {
				const relshPath = "p2";
				const newCddState = updatePending(partialCddState, key, relshPath, "missing");
				expect(newCddState).to.be.deep.equal({
					...partialCddState,
					pendingUsages: [
						{
							key,
							relshUsages: partialCddState.pendingUsages[0].relshUsages.map((p) =>
								p.relshPath === relshPath ? { ...p, loadingState: "missing" } : p
							)
						}
					]
				});
			});
			test("updates relshpath entry if loading state = 'loading'", () => {
				const relshPath = "p3";
				const newCddState = updatePending(partialCddState, key, relshPath, "loading");
				expect(newCddState).to.be.deep.equal({
					...partialCddState,
					pendingUsages: [
						{
							key,
							relshUsages: partialCddState.pendingUsages[0].relshUsages.map((p) =>
								p.relshPath === relshPath ? { ...p, loadingState: "loading" } : p
							)
						}
					]
				});
			});
		});
	});

	describe("collectMissingPaths", () => {
		describe("given a partial cdd state", () => {
			test("returns an empty list if no relshpath entry has loading state = 'missing'", () => {
				const partialCddState = {
					rootDocRef: "doc1",
					cdm,
					pendingUsages: [
						{
							key: { relshName: "rm1", targetDocRef: "doc1" },
							relshUsages: [
								{ relshPath: "p1", loadingState: "loading" as const },
								{ relshPath: "p2", loadingState: "loading" as const }
							]
						}
					]
				};
				const queryPaths = collectMissingPaths(partialCddState);

				expect(queryPaths).to.be.deep.equal([]);
			});

			test("returns a query path for all relshpath entries with loading state = 'missing'", () => {
				const partialCddState = {
					rootDocRef: "doc1",
					cdm,
					pendingUsages: [
						{
							key: { relshName: "rm1", targetDocRef: "doc1" },
							relshUsages: [
								{ relshPath: "p1", loadingState: "loading" as const },
								{ relshPath: "p2", loadingState: "missing" as const },
								{ relshPath: "p3", loadingState: "loading" as const },
								{ relshPath: "p4", loadingState: "missing" as const }
							]
						}
					]
				};
				const queryPaths = collectMissingPaths(partialCddState);

				expect(queryPaths).to.be.deep.equal([
					{ docRef: "doc1", path: "p2" },
					{ docRef: "doc1", path: "p4" }
				]);
			});
		});
		describe("given a doc ref", () => {
			test("creates a query path for the root document", () => {
				const docRef = "doc1";
				const queryPaths = collectMissingPaths(docRef);

				expect(queryPaths).to.be.deep.equal([{ docRef, path: "" }]);
			});
		});
	});
});

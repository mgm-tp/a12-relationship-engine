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

import { resetDocRefCounterForTesting } from "../../../../internal/cdm/cdd/redux/newDocRef.js";
import {
	computeSubActivityData,
	type NewLinkDescriptorSpecs
} from "../../../../internal/cdm/dataProvider/subactivity/computeSubActivityData.js";
import {
	createDG,
	type DgChangeLogSlice,
	type DgSlice,
	resetAddedLinkIndexForTesting
} from "../../../../internal/documentGraph/core/index.js";
import { newChangeLog } from "../../../../internal/documentGraph/core/changeLog/changeLogImpl.js";
import { replaceLinkRanksInDg } from "../../cdd/cddUtils/testUtils.js";

describe("com.mgmtp.a12.client.extensions.cdm.subactivity", () => {
	describe("computeSubActivityData", () => {
		beforeEach(() => {
			resetDocRefCounterForTesting();
			resetAddedLinkIndexForTesting();
		});
		const parentData: DgSlice & DgChangeLogSlice = {
			documentGraph: createDG(),
			changeLog: newChangeLog()
		};
		describe("given only the parent data", () => {
			test("returns the parent data", () => {
				expect(computeSubActivityData(parentData)).toEqual(parentData);
			});
		});

		describe("given parent data and addition data", () => {
			test("returns parent data extended by a new doc and link", () => {
				const addition: NewLinkDescriptorSpecs = {
					relationshipModel: "rm",
					sourceDocRef: "source/1",
					sourceRole: "source",
					targetDocRef: "target/1",
					targetModel: "targetModel",
					targetRole: "target"
				};

				const expected: DgSlice & DgChangeLogSlice = {
					changeLog: {
						changeCounter: 2,
						changes: [
							{
								docRef: "target/1",
								kind: "docAdded"
							},
							{
								kind: "linkAdded",
								linkId: "rm_NEW_1"
							}
						]
					},
					documentGraph: {
						documents: {
							byDocRef: {
								"source/1": {
									docRef: "source/1",
									loadingState: "missing"
								},
								"target/1": {
									docRef: "target/1",
									document: {},
									documentModelName: "targetModel",
									loadingState: "loaded"
								}
							}
						},
						links: {
							byId: {
								rm_NEW_1: {
									linkDocRef: undefined,
									linkRef: {
										id: "rm_NEW_1",
										linkDescriptor: {
											entities: [
												{
													docRef: "source/1",
													role: "source"
												},
												{
													docRef: "target/1",
													role: "target"
												}
											],
											relationshipModel: "rm"
										}
									},
									rank: 0
								}
							},
							linkIdsByDocId: {
								"source/1": ["rm_NEW_1"],
								"target/1": ["rm_NEW_1"]
							}
						}
					}
				};

				const actual = computeSubActivityData(parentData, addition);

				expect(replaceLinkRanksInDg(actual.documentGraph)).toEqual(expected.documentGraph);
				expect(actual.changeLog).toEqual(expected.changeLog);
			});
		});
	});
});

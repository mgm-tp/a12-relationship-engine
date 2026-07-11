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

import * as TypeMoq from "typemoq";
import { test, expect, describe } from "vitest";

import type { Action } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";

import { createLinkDescriptor } from "../../../mocks/relationships/mocks.js";
import type { DocumentGraph } from "../../../../internal/documentGraph/core/documentGraph.js";
import {
	setDg,
	addLink,
	mergeDG,
	removeLink,
	addDocument,
	changeDocument,
	endTransaction,
	beginTransaction,
	type SetDGPayload,
	type AddLinkPayload,
	type MergeDGPayload,
	type RemoveLinkPayload,
	type AddDocumentPayload,
	type ChangeDocumentPayload,
	type EndTransactionPayload,
	type BeginTransactionPayload
} from "../../../../internal/documentGraph/redux/actions.js";

describe("document graph change handling actions", () => {
	describe("DG", () => {
		const documentGraph = TypeMoq.Mock.ofType<DocumentGraph>().object;

		describe("setDg is an ActionCreator which", () => {
			describe("given the id of an activity, for which a document graph was set", () => {
				test("creates a setDg action for this activity.", () => {
					const payload: SetDGPayload = {
						activityId: "1",
						documentGraph
					};
					const expectedAction: Action<SetDGPayload> = {
						type: setDg.type,
						payload
					};

					expect(setDg(payload)).to.be.deep.equal(expectedAction);
				});
			});
		});

		describe("mergeDG is an ActionCreator which", () => {
			describe("given the id of an activity, for which a document graph was merged", () => {
				test("creates a mergeDG action for this activity.", () => {
					const payload: MergeDGPayload = {
						activityId: "1",
						documentGraph
					};
					const expectedAction: Action<MergeDGPayload> = {
						type: mergeDG.type,
						payload
					};

					expect(mergeDG(payload)).to.be.deep.equal(expectedAction);
				});
			});
		});
	});

	describe("Link", () => {
		const linkDescriptor = createLinkDescriptor("a", "b", "c", "d", "e");

		describe("addLink is an ActionCreator which", () => {
			describe("given the id of an activity, for which a link was added", () => {
				test("creates an addLink action for this activity.", () => {
					const payload: AddLinkPayload = {
						activityId: "1",
						linkDescriptor,
						setDirty: true
					};
					const expectedAction: Action<AddLinkPayload> = {
						type: addLink.type,
						payload
					};

					expect(addLink(payload)).to.be.deep.equal(expectedAction);
				});

				describe("and given an optional link document", () => {
					test("creates an addLink action for this activity.", () => {
						const payload: AddLinkPayload = {
							activityId: "1",
							linkDescriptor,
							linkDoc: { document: { key: "value" }, documentModelName: "linkDocModel" },
							setDirty: true
						};
						const expectedAction: Action<AddLinkPayload> = {
							type: addLink.type,
							payload
						};

						expect(addLink(payload)).to.be.deep.equal(expectedAction);
					});
				});
			});
		});

		describe("removeLink is an ActionCreator which", () => {
			describe("given the id of an activity, from which a link was removed", () => {
				test("creates a removeLink action for this activity.", () => {
					const payload: RemoveLinkPayload = {
						activityId: "1",
						linkRef: {
							id: "2",
							linkDescriptor
						},
						setDirty: true
					};
					const expectedAction: Action<RemoveLinkPayload> = {
						type: removeLink.type,
						payload
					};

					expect(removeLink(payload)).to.be.deep.equal(expectedAction);
				});
			});
		});
	});

	describe("Document", () => {
		describe("addDocument is an ActionCreator which", () => {
			describe("given the id of an activity, for which a document was added", () => {
				test("creates a addDocument action for this activity.", () => {
					const payload: AddDocumentPayload = {
						activityId: "1",
						elementRef: "ref",
						document: { key: "value" },
						documentModelName: "test"
					};
					const expectedAction: Action<AddDocumentPayload> = {
						type: addDocument.type,
						payload
					};

					expect(addDocument(payload)).to.be.deep.equal(expectedAction);
				});
			});
		});

		describe("changeDocument is an ActionCreator which", () => {
			describe("given the id of an activity, for which a document was changed", () => {
				test("creates a changeDocument action for this activity.", () => {
					const payload: ChangeDocumentPayload = {
						activityId: "1",
						elementRef: "ref",
						document: { key: "value" }
					};
					const expectedAction: Action<ChangeDocumentPayload> = {
						type: changeDocument.type,
						payload
					};

					expect(changeDocument(payload)).to.be.deep.equal(expectedAction);
				});
			});
		});
	});

	describe("Transaction", () => {
		describe("beginTransaction is an ActionCreator which", () => {
			describe("given the id of an activity, for which a transaction was started", () => {
				test("creates a beginTransaction action for this activity.", () => {
					const payload: BeginTransactionPayload = {
						activityId: "1",
						id: "2"
					};
					const expectedAction: Action<BeginTransactionPayload> = {
						type: beginTransaction.type,
						payload
					};

					expect(beginTransaction(payload)).to.be.deep.equal(expectedAction);
				});
			});
		});

		describe("endTransaction is an ActionCreator which", () => {
			describe("given the id of an activity, for which a transaction was committed", () => {
				test("creates a endTransaction action for this activity.", () => {
					const payload: EndTransactionPayload = {
						activityId: "1",
						outcome: "commit",
						setDirty: true
					};
					const expectedAction: Action<EndTransactionPayload> = {
						type: endTransaction.type,
						payload
					};

					expect(endTransaction(payload)).to.be.deep.equal(expectedAction);
				});
			});
		});
	});
});

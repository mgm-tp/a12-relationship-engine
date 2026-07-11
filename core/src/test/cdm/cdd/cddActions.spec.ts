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

import type { Action } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";

import { createLinkDescriptor } from "../../mocks/relationships/mocks.js";
import {
	addCddLink,
	changeCddDocument,
	type AddCddLinkPayload,
	type ChangeCddDocumentPayload
} from "../../../internal/cdm/cdd/redux/actions.js";

describe("Change cdd actions", () => {
	describe("addCddLink is an ActionCreator which", () => {
		describe("given the id of an activity, for which a cdd link was added", () => {
			test("creates an addCddLink action for this activity.", () => {
				const payload: AddCddLinkPayload = {
					activityId: "1",
					targetRole: "role",
					linkDescriptor: createLinkDescriptor("a", "b", "c", "d", "e"),
					setDirty: true
				};
				const expectedAction: Action<AddCddLinkPayload> = {
					type: addCddLink.type,
					payload
				};

				expect(addCddLink(payload)).to.be.deep.equal(expectedAction);
			});

			describe("and given an optional link and target document", () => {
				test("creates an addCddLink action for this activity.", () => {
					const payload: AddCddLinkPayload = {
						activityId: "1",
						targetRole: "role",
						linkDescriptor: createLinkDescriptor("a", "b", "c", "d", "e"),
						linkDoc: { document: { key: "value" }, documentModelName: "linkDocModel" },
						targetDoc: {
							document: { key: "value2" },
							documentModelName: "test"
						},
						setDirty: true
					};
					const expectedAction: Action<AddCddLinkPayload> = {
						type: addCddLink.type,
						payload
					};

					expect(addCddLink(payload)).to.be.deep.equal(expectedAction);
				});
			});
		});
	});

	describe("changeCddDocument is an ActionCreator which", () => {
		describe("given the id of an activity, for which a cdd document was changed", () => {
			test("creates a changeCddDocument action for this activity.", () => {
				const payload: ChangeCddDocumentPayload = {
					activityId: "1",
					document: { key: "value" },
					changes: {
						change: {
							type: "ValueChanged",
							path: []
						}
					},
					modelGraph: { documentModels: [], composeDocumentModels: [], relationshipModels: [] }
				};
				const expectedAction: Action<ChangeCddDocumentPayload> = {
					type: changeCddDocument.type,
					payload
				};
				expect(changeCddDocument(payload)).to.be.deep.equal(expectedAction);
			});
		});
	});
});

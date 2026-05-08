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
import { type Action } from "typescript-fsa";

import { CRUDActions } from "../../../../internal/actions.js";

describe("com.mgmtp.a12.crud.lib.extensions.crud.actions", () => {
	describe("CRUDActions", () => {
		describe("createNewDocument is an ActionCreator, which", () => {
			describe("given the id of an activity", () => {
				test("creates a CreateNewDocument action for this activity with the payload containing the id", () => {
					const payload: CRUDActions.CreateNewDocumentPayload = {
						activityId: "1",
						model: "CRUD"
					};
					const expectedAction: Action<CRUDActions.CreateNewDocumentPayload> = {
						type: CRUDActions.createNewDocument.type,
						payload
					};

					expect(CRUDActions.createNewDocument(payload)).to.be.deep.equal(expectedAction);
				});
			});

			describe("given the id of an activity and an optional model", () => {
				test("creates a CreateNewDocument action for this activity with the payload containing the id and the model.", () => {
					const payload: CRUDActions.CreateNewDocumentPayload = {
						activityId: "1",
						model: "CRUD"
					};
					const expectedAction: Action<CRUDActions.CreateNewDocumentPayload> = {
						type: CRUDActions.createNewDocument.type,
						payload
					};

					expect(CRUDActions.createNewDocument(payload)).to.be.deep.equal(expectedAction);
				});
			});
		});

		describe("selectRow is an ActionCreator, which", () => {
			describe("given the id of an activity, a model and an instanceId", () => {
				test("creates selectRow action for this activity with the payload containing the id, the model and the instanceId", () => {
					const payload: CRUDActions.SelectRowPayload = {
						activityId: "1",
						instanceId: "A"
					};
					const expectedAction: Action<CRUDActions.SelectRowPayload> = {
						type: CRUDActions.selectRow.type,
						payload
					};

					expect(CRUDActions.selectRow(payload)).to.be.deep.equal(expectedAction);
				});
			});
		});

		describe("deleteRow is an ActionCreator, which", () => {
			describe("given the id of an activity and an instanceId", () => {
				test("creates deleteRow action for this activity with the payload containing the id and the instanceId", () => {
					const payload: CRUDActions.DeleteRowPayload = {
						activityId: "1",
						instanceId: "A"
					};
					const expectedAction: Action<CRUDActions.DeleteRowPayload> = {
						type: CRUDActions.deleteRow.type,
						payload
					};

					expect(CRUDActions.deleteRow(payload)).to.be.deep.equal(expectedAction);
				});
			});
		});
	});
});

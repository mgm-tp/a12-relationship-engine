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

import { type Activity } from "@com.mgmtp.a12.client/client-core";

import { type Relationship, RelationshipActions } from "../../../../../internal/relationship/index.js";
import { handleDataSaved } from "../../../../../internal/relationship/reducers/dataSaved.js";
import {
	createCandidate,
	createCandidateDataholder,
	createCandidatePayload,
	createDocumentModel,
	createLinkDataholder,
	createLinkPayload,
	createLinkWithDocument,
	createMutation
} from "../../../../mocks/relationships/mocks.js";
import { createDataHolder } from "../../../../utils/activity.js";

describe("com.mgmtp.a12.relationshipengine-core.lib.extensions.relationship.reducers", () => {
	describe("dataSaved", () => {
		const documentModel = createDocumentModel();

		test("clears error of default dh", () => {
			const defaultDh = createDataHolder({
				descriptor: { key: "default" },
				error: { ...new Error(""), errorCode: "INTERNAL_CLIENT_ERROR" }
			});
			const dhs = [
				createDataHolder({ descriptor: { key: "1" } }),
				defaultDh,
				createDataHolder({ descriptor: { key: "3" } })
			];

			const action = RelationshipActions.Commands.dataSaved({
				activityId: "1",
				documentModel,
				linkPayloads: [],
				candidatePayloads: [],
				setPagePayloads: []
			});

			const newDhs = handleDataSaved(dhs, action, defaultDh);

			expect(newDhs.length).to.equal(dhs.length);

			expect(newDhs[0]).to.equal(dhs[0]);
			expect(newDhs[1].error).to.equal(undefined);
			expect(newDhs[2]).to.equal(dhs[2]);
		});

		test("sets new document in default dh if documentId is given", () => {
			const defaultDh = createDataHolder({
				descriptor: { key: "default" },
				data: { document: { id: "oldID" } }
			});
			const dhs = [
				createDataHolder({ descriptor: { key: "1" } }),
				defaultDh,
				createDataHolder({ descriptor: { key: "3" } })
			];

			const action = RelationshipActions.Commands.dataSaved({
				activityId: "1",
				documentId: "newID",
				documentModel,
				linkPayloads: [],
				candidatePayloads: [],
				setPagePayloads: []
			});

			const newDhs = handleDataSaved(dhs, action, defaultDh);

			expect(newDhs.length).to.equal(dhs.length);

			expect(newDhs[0]).to.equal(dhs[0]);
			expect(newDhs[1].data).to.deep.equal({ document: { id: "newID" } });
			expect(newDhs[2]).to.equal(dhs[2]);
		});

		test("resets mutation dh if it exists", () => {
			const dhs = [
				createDataHolder({ descriptor: { key: "1" } }),
				createDataHolder({
					descriptor: { feature: "relationship", type: "mutation" },
					data: [createMutation(), createMutation()],
					dirty: true
				}),
				createDataHolder({ descriptor: { key: "3" } })
			];

			const action = RelationshipActions.Commands.dataSaved({
				activityId: "1",
				documentModel,
				linkPayloads: [],
				candidatePayloads: [],
				setPagePayloads: []
			});

			const newDhs = handleDataSaved(dhs, action);

			expect(newDhs.length).to.equal(dhs.length);

			expect(newDhs[0]).to.equal(dhs[0]);

			expect(newDhs[1].data).to.deep.equal([]);
			expect(newDhs[1].dirty).to.equal(false);

			expect(newDhs[2]).to.equal(dhs[2]);
		});

		test("updates candidate dhs with new candidate data", () => {
			const dhs = [
				createCandidateDataholder("rm", "i1", []),
				createCandidateDataholder("otherRm", "i2", []),
				createCandidateDataholder("rm", "i3", [])
			];

			const newCandidate = createCandidate();

			const action = RelationshipActions.Commands.dataSaved({
				activityId: "1",
				linkPayloads: [],
				candidatePayloads: [createCandidatePayload({ candidates: [newCandidate], instanceId: "i2" })],
				setPagePayloads: [],
				documentModel
			});

			const newDhs = handleDataSaved(dhs, action);

			expect(newDhs.length).to.equal(dhs.length);

			const candidateDh = newDhs[1] as Activity.DataHolder<Relationship.CandidateInstance>;

			expect(newDhs[0]).to.equal(dhs[0]);
			expect(candidateDh.data?.candidates).to.deep.equal([newCandidate]);
			expect(newDhs[2]).to.equal(dhs[2]);
		});

		test("updates link dhs with new link data", () => {
			const dhs = [
				createLinkDataholder("rm", "i1", []),
				createLinkDataholder("otherRm", "i2", []),
				createLinkDataholder("rm", "i3", [])
			];

			const newLink = createLinkWithDocument();

			const action = RelationshipActions.Commands.dataSaved({
				activityId: "1",
				linkPayloads: [createLinkPayload({ links: [newLink], instanceId: "i2" })],
				candidatePayloads: [],
				setPagePayloads: [],
				documentModel
			});

			const newDhs = handleDataSaved(dhs, action);

			expect(newDhs.length).to.equal(dhs.length);

			const linkDh = newDhs[1] as Activity.DataHolder<Relationship.LinkInstance>;

			expect(newDhs[0]).to.equal(dhs[0]);
			expect(linkDh.data?.links).to.deep.equal([newLink]);
			expect(newDhs[2]).to.equal(dhs[2]);
		});

		test("returns other dhs unchanged", () => {
			const dhs = [
				createDataHolder({ descriptor: { key: "1" } }),
				createDataHolder({ descriptor: { key: "2" } }),
				createDataHolder({ descriptor: { key: "3" } })
			];

			const action = RelationshipActions.Commands.dataSaved({
				activityId: "1",
				documentModel,
				linkPayloads: [],
				candidatePayloads: [],
				setPagePayloads: []
			});

			const newDhs = handleDataSaved(dhs, action);

			expect(newDhs).to.deep.equal(dhs);
		});
	});
});

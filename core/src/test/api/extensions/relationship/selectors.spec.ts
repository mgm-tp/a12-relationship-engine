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
import { type MockStore, legacy_configureStore as configureStore } from "redux-mock-store";

import type { ActivityMap } from "@com.mgmtp.a12.client/client-core";

import type { ModelState } from "../../../utils/models.js";
import type { Relationship } from "../../../../internal/relationship/relationship.js";
import { RelationshipSelectors } from "../../../../internal/relationship/selectors.js";
import {
	ACTIVITY_ID,
	COMPONENT_CONFIG,
	createModelSlice,
	createActivitySlice,
	LINK_OVERVIEW_MODEL_ID,
	CANDIDATE_OVERVIEW_MODEL_ID,
	COMPONENT_CONFIG_FORM_MODEL_FIRST
} from "../../../mocks/relationships/mocks.js";

describe("com.mgmtp.a12.relationshipengine-core.lib.extensions.relationship.RelationshipSelectors", () => {
	describe("overviewModels", () => {
		describe(
			"Given a store with an activity matching a form scene " + "and the form model contains a relationship binding",
			() => {
				let store = setupStore();

				beforeEach(() => {
					store = setupStore();
				});

				describe("and given the activity ID, a component configuration of the binding", () => {
					describe("and 'link' as resultDocumentModelType", () => {
						test("returns the link overview model of the component", () => {
							executeTests({
								componentConfig: COMPONENT_CONFIG_FORM_MODEL_FIRST,
								resultDocumentModelType: "link",
								expectedModelId: LINK_OVERVIEW_MODEL_ID
							});

							executeTests({
								componentConfig: COMPONENT_CONFIG,
								resultDocumentModelType: "link",
								expectedModelId: LINK_OVERVIEW_MODEL_ID
							});
						});
					});

					describe("and 'candidate' as resultDocumentModelType", () => {
						test("returns the candidate overview model of the component", () => {
							executeTests({
								componentConfig: COMPONENT_CONFIG_FORM_MODEL_FIRST,
								resultDocumentModelType: "candidate",
								expectedModelId: CANDIDATE_OVERVIEW_MODEL_ID
							});

							executeTests({
								componentConfig: COMPONENT_CONFIG,
								resultDocumentModelType: "candidate",
								expectedModelId: CANDIDATE_OVERVIEW_MODEL_ID
							});
						});
					});

					function executeTests(params: {
						componentConfig: Relationship.ComponentConfiguration;
						resultDocumentModelType: "candidate" | "link";
						expectedModelId: string;
					}) {
						const selection = RelationshipSelectors.overviewModels({
							componentConfig: params.componentConfig,
							activityId: ACTIVITY_ID,
							resultDocumentModelType: params.resultDocumentModelType
						})(store.getState());

						expect(selection.loadingState).to.be.equal("loaded");

						if (selection.loadingState === "loaded") {
							expect(selection.overviewModel.header.id).to.be.equal(params.expectedModelId);
						}
					}
				});
			}
		);
	});
});

function setupStore(): MockStore<object> {
	return configureStore<{ activities: ActivityMap; models: ModelState }>()({
		activities: createActivitySlice(),
		models: createModelSlice()
	});
}

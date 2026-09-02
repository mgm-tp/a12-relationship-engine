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

import { Mock, type IMock } from "typemoq";
import { expectSaga } from "redux-saga-test-plan";
import * as matchers from "redux-saga-test-plan/matchers.js";
import { vi, test, expect, describe, beforeAll } from "vitest";

import {
	StoreSagas,
	type Activity,
	ModelSelectors,
	ActivityActions,
	ActivitySelectors,
	type ApplicationSaga
} from "@com.mgmtp.a12.client/client-core";

import { CddSelectors } from "../../../../../internal/cdm/cdd/redux/index.js";
import { RelationshipSelectors } from "../../../../../internal/relationship/selectors.js";
import { initializeDataHoldersSaga } from "../../../../../internal/relationship/sagas/initializeDataHolders.js";

describe("com.mgmtp.a12.relationshipengine-core.lib.extensions.relationship.sagas", () => {
	describe("loadLinks", () => {
		let configMock: IMock<ApplicationSaga.Configuration>;
		let pushPayloadMock: IMock<ActivityActions.PushPayload>;
		let cancelPayloadMock: IMock<ActivityActions.CancelPayload>;
		let activityMock: IMock<Activity>;

		beforeAll(() => {
			configMock = Mock.ofType<ApplicationSaga.Configuration>();
			activityMock = Mock.ofType<Activity>();
			activityMock.setup((x) => x.id).returns(() => "a");
			pushPayloadMock = Mock.ofType<ActivityActions.PushPayload>();
			pushPayloadMock.setup((x) => x.activity).returns(() => activityMock.object);
			cancelPayloadMock = Mock.ofType<ActivityActions.CancelPayload>();
			cancelPayloadMock.setup((x) => x.replacementActivity).returns(() => activityMock.object);

			vi.spyOn(CddSelectors, "isCddActivity").mockReturnValue(false);
		});

		describe("initializeDataHolders", () => {
			test("forks its runner saga when receiving ActivityActions.push", async () => {
				const { effects } = await expectSaga(initializeDataHoldersSaga, configMock.object)
					.dispatch(ActivityActions.push(pushPayloadMock.object))
					.silentRun();

				expect(effects.fork.length).to.be.greaterThan(0);
			});

			test("forks its runner saga when receiving ActivityActions.cancel", async () => {
				const { effects } = await expectSaga(initializeDataHoldersSaga, configMock.object)
					.dispatch(ActivityActions.cancel(cancelPayloadMock.object))
					.silentRun();

				expect(effects.fork.length).to.be.greaterThan(0);
			});
		});

		describe("waitForFormModelLoading", () => {
			function makeDescriptor(modelType: string, name: string) {
				return { modelType, name };
			}

			function makeBinding(elementId: string) {
				return {
					type: "relationship" as const,
					elementId,
					details: {
						metaInformation: { version: "1.0.0" as const },
						name: "TestBinding",
						relationshipName: "TestRelationship",
						targetRole: "target",
						components: []
					}
				};
			}

			function makeLoadedResult() {
				return { stateChanged: true, returnValue: {} };
			}

			test("waits for form models when scene has mixed model types (form + document)", async () => {
				vi.spyOn(ModelSelectors, "modelDescriptorsByActivityId").mockReturnValue(() => [
					makeDescriptor("form", "SomeFormModel"),
					makeDescriptor("document", "SomeOtherModel")
				]);
				vi.spyOn(RelationshipSelectors, "relationshipBindings").mockReturnValue(() => [makeBinding("b1")]);
				vi.spyOn(ActivitySelectors, "activityById").mockReturnValue(
					() =>
						({
							id: "a",
							descriptor: { instance: "Product/1" }
						}) as Activity
				);

				const { effects } = await expectSaga(initializeDataHoldersSaga, configMock.object)
					.provide([[matchers.call.fn(StoreSagas.waitForStateChange), makeLoadedResult()]])
					.dispatch(ActivityActions.push(pushPayloadMock.object))
					.silentRun();

				expect(effects.call.filter((c) => c.payload.fn === StoreSagas.waitForStateChange)).toHaveLength(1);
			});

			test("waits for all form models when scene has only form models", async () => {
				vi.spyOn(ModelSelectors, "modelDescriptorsByActivityId").mockReturnValue(() => [
					makeDescriptor("form", "FormModel1"),
					makeDescriptor("form", "FormModel2")
				]);
				vi.spyOn(RelationshipSelectors, "relationshipBindings").mockReturnValue(() => [makeBinding("b1")]);
				vi.spyOn(ActivitySelectors, "activityById").mockReturnValue(
					() =>
						({
							id: "a",
							descriptor: { instance: "Product/1" }
						}) as Activity
				);

				const { effects } = await expectSaga(initializeDataHoldersSaga, configMock.object)
					.provide([[matchers.call.fn(StoreSagas.waitForStateChange), makeLoadedResult()]])
					.dispatch(ActivityActions.push(pushPayloadMock.object))
					.silentRun();

				expect(effects.call.filter((c) => c.payload.fn === StoreSagas.waitForStateChange)).toHaveLength(2);
			});

			test("does not wait when scene has no form models", async () => {
				vi.spyOn(ModelSelectors, "modelDescriptorsByActivityId").mockReturnValue(() => [
					makeDescriptor("overview", "SomeOverviewModel")
				]);
				vi.spyOn(RelationshipSelectors, "relationshipBindings").mockReturnValue(() => []);

				const { effects } = await expectSaga(initializeDataHoldersSaga, configMock.object)
					.dispatch(ActivityActions.push(pushPayloadMock.object))
					.silentRun();

				expect(effects.call.filter((c) => c.payload.fn === StoreSagas.waitForStateChange)).toHaveLength(0);
			});
		});
	});
});

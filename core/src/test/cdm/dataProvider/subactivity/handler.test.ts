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

import { expectSaga } from "redux-saga-test-plan";
import * as matchers from "redux-saga-test-plan/matchers.js";
import { assert, beforeAll, describe, expect, it, test, vi } from "vitest";

import { type Activity, ModelSelectors } from "@com.mgmtp.a12.client/client-core";
import { type ModelGraph } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { type FormModel } from "@com.mgmtp.a12.formengine/formengine-core";
import { type DocumentModel, type GroupInstance } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";
import { THUMBNAIL_SLICE } from "@com.mgmtp.a12.client/client-core/lib/core/activity/a12-internal/thumbnails/slice.js";

import { type CddState } from "../../../../internal/cdm/cdd/core/cddState.js";
import { CddActions } from "../../../../internal/cdm/cdd/redux/index.js";
import { type ScdmDataHolderShape } from "../../../../internal/cdm/cdd/redux/dhReducersImpl.js";
import { CddSelectors } from "../../../../internal/cdm/cdd/redux/selectors.js";
import { createInitialDgCl } from "../../../../internal/cdm/cddUtils/createInitialDgCl.js";
import { queryRootName } from "../../../../internal/cdm/commons/modelUtils.js";
import { type CddDataHandler } from "../../../../internal/cdm/dataProvider/CddDataHandler.js";
import {
	SubActivityHandler,
	replaceCddDocument,
	setMarkerAfterInitialization,
	wasSubActivityEditedBefore
} from "../../../../internal/cdm/dataProvider/subactivity/SubActivityHandler.js";
import { DefaultRequestSelectorMap } from "../../../../internal/server-connectors/request-selector-map.js";
import { load } from "../../../../internal/cdm/dataProvider/StandaloneActivityHandler.js";
import {
	type ChangeLog,
	type DeepReadonly,
	type DgChangeLog,
	type DocumentGraph
} from "../../../../internal/documentGraph/core/index.js";
import { newChangeLog } from "../../../../internal/documentGraph/core/changeLog/changeLogImpl.js";
import { createModelsMock } from "../../../mocks/relationships/mocks.js";
import { createActivity, createDataHolder } from "../../../utils/activity.js";
import { stubConsoleErrors } from "../../../utils/stubs.js";

import { createMockDg, createMockSaveConfig, mockSaveDoneAction } from "../testSetup.js";

describe("com.mgmtp.a12.client.extensions.cdm.subactivity", () => {
	describe("SubActivityHandler", () => {
		describe("#load", () => {
			describe("with type 'create'", () => {
				const loadType = "create";

				beforeAll(() => {
					vi.spyOn(ModelSelectors, "modelGraph").mockReturnValue(() => ({}) as ModelGraph);
					vi.spyOn(ModelSelectors, "allModelsInScene").mockReturnValue(() => []);
				});

				describe("when the data of the sub activity was not edited before", () => {
					test("sets initial values and merges cdd if document model is a CDM", async () => {
						const { sagaToTest, modelsPromise, documentGraph, changeLog, instance, activity } = setup("load");

						const { documentModel } = await modelsPromise;

						const expectedMergeAction = CddActions.merge({
							cdm: documentModel,
							path: "",
							documentGraph,
							changeLog,
							rootDoc: instance,
							activityId: activity.id,
							selectedLinkId: undefined
						});

						await expectSaga(sagaToTest, loadType)
							.provide([
								[matchers.call.fn(wasSubActivityEditedBefore), false],
								[matchers.call.fn(createInitialDgCl), { documentGraph, changeLog }],
								[matchers.call.fn(setMarkerAfterInitialization), changeLog],
								[matchers.call.fn(queryRootName), "cdm"]
							])
							.put(expectedMergeAction)
							.silentRun();
					});

					test("sets initial values and sets data with additional cdd slice if document model is not a CDM", async () => {
						const { sagaToTest, modelsPromise, documentGraph, changeLog, instance, activity } = setup("load");

						const { documentModel } = await modelsPromise;

						const expectedSetDataAction = CddActions.setSubActivityData({
							activityId: activity.id,
							documentGraph,
							changeLog,
							cdm: documentModel,
							rootDoc: instance,
							selectedLinkId: undefined
						});

						await expectSaga(sagaToTest, loadType)
							.provide([
								[matchers.call.fn(wasSubActivityEditedBefore), false],
								[matchers.call.fn(createInitialDgCl), { documentGraph, changeLog }],
								[matchers.call.fn(setMarkerAfterInitialization), changeLog],
								[matchers.call.fn(queryRootName), undefined]
							])
							.put(expectedSetDataAction)
							.silentRun();
					});
				});

				describe("when the data of the sub activity was already edited before", () => {
					test("doesn't set initial values again", async () => {
						const { sagaToTest, modelsPromise, documentGraph, changeLog, instance, activity } = setup("load");

						const { documentModel } = await modelsPromise;

						const expectedMergeAction = CddActions.merge({
							cdm: documentModel,
							path: "",
							documentGraph,
							changeLog,
							rootDoc: instance,
							activityId: activity.id,
							selectedLinkId: undefined
						});

						await expectSaga(sagaToTest, loadType)
							.provide([
								[matchers.call.fn(wasSubActivityEditedBefore), true],
								[matchers.call.fn(replaceCddDocument), documentGraph],
								[matchers.call.fn(queryRootName), "cdm"]
							])
							.put(expectedMergeAction)
							.silentRun();
					});
				});
			});

			describe("with type 'load'", () => {
				const loadType = "load";
				test("delegates to standalone load", async () => {
					const { sagaToTest } = setup("load");
					await expectSaga(sagaToTest, loadType)
						.provide([[matchers.call.fn(load), undefined]])
						.silentRun();
				});
			});
		});

		describe("#save", () => {
			beforeAll(() => {
				vi.spyOn(ModelSelectors, "allModelsInScene").mockReturnValue(() => []);
				vi.spyOn(ModelSelectors, "modelGraph").mockReturnValue(() => ({}) as unknown as ModelGraph);
				vi.spyOn(CddSelectors, "selectModelTuple").mockReturnValue(createModelsMock());
			});

			test("saves data to parent", async () => {
				const { sagaToTest, documentGraph, changeLog, initiatingActivity } = setup("save");

				const mockScdmDH = createDataHolder({
					data: { documentGraph, changeLog, cddState: { cachedCdd: { cdd: {} } } as CddState }
				}) as Required<ScdmDataHolderShape>;

				const expectedSaveAction = CddActions.saveSubActivity({
					activityId: initiatingActivity.id,
					documentGraph: mockScdmDH.data.documentGraph,
					changeLog: mockScdmDH.data.changeLog,
					setDirty: true,
					thumbnailSlice: mockScdmDH.slices[THUMBNAIL_SLICE]
				});

				await expectSaga(sagaToTest, createMockSaveConfig({ dataHolders: [mockScdmDH] }))
					.provide([[matchers.call.fn(replaceCddDocument), mockScdmDH.data.documentGraph]])
					.put(expectedSaveAction)
					.put(mockSaveDoneAction({}))
					.silentRun();
			});

			describe("errors", () => {
				stubConsoleErrors();

				test("expects data holder to contain necessary scdm slices", async () => {
					const { sagaToTest } = setup("save");

					const runResultPromise = expectSaga(sagaToTest, createMockSaveConfig()).silentRun();

					await expect(runResultPromise).rejects.toThrow("Cannot save without a data holder that contains the cdd.");
				});
			});
		});
	});

	describe("wasSubActivityEditedBefore", () => {
		test("returns true for a persisted root doc ref", () => {
			const changeLog = newChangeLog<DeepReadonly<DocumentGraph>>();
			const rootDocRef = "a/1";

			assert.strictEqual(wasSubActivityEditedBefore(rootDocRef, changeLog), true);
		});

		test("returns true when the change log contains a root doc ref marker", () => {
			const rootDocRef = "a_NEW";
			const changeLog: DgChangeLog = {
				changeCounter: 42,
				changes: [{ kind: "marker", id: rootDocRef, snapshot: {} as DeepReadonly<DocumentGraph> }]
			};

			assert.strictEqual(wasSubActivityEditedBefore(rootDocRef, changeLog), true);
		});

		it(
			"returns false when neither the change log contains a root doc ref marker " +
				"nor the given root doc ref is from a persisted doc",
			() => {
				const rootDocRef = "a_NEW";
				const changeLog: DgChangeLog = {
					changeCounter: 42,
					changes: [{ kind: "docAdded", docRef: "b_NEW" }]
				};

				assert.strictEqual(wasSubActivityEditedBefore(rootDocRef, changeLog), false);
			}
		);
	});
});

interface TestSetup<M extends keyof CddDataHandler> {
	readonly sagaToTest: CddDataHandler[M];
	readonly documentGraph: DocumentGraph;
	readonly changeLog: ChangeLog<DeepReadonly<DocumentGraph>>;
	readonly cdd: DeepReadonly<GroupInstance>;
	readonly instance: string;
	readonly activity: Activity;
	readonly initiatingActivity: Activity;
	readonly modelsPromise: Promise<{ documentModel: DocumentModel; formModel: FormModel }>;
}

function setup<M extends keyof CddDataHandler>(method: M): TestSetup<M> {
	const mockInstance = "root";
	const documentModelName = "dm";
	const mockDG = createMockDg([{ docRef: mockInstance, loadingState: "loaded", documentModelName, document: {} }]);
	const mockChangelog = {} as ChangeLog<DeepReadonly<DocumentGraph>>;
	const mockCdd = {} as DeepReadonly<GroupInstance>;

	const activity = createActivity({
		id: "child",
		initiatingActivityId: "parent",
		descriptor: { instance: mockInstance, model: documentModelName },
		activityDataHolder: {
			data: { documentGraph: mockDG, changeLog: mockChangelog }
		}
	});
	const initiatingActivity = createActivity({
		id: "parent",
		activityDataHolder: {
			data: {
				documentGraph: mockDG,
				changeLog: mockChangelog,
				cddState: { cdm: { header: { id: "parentDm" } } }
			}
		}
	});

	const modelsPromise = Promise.resolve({
		documentModel: { content: { modelRoot: {} } },
		formModel: {}
	} as { documentModel: DocumentModel; formModel: FormModel });

	const handler = new SubActivityHandler(activity, initiatingActivity, modelsPromise, DefaultRequestSelectorMap);
	const boundSaga = handler[method].bind(handler) as CddDataHandler[M];

	return {
		sagaToTest: boundSaga,
		documentGraph: mockDG,
		changeLog: mockChangelog,
		cdd: mockCdd,
		instance: mockInstance,
		activity,
		initiatingActivity,
		modelsPromise
	};
}

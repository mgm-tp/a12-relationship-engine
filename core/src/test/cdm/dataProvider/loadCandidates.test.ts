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
import * as TypeMoq from "typemoq";
import { describe, test, vi, beforeAll, type MockInstance } from "vitest";

import {
	type Activity,
	ActivitySelectors,
	type Model,
	ModelSelectors,
	StoreSagas
} from "@com.mgmtp.a12.client/client-core";
import {
	type ModelGraph,
	type Content,
	type EntityCharacteristics
} from "@com.mgmtp.a12.dataservices/dataservices-access";
import { type FormModel } from "@com.mgmtp.a12.formengine/formengine-core";
import { type DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/index.js";

import { CddActions } from "../../../internal/cdm/cdd/redux/index.js";
import { initAndLoadCandidates } from "../../../internal/cdm/cdd/redux/actions.js";
import { createCandidateDataHoldersSaga } from "../../../internal/cdm/dataProvider/loadCandidates.js";
import { type DeepReadonly, type DocumentGraph } from "../../../internal/documentGraph/core/index.js";
import { type Relationship } from "../../../internal/relationship/index.js";

import documentGraph from "../testData/dg.json" with { type: "json" };

describe("com.mgmtp.a12.relationshipengine-core.extensions.cdm.loadCandidates", () => {
	let activityByIdSelectorStub: MockInstance;
	let modelInSceneSelectorStub: MockInstance;
	let modelGraphSelectorStub: MockInstance;
	let referencedModelsInSceneStub: MockInstance;

	beforeAll(() => {
		activityByIdSelectorStub = vi.spyOn(ActivitySelectors, "activityById");
		modelInSceneSelectorStub = vi.spyOn(ModelSelectors, "modelInScene");
		modelGraphSelectorStub = vi.spyOn(ModelSelectors, "modelGraph");
		referencedModelsInSceneStub = vi.spyOn(ModelSelectors, "referencedModelsInScene");
	});

	function testFixture(params: { hasBindings?: boolean; hasDataHolders?: boolean }): {
		activityId: string;
		cdm: DocumentModel;
		formModel: FormModel;
		modelGraph: ModelGraph;
		dataHolderDescriptors: Activity.DataHolderDescriptor[];
	} {
		const activityId = "1";
		const activity: Activity = testActivity(activityId);

		const cdm = TypeMoq.Mock.ofType<Model.DocumentAndValidationModel>().object;
		const formModel = testFormModel(params.hasBindings ? testBindings() : []).object;
		const modelGraph = testModelGraph();

		activityByIdSelectorStub.mockReturnValue(() => activity);
		modelInSceneSelectorStub.mockReturnValue(() => formModel);
		modelGraphSelectorStub.mockReturnValue(() => modelGraph);
		referencedModelsInSceneStub.mockReturnValue(() => []);

		const dataHolderDescriptors: Activity.DataHolderDescriptor[] = [
			{
				type: "candidate",
				feature: "relationship",
				instanceId: "detachedrepeat-53225"
			},
			{
				type: "candidate",
				feature: "relationship",
				instanceId: "section-5748f"
			}
		];

		return {
			activityId,
			cdm,
			formModel,
			modelGraph,
			dataHolderDescriptors
		};
	}

	describe("given a scdm form model with embedded binding configurations", () => {
		test("dispatches an action to create and load the dataholders", () => {
			const { activityId, cdm, formModel: formModelMock, modelGraph } = testFixture({ hasBindings: true });

			return expectSaga(createCandidateDataHoldersSaga)
				.dispatch(
					CddActions.merge({
						path: "",
						cdm,
						documentGraph: documentGraph as DeepReadonly<DocumentGraph>,
						rootDoc: "Contract-document/24",
						activityId
					})
				)
				.provide([
					[
						matchers.call.fn(StoreSagas.waitForStateChange),
						{
							stateChanged: true,
							returnValue: {
								uiModel: formModelMock,
								documentAndValidationModel: cdm
							}
						}
					]
				])
				.put(
					initAndLoadCandidates({
						activityId,
						bindings: testBindings(),
						modelGraph,
						modelsInScene: []
					})
				)
				.silentRun();
		});
	});

	describe("given an scdm form model without embedded binding configurations", () => {
		test("dispatches an action where bindings is empty", () => {
			const { activityId, cdm, formModel: formModelMock, modelGraph } = testFixture({ hasBindings: false });

			return expectSaga(createCandidateDataHoldersSaga)
				.dispatch(
					CddActions.merge({
						path: "",
						cdm,
						documentGraph: documentGraph as DeepReadonly<DocumentGraph>,
						rootDoc: "Contract-document/24",
						activityId
					})
				)
				.provide([
					[
						matchers.call.fn(StoreSagas.waitForStateChange),
						{
							stateChanged: true,
							returnValue: {
								uiModel: formModelMock,
								documentAndValidationModel: cdm
							}
						}
					]
				])
				.put(initAndLoadCandidates({ activityId, bindings: [], modelGraph, modelsInScene: [] }))
				.silentRun();
		});
	});

	function ecMock(role: string): EntityCharacteristics {
		const mock = TypeMoq.Mock.ofType<EntityCharacteristics>();
		mock.setup((x) => x.role).returns(() => role);
		return mock.object;
	}

	function rmContentMock(roles: string[]): Content {
		const mock = TypeMoq.Mock.ofType<Content>();
		mock.setup((x) => x.entityCharacteristics).returns(() => [ecMock(roles[0]), ecMock(roles[1])]);
		return mock.object;
	}

	function testBindings(): Relationship.UiConfigurationBinding[] {
		return [
			{
				details: {
					name: "default name",
					metaInformation: {
						version: "1.0.0"
					},
					relationshipName: "CoInsurer",
					targetRole: "businessPartner",
					components: [
						{
							id: "unused",
							name: "TableList",
							models: [
								{
									name: "CoInsurerLinks-overview",
									use: "link"
								}
							],
							props: {
								editComponent: "4711"
							}
						},
						{
							id: "4711",
							name: "DualPaneSelection",
							models: [
								{
									name: "BusinessPartner-overview",
									use: "candidate"
								},
								{
									name: "CoInsurerLinks-overview",
									use: "link"
								}
							]
						}
					]
				},
				type: "relationship",
				elementId: "detachedrepeat-53225"
			},
			{
				details: {
					name: "default name",
					metaInformation: {
						version: "1.0.0"
					},
					relationshipName: "PolicyHolder",
					targetRole: "businessPartner",
					components: [
						{
							id: "-1",
							name: "DropDownSelection",
							models: [
								{
									name: "BusinessPartner-overview",
									use: "candidate"
								},
								{
									name: "PolicyHolderLinks-overview",
									use: "link"
								}
							]
						}
					]
				},
				type: "relationship",
				elementId: "section-5748f"
			}
		];
	}

	function testModelGraph(): ModelGraph {
		return {
			documentModels: [],
			relationshipModels: [
				{
					header: {
						id: "CoInsurer",
						modelType: "relationship",
						modelVersion: "foo"
					},
					content: rmContentMock(["businessPartner", "contract"])
				},
				{
					header: {
						id: "PolicyHolder",
						modelType: "relationship",
						modelVersion: "foo"
					},
					content: rmContentMock(["contract", "businessPartner"])
				}
			],
			composeDocumentModels: []
		};
	}

	function testFormModel(bindings: Relationship.UiConfigurationBinding[]) {
		const formModelMock = TypeMoq.Mock.ofType<FormModel>();
		formModelMock
			.setup((x) => x.header)
			.returns(() => ({
				id: "Contract-form",
				modelType: "form",
				modelVersion: "32.0.0",
				annotations:
					bindings.length > 0
						? [
								{
									name: "bindingConfiguration",
									value: JSON.stringify(bindings)
								}
							]
						: undefined
			}));
		return formModelMock;
	}

	function testActivity(activityId: string): Activity {
		return {
			id: activityId,
			activationTimestamp: 1,
			descriptor: { model: "ContractCDM" },
			dataHolders: []
		};
	}
});

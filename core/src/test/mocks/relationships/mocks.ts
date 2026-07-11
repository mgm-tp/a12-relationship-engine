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

import type { Model, Header } from "@com.mgmtp.a12.base/base-model-api";
import type { Models, FormModel } from "@com.mgmtp.a12.formengine/formengine-core";
import type { OverviewModel } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import type { Activity, ActivityMap, ApplicationModel } from "@com.mgmtp.a12.client/client-core";
import type { DocumentModel, IGeneratedCodeAccessor } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import type { ModelGraph, Relationship, RelationshipModel } from "@com.mgmtp.a12.dataservices/dataservices-access";

import type { ModelState } from "../../utils/models.js";
import { createActivity, createDataHolder, setupActivityMap } from "../../utils/activity.js";
import type {
	RelationshipActions,
	Relationship as RelationshipClientApi
} from "../../../internal/relationship/index.js";

export const ACTIVITY_ID = "1";

export const FORM_MODEL_ID = "FORM_MODEL_ID";
export const FORM_MODEL_DOC_ID = "FORM_MODEL_DOC_ID";
export const CANDIDATE_OVERVIEW_MODEL_ID = "CANDIDATE_OVERVIEW_MODEL_ID";
export const CANDIDATE_OVERVIEW_MODEL_DOC_ID = "CANDIDATE_OVERVIEW_MODEL_DOC_ID";
export const LINK_OVERVIEW_MODEL_ID = "LINK_OVERVIEW_MODEL_ID";
export const LINK_OVERVIEW_MODEL_DOC_ID = "LINK_OVERVIEW_MODEL_DOC_ID";
export const LINK_FORM_MODEL_ID = "LINK_FORM_MODEL_ID";
export const LINK_FORM_MODEL_DOC_ID = "LINK_FORM_MODEL_DOC_ID";

export const COMPONENT_CONFIG = {
	id: "",
	name: "",
	candidatePageSize: 1,
	models: [
		{ name: CANDIDATE_OVERVIEW_MODEL_ID, use: "candidate" },
		{ name: LINK_OVERVIEW_MODEL_ID, use: "link" },
		{ name: LINK_FORM_MODEL_DOC_ID, use: "link" }
	]
};

export const COMPONENT_CONFIG_FORM_MODEL_FIRST = {
	id: "",
	name: "",
	candidatePageSize: 1,
	models: [
		{ name: LINK_FORM_MODEL_DOC_ID, use: "link" },
		{ name: CANDIDATE_OVERVIEW_MODEL_ID, use: "candidate" },
		{ name: LINK_OVERVIEW_MODEL_ID, use: "link" }
	]
};

export function createActivitySlice(): ActivityMap {
	return setupActivityMap([createActivity({ id: ACTIVITY_ID })]);
}

export function createModelSlice(): ModelState {
	const models = [
		...createModel({
			id: FORM_MODEL_ID,
			docId: FORM_MODEL_DOC_ID,
			type: "form",
			annotations: createBindingConfiguration()
		}),
		...createModel({
			id: CANDIDATE_OVERVIEW_MODEL_ID,
			docId: CANDIDATE_OVERVIEW_MODEL_DOC_ID,
			type: "overview"
		}),
		...createModel({
			id: LINK_OVERVIEW_MODEL_ID,
			docId: LINK_OVERVIEW_MODEL_DOC_ID,
			type: "overview"
		}),
		...createModel({
			id: LINK_FORM_MODEL_ID,
			docId: LINK_FORM_MODEL_DOC_ID,
			type: "form"
		})
	];

	return {
		applicationModel: createAppModel(),
		modelGraph: TypeMoq.Mock.ofType<ModelGraph>().object,
		models: models.reduce((modls, modl) => ({ ...modls, [modl.header.id]: modl }), {})
	};
}

function createAppModel(): ApplicationModel {
	return {
		header: TypeMoq.Mock.ofType<Header>().object,
		content: {
			region: {
				name: "APP",
				layout: { name: "MasterDetail" }
			},
			defaultRegion: ["APP"],
			modules: [
				{
					name: "RelationshipTest",
					menu: TypeMoq.Mock.ofType<ApplicationModel.Menu>().object,
					flows: [
						{
							name: "RelationshipTest",
							scenes: [
								{
									name: "FormEngineAdapterTestOverview",
									matchConditions: [],
									sceneChange: {
										onEnter: [
											{
												type: "REGION_CLEAR"
											},
											{
												type: "VIEW_ADD",
												name: "FormEngine",
												models: [{ modelType: "form", name: FORM_MODEL_ID }]
											}
										]
									}
								}
							]
						}
					]
				}
			]
		}
	};
}

function createRelationshipBinding(
	componentConfig: RelationshipClientApi.ComponentConfiguration
): RelationshipClientApi.UiConfigurationBinding {
	const uiConfig: RelationshipClientApi.UiConfiguration = {
		metaInformation: { version: "1.0.0" },
		name: "",
		targetRole: "",
		relationshipName: "",
		components: [componentConfig]
	};

	return {
		details: uiConfig,
		elementId: "a",
		type: "relationship"
	};
}

function createBindingConfiguration(): Header["annotations"] {
	const bindingConfig = [
		createRelationshipBinding(COMPONENT_CONFIG),
		createRelationshipBinding(COMPONENT_CONFIG_FORM_MODEL_FIRST)
	];

	return [
		{
			name: "bindingConfiguration",
			value: JSON.stringify(bindingConfig)
		}
	];
}

function createModel(params: {
	id: string;
	docId?: string;
	type: string;
	annotations?: Header["annotations"];
}): Model[] {
	const docModel =
		params.docId !== undefined
			? createModel({
					id: params.docId,
					type: "document"
				}).map((dm) => ({
					...dm,
					generatedCodeAccessor: TypeMoq.Mock.ofType<IGeneratedCodeAccessor>().object
				}))
			: [];

	const mock = TypeMoq.Mock.ofType<Model>();
	mock
		.setup((x) => x.header)
		.returns(() => ({
			id: params.id,
			modelType: params.type,
			modelVersion: "1.0.0",
			modelReferences: docModel.map((dm) => ({
				modelType: "document",
				reference: dm.header.id
			})),
			annotations: params.annotations
		}));
	mock.setup((x) => x.content).returns(() => ({}));

	return [{ ...mock.object }, ...docModel];
}

export function getMockModels(column: OverviewModel.Column): RelationshipClientApi.OverviewModels {
	const mockDM = TypeMoq.Mock.ofType<DocumentModel>();
	mockDM
		.setup((x) => x.content)
		.returns(() => ({
			documentUniquenessCriteria: [],
			modelInfo: TypeMoq.Mock.ofType<DocumentModel.DocumentModelInfo>().object,
			modelConfig: TypeMoq.Mock.ofType<DocumentModel.DocumentModelConfig>().object,
			modelRoot: {
				id: "root",
				name: "root",
				type: "Group",
				repeatability: 1,
				elements: [
					{
						id: "g1",
						name: "g1",
						type: "Group",
						repeatability: 1,
						elements: [
							{
								id: "stringField",
								name: "stringField",
								type: "Field",
								fieldType: {
									type: "StringType"
								}
							},
							{
								id: "numberField",
								name: "numberField",
								type: "Field",
								fieldType: {
									type: "NumberType"
								}
							},
							{
								id: "enumField",
								name: "enumField",
								type: "Field",
								fieldType: {
									type: "EnumerationType",
									values: [
										{
											value: "v1",
											label: [
												{ locale: "en", text: "Label.en" },
												{ locale: "de", text: "Label.de" }
											]
										}
									]
								}
							}
						]
					}
				]
			}
		}));

	const mockOM = TypeMoq.Mock.ofType<OverviewModel>();
	mockOM
		.setup((x) => x.content)
		.returns(() => ({
			configuration: TypeMoq.Mock.ofType<OverviewModel.Configuration>().object,
			rowActionGroup: {},
			columns: [column]
		}));

	return {
		loadingState: "loaded",
		overviewModel: mockOM.object,
		documentModel: mockDM.object,
		validatorProvider: TypeMoq.Mock.ofType<IGeneratedCodeAccessor>().object
	};
}

export function createDocumentModel(): DocumentModel {
	return {
		header: {
			id: "MY_MOCKED_MODEL",
			modelType: "document",
			modelVersion: "26.0.0",
			locales: [{ code: "de" }]
		},
		content: {
			modelInfo: {},
			modelConfig: { timeZone: "UTC" },
			modelRoot: {
				type: "Group",
				id: "RootGroup",
				name: "RootGroup",
				repeatability: 1,
				elements: [
					{
						id: "F0",
						type: "Field",
						name: "testField",
						fieldType: {
							type: "StringType"
						}
					}
				]
			},
			documentUniquenessCriteria: []
		}
	};
}

export function createOverviewModel(): OverviewModel {
	return {
		header: {
			id: "MY_MOCKED_OVERVIEW_MODEL",
			modelType: "overview",
			modelVersion: "38.0.0",
			locales: [{ code: "de" }],
			modelReferences: [
				{
					purpose: "document-model-for-overview",
					modelType: "document",
					alias: "DM",
					reference: "MY_MOCKED_MODEL"
				}
			]
		},
		content: {
			configuration: {
				enableFilter: false,
				showFullTextSearch: false,
				pagingSize: 10
			},
			columns: [
				{
					id: "column-4536a",
					width: 1,
					elementRef: "F0",
					sortable: false
				}
			],
			rowActionGroup: {
				actions: []
			}
		}
	};
}

export function createFormModel(): FormModel {
	return {
		header: {
			id: "MY_MOCKED_FORM_MODEL",
			modelType: "form",
			modelVersion: "37.0.0"
		},
		content: {
			defaults: {},
			dependentScreenElements: {},
			fieldConfiguration: { fieldMap: {} },
			footerBox: {
				id: "footerbox"
			},
			subHeaderBox: {
				id: "subHeaderBox"
			},
			groupConfiguration: { groupMap: {} },
			screens: []
		}
	};
}

export function createRelationshipModel(): RelationshipModel {
	return {
		header: {
			id: "MY_MOCKED_RELATIONSHIP_MODEL",
			modelType: "relationship",
			modelVersion: "3.0.0",
			locales: [
				{
					code: "de"
				}
			],
			modelReferences: [
				{
					purpose: "Document model",
					modelType: "document",
					alias: "MY_MOCKED_MODEL",
					reference: "MY_MOCKED_MODEL"
				}
			]
		},
		content: {
			duplicatesAllowed: false,
			associationType: "SHARED",
			storage: "EXTERNAL",
			linkDocumentModel: null,
			embeddedGroupPath: null,
			labels: [
				{
					locale: "en"
				},
				{
					locale: "de"
				}
			],
			entityCharacteristics: [
				{
					role: "Parent",
					documentModel: "MY_MOCKED_MODEL",
					ordered: false,
					navigable: true,
					linkConstraints: {
						multiplicity: {
							lowerLimit: 0,
							unbounded: true,
							upperLimit: null
						}
					},
					candidateConstraints: null
				},
				{
					role: "Child",
					documentModel: "MY_MOCKED_MODEL",
					ordered: true,
					navigable: true,
					linkConstraints: {
						multiplicity: {
							lowerLimit: 0,
							unbounded: false,
							upperLimit: 1
						}
					},
					candidateConstraints: null
				}
			]
		}
	} as RelationshipModel;
}

export function createModelsMock(): Models {
	return {
		documentModel: createDocumentModel(),
		formModel: createFormModel()
	};
}

type OverviewModelsLoaded = Extract<RelationshipClientApi.OverviewModels, { loadingState: "loaded" }>;

export function createOverviewModelsLoaded(dm?: DocumentModel): OverviewModelsLoaded {
	const overviewModelsMock = TypeMoq.Mock.ofType<OverviewModelsLoaded>();
	overviewModelsMock.setup((x) => x.loadingState).returns(() => "loaded");
	overviewModelsMock.setup((x) => x.documentModel).returns(() => dm ?? createDocumentModel());
	overviewModelsMock.setup((x) => x.overviewModel).returns(() => createOverviewModel());

	return overviewModelsMock.object;
}

export function createLinkRef(params: {
	id: string;
	docRef1: string;
	role1: string;
	docRef2: string;
	role2: string;
	relationshipModel: string;
}): Relationship.LinkRef {
	const { id, docRef1, role1, docRef2, role2, relationshipModel } = params;

	return {
		id,
		linkDescriptor: createLinkDescriptor(relationshipModel, docRef1, role1, docRef2, role2)
	};
}

export function createLinkRefResponse(params: {
	id: string;
	docRef1: string;
	role1: string;
	docRef2: string;
	role2: string;
	relationshipModel: string;
}): Relationship.LinkRefResponse {
	const { id, docRef1, role1, docRef2, role2, relationshipModel } = params;

	return {
		id,
		linkDescriptor: createLinkDescriptorResponse(relationshipModel, docRef1, role1, docRef2, role2)
	};
}

export function createLinkDescriptor(
	relationshipModel: string,
	leftDocRef: string,
	leftRole: string,
	rightDocRef: string,
	rightRole: string
): Relationship.LinkDescriptor {
	return {
		relationshipModel,
		entities: [
			{
				role: leftRole,
				docRef: leftDocRef
			},
			{
				role: rightRole,
				docRef: rightDocRef
			}
		]
	};
}

export function createLinkDescriptorResponse(
	relationshipModel: string,
	leftDocRef: string,
	leftRole: string,
	rightDocRef: string,
	rightRole: string,
	leftModelName?: string,
	rightModelName?: string
): Relationship.LinkDescriptorResponse {
	return {
		relationshipModel,
		entities: [
			{
				role: leftRole,
				docRef: leftDocRef,
				modelName: leftModelName ?? leftDocRef
			},
			{
				role: rightRole,
				docRef: rightDocRef,
				modelName: rightModelName ?? rightDocRef
			}
		]
	};
}

export function createCandidateDataholder(
	relationshipName: string,
	instanceId: string,
	candidates?: Relationship.Candidate[]
): Activity.DataHolder<RelationshipClientApi.CandidateInstance> {
	const mockInstance = TypeMoq.Mock.ofType<RelationshipClientApi.CandidateInstance>();

	mockInstance
		.setup((m) => m.uiConfiguration)
		.returns(() => ({ relationshipName }) as RelationshipClientApi.UiConfiguration);
	mockInstance.setup((m) => m.sourceEntity).returns(() => ({ docRef: "d1", role: "r1" }));
	mockInstance.setup((m) => m.candidates).returns(() => candidates ?? [createCandidate()]);
	mockInstance
		.setup((m) => m.candidatePagination)
		.returns(() => ({
			offset: 0,
			limit: 10,
			fullCount: candidates?.length ?? 1,
			pageSize: 1,
			pageNumber: 1
		}));

	return createDataHolder({
		data: mockInstance.object,
		descriptor: { feature: "relationship", type: "candidate", instanceId }
	});
}

export function createLinkDataholder(
	relationshipName: string,
	instanceId: string,
	links?: RelationshipClientApi.LinkWithDocument[]
): Activity.DataHolder<RelationshipClientApi.LinkInstance> {
	const mockInstance = TypeMoq.Mock.ofType<RelationshipClientApi.LinkInstance>();

	mockInstance
		.setup((m) => m.uiConfiguration)
		.returns(() => ({ relationshipName }) as RelationshipClientApi.UiConfiguration);
	mockInstance.setup((m) => m.sourceEntity).returns(() => ({ docRef: "d1", role: "r1" }));
	mockInstance.setup((m) => m.links).returns(() => links ?? [createLinkWithDocument()]);
	mockInstance
		.setup((m) => m.linkPagination)
		.returns(() => ({
			offset: 0,
			limit: 10,
			fullCount: links?.length ?? 1,
			pageSize: 1,
			pageNumber: 1
		}));

	return createDataHolder({
		data: mockInstance.object,
		descriptor: { feature: "relationship", type: "link", instanceId }
	});
}

export function createCandidate(document: Record<string, object> = {}): Relationship.Candidate {
	return {
		linkRef: createLinkRefResponse({
			id: "candidate",
			docRef1: "d1",
			docRef2: "d2",
			relationshipModel: "rm",
			role1: "r1",
			role2: "r2"
		}),
		document
	};
}

export function createLinkWithDocument(document: Record<string, unknown> = {}): RelationshipClientApi.LinkWithDocument {
	return {
		linkRef: createLinkRef({
			id: "link",
			docRef1: "d1",
			docRef2: "d2",
			relationshipModel: "rm",
			role1: "r1",
			role2: "r2"
		}),
		document
	};
}

export function createMutation(opts: Partial<RelationshipClientApi.Mutation> = {}): RelationshipClientApi.Mutation {
	return {
		link: createLinkWithDocument(),
		modified: false,
		relinked: false,
		mutationState: "added",
		...opts
	};
}

export function createCandidatePayload(
	opts: Partial<RelationshipActions.Commands.SetCandidatesPayload> = {}
): RelationshipActions.Commands.SetCandidatesPayload {
	return {
		candidates: [],
		activityId: "",
		instanceId: "",
		fullCount: 0,
		offset: 0,
		limit: 10,
		...opts
	};
}

export function createLinkPayload(
	opts: Partial<RelationshipActions.Commands.SetLinksPayload> = {}
): RelationshipActions.Commands.SetLinksPayload {
	return { links: [], activityId: "", instanceId: "", fullCount: 0, offset: 0, limit: 10, ...opts };
}

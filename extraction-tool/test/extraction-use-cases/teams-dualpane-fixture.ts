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

import { vi } from "vitest";

import type { GenericModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import type { OverviewModel } from "../../src/models/overview-model.js";
import { extractionTransform } from "../../src/internal/steps/RuM/extraction/index.js";
import { createFixtureContext } from "../internal/test-support/fixture-context-factory.js";
import {
	FORM_MODEL_VERSION,
	DOCUMENT_MODEL_VERSION,
	OVERVIEW_MODEL_VERSION,
	RELATIONSHIP_MODEL_VERSION
} from "../../src/internal/steps/RuM/extraction/constants.js";

import { requireModel, toFixtureModel, type FixtureModel } from "./location-dualpane-fixture.js";

export const TEAM_FORM_ID = "Team";
export const TEAM_RELATIONSHIP_ID = "TeamPerson";
export const TEAM_LINK_FORM_ID = "TeamPerson_LinkForm";
export const TEAM_RUM_ID = "Team-binding-default-name-section-nbh8s_RuM";
export const TEAM_AVAILABLE_OVERVIEW_ID = "PersonCandidates-overview";
export const TEAM_AVAILABLE_QUERY_ID = `${TEAM_AVAILABLE_OVERVIEW_ID}-query`;
export const TEAM_SELECTED_OVERVIEW_ID = "TeamPerson_Person_LinkOverview-overview";
export const TEAM_SELECTED_GENERATED_DOCUMENT_ID = "TeamPerson_Person____generated";

export interface TeamsExtractionResult {
	readonly workspaceModels: readonly FixtureModel[];
	readonly addedModels: readonly FixtureModel[];
	readonly updatedForm: FixtureModel;
	readonly rumModel: FixtureModel;
	readonly survivingModels: readonly FixtureModel[];
	readonly findSurvivingById: (id: string) => FixtureModel | undefined;
}

export function runTeamsDualPaneExtraction(): TeamsExtractionResult {
	const workspaceModels = createWorkspaceModels().map(toFixtureModel);
	const harness = createFixtureContext({ models: workspaceModels, config: { keepModels: false } });
	const updatedForm = toFixtureModel(
		extractionTransform(createTeamForm(), { log: vi.fn(), info: vi.fn(), error: vi.fn() }, harness.context)
	);
	const addedModels = harness.getAddedModels().map(toFixtureModel);
	const survivingModels = mergeSurvivingModels(workspaceModels, addedModels, updatedForm, harness.getDeletedIds());
	const rumModel = requireModel(
		addedModels.find((model) => model.header.modelType === "relationship-ui"),
		"Team DualPane relationship-ui"
	);

	return {
		workspaceModels,
		addedModels,
		updatedForm,
		rumModel,
		survivingModels,
		findSurvivingById: (id) => survivingModels.find((model) => model.header.id === id)
	};
}

function createWorkspaceModels(): readonly GenericModel[] {
	return [
		createTeamForm(),
		createRelationshipModel(),
		createAvailableOverview(),
		createSelectedOverview(),
		createTeamLinkForm(),
		createDomainTeamDocument(),
		createDomainPersonDocument(),
		createLinkDocument(),
		createSelectedGeneratedDocument()
	];
}

function createTeamForm(): GenericModel {
	return {
		header: {
			id: TEAM_FORM_ID,
			modelType: "form",
			modelVersion: FORM_MODEL_VERSION,
			modelReferences: [
				{ alias: "DM", modelType: "document", purpose: "data binding", reference: "DomainTeam" },
				{
					alias: TEAM_AVAILABLE_OVERVIEW_ID,
					modelType: "overview",
					purpose: "bindingReference",
					reference: TEAM_AVAILABLE_OVERVIEW_ID
				},
				{
					alias: TEAM_SELECTED_OVERVIEW_ID,
					modelType: "overview",
					purpose: "bindingReference",
					reference: TEAM_SELECTED_OVERVIEW_ID
				},
				{ alias: TEAM_LINK_FORM_ID, modelType: "form", purpose: "bindingReference", reference: TEAM_LINK_FORM_ID }
			],
			annotations: [{ name: "bindingConfiguration", value: JSON.stringify([createBindingConfiguration()]) }]
		},
		content: {
			screens: [{ id: "screen1", name: "Screen1", screenElements: [createRelationshipElement()] }],
			fieldConfiguration: {},
			groupConfiguration: {},
			defaults: {}
		}
	} as GenericModel;
}

function createRelationshipModel(): GenericModel {
	return {
		header: {
			id: TEAM_RELATIONSHIP_ID,
			modelType: "relationship",
			modelVersion: RELATIONSHIP_MODEL_VERSION,
			modelReferences: [
				{ purpose: "Document model", modelType: "document", alias: "Person", reference: "DomainPerson" },
				{ purpose: "Document model", modelType: "document", alias: "Team", reference: "DomainTeam" },
				{
					purpose: "Link Document model",
					modelType: "document",
					alias: "Link Model",
					reference: "DomainTeamPerson_AdditionalFieldsModel"
				}
			]
		},
		content: {
			duplicatesAllowed: false,
			linkDocumentModel: "DomainTeamPerson_AdditionalFieldsModel",
			entityCharacteristics: [
				{
					role: "Person",
					documentModel: "DomainPerson",
					ordered: false,
					linkConstraints: { multiplicity: { unbounded: true } }
				},
				{
					role: "Team",
					documentModel: "DomainTeam",
					ordered: true,
					linkConstraints: { multiplicity: { unbounded: true } }
				}
			]
		}
	} as GenericModel;
}

function createAvailableOverview(): GenericModel {
	return overviewModel(TEAM_AVAILABLE_OVERVIEW_ID, "DomainPerson", ["F3", "F4"]);
}

function createSelectedOverview(): GenericModel {
	return overviewModel(TEAM_SELECTED_OVERVIEW_ID, TEAM_SELECTED_GENERATED_DOCUMENT_ID, [
		"I4_F3",
		"I4_F4",
		"I5_field_04443"
	]);
}

function overviewModel(id: string, documentReference: string, elementRefs: readonly string[]): OverviewModel {
	return {
		header: {
			id,
			modelType: "overview",
			modelVersion: OVERVIEW_MODEL_VERSION,
			modelReferences: [
				{ purpose: "document-model-for-overview", modelType: "document", alias: "DM", reference: documentReference }
			]
		},
		content: {
			configuration: { enableFilter: true },
			columns: elementRefs.map((elementRef, index) => ({
				id: `column-${index}`,
				elementRef,
				sortable: false,
				width: 1
			})),
			rowActionGroup: {}
		}
	};
}

function createTeamLinkForm(): GenericModel {
	return {
		header: {
			id: TEAM_LINK_FORM_ID,
			modelType: "form",
			modelVersion: FORM_MODEL_VERSION,
			modelReferences: [
				{
					alias: "DM",
					modelType: "document",
					purpose: "data binding",
					reference: "DomainTeamPerson_AdditionalFieldsModel"
				}
			]
		},
		content: {
			screens: [{ id: "screen1", name: "Screen1", screenElements: [] }],
			fieldConfiguration: {},
			groupConfiguration: {},
			defaults: {}
		}
	} as GenericModel;
}

function createDomainTeamDocument(): GenericModel {
	return documentModel("DomainTeam", [
		{ type: "Field", id: "field_c9ad3", name: "TeamName", Field: { fieldType: { type: "StringType" } } }
	]);
}

function createDomainPersonDocument(): GenericModel {
	return documentModel("DomainPerson", [
		{ type: "Field", id: "F3", name: "FirstName", Field: { fieldType: { type: "StringType" } } },
		{ type: "Field", id: "F4", name: "LastName", Field: { fieldType: { type: "StringType" } } }
	]);
}

function createLinkDocument(): GenericModel {
	return documentModel("DomainTeamPerson_AdditionalFieldsModel", [
		{ type: "Field", id: "field_04443", name: "Role", Field: { fieldType: { type: "StringType" } } }
	]);
}

function createSelectedGeneratedDocument(): GenericModel {
	return {
		header: {
			id: TEAM_SELECTED_GENERATED_DOCUMENT_ID,
			modelType: "document",
			modelVersion: DOCUMENT_MODEL_VERSION,
			modelReferences: [
				{ alias: "DomainPerson", modelType: "document", purpose: "include", reference: "DomainPerson" },
				{
					alias: "DomainTeamPerson_AdditionalFieldsModel",
					modelType: "document",
					purpose: "include",
					reference: "DomainTeamPerson_AdditionalFieldsModel"
				}
			]
		},
		content: {
			modelRoot: {
				rootGroups: [
					includedGroup("G1", "target", "I4", "person", "DomainPerson"),
					includedGroup("G2", "relationship", "I5", "link", "DomainTeamPerson_AdditionalFieldsModel")
				]
			}
		}
	} as GenericModel;
}

function documentModel(id: string, elements: readonly unknown[]): GenericModel {
	return {
		header: { id, modelType: "document", modelVersion: DOCUMENT_MODEL_VERSION },
		content: {
			modelRoot: { rootGroups: [{ type: "Group", id: `${id}-group`, name: id, Group: { repeatability: 1, elements } }] }
		}
	} as GenericModel;
}

function createBindingConfiguration(): Record<string, unknown> {
	return {
		type: "relationship",
		details: {
			name: "default name",
			metaInformation: { version: "1.0.0" },
			relationshipName: TEAM_RELATIONSHIP_ID,
			targetRole: "Person",
			components: [
				{
					id: "-1",
					name: "DualPaneSelection",
					candidatePageSize: 10,
					models: createBindingModels(),
					props: { height: 328 }
				}
			]
		},
		elementId: "section-nbh8s"
	};
}

function createBindingModels(): readonly Record<string, string>[] {
	return [
		{ name: TEAM_AVAILABLE_OVERVIEW_ID, use: "candidate" },
		{ name: TEAM_SELECTED_OVERVIEW_ID, use: "link" },
		{ name: TEAM_LINK_FORM_ID, use: "link" }
	];
}

function createRelationshipElement(): Record<string, unknown> {
	return {
		type: "CustomScreenElement",
		id: "section-nbh8s",
		name: "DualpanePeople",
		annotations: [{ name: "relationship" }]
	};
}

function includedGroup(
	groupId: string,
	groupName: string,
	includeId: string,
	includeName: string,
	reference: string
): unknown {
	return {
		type: "Group",
		id: groupId,
		name: groupName,
		Group: {
			repeatability: 1,
			elements: [
				{ type: "Group", id: includeId, name: includeName, Group: { repeatability: 1, includeConfig: { reference } } }
			]
		}
	};
}

function mergeSurvivingModels(
	workspaceModels: readonly FixtureModel[],
	addedModels: readonly FixtureModel[],
	updatedForm: FixtureModel,
	deletedIds: readonly string[]
): readonly FixtureModel[] {
	const deletedIdSet = new Set(deletedIds);
	const byId = new Map<string, FixtureModel>();

	for (const model of [...workspaceModels, ...addedModels, updatedForm]) {
		if (!deletedIdSet.has(model.header.id)) {
			byId.set(model.header.id, model);
		}
	}

	return [...byId.values()];
}

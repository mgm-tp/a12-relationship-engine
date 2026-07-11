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

import { it, vi, expect, describe } from "vitest";

import type { GenericModel, MigrationStepContext } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import type { OverviewModel } from "../../../../../src/models/overview-model.js";
import { extractionTransform } from "../../../../../src/internal/steps/RuM/extraction/index.js";
import {
	FORM_MODEL_VERSION,
	OVERVIEW_MODEL_VERSION
} from "../../../../../src/internal/steps/RuM/extraction/constants.js";
import {
	RUM_VERSION,
	DOCUMENT_MODEL_VERSION,
	RELATIONSHIP_MODEL_VERSION
} from "../../../../../src/internal/steps/RuM/extraction/constants.js";

function createMockContext(models: readonly object[]): MigrationStepContext {
	const modelEntries = models as Array<{ header: { id: string } }>;
	const modelMap = new Map(modelEntries.map((entry) => [entry.header.id, entry as object]));
	const workspaceModelEntries = modelEntries.map((model) => ({
		header: model.header,
		path: `${model.header.id}.json`
	}));
	const workspaceModels = new Map(workspaceModelEntries.map((entry) => [entry.header.id, entry]));

	return {
		addModel: vi.fn(),
		deleteModel: vi.fn(),
		findResource: vi.fn(),
		findModel: (id: string) => workspaceModels.get(id),
		findModelsByType: vi.fn(),
		workspace: { models: workspaceModelEntries },
		resolveModel: (entry: unknown) => {
			const id =
				typeof entry === "object" && entry !== null && "header" in entry
					? (entry as { header: { id?: string } }).header.id
					: undefined;

			return typeof id === "string" ? modelMap.get(id) : undefined;
		},
		resolveResource: vi.fn(),
		addResource: vi.fn(),
		deleteCurrentModel: vi.fn(),
		deleteResource: vi.fn()
	} as unknown as MigrationStepContext;
}

function createFormContent(bindingEntries: readonly object[]): object {
	return {
		screens: [
			{
				id: "screen-1",
				name: "Screen 1",
				screenElements: bindingEntries.map((bindingEntry) => ({
					id: (bindingEntry as { elementId?: string }).elementId ?? "unbound-element",
					name: (bindingEntry as { elementId?: string }).elementId ?? "unbound-element",
					type: "CustomScreenElement"
				}))
			}
		],
		subHeaderBox: { id: "sub-header-box" },
		footerBox: { id: "footer-box" },
		fieldConfiguration: {},
		groupConfiguration: {},
		defaults: {}
	};
}

function makeNonKeepModelsSmokeFormModel(bindingEntries: readonly object[]): GenericModel {
	return {
		header: {
			id: "Team-form",
			modelType: "form",
			modelVersion: "1.0.0",
			modelReferences: [
				{ reference: "Team-document", modelType: "document", purpose: "document" },
				{ reference: "TeamPerson_AvailableItemsOverview", modelType: "overview", purpose: "bindingReference" },
				{ reference: "TeamPerson_Person_LinkOverview-overview", modelType: "overview", purpose: "bindingReference" },
				{ reference: "TeamPerson_LinkForm", modelType: "form", purpose: "bindingReference" },
				{ reference: "UnrelatedHistory-overview", modelType: "overview", purpose: "bindingReference" }
			],
			annotations: [{ name: "bindingConfiguration", value: JSON.stringify(bindingEntries) }]
		},
		content: createFormContent(bindingEntries)
	} as unknown as GenericModel;
}

function makeDualPaneRowActionBindingEntry(): object {
	return {
		type: "relationship",
		elementId: "section-team-person",
		details: {
			name: "TeamPersonRelation",
			relationshipName: "TeamPerson",
			targetRole: "Person",
			metaInformation: { version: "1.0.0" },
			components: [
				{
					name: "DualPaneSelection",
					id: "team-person-dualpane",
					models: [
						{ name: "TeamPerson_AvailableItemsOverview", use: "candidate" },
						{ name: "TeamPerson_Person_LinkOverview-overview", use: "link" },
						{ name: "TeamPerson_LinkForm", use: "link" }
					]
				}
			]
		}
	};
}

function makeSelectedOverviewBindingEntry(selectedOverviewId: string): object {
	return {
		type: "relationship",
		elementId: "section-shared",
		details: {
			name: "Shared binding",
			relationshipName: "TeamPerson",
			targetRole: "Person",
			metaInformation: { version: "1.0.0" },
			components: [
				{
					name: "DualPaneSelection",
					id: "section-shared-component",
					models: [
						{ name: "TeamPerson_AvailableItemsOverview", use: "candidate" },
						{ name: selectedOverviewId, use: "link" },
						{ name: "TeamPerson_LinkForm", use: "link" }
					]
				}
			]
		}
	};
}

function makeDocumentModel(id: string): object {
	return {
		header: { id, modelType: "document", modelVersion: DOCUMENT_MODEL_VERSION },
		content: { modelRoot: { rootGroups: [] } }
	};
}

function makeRelationshipModel(): object {
	return {
		header: { id: "TeamPerson", modelType: "relationship", modelVersion: RELATIONSHIP_MODEL_VERSION },
		content: {
			duplicatesAllowed: false,
			entityCharacteristics: [
				{ role: "Person", documentModel: "Person-document" },
				{ role: "Team", documentModel: "Team-document" }
			]
		}
	};
}

function makeLinkFormModel(id: string): object {
	return {
		header: { id, modelType: "form", modelVersion: FORM_MODEL_VERSION, modelReferences: [] },
		content: createFormContent([])
	};
}

function makeDocumentBackedOverviewModelWithColumns(
	id: string,
	documentModelId: string,
	columns: ReadonlyArray<{
		readonly id: string;
		readonly elementRef: string;
		readonly sortable?: boolean;
		readonly width?: number;
	}>
): OverviewModel {
	return {
		header: {
			id,
			modelType: "overview",
			modelVersion: OVERVIEW_MODEL_VERSION,
			annotations: [],
			modelReferences: [{ purpose: "document-model-for-overview", modelType: "document", reference: documentModelId }]
		},
		content: {
			configuration: { enableFilter: true },
			columns: columns.map((col) => ({ width: 1, ...col })),
			rowActionGroup: {}
		}
	};
}

function makeDocumentBackedOverviewModel(id: string, documentModelId: string): object {
	return makeDocumentBackedOverviewModelWithColumns(id, documentModelId, []);
}

function makeGeneratedDocModelWithOptionalLink(id: string, targetDocumentId: string, linkDocumentId?: string): object {
	return {
		header: { id, modelType: "document", modelVersion: DOCUMENT_MODEL_VERSION },
		content: {
			modelRoot: {
				rootGroups: [
					{
						type: "rootGroup",
						id: "target-root",
						name: "target",
						Group: {
							elements: [
								{
									id: "I4_root",
									type: "element",
									Group: { includeConfig: { reference: targetDocumentId }, elements: [] }
								},
								...(linkDocumentId === undefined
									? []
									: [
											{
												id: "I5_root",
												type: "element",
												Group: { includeConfig: { reference: linkDocumentId }, elements: [] }
											}
										])
							]
						}
					}
				]
			}
		}
	};
}

function makeLegacyWorkspaceFormModel(id: string, selectedOverviewId: string): object {
	const bindingEntries = [makeSelectedOverviewBindingEntry(selectedOverviewId)];

	return {
		header: {
			id,
			modelType: "form",
			modelVersion: "1.0.0",
			modelReferences: [
				{ reference: "Team-document", modelType: "document", purpose: "document" },
				{ reference: selectedOverviewId, modelType: "overview", purpose: "bindingReference" }
			],
			annotations: [{ name: "bindingConfiguration", value: JSON.stringify(bindingEntries) }]
		},
		content: createFormContent(bindingEntries)
	} as unknown as GenericModel;
}

function makeMigratedRelationshipUiModel(id: string, selectedOverviewId: string): object {
	return {
		header: {
			id,
			modelType: "relationship-ui",
			modelVersion: RUM_VERSION,
			modelReferences: [{ purpose: "selectedItems", modelType: "overview", reference: selectedOverviewId }]
		},
		content: { component: { componentType: "DualPaneSelection", selectedItemsOverviewModel: selectedOverviewId } }
	};
}

function makeGenericReferenceModel(id: string, references: readonly string[]): object {
	return {
		header: {
			id,
			modelType: "query",
			modelVersion: "1.0.0",
			modelReferences: references.map((reference) => ({
				purpose: "generic-reference",
				modelType: reference.endsWith("____generated") ? "document" : "overview",
				reference
			}))
		},
		content: { references }
	};
}

function getAddedModels(context: MigrationStepContext): readonly object[] {
	return (context.addModel as ReturnType<typeof vi.fn>).mock.calls.map(
		([payload]) => (payload as { model: object }).model
	);
}

function findModelById(context: MigrationStepContext, modelId: string): object | undefined {
	return getAddedModels(context).find((model) => (model as { header?: { id?: string } }).header?.id === modelId);
}

function writtenModelsContainExactString(
	updatedForm: GenericModel,
	context: MigrationStepContext,
	targetId: string
): boolean {
	return [updatedForm, ...getAddedModels(context)].some((model) => jsonTreeContainsExactString(model, targetId));
}

function jsonTreeContainsExactString(value: unknown, targetId: string): boolean {
	if (typeof value === "string") {
		return value === targetId;
	}

	if (Array.isArray(value)) {
		return value.some((entry) => jsonTreeContainsExactString(entry, targetId));
	}

	return typeof value === "object" && value !== null
		? Object.values(value).some((entry) => jsonTreeContainsExactString(entry, targetId))
		: false;
}

function createTargetOnlyOrphanSelectedOverviewCleanupFixture(keepModels = false): {
	readonly context: MigrationStepContext;
	readonly formModel: GenericModel;
	readonly orphanOverviewId: string;
	readonly orphanGeneratedDocId: string;
} {
	const orphanOverviewId = "TeamTeam_Parent_LinkOverview-overview";
	const orphanGeneratedDocId = "TeamTeam_Parent____generated";
	const formModel = makeNonKeepModelsSmokeFormModel([makeDualPaneRowActionBindingEntry()]);
	const context = createMockContext([
		makeDocumentModel("Team-document"),
		makeDocumentModel("Person-document"),
		makeDocumentModel("TeamPerson-document"),
		makeRelationshipModel(),
		makeDocumentBackedOverviewModel("TeamPerson_AvailableItemsOverview", "Person-document"),
		makeDocumentBackedOverviewModel(
			"TeamPerson_Person_LinkOverview-overview",
			"TeamPerson_Person_LinkOverview-overview____generated"
		),
		makeGeneratedDocModelWithOptionalLink(
			"TeamPerson_Person_LinkOverview-overview____generated",
			"Person-document",
			"TeamPerson-document"
		),
		makeLinkFormModel("TeamPerson_LinkForm"),
		makeDocumentBackedOverviewModelWithColumns(orphanOverviewId, orphanGeneratedDocId, [
			{ id: "column-first-name", elementRef: "I4_field_c2497" },
			{ id: "column-last-name", elementRef: "I4_field_c9ad3" }
		]),
		makeGeneratedDocModelWithOptionalLink(orphanGeneratedDocId, "DomainTeam")
	]);

	(context as unknown as { userConfig?: { keepModels?: boolean } }).userConfig = { keepModels };

	return { context, formModel, orphanOverviewId, orphanGeneratedDocId };
}

function createReferencedSelectedOverviewCleanupFixture(): {
	readonly context: MigrationStepContext;
	readonly formModel: GenericModel;
	readonly sharedOverviewId: string;
	readonly sharedGeneratedDocId: string;
	readonly migratedOverviewId: string;
	readonly migratedGeneratedDocId: string;
} {
	const sharedOverviewId = "Shared_LinkOverview-overview";
	const sharedGeneratedDocId = `${sharedOverviewId}____generated`;
	const migratedOverviewId = "Migrated_LinkOverview-overview";
	const migratedGeneratedDocId = `${migratedOverviewId}____generated`;

	return {
		context: createMockContext([
			makeDocumentModel("Team-document"),
			makeDocumentModel("Person-document"),
			makeDocumentModel("TeamPerson-document"),
			makeRelationshipModel(),
			makeDocumentBackedOverviewModel("TeamPerson_AvailableItemsOverview", "Person-document"),
			makeDocumentBackedOverviewModel(
				"TeamPerson_Person_LinkOverview-overview",
				"TeamPerson_Person_LinkOverview-overview____generated"
			),
			makeGeneratedDocModelWithOptionalLink(
				"TeamPerson_Person_LinkOverview-overview____generated",
				"Person-document",
				"TeamPerson-document"
			),
			makeLinkFormModel("TeamPerson_LinkForm"),
			makeDocumentBackedOverviewModelWithColumns(sharedOverviewId, sharedGeneratedDocId, [
				{ id: "column-first-name", elementRef: "I4_F3" },
				{ id: "column-link-value", elementRef: "I5_field_04443" }
			]),
			makeGeneratedDocModelWithOptionalLink(sharedGeneratedDocId, "Person-document", "TeamPerson-document"),
			makeDocumentBackedOverviewModelWithColumns(migratedOverviewId, migratedGeneratedDocId, [
				{ id: "column-first-name", elementRef: "I4_F3" },
				{ id: "column-link-value", elementRef: "I5_field_04443" }
			]),
			makeGeneratedDocModelWithOptionalLink(migratedGeneratedDocId, "Person-document", "TeamPerson-document"),
			makeLegacyWorkspaceFormModel("Shared-form", sharedOverviewId),
			makeMigratedRelationshipUiModel("Migrated_RuM", migratedOverviewId),
			makeGenericReferenceModel("GenericRef-query", [migratedOverviewId, migratedGeneratedDocId])
		]),
		formModel: makeNonKeepModelsSmokeFormModel([makeDualPaneRowActionBindingEntry()]),
		sharedOverviewId,
		sharedGeneratedDocId,
		migratedOverviewId,
		migratedGeneratedDocId
	};
}

describe("extractionTransform orphan selected overview cleanup", () => {
	it("non-keepModels: deletes unreferenced target-only selected link overview artifacts", () => {
		const { context, formModel, orphanOverviewId, orphanGeneratedDocId } =
			createTargetOnlyOrphanSelectedOverviewCleanupFixture();
		const updatedForm = extractionTransform(formModel, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, context);
		const deletedIds = (context.deleteModel as ReturnType<typeof vi.fn>).mock.calls.map(([id]) => id);

		expect(deletedIds).toEqual(
			expect.arrayContaining([
				"TeamPerson_Person_LinkOverview-overview____generated",
				orphanOverviewId,
				orphanGeneratedDocId
			])
		);
		expect(findModelById(context, orphanOverviewId)).toBeUndefined();
		expect(writtenModelsContainExactString(updatedForm, context, orphanOverviewId)).toBe(false);
		expect(writtenModelsContainExactString(updatedForm, context, orphanGeneratedDocId)).toBe(false);
	});

	it("keepModels: preserves target-only selected link overview artifacts", () => {
		const { context, formModel, orphanOverviewId, orphanGeneratedDocId } =
			createTargetOnlyOrphanSelectedOverviewCleanupFixture(true);
		extractionTransform(formModel, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, context);
		const deletedIds = (context.deleteModel as ReturnType<typeof vi.fn>).mock.calls.map(([id]) => id);

		expect(deletedIds).not.toContain(orphanOverviewId);
		expect(deletedIds).not.toContain(orphanGeneratedDocId);
	});

	it("non-keepModels: preserves shared and externally referenced selected overviews", () => {
		const { context, formModel, sharedOverviewId, sharedGeneratedDocId, migratedOverviewId, migratedGeneratedDocId } =
			createReferencedSelectedOverviewCleanupFixture();
		extractionTransform(formModel, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, context);
		const deletedIds = (context.deleteModel as ReturnType<typeof vi.fn>).mock.calls.map(([id]) => id);

		expect(deletedIds).not.toContain(sharedOverviewId);
		expect(deletedIds).not.toContain(sharedGeneratedDocId);
		expect(deletedIds).not.toContain(migratedOverviewId);
		expect(deletedIds).not.toContain(migratedGeneratedDocId);
	});
});

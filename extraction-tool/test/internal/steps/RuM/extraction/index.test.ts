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
import type { OverviewLabelMigration } from "../../../../../src/internal/steps/RuM/extraction/types.js";
import { RUM_VERSION, OVERVIEW_MODEL_VERSION } from "../../../../../src/internal/steps/RuM/extraction/constants.js";
import { collectExistingOverviewIdsForRemap } from "../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/overview-state-populator.js";
import {
	remapRowActionOverviewId,
	remapAvailableOverviewRefs
} from "../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/overview-migration-id-remapper.js";
import {
	resolveCloneTargetId,
	buildOverviewLabelRegistry,
	remapOverviewLabelOverviewId,
	generateRegistryFallbackMigrations
} from "../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/overview-label-remap.js";

function createModelMap(entries: Array<{ header: { id: string } }>): Map<string, object> {
	return new Map(entries.map((entry) => [entry.header.id, entry as object]));
}

function createMockContext(models: readonly object[]): MigrationStepContext {
	const modelEntries = models as Array<{ header: { id: string } }>;
	const modelMap = createModelMap(modelEntries);
	const workspaceModelEntries = modelEntries.map((model) => ({
		header: model.header,
		path: `${model.header.id}.json`
	}));
	const workspaceModels = new Map<string, { header: { id: string }; path: string }>();

	for (const entry of workspaceModelEntries) {
		workspaceModels.set(entry.header.id, entry);
	}

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

			if (typeof id !== "string") {
				return undefined;
			}

			return modelMap.get(id);
		},
		resolveResource: vi.fn(),
		addResource: vi.fn(),
		deleteCurrentModel: vi.fn(),
		deleteResource: vi.fn()
	} as unknown as MigrationStepContext;
}

function makeFormModel(bindingEntries: object[]): GenericModel {
	return {
		header: {
			id: "TestForm",
			modelType: "form",
			modelVersion: "1.0.0",
			modelReferences: [],
			annotations: [
				{
					name: "bindingConfiguration",
					value: JSON.stringify(bindingEntries)
				}
			]
		},
		content: createFormContent(bindingEntries)
	} as unknown as GenericModel;
}

function createFormContent(bindingEntries: readonly object[] = []): object {
	return {
		screens: [
			{
				id: "screen-1",
				name: "Screen 1",
				screenElements: bindingEntries.map(createBindingScreenElement)
			}
		],
		subHeaderBox: { id: "sub-header-box" },
		footerBox: { id: "footer-box" },
		fieldConfiguration: {},
		groupConfiguration: {},
		defaults: {}
	};
}

function createBindingScreenElement(bindingEntry: object): object {
	const entry = bindingEntry as { readonly elementId?: unknown };
	const elementId = typeof entry.elementId === "string" ? entry.elementId : "unbound-element";

	return {
		id: elementId,
		name: elementId,
		type: "CustomScreenElement"
	};
}

function makeSharedCandidateBindingEntry(name: string, relationshipName: string, overviewId: string): object {
	return {
		type: "relationship",
		elementId: `section-${name}`,
		details: {
			name,
			relationshipName,
			targetRole: "Person",
			metaInformation: { version: "1.0.0" },
			components: [
				{
					name: "DualPaneSelection",
					id: `dual-${name}`,
					models: [{ name: overviewId, use: "candidate" }]
				}
			]
		}
	};
}

function makeBindingEntry(name: string): object {
	return {
		type: "relationship",
		elementId: "section-address",
		details: {
			name,
			relationshipName: "RelAB",
			targetRole: "TargetRole",
			metaInformation: { version: "1.0.0" },
			components: [
				{
					name: "DualPaneSelection",
					id: "sel-test",
					models: [{ name: "Product_Brand_AvailableItemsOverview", use: "candidate" }]
				}
			]
		}
	};
}

/**
 * Creates a binding entry with a DualPaneSelection component that has
 * both availableItemsTable.label and selectedItemsTable.label props.
 * Used to exercise the binding extraction to overview-decoration label migration path.
 */
function makeDualPaneLabelBindingEntry(name: string): object {
	return {
		type: "relationship",
		elementId: "section-relations",
		details: {
			name,
			relationshipName: "DualPaneRel",
			targetRole: "TargetRole",
			metaInformation: { version: "1.0.0" },
			components: [
				{
					name: "DualPaneSelection",
					id: "dual-test",
					models: [
						{ name: "DualPane_CandidateOverview", use: "candidate" },
						{ name: "DualPane_SelectedOverview", use: "link" }
					],
					props: {
						availableItemsTable: { label: [{ locale: "en", text: "Available Items" }] },
						selectedItemsTable: { label: [{ locale: "en", text: "Selected Items" }] }
					}
				}
			]
		}
	};
}

function makeDualPaneRowActionBindingEntry(options?: { readonly linkFormModel?: string }): object {
	const selectedOverviewId = "TeamPerson_Person_LinkOverview-overview";
	const models = [
		{ name: "TeamPerson_AvailableItemsOverview", use: "candidate" },
		{ name: selectedOverviewId, use: "link" },
		...(options?.linkFormModel !== undefined ? [{ name: options.linkFormModel, use: "link" }] : [])
	];

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
					models
				}
			]
		}
	};
}

function makeTableListRowActionBindingEntry(options?: { readonly linkFormModel?: string }): object {
	const selectedOverviewId = "TeamPerson_Person_LinkOverview-overview";
	const models = [
		{ name: "TeamPerson_AvailableItemsOverview", use: "candidate" },
		{ name: selectedOverviewId, use: "link" },
		...(options?.linkFormModel !== undefined ? [{ name: options.linkFormModel, use: "link" }] : [])
	];

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
					name: "TableList",
					id: "team-person-tablelist",
					models
				},
				{
					name: "DualPaneSelection",
					id: "team-person-tablelist-edit",
					models
				}
			]
		}
	};
}

function makeDropDownNonKeepModelsBindingEntry(): object {
	return {
		type: "relationship",
		elementId: "section-team-person-dropdown",
		details: {
			name: "TeamPersonDropdown",
			relationshipName: "TeamPerson",
			targetRole: "Person",
			metaInformation: { version: "1.0.0" },
			components: [
				{
					name: "DropDownSelection",
					id: "team-person-dropdown",
					models: [
						{ name: "TeamPerson_DropDown_AvailableItemsOverview", use: "candidate" },
						{ name: "TeamPerson_DropDown_SelectedItemsOverview", use: "link" }
					],
					candidatePageSize: 25
				}
			]
		}
	};
}

function makeOverviewModel(id: string, documentModelId = "Address-document"): object {
	return {
		header: {
			id,
			modelType: "overview",
			modelVersion: RUM_VERSION,
			annotations: [],
			modelReferences: []
		},
		content: {
			documentModelId
		}
	};
}

function makeDocumentBackedOverviewModel(id: string, documentModelId: string): object {
	return makeDocumentBackedOverviewModelWithColumns(id, documentModelId, []);
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
			modelReferences: [
				{
					purpose: "document-model-for-overview",
					modelType: "document",
					reference: documentModelId
				}
			]
		},
		content: {
			configuration: { enableFilter: true },
			columns: columns.map((col) => ({ width: 1, ...col })),
			rowActionGroup: {}
		}
	};
}

function makeGeneratedDocModel(id: string, targetDocumentId: string): object {
	return makeGeneratedDocModelWithOptionalLink(id, targetDocumentId);
}

function makeGeneratedDocModelWithOptionalLink(id: string, targetDocumentId: string, linkDocumentId?: string): object {
	return {
		header: {
			id,
			modelType: "document",
			modelVersion: OVERVIEW_MODEL_VERSION
		},
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
									Group: {
										includeConfig: { reference: targetDocumentId },
										elements: []
									}
								},
								...(linkDocumentId !== undefined
									? [
											{
												id: "I5_root",
												type: "element",
												Group: {
													includeConfig: { reference: linkDocumentId },
													elements: []
												}
											}
										]
									: [])
							]
						}
					}
				]
			}
		}
	};
}

function makeDocumentModel(id: string): object {
	return {
		header: {
			id,
			modelType: "document",
			modelVersion: OVERVIEW_MODEL_VERSION
		},
		content: {
			modelRoot: { rootGroups: [] }
		}
	};
}

function makeRelationshipModelWithIds(
	id: string,
	targetRole: string,
	sourceRole: string,
	targetDocumentId: string,
	sourceDocumentId: string
): object {
	return {
		header: {
			id,
			modelType: "relationship",
			modelVersion: OVERVIEW_MODEL_VERSION
		},
		content: {
			duplicatesAllowed: false,
			entityCharacteristics: [
				{ role: targetRole, documentModel: targetDocumentId },
				{ role: sourceRole, documentModel: sourceDocumentId }
			]
		}
	};
}

function makeRelationshipModel(): object {
	return {
		header: {
			id: "TeamPerson",
			modelType: "relationship",
			modelVersion: OVERVIEW_MODEL_VERSION
		},
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
		header: {
			id,
			modelType: "form",
			modelVersion: OVERVIEW_MODEL_VERSION,
			modelReferences: []
		},
		content: createFormContent()
	};
}

function findModelById(context: MigrationStepContext, modelId: string): object | undefined {
	const calls = (context.addModel as ReturnType<typeof vi.fn>).mock.calls;

	for (const call of calls) {
		const [payload] = call as [{ model: object }];
		const id = (payload?.model as { header?: { id?: string } }).header?.id;

		if (id === modelId) {
			return payload.model;
		}
	}

	return undefined;
}

function getAddedModels(context: MigrationStepContext): readonly object[] {
	return (context.addModel as ReturnType<typeof vi.fn>).mock.calls.map((call) => {
		const [payload] = call as [{ model: object }];

		return payload.model;
	});
}

function makeRowActionFormModel(bindingEntries: object[], options?: { readonly linkFormModel?: string }): GenericModel {
	return {
		header: {
			id: "Team-form",
			modelType: "form",
			modelVersion: "1.0.0",
			modelReferences: [
				{ reference: "Team-document", modelType: "document", purpose: "document" },
				{ reference: "TeamPerson_AvailableItemsOverview", modelType: "overview", purpose: "overview" },
				{
					reference: "TeamPerson_Person_LinkOverview-overview",
					modelType: "overview",
					purpose: "overview"
				},
				...(options?.linkFormModel !== undefined
					? [{ reference: options.linkFormModel, modelType: "form", purpose: "form" }]
					: [])
			],
			annotations: [
				{
					name: "bindingConfiguration",
					value: JSON.stringify(bindingEntries)
				}
			]
		},
		content: createFormContent(bindingEntries)
	} as unknown as GenericModel;
}

function createRowActionFixture(options?: { readonly linkFormModel?: string }): {
	readonly context: MigrationStepContext;
	readonly formModel: GenericModel;
} {
	const generatedDocId = "TeamPerson_Person_LinkOverview-overview____generated";
	const bindingEntry = makeDualPaneRowActionBindingEntry(options);
	const formModel = makeRowActionFormModel([bindingEntry], options);
	const linkFormModels = options?.linkFormModel !== undefined ? [makeLinkFormModel(options.linkFormModel)] : [];
	const context = createMockContext([
		makeDocumentModel("Team-document"),
		makeDocumentModel("Person-document"),
		makeRelationshipModel(),
		makeDocumentBackedOverviewModel("TeamPerson_AvailableItemsOverview", "Person-document"),
		makeDocumentBackedOverviewModel("TeamPerson_Person_LinkOverview-overview", generatedDocId),
		makeGeneratedDocModel(generatedDocId, "Person-document"),
		...linkFormModels
	]);

	return { context, formModel };
}

function makeNonKeepModelsSmokeFormModel(bindingEntries: object[]): GenericModel {
	return {
		header: {
			id: "Team-form",
			modelType: "form",
			modelVersion: "1.0.0",
			modelReferences: [
				{ reference: "Team-document", modelType: "document", purpose: "document" },
				{ reference: "TeamPerson_AvailableItemsOverview", modelType: "overview", purpose: "bindingReference" },
				{
					reference: "TeamPerson_Person_LinkOverview-overview",
					modelType: "overview",
					purpose: "bindingReference"
				},
				{ reference: "TeamPerson_LinkForm", modelType: "form", purpose: "bindingReference" },
				{ reference: "UnrelatedHistory-overview", modelType: "overview", purpose: "bindingReference" }
			],
			annotations: [
				{
					name: "bindingConfiguration",
					value: JSON.stringify(bindingEntries)
				}
			]
		},
		content: createFormContent(bindingEntries)
	} as unknown as GenericModel;
}

function createNonKeepModelsSmokeFixture(): {
	readonly context: MigrationStepContext;
	readonly formModel: GenericModel;
	readonly generatedDocId: string;
} {
	const generatedDocId = "TeamPerson_Person_LinkOverview-overview____generated";
	const bindingEntry = makeDualPaneRowActionBindingEntry({ linkFormModel: "TeamPerson_LinkForm" });
	const formModel = makeNonKeepModelsSmokeFormModel([bindingEntry]);
	const context = createMockContext([
		makeDocumentModel("Team-document"),
		makeDocumentModel("Person-document"),
		makeRelationshipModel(),
		makeDocumentBackedOverviewModel("TeamPerson_AvailableItemsOverview", "Person-document"),
		makeDocumentBackedOverviewModel("TeamPerson_Person_LinkOverview-overview", generatedDocId),
		makeGeneratedDocModel(generatedDocId, "Person-document"),
		makeLinkFormModel("TeamPerson_LinkForm")
	]);

	return { context, formModel, generatedDocId };
}

function createNonKeepModelsTableListFixture(options?: { readonly linkFormModel?: string }): {
	readonly context: MigrationStepContext;
	readonly formModel: GenericModel;
	readonly generatedDocId: string;
} {
	const generatedDocId = "TeamPerson_Person_LinkOverview-overview____generated";
	const bindingEntry = makeTableListRowActionBindingEntry(options);
	const formModel = makeNonKeepModelsSmokeFormModel([bindingEntry]);
	const linkFormModels = options?.linkFormModel !== undefined ? [makeLinkFormModel(options.linkFormModel)] : [];
	const context = createMockContext([
		makeDocumentModel("Team-document"),
		makeDocumentModel("Person-document"),
		makeDocumentModel("TeamPerson-document"),
		makeRelationshipModel(),
		makeDocumentBackedOverviewModel("TeamPerson_AvailableItemsOverview", "Person-document"),
		makeDocumentBackedOverviewModelWithColumns("TeamPerson_Person_LinkOverview-overview", generatedDocId, [
			{ id: "column-first-name", elementRef: "I4_F3" },
			{ id: "column-link-value", elementRef: "I5_field_04443" },
			{ id: "column-wrapper", elementRef: "G2_field_generated" }
		]),
		makeGeneratedDocModelWithOptionalLink(generatedDocId, "Person-document", "TeamPerson-document"),
		...linkFormModels
	]);

	return { context, formModel, generatedDocId };
}

function createNonKeepModelsDropDownFixture(): {
	readonly context: MigrationStepContext;
	readonly formModel: GenericModel;
} {
	const bindingEntry = makeDropDownNonKeepModelsBindingEntry();
	const formModel = {
		header: {
			id: "Team-form",
			modelType: "form",
			modelVersion: "1.0.0",
			modelReferences: [
				{ reference: "Team-document", modelType: "document", purpose: "document" },
				{
					reference: "TeamPerson_DropDown_AvailableItemsOverview",
					modelType: "overview",
					purpose: "bindingReference"
				},
				{
					reference: "TeamPerson_DropDown_SelectedItemsOverview",
					modelType: "overview",
					purpose: "bindingReference"
				},
				{ reference: "UnrelatedHistory-overview", modelType: "overview", purpose: "bindingReference" }
			],
			annotations: [
				{
					name: "bindingConfiguration",
					value: JSON.stringify([bindingEntry])
				}
			]
		},
		content: createFormContent([bindingEntry])
	} as unknown as GenericModel;
	const context = createMockContext([
		makeDocumentModel("Team-document"),
		makeDocumentModel("Person-document"),
		makeRelationshipModel(),
		makeDocumentBackedOverviewModelWithColumns("TeamPerson_DropDown_AvailableItemsOverview", "Person-document", [
			{ id: "column-first-name", elementRef: "F3" }
		]),
		makeDocumentBackedOverviewModelWithColumns("TeamPerson_DropDown_SelectedItemsOverview", "Person-document", [
			{ id: "column-last-name", elementRef: "F4" }
		])
	]);

	return { context, formModel };
}

function expectRowActions(
	overview: object | undefined,
	expectedActions: ReadonlyArray<{
		readonly event: string;
		readonly label: readonly { readonly locale: string; readonly text: string }[];
	}>
): void {
	expect(overview).toBeDefined();
	const actions = getRowActionEventsSource(overview)?.actions;

	expect(actions?.map((action) => action.event)).toEqual(expectedActions.map((action) => action.event));

	for (const expectedAction of expectedActions) {
		const action = actions?.find((candidate) => candidate.event === expectedAction.event);

		expect(action?.labelHidden).toBe(true);
		expect(action?.label).toEqual(expectedAction.label);
	}
}

function getRowActionEventsSource(
	overview: object | undefined
): { actions?: Array<{ event?: string; label?: unknown; labelHidden?: boolean }> } | undefined {
	return (
		overview as {
			content?: { rowActionGroup?: { actions?: Array<{ event?: string; label?: unknown; labelHidden?: boolean }> } };
		}
	).content?.rowActionGroup;
}

describe("remapRowActionOverviewId", () => {
	it("should remap DualPane selected action to clone target when keepModels cloneMap has a hit", () => {
		const cloneMap = new Map([["LocationLinks-overview", "LocationLinks-overview-edit"]]);
		const multiContextRemap = new Map<string, ReadonlyMap<string, string>>();

		expect(
			remapRowActionOverviewId(
				"LocationLinks-overview",
				"Location",
				"DualPaneSelection",
				"event_delete_link",
				cloneMap,
				multiContextRemap,
				true,
				new Set(["LocationLinks-overview-edit"])
			)
		).toBe("LocationLinks-overview-edit");
	});

	it("should keep non-keepModels DualPane selected action on base overview even when cloneMap has a hit", () => {
		const cloneMap = new Map([["LocationLinks-overview", "LocationLinks-overview-edit"]]);
		const multiContextRemap = new Map<string, ReadonlyMap<string, string>>();

		expect(
			remapRowActionOverviewId(
				"LocationLinks-overview",
				"Location",
				"DualPaneSelection",
				"event_restore_link",
				cloneMap,
				multiContextRemap,
				false,
				new Set(["LocationLinks-overview-edit"])
			)
		).toBe("LocationLinks-overview");
	});

	it("should keep DualPane selected action on original overview when cloneMap has no hit", () => {
		const cloneMap = new Map<string, string>();
		const multiContextRemap = new Map<string, ReadonlyMap<string, string>>();

		expect(
			remapRowActionOverviewId(
				"LocationLinks-overview",
				"Location",
				"DualPaneSelection",
				"event_restore_link",
				cloneMap,
				multiContextRemap,
				true,
				new Set()
			)
		).toBe("LocationLinks-overview");
	});

	it("should remap keepModels add_link action to existing relationship clone", () => {
		const cloneMap = new Map<string, string>();
		const multiContextRemap = new Map<string, ReadonlyMap<string, string>>();

		expect(
			remapRowActionOverviewId(
				"Product_Brand_AvailableItemsOverview",
				"ProductBrand",
				"DualPaneSelection",
				"event_add_link",
				cloneMap,
				multiContextRemap,
				true,
				new Set(["Product_Brand_AvailableItemsOverview--ProductBrand"])
			)
		).toBe("Product_Brand_AvailableItemsOverview--ProductBrand");
	});

	it("should keep keepModels add_link action on original overview when relationship clone does not exist", () => {
		const cloneMap = new Map<string, string>();
		const multiContextRemap = new Map<string, ReadonlyMap<string, string>>();

		expect(
			remapRowActionOverviewId(
				"Product_Brand_SingleSelection_AvailableItemsOverview",
				"ProductBrand",
				"DualPaneSelection",
				"event_add_link",
				cloneMap,
				multiContextRemap,
				true,
				new Set<string>()
			)
		).toBe("Product_Brand_SingleSelection_AvailableItemsOverview");
	});

	it("should remap non-keepModels add_link action to existing relationship clone", () => {
		const cloneMap = new Map<string, string>();
		const multiContextRemap = new Map<string, ReadonlyMap<string, string>>();

		expect(
			remapRowActionOverviewId(
				"Product_Brand_AvailableItemsOverview",
				"ProductBrand",
				"DualPaneSelection",
				"event_add_link",
				cloneMap,
				multiContextRemap,
				false,
				new Set(["Product_Brand_AvailableItemsOverview--ProductBrand"])
			)
		).toBe("Product_Brand_AvailableItemsOverview--ProductBrand");
	});

	it("should keep non-keepModels add_link action on original overview when relationship clone does not exist", () => {
		const cloneMap = new Map<string, string>();
		const multiContextRemap = new Map<string, ReadonlyMap<string, string>>();

		expect(
			remapRowActionOverviewId(
				"Product_Brand_AvailableItemsOverview",
				"ProductBrand",
				"DualPaneSelection",
				"event_add_link",
				cloneMap,
				multiContextRemap,
				false,
				new Set<string>()
			)
		).toBe("Product_Brand_AvailableItemsOverview");
	});

	it("should not implicitly remap non-add-link action to existing relationship clone", () => {
		const cloneMap = new Map<string, string>();
		const multiContextRemap = new Map<string, ReadonlyMap<string, string>>();

		expect(
			remapRowActionOverviewId(
				"Product_Brand_AvailableItemsOverview",
				"ProductBrand",
				"DualPaneSelection",
				"event_open_link",
				cloneMap,
				multiContextRemap,
				false,
				new Set(["Product_Brand_AvailableItemsOverview--ProductBrand"])
			)
		).toBe("Product_Brand_AvailableItemsOverview");
	});

	it("should not remap DropDown row actions", () => {
		const cloneMap = new Map([["Product_Brand_AvailableItemsOverview", "Product_Brand_AvailableItemsOverview-edit"]]);
		const multiContextRemap = new Map<string, ReadonlyMap<string, string>>();

		expect(
			remapRowActionOverviewId(
				"Product_Brand_AvailableItemsOverview",
				"ProductBrand",
				"DropDownSelection",
				"event_add_link",
				cloneMap,
				multiContextRemap,
				false,
				new Set(["Product_Brand_AvailableItemsOverview--ProductBrand"])
			)
		).toBe("Product_Brand_AvailableItemsOverview");
	});
});

describe("remapOverviewLabelOverviewId", () => {
	it("should keep pane-label-without-cloneTargets using legacy remap (cloneMap lookup)", () => {
		const remappedOverviewId = remapOverviewLabelOverviewId(
			{
				overviewModelId: "Product_Brand_SelectedItemsOverview",
				labels: [{ locale: "en", text: "Selected products" }],
				source: "pane-label"
				// No cloneTargets: legacy fallback path
			},
			"ProductBrand",
			new Map([["Product_Brand_SelectedItemsOverview", "Product_Brand_SelectedItemsOverview-edit"]]),
			new Map(),
			false,
			new Set<string>()
		);

		// Falls through to legacy cloneMap lookup (direct-host-label branch skipped)
		expect(remappedOverviewId).toBe("Product_Brand_SelectedItemsOverview-edit");
	});
});

describe("resolveCloneTargetId", () => {
	const BASE_ID = "Candidate-overview";
	const REL_NAME = "ProductBrand";

	it("'base' always resolves to the original overview ID", () => {
		const id = resolveCloneTargetId("base", BASE_ID, REL_NAME, new Map(), new Map(), false, new Set());

		expect(id).toBe(BASE_ID);
	});

	it("'RelName' resolves to multi-context clone when in multiContextRemap", () => {
		const multiContextRemap = new Map([[BASE_ID, new Map([[REL_NAME, `${BASE_ID}--${REL_NAME}`]])]]);
		const id = resolveCloneTargetId("RelName", BASE_ID, REL_NAME, new Map(), multiContextRemap, false, new Set());

		expect(id).toBe(`${BASE_ID}--${REL_NAME}`);
	});

	it("'RelName' resolves to single-context keepModels clone when it exists", () => {
		const singleContextId = `${BASE_ID}--${REL_NAME}`;
		const existingIds = new Set([singleContextId]);
		const id = resolveCloneTargetId("RelName", BASE_ID, REL_NAME, new Map(), new Map(), true, existingIds);

		expect(id).toBe(singleContextId);
	});

	it("'RelName' returns undefined when clone does not exist", () => {
		const id = resolveCloneTargetId("RelName", BASE_ID, REL_NAME, new Map(), new Map(), false, new Set());

		expect(id).toBeUndefined();
	});

	it("'RelName' returns undefined even with keepModels when clone not in existingIds", () => {
		const id = resolveCloneTargetId("RelName", BASE_ID, REL_NAME, new Map(), new Map(), true, new Set());

		expect(id).toBeUndefined();
	});

	it("'tableList' resolves when -tableList clone exists in existingIds", () => {
		const tableListId = `${BASE_ID}-tableList`;
		const existingIds = new Set([tableListId]);
		const id = resolveCloneTargetId("tableList", BASE_ID, REL_NAME, new Map(), new Map(), false, existingIds);

		expect(id).toBe(tableListId);
	});

	it("'tableList' returns undefined when no -tableList clone exists", () => {
		const id = resolveCloneTargetId("tableList", BASE_ID, REL_NAME, new Map(), new Map(), true, new Set());

		expect(id).toBeUndefined();
	});

	it("'edit' resolves to cloneMap entry", () => {
		const LINK_ID = "Link-overview";
		const editCloneId = `${LINK_ID}-edit`;
		const cloneMap = new Map([[LINK_ID, editCloneId]]);
		const id = resolveCloneTargetId("edit", LINK_ID, REL_NAME, cloneMap, new Map(), false, new Set());

		expect(id).toBe(editCloneId);
	});

	it("'edit' returns undefined when cloneMap has no entry", () => {
		const id = resolveCloneTargetId("edit", BASE_ID, REL_NAME, new Map(), new Map(), false, new Set());

		expect(id).toBeUndefined();
	});

	it("'edit-available' resolves to multi-context clone (same lookup as RelName)", () => {
		const multiContextRemap = new Map([[BASE_ID, new Map([[REL_NAME, `${BASE_ID}--${REL_NAME}`]])]]);
		const id = resolveCloneTargetId(
			"edit-available",
			BASE_ID,
			REL_NAME,
			new Map(),
			multiContextRemap,
			false,
			new Set()
		);

		expect(id).toBe(`${BASE_ID}--${REL_NAME}`);
	});

	it("'edit-available' returns undefined (does not fall back to bare base) when no clone exists", () => {
		const id = resolveCloneTargetId("edit-available", BASE_ID, REL_NAME, new Map(), new Map(), false, new Set());

		expect(id).toBeUndefined();
	});

	it("'edit-available' does NOT create a -edit-available suffix (no such suffix in model IDs)", () => {
		const existingIds = new Set([`${BASE_ID}-edit-available`]); // such a clone should not be used
		const id = resolveCloneTargetId("edit-available", BASE_ID, REL_NAME, new Map(), new Map(), false, existingIds);

		// Must not return the -edit-available suffixed ID
		expect(id).toBeUndefined();
	});
});

describe("collectExistingOverviewIdsForRemap", () => {
	it("should include remapped overviews, clone targets and state overview ids", () => {
		const existingOverviewIds = collectExistingOverviewIdsForRemap(
			{
				remappedOverviews: new Map([
					["Address-overview--Location", makeOverviewModel("Address-overview--Location")]
				]) as never,
				cloneMap: new Map([["LocationLinks-overview", "LocationLinks-overview-edit"]])
			},
			{
				overviewModelIds: ["LocationLinks-overview", "WorkspaceOnly-overview"]
			}
		);

		expect(existingOverviewIds).toEqual(
			new Set([
				"Address-overview--Location",
				"LocationLinks-overview",
				"LocationLinks-overview-edit",
				"WorkspaceOnly-overview"
			])
		);
	});
});

describe("extractionTransform", () => {
	it("should throw the expected boundary error when updated form content is missing", () => {
		const bindingEntries = [makeBindingEntry("AddressRelation")];
		const formModel = makeFormModel(bindingEntries) as GenericModel & { content?: unknown };
		// Added RelAB relationship model — required since resolveDuplicatesAllowed now throws when missing
		const context = createMockContext([
			makeOverviewModel("Product_Brand_AvailableItemsOverview"),
			makeRelationshipModelWithIds("RelAB", "TargetRole", "SourceRole", "Target-document", "Source-document")
		]);

		delete formModel.content;

		expect(() => extractionTransform(formModel, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, context)).toThrow(
			"Expected form model after updateFormModel"
		);
	});

	it("should copy source form roles annotation to extracted Relationship UI models", () => {
		const rolesAnnotation = { name: "roles", value: "admin,editor" };
		const bindingEntries = [makeBindingEntry("AddressRelation")];
		const formModel = makeFormModel(bindingEntries);
		const annotations = (formModel as { header: { annotations: object[] } }).header.annotations;
		annotations.push(rolesAnnotation);
		// Added RelAB relationship model — required since resolveDuplicatesAllowed now throws when missing
		const context = createMockContext([
			makeOverviewModel("Product_Brand_AvailableItemsOverview"),
			makeRelationshipModelWithIds("RelAB", "TargetRole", "SourceRole", "Target-document", "Source-document")
		]);

		extractionTransform(formModel, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, context);

		const rumModel = getAddedModels(context).find(
			(addedModel) => (addedModel as { header?: { modelType?: string } }).header?.modelType === "relationship-ui"
		) as { header?: { annotations?: object[] } } | undefined;

		expect(rumModel?.header?.annotations).toEqual([rolesAnnotation]);
	});

	it("should add row action events to candidate overview added from workspace when base overview is not already in state", () => {
		const bindingEntries = [makeBindingEntry("AddressRelation")];
		const formModel = makeFormModel(bindingEntries);
		// Added RelAB relationship model — required since resolveDuplicatesAllowed now throws when missing
		const context = createMockContext([
			makeOverviewModel("Product_Brand_AvailableItemsOverview"),
			makeRelationshipModelWithIds("RelAB", "TargetRole", "SourceRole", "Target-document", "Source-document")
		]);

		extractionTransform(
			formModel,
			{
				log: vi.fn(),
				info: vi.fn(),
				error: vi.fn()
			},
			context
		);

		const candidateOverview = findModelById(context, "Product_Brand_AvailableItemsOverview");

		expect(candidateOverview).toBeDefined();
		expect(
			(candidateOverview as { content?: { rowActionGroup?: { actions?: Array<{ event?: string }> } } })?.content
				?.rowActionGroup
		).toBeDefined();
		expect(
			(
				candidateOverview as {
					content?: { rowActionGroup?: { actions?: Array<{ event: string; icon?: { name: string } }> } };
				}
			).content?.rowActionGroup?.actions?.[0]?.event
		).toBe("event_add_link");
	});

	it("should flow availableItemsTable.label and selectedItemsTable.label into overview header.labels", () => {
		// Gap 1 (reviewer note): verify label migrations from pane labels flow end-to-end
		// through binding collection, aggregation, clone-target expansion, and overview decoration.
		const bindingEntries = [makeDualPaneLabelBindingEntry("DualPaneRelation")];
		const formModel = makeFormModel(bindingEntries);
		// Added DualPaneRel relationship model — required since resolveDuplicatesAllowed now throws when missing
		const context = createMockContext([
			makeOverviewModel("DualPane_CandidateOverview"),
			makeOverviewModel("DualPane_SelectedOverview"),
			makeRelationshipModelWithIds("DualPaneRel", "TargetRole", "SourceRole", "Target-document", "Source-document")
		]);

		extractionTransform(formModel, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, context);

		// Available pane label → candidate overview header.labels
		const candidateOverview = findModelById(context, "DualPane_CandidateOverview");

		expect(candidateOverview).toBeDefined();
		expect(
			(candidateOverview as { header?: { labels?: Array<{ locale: string; text: string }> } }).header?.labels
		).toBeDefined();
		expect(
			(candidateOverview as { header?: { labels?: Array<{ locale: string; text: string }> } }).header?.labels?.[0]?.text
		).toBe("Available Items");

		// Selected pane label → link overview header.labels
		const selectedOverview = findModelById(context, "DualPane_SelectedOverview");

		expect(selectedOverview).toBeDefined();
		expect(
			(selectedOverview as { header?: { labels?: Array<{ locale: string; text: string }> } }).header?.labels
		).toBeDefined();
		expect(
			(selectedOverview as { header?: { labels?: Array<{ locale: string; text: string }> } }).header?.labels?.[0]?.text
		).toBe("Selected Items");
	});

	it("non-keepModels: applies default delete and restore row actions on the base selected overview", () => {
		const { context, formModel } = createRowActionFixture();

		extractionTransform(formModel, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, context);

		expectRowActions(findModelById(context, "TeamPerson_Person_LinkOverview-overview"), [
			{
				event: "event_delete_link",
				label: [
					{ locale: "en", text: "Remove" },
					{ locale: "de", text: "Entfernen" }
				]
			},
			{
				event: "event_restore_link",
				label: [
					{ locale: "en", text: "Restore" },
					{ locale: "de", text: "Wiederherstellen" }
				]
			}
		]);
	});

	it("non-keepModels: applies default delete, restore and edit-link-document row actions when linkFormModel exists", () => {
		const { context, formModel } = createRowActionFixture({ linkFormModel: "TeamPerson_LinkForm" });

		extractionTransform(formModel, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, context);

		expectRowActions(findModelById(context, "TeamPerson_Person_LinkOverview-overview"), [
			{
				event: "event_delete_link",
				label: [
					{ locale: "en", text: "Remove" },
					{ locale: "de", text: "Entfernen" }
				]
			},
			{
				event: "event_restore_link",
				label: [
					{ locale: "en", text: "Restore" },
					{ locale: "de", text: "Wiederherstellen" }
				]
			},
			{
				event: "event_edit_link_document",
				label: [
					{ locale: "en", text: "Edit additional properties" },
					{ locale: "de", text: "Zusätzliche Eigenschaften bearbeiten" }
				]
			}
		]);
	});

	it("non-keepModels: workspace-shared candidate overview writes relationship clone and query", () => {
		const overviewId = "SharedCandidateOverview";
		const relationshipName = "TeamPerson";
		const otherRelationshipName = "ProjectPerson";
		const currentBinding = makeSharedCandidateBindingEntry("TeamPersonBinding", relationshipName, overviewId);
		const otherBinding = makeSharedCandidateBindingEntry("ProjectPersonBinding", otherRelationshipName, overviewId);
		const formModel = makeRowActionFormModel([currentBinding]);
		const otherFormModel = {
			header: {
				id: "Project-form",
				modelType: "form",
				modelVersion: "1.0.0",
				modelReferences: [{ reference: "Project-document", modelType: "document", purpose: "document" }],
				annotations: [{ name: "bindingConfiguration", value: JSON.stringify([otherBinding]) }]
			},
			content: createFormContent([otherBinding])
		};
		const context = createMockContext([
			formModel,
			otherFormModel,
			makeDocumentBackedOverviewModel(overviewId, `${overviewId}____generated`),
			makeGeneratedDocModel(`${overviewId}____generated`, "Person-document"),
			makeDocumentModel("Person-document"),
			makeDocumentModel("Team-document"),
			makeRelationshipModelWithIds(relationshipName, "Person", "Team", "Person-document", "Team-document"),
			makeRelationshipModelWithIds(otherRelationshipName, "Person", "Project", "Person-document", "Project-document")
		]);

		extractionTransform(formModel, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, context);

		const baseOverview = findModelById(context, overviewId) as {
			header?: { modelReferences?: Array<{ purpose?: string; modelType?: string; reference?: string }> };
		};
		const cloneOverview = findModelById(context, `${overviewId}--${relationshipName}`);
		const queryModel = findModelById(context, `${overviewId}--${relationshipName}-query`);

		const rumModel = getAddedModels(context).find(
			(addedModel) => (addedModel as { header?: { modelType?: string } }).header?.modelType === "relationship-ui"
		) as {
			header?: { modelReferences?: Array<{ purpose?: string; modelType?: string; reference?: string }> };
			content?: { component?: { availableItemsOverviewModel?: string; selectedItemsOverviewModel?: string } };
		};
		const cloneId = `${overviewId}--${relationshipName}`;

		expect(cloneOverview).toBeDefined();
		expect(queryModel).toBeDefined();
		expect(rumModel.content?.component?.availableItemsOverviewModel).toBe(cloneId);
		expect(rumModel.content?.component?.selectedItemsOverviewModel).toBeUndefined();
		expect(rumModel.header?.modelReferences).toEqual(
			expect.arrayContaining([{ purpose: "availableItems", modelType: "overview", reference: cloneId }])
		);
		expect(
			rumModel.header?.modelReferences?.some((ref) => ref.modelType === "overview" && ref.reference === overviewId)
		).toBe(false);
		expect(baseOverview.header?.modelReferences).toMatchObject([
			{ purpose: "document-model-for-overview", modelType: "document", reference: "Person-document" }
		]);
	});

	it("non-keepModels: available clone header remap preserves selected base ref when both share an overview", () => {
		const result = remapAvailableOverviewRefs(
			[
				{ purpose: "overview", modelType: "overview", reference: "SharedOverview" },
				{ purpose: "overview", modelType: "overview", reference: "OtherOverview" }
			],
			new Map([["SharedOverview", "SharedOverview--TeamPerson"]]),
			new Set(["SharedOverview"])
		);

		expect(result).toEqual([
			{ purpose: "overview", modelType: "overview", reference: "SharedOverview" },
			{ purpose: "overview", modelType: "overview", reference: "OtherOverview" },
			{ purpose: "overview", modelType: "overview", reference: "SharedOverview--TeamPerson" }
		]);
	});

	it("non-keepModels: unshared candidate overview does not write relationship clone or remap RuM", () => {
		const overviewId = "UnsharedCandidateOverview";
		const relationshipName = "TeamPerson";
		const currentBinding = makeSharedCandidateBindingEntry("TeamPersonBinding", relationshipName, overviewId);
		const formModel = makeRowActionFormModel([currentBinding]);
		const context = createMockContext([
			formModel,
			makeDocumentBackedOverviewModel(overviewId, `${overviewId}____generated`),
			makeGeneratedDocModel(`${overviewId}____generated`, "Person-document"),
			makeDocumentModel("Person-document"),
			makeDocumentModel("Team-document"),
			makeRelationshipModelWithIds(relationshipName, "Person", "Team", "Person-document", "Team-document")
		]);

		extractionTransform(formModel, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, context);

		const rumModel = getAddedModels(context).find(
			(addedModel) => (addedModel as { header?: { modelType?: string } }).header?.modelType === "relationship-ui"
		) as {
			header?: { modelReferences?: Array<{ purpose?: string; modelType?: string; reference?: string }> };
			content?: { component?: { availableItemsOverviewModel?: string } };
		};

		expect(findModelById(context, `${overviewId}--${relationshipName}`)).toBeUndefined();
		expect(findModelById(context, `${overviewId}--${relationshipName}-query`)).toBeUndefined();
		expect(findModelById(context, `${overviewId}-query`)).toBeDefined();
		expect(rumModel.content?.component?.availableItemsOverviewModel).toBe(overviewId);
		expect(rumModel.header?.modelReferences).toEqual(
			expect.arrayContaining([{ purpose: "availableItems", modelType: "overview", reference: overviewId }])
		);
	});

	it("non-keepModels: TableList edit available overview remaps while selected refs stay unchanged", () => {
		const overviewId = "TeamPerson_AvailableItemsOverview";
		const relationshipName = "TeamPerson";
		const otherRelationshipName = "ProjectPerson";
		const generatedDocId = "TeamPerson_Person_LinkOverview-overview____generated";
		const currentBinding = makeTableListRowActionBindingEntry({ linkFormModel: "TeamPerson_LinkForm" });
		const otherBinding = makeSharedCandidateBindingEntry("ProjectPersonBinding", otherRelationshipName, overviewId);
		const formModel = makeNonKeepModelsSmokeFormModel([currentBinding]);
		const otherFormModel = {
			header: {
				id: "Project-form",
				modelType: "form",
				modelVersion: "1.0.0",
				modelReferences: [{ reference: "Project-document", modelType: "document", purpose: "document" }],
				annotations: [{ name: "bindingConfiguration", value: JSON.stringify([otherBinding]) }]
			},
			content: createFormContent([otherBinding])
		};
		const context = createMockContext([
			formModel,
			otherFormModel,
			makeDocumentModel("Team-document"),
			makeDocumentModel("Person-document"),
			makeDocumentModel("TeamPerson-document"),
			makeRelationshipModel(),
			makeRelationshipModelWithIds(otherRelationshipName, "Person", "Project", "Person-document", "Project-document"),
			makeDocumentBackedOverviewModel(overviewId, "Person-document"),
			makeDocumentBackedOverviewModelWithColumns("TeamPerson_Person_LinkOverview-overview", generatedDocId, [
				{ id: "column-first-name", elementRef: "I4_F3" }
			]),
			makeGeneratedDocModelWithOptionalLink(generatedDocId, "Person-document", "TeamPerson-document"),
			makeLinkFormModel("TeamPerson_LinkForm")
		]);

		extractionTransform(formModel, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, context);

		const selectedOverviewId = "TeamPerson_Person_LinkOverview-overview";
		const editSelectedOverviewId = `${selectedOverviewId}-edit`;
		const cloneId = `${overviewId}--${relationshipName}`;
		const rumModel = getAddedModels(context).find(
			(addedModel) => (addedModel as { header?: { modelType?: string } }).header?.modelType === "relationship-ui"
		) as {
			header?: { modelReferences?: Array<{ purpose?: string; modelType?: string; reference?: string }> };
			content?: {
				component?: {
					selectedItemsOverviewModel?: string;
					editConfiguration?: { availableItemsOverviewModel?: string; selectedItemsOverviewModel?: string };
				};
			};
		};

		expect(findModelById(context, cloneId)).toBeDefined();
		expect(rumModel.content?.component?.selectedItemsOverviewModel).toBe(selectedOverviewId);
		expect(rumModel.content?.component?.editConfiguration?.availableItemsOverviewModel).toBe(cloneId);
		expect(rumModel.content?.component?.editConfiguration?.selectedItemsOverviewModel).toBe(editSelectedOverviewId);
		expect(
			(rumModel.header?.modelReferences ?? []).filter((ref) => ref.modelType === "overview").map((ref) => ref.reference)
		).toEqual(expect.arrayContaining([cloneId, selectedOverviewId, editSelectedOverviewId]));
		expect(
			(rumModel.header?.modelReferences ?? []).some(
				(ref) => ref.modelType === "overview" && ref.reference === overviewId
			)
		).toBe(false);
	});

	it("non-keepModels: extracts generated-doc-backed DualPane selected overview into clean query-backed output", () => {
		const { context, formModel, generatedDocId } = createNonKeepModelsSmokeFixture();

		const updatedForm = extractionTransform(formModel, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, context);
		const selectedOverview = findModelById(context, "TeamPerson_Person_LinkOverview-overview") as {
			header?: { modelReferences?: Array<{ purpose?: string; modelType?: string; reference?: string }> };
			content?: { columns?: Array<{ elementRef?: unknown }> };
		};
		const selectedReferences = selectedOverview.header?.modelReferences ?? [];

		expect(selectedReferences).toEqual([
			{
				purpose: "query-model-for-overview",
				modelType: "query",
				reference: "TeamPerson_Person_LinkOverview-overview-query"
			}
		]);
		expect(selectedReferences.some((ref) => ref.purpose === "document-model-for-overview")).toBe(false);
		expect(
			(selectedOverview.content?.columns ?? []).every((column) => {
				const elementRef = String(column.elementRef ?? "");

				return !/^I[0-9]+_/.test(elementRef) && !elementRef.startsWith("G2_");
			})
		).toBe(true);
		expect((context.deleteModel as ReturnType<typeof vi.fn>).mock.calls).toEqual([[generatedDocId]]);

		const updatedHeader = (
			updatedForm as {
				header?: {
					annotations?: Array<{ name?: string }>;
					modelReferences?: Array<{ purpose?: string; modelType?: string; reference?: string }>;
				};
			}
		).header;
		const updatedRefs = updatedHeader?.modelReferences ?? [];
		const extractedLegacyIds = new Set([
			"TeamPerson_AvailableItemsOverview",
			"TeamPerson_Person_LinkOverview-overview",
			"TeamPerson_LinkForm"
		]);

		expect(updatedHeader?.annotations?.some((annotation) => annotation.name === "bindingConfiguration")).toBe(false);
		expect(
			updatedRefs.some((ref) => ref.purpose === "bindingReference" && extractedLegacyIds.has(ref.reference ?? ""))
		).toBe(false);
		expect(updatedRefs.filter((ref) => ref.purpose === "relationship-ui")).toHaveLength(1);
		expect(updatedRefs.some((ref) => ref.reference === "UnrelatedHistory-overview")).toBe(true);
		expectRowActions(selectedOverview, [
			{
				event: "event_delete_link",
				label: [
					{ locale: "en", text: "Remove" },
					{ locale: "de", text: "Entfernen" }
				]
			},
			{
				event: "event_restore_link",
				label: [
					{ locale: "en", text: "Restore" },
					{ locale: "de", text: "Wiederherstellen" }
				]
			},
			{
				event: "event_edit_link_document",
				label: [
					{ locale: "en", text: "Edit additional properties" },
					{ locale: "de", text: "Zusätzliche Eigenschaften bearbeiten" }
				]
			}
		]);

		const writtenOverviewIds = getAddedModels(context)
			.map((model) => (model as { header?: { id?: string; modelType?: string } }).header)
			.filter((header): header is { id: string; modelType: string } => header?.modelType === "overview");

		expect(writtenOverviewIds.some((header) => header.id.endsWith("-edit"))).toBe(false);
		expect(writtenOverviewIds.some((header) => header.id.endsWith("-tableList"))).toBe(false);
		expect(writtenOverviewIds.some((header) => header.id.includes("--TeamPerson"))).toBe(false);
	});

	it.each([
		{ linkFormModel: undefined, expectedEditEvents: ["event_delete_link", "event_restore_link"] },
		{
			linkFormModel: "TeamPerson_LinkForm",
			expectedEditEvents: ["event_delete_link", "event_restore_link", "event_edit_link_document"]
		}
	])(
		"non-keepModels: TableList same-source selected overview keeps direct base and writes edit clone %#",
		({ linkFormModel, expectedEditEvents }) => {
			const overviewId = "TeamPerson_Person_LinkOverview-overview";
			const editOverviewId = `${overviewId}-edit`;
			const { context, formModel, generatedDocId } = createNonKeepModelsTableListFixture(
				linkFormModel === undefined ? undefined : { linkFormModel }
			);

			const updatedForm = extractionTransform(formModel, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, context);
			const addedModels = getAddedModels(context);
			const rumModel = addedModels.find(
				(model) => (model as { header?: { modelType?: string } }).header?.modelType === "relationship-ui"
			) as {
				header?: { modelReferences?: Array<{ purpose?: string; modelType?: string; reference?: string }> };
				content?: {
					component?: {
						selectedItemsOverviewModel?: string;
						editConfiguration?: { selectedItemsOverviewModel?: string };
					};
				};
			};
			const baseOverview = findModelById(context, overviewId) as {
				header?: { modelReferences?: Array<{ purpose?: string; modelType?: string; reference?: string }> };
				content?: { columns?: Array<{ elementRef?: unknown }> };
			};
			const editOverview = findModelById(context, editOverviewId) as {
				header?: { modelReferences?: Array<{ purpose?: string; modelType?: string; reference?: string }> };
				content?: { columns?: Array<{ elementRef?: unknown }> };
			};
			const writtenOverviewIds = addedModels
				.map((model) => (model as { header?: { id?: string; modelType?: string } }).header)
				.filter((header): header is { id: string; modelType: string } => header?.modelType === "overview")
				.map((header) => header.id);
			const writtenQueryIds = addedModels
				.map((model) => (model as { header?: { id?: string; modelType?: string } }).header)
				.filter((header): header is { id: string; modelType: string } => header?.modelType === "query")
				.map((header) => header.id);

			expect(rumModel.content?.component?.selectedItemsOverviewModel).toBe(overviewId);
			expect(rumModel.content?.component?.editConfiguration?.selectedItemsOverviewModel).toBe(editOverviewId);
			expect(
				(rumModel.header?.modelReferences ?? [])
					.filter((ref) => ref.modelType === "overview")
					.map((ref) => ref.reference)
			).toEqual(expect.arrayContaining([overviewId, editOverviewId]));
			expect(rumModel.header?.modelReferences?.some((ref) => ref.reference === `${overviewId}-tableList`)).toBe(false);

			expect(baseOverview.header?.modelReferences).toEqual([
				{ purpose: "query-model-for-overview", modelType: "query", reference: `${overviewId}-query` }
			]);
			expect(editOverview.header?.modelReferences).toEqual([
				{ purpose: "query-model-for-overview", modelType: "query", reference: `${overviewId}-query` }
			]);
			expect(
				[...(baseOverview.content?.columns ?? []), ...(editOverview.content?.columns ?? [])].every((column) => {
					const elementRef = String(column.elementRef ?? "");

					return !/^I[0-9]+_/.test(elementRef) && !elementRef.startsWith("G2_");
				})
			).toBe(true);
			expect(getRowActionEventsSource(baseOverview)?.actions?.map((action) => action.event) ?? []).not.toEqual(
				expect.arrayContaining(["event_delete_link", "event_restore_link", "event_edit_link_document"])
			);
			expect(getRowActionEventsSource(editOverview)?.actions?.map((action) => action.event)).toEqual(
				expectedEditEvents
			);
			expectRowActions(
				editOverview,
				expectedEditEvents.map((event) => {
					if (event === "event_edit_link_document") {
						return {
							event,
							label: [
								{ locale: "en", text: "Edit additional properties" },
								{ locale: "de", text: "Zusätzliche Eigenschaften bearbeiten" }
							]
						};
					}

					return {
						event,
						label:
							event === "event_delete_link"
								? [
										{ locale: "en", text: "Remove" },
										{ locale: "de", text: "Entfernen" }
									]
								: [
										{ locale: "en", text: "Restore" },
										{ locale: "de", text: "Wiederherstellen" }
									]
					};
				})
			);

			expect((context.deleteModel as ReturnType<typeof vi.fn>).mock.calls).toEqual([[generatedDocId]]);
			expect(writtenOverviewIds).toEqual(expect.arrayContaining([overviewId, editOverviewId]));
			expect(writtenOverviewIds).not.toContain(`${overviewId}-tableList`);
			expect(writtenQueryIds.filter((id) => id === `${overviewId}-query`)).toHaveLength(1);
			expect(writtenQueryIds).not.toContain(`${overviewId}-edit-query`);

			const updatedHeader = (
				updatedForm as {
					header?: {
						annotations?: Array<{ name?: string }>;
						modelReferences?: Array<{ purpose?: string; modelType?: string; reference?: string }>;
					};
				}
			).header;
			const updatedRefs = updatedHeader?.modelReferences ?? [];
			const extractedLegacyIds = new Set([
				"TeamPerson_AvailableItemsOverview",
				overviewId,
				...(linkFormModel === undefined ? [] : [linkFormModel])
			]);

			expect(updatedHeader?.annotations?.some((annotation) => annotation.name === "bindingConfiguration")).toBe(false);
			expect(
				updatedRefs.some((ref) => ref.purpose === "bindingReference" && extractedLegacyIds.has(ref.reference ?? ""))
			).toBe(false);
			expect(updatedRefs.filter((ref) => ref.purpose === "relationship-ui")).toHaveLength(1);
			expect(updatedRefs.some((ref) => ref.reference === "UnrelatedHistory-overview")).toBe(true);
		}
	);

	it("non-keepModels: DropDown upgrades to queries, prunes legacy refs, and writes no overview output", () => {
		const availableOverviewId = "TeamPerson_DropDown_AvailableItemsOverview";
		const selectedOverviewId = "TeamPerson_DropDown_SelectedItemsOverview";
		const staleDropdownOverviewIds = new Set([availableOverviewId, selectedOverviewId]);
		const { context, formModel } = createNonKeepModelsDropDownFixture();

		const updatedForm = extractionTransform(formModel, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, context);
		const addedModels = getAddedModels(context);
		const rumModel = addedModels.find(
			(model) => (model as { header?: { modelType?: string } }).header?.modelType === "relationship-ui"
		) as {
			header?: { modelReferences?: Array<{ purpose?: string; modelType?: string; reference?: string }> };
			content?: {
				component?: {
					availableItemsQueryModel?: string;
					selectedItemQueryModel?: string;
					availableItemsOverviewModel?: string;
					selectedItemsOverviewModel?: string;
				};
			};
		};
		const component = rumModel.content?.component;
		const selectedWorkspaceModel = context.findModel(selectedOverviewId);
		const originalSelectedOverview =
			selectedWorkspaceModel !== undefined ? context.resolveModel(selectedWorkspaceModel) : undefined;
		const addedOverviewHeaders = addedModels
			.map((model) => (model as { header?: { id?: string; modelType?: string; modelReferences?: unknown } }).header)
			.filter((header): header is { id: string; modelType: string; modelReferences?: unknown } => header !== undefined)
			.filter((header) => header.modelType === "overview");
		const addedQueryIds = addedModels
			.map((model) => (model as { header?: { id?: string; modelType?: string } }).header)
			.filter((header): header is { id: string; modelType: string } => header?.modelType === "query")
			.map((header) => header.id);

		expect(component?.availableItemsQueryModel).toBe("Team-form-binding-TeamPersonDropdown-available-query");
		expect(component?.selectedItemQueryModel).toBe("Team-form-binding-TeamPersonDropdown-selected-query");
		expect(component?.availableItemsOverviewModel).toBeUndefined();
		expect(component?.selectedItemsOverviewModel).toBeUndefined();
		expect(rumModel.header?.modelReferences).toEqual([
			{
				purpose: "availableItemsQuery",
				modelType: "query",
				reference: "Team-form-binding-TeamPersonDropdown-available-query"
			},
			{
				purpose: "selectedItemQuery",
				modelType: "query",
				reference: "Team-form-binding-TeamPersonDropdown-selected-query"
			}
		]);
		expect(
			(rumModel.header?.modelReferences ?? []).some(
				(ref) => ref.modelType === "overview" && staleDropdownOverviewIds.has(ref.reference ?? "")
			)
		).toBe(false);

		expect(addedQueryIds).toEqual([
			"Team-form-binding-TeamPersonDropdown-available-query",
			"Team-form-binding-TeamPersonDropdown-selected-query"
		]);
		expect(addedOverviewHeaders.some((header) => staleDropdownOverviewIds.has(header.id))).toBe(false);
		expect(addedOverviewHeaders.some((header) => header.id === `${selectedOverviewId}-edit`)).toBe(false);
		expect(addedOverviewHeaders.some((header) => header.id === `${selectedOverviewId}-tableList`)).toBe(false);
		expect(
			addedOverviewHeaders.some((header) =>
				(header.modelReferences as Array<{ purpose?: string; reference?: string }> | undefined)?.some(
					(ref) => ref.purpose === "query-model-for-overview" && staleDropdownOverviewIds.has(header.id)
				)
			)
		).toBe(false);
		expect(findModelById(context, selectedOverviewId)).toBeUndefined();
		expect(originalSelectedOverview).toBeDefined();
		expect(
			getRowActionEventsSource(originalSelectedOverview)?.actions?.map((action) => action.event) ?? []
		).not.toEqual(expect.arrayContaining(["event_delete_link", "event_restore_link", "event_edit_link_document"]));

		const updatedHeader = (
			updatedForm as {
				header?: {
					annotations?: Array<{ name?: string }>;
					modelReferences?: Array<{ purpose?: string; modelType?: string; reference?: string }>;
				};
			}
		).header;
		const updatedRefs = updatedHeader?.modelReferences ?? [];

		expect(updatedHeader?.annotations?.some((annotation) => annotation.name === "bindingConfiguration")).toBe(false);
		expect(
			updatedRefs.some((ref) => ref.purpose === "bindingReference" && staleDropdownOverviewIds.has(ref.reference ?? ""))
		).toBe(false);
		expect(updatedRefs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ reference: "UnrelatedHistory-overview", purpose: "bindingReference" })
			])
		);
		expect(updatedRefs.filter((ref) => ref.purpose === "relationship-ui")).toHaveLength(1);
	});

	it("keepModels: does not delete generated document model for DualPane selected overview", () => {
		const { context, formModel, generatedDocId } = createNonKeepModelsSmokeFixture();

		(context as unknown as { userConfig: { keepModels: boolean } }).userConfig = { keepModels: true };

		extractionTransform(formModel, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, context);

		expect((context.deleteModel as ReturnType<typeof vi.fn>).mock.calls).not.toContainEqual([generatedDocId]);
	});
});

describe("buildOverviewLabelRegistry", () => {
	it("registers only pane-label source migrations, not nested-edit-pane-label", () => {
		const migrations: readonly OverviewLabelMigration[] = [
			{
				overviewModelId: "Candidate-overview",
				labels: [{ locale: "en", text: "Available" }],
				source: "pane-label",
				cloneTargets: new Set(["base", "RelName"])
			},
			{
				overviewModelId: "Edit-overview",
				labels: [{ locale: "en", text: "Edit available" }],
				source: "nested-edit-pane-label",
				cloneTargets: new Set(["edit-available"])
				// nested-edit-pane-label: not registered
			}
		];

		const registry = buildOverviewLabelRegistry(migrations);

		expect(registry.has("Candidate-overview")).toBe(true);
		expect(registry.has("Edit-overview")).toBe(false); // nested-edit-pane-label not registered
	});

	it("first-writer wins deterministically when same overviewModelId appears in multiple pane-label migrations", () => {
		const migrations: readonly OverviewLabelMigration[] = [
			{
				overviewModelId: "SharedOverview",
				labels: [{ locale: "en", text: "First binding label" }],
				source: "pane-label",
				cloneTargets: new Set(["base"])
			},
			{
				overviewModelId: "SharedOverview",
				labels: [{ locale: "en", text: "Second binding label (should be skipped)" }],
				source: "pane-label",
				cloneTargets: new Set(["base"])
			}
		];

		const registry = buildOverviewLabelRegistry(migrations);

		expect(registry.has("SharedOverview")).toBe(true);
		const entry = registry.get("SharedOverview")!;

		expect(entry.labels[0].text).toBe("First binding label");
	});

	it("stores inherited cloneTargets from the originating pane-label migration", () => {
		const migrations: readonly OverviewLabelMigration[] = [
			{
				overviewModelId: "Candidate-overview",
				labels: [
					{ locale: "en", text: "Available" },
					{ locale: "de", text: "Verf\u00fcgbar" }
				],
				source: "pane-label",
				cloneTargets: new Set(["base", "RelName"])
			}
		];

		const registry = buildOverviewLabelRegistry(migrations);
		const entry = registry.get("Candidate-overview")!;

		expect(entry.labels).toHaveLength(2);
		expect(entry.cloneTargets.has("base")).toBe(true);
		expect(entry.cloneTargets.has("RelName")).toBe(true);
		expect(entry.cloneTargets.has("tableList")).toBe(false);
	});

	it("does not register pane-label migrations without cloneTargets", () => {
		const migrations: readonly OverviewLabelMigration[] = [
			{
				overviewModelId: "Candidate-overview",
				labels: [{ locale: "en", text: "Available" }],
				source: "pane-label"
				// No cloneTargets: skipped by buildOverviewLabelRegistry
			}
		];

		const registry = buildOverviewLabelRegistry(migrations);

		expect(registry.has("Candidate-overview")).toBe(false);
	});

	it("returns empty registry for empty input", () => {
		const registry = buildOverviewLabelRegistry([]);

		expect(registry.size).toBe(0);
	});
});

describe("generateRegistryFallbackMigrations", () => {
	const BASE_REL = "TestRel";
	const EMPTY_CLONE = new Map<string, string>();
	const EMPTY_MULTI = new Map<string, ReadonlyMap<string, string>>();
	const EMPTY_IDS = new Set<string>();

	it("generates registry fallback when overview is not covered by any explicit migration", () => {
		// Seed the registry with a pane-label from a sibling binding
		const registry = buildOverviewLabelRegistry([
			{
				overviewModelId: "SharedOverview",
				labels: [{ locale: "en", text: "Sibling pane label" }],
				source: "pane-label",
				cloneTargets: new Set(["base"])
			}
		]);
		const component = { availableItemsOverviewModel: "SharedOverview" };

		// This binding has NO explicit pane-label migrations for SharedOverview
		const result = generateRegistryFallbackMigrations(
			[], // no explicit migrations from this binding
			component,
			BASE_REL,
			registry,
			EMPTY_CLONE,
			EMPTY_MULTI,
			false,
			EMPTY_IDS
		);

		// Should generate one registry-source fallback migration for SharedOverview
		expect(result.length).toBeGreaterThan(0);
		const fallback = result.find((m) => m.overviewModelId === "SharedOverview");

		expect(fallback).toBeDefined();
		expect(fallback?.source).toBe("registry");
		expect(fallback?.labels[0].text).toBe("Sibling pane label");
	});

	it("does not generate registry fallback when explicit pane-label covers the overview", () => {
		const registry = buildOverviewLabelRegistry([
			{
				overviewModelId: "SharedOverview",
				labels: [{ locale: "en", text: "Registry label" }],
				source: "pane-label",
				cloneTargets: new Set(["base"])
			}
		]);
		const component = { availableItemsOverviewModel: "SharedOverview" };

		// This binding has an explicit pane-label for SharedOverview
		const explicitMigrations: readonly OverviewLabelMigration[] = [
			{
				overviewModelId: "SharedOverview",
				labels: [{ locale: "en", text: "Explicit binding label" }],
				source: "pane-label",
				cloneTargets: new Set(["base"])
			}
		];

		const result = generateRegistryFallbackMigrations(
			explicitMigrations,
			component,
			BASE_REL,
			registry,
			EMPTY_CLONE,
			EMPTY_MULTI,
			false,
			EMPTY_IDS
		);

		// Explicit coverage blocks registry fallback
		expect(result).toHaveLength(0);
	});

	it("generates registry fallback when selected overview has no explicit pane-label", () => {
		const registry = buildOverviewLabelRegistry([
			{
				overviewModelId: "SharedOverview",
				labels: [{ locale: "en", text: "Registry label" }],
				source: "pane-label",
				cloneTargets: new Set(["base"])
			}
		]);
		const component = { selectedItemsOverviewModel: "SharedOverview" };

		const result = generateRegistryFallbackMigrations(
			[],
			component,
			BASE_REL,
			registry,
			EMPTY_CLONE,
			EMPTY_MULTI,
			false,
			EMPTY_IDS
		);

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			overviewModelId: "SharedOverview",
			source: "registry"
		});
	});

	it("does not generate fallback when overview is not in the registry", () => {
		const registry = buildOverviewLabelRegistry([]); // empty registry
		const component = { availableItemsOverviewModel: "SomeOverview" };

		const result = generateRegistryFallbackMigrations(
			[],
			component,
			BASE_REL,
			registry,
			EMPTY_CLONE,
			EMPTY_MULTI,
			false,
			EMPTY_IDS
		);

		expect(result).toHaveLength(0);
	});

	it("generates fallback for selectedItemsOverviewModel as well as availableItemsOverviewModel", () => {
		const registry = buildOverviewLabelRegistry([
			{
				overviewModelId: "SelectedOverview",
				labels: [{ locale: "en", text: "Registry selected label" }],
				source: "pane-label",
				cloneTargets: new Set(["base", "tableList"])
			}
		]);
		const component = { selectedItemsOverviewModel: "SelectedOverview" };

		const result = generateRegistryFallbackMigrations(
			[],
			component,
			BASE_REL,
			registry,
			EMPTY_CLONE,
			EMPTY_MULTI,
			false,
			EMPTY_IDS
		);

		// Fallback for selected overview, source = registry
		const fallback = result.find((m) => m.overviewModelId === "SelectedOverview");

		expect(fallback).toBeDefined();
		expect(fallback?.source).toBe("registry");
		expect(fallback?.labels[0].text).toBe("Registry selected label");
	});

	it("does nothing when component is undefined", () => {
		const registry = buildOverviewLabelRegistry([
			{
				overviewModelId: "SomeOverview",
				labels: [{ locale: "en", text: "Label" }],
				source: "pane-label",
				cloneTargets: new Set(["base"])
			}
		]);

		const result = generateRegistryFallbackMigrations(
			[],
			undefined, // no component
			BASE_REL,
			registry,
			EMPTY_CLONE,
			EMPTY_MULTI,
			false,
			EMPTY_IDS
		);

		expect(result).toHaveLength(0);
	});
});

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

import { it, expect, describe } from "vitest";

import type { Header } from "@com.mgmtp.a12.base/base-model-api";

import type { FormModel } from "../../../../../../src/models/form-model.js";
import { RUM_VERSION } from "../../../../../../src/internal/steps/RuM/extraction/constants.js";
import type { BindingModel } from "../../../../../../src/internal/steps/binding/binding-model.js";
import type { PipelineContext } from "../../../../../../src/internal/steps/RuM/extraction/types.js";
import { convertLegacyBinding } from "../../../../../../src/internal/steps/RuM/extraction/phase-1-binding-extraction/binding-converter.js";

type BindingDetails = BindingModel["details"];

interface BindingOverrides {
	readonly elementId?: BindingModel["elementId"];
	readonly name?: BindingDetails["name"];
	readonly relationshipName?: BindingDetails["relationshipName"];
	readonly targetRole?: BindingDetails["targetRole"];
	readonly metaInformation?: BindingDetails["metaInformation"];
	readonly components?: BindingDetails["components"];
	readonly modificationConfiguration?: BindingDetails["modificationConfiguration"];
}

type TestScreenElement = Pick<FormModel.BasicScreenElement, "id" | "title">;

interface ContextOverrides {
	readonly header?: Partial<Header>;
	readonly content?: {
		readonly screens?: readonly { readonly screenElements: readonly TestScreenElement[] }[];
	};
	readonly rolesAnnotations?: PipelineContext["rolesAnnotations"];
}

function createBinding(overrides: BindingOverrides = {}): BindingModel {
	const { elementId = "test-element", ...detailOverrides } = overrides;
	const details: BindingDetails = {
		name: "TestBinding",
		relationshipName: "TestRelationship",
		targetRole: "TargetRole",
		metaInformation: { version: "1.0.0" },
		components: [
			{
				name: "DropDownSelection",
				id: "test-dropdown",
				models: [{ name: "PersonOverview", use: "candidate" }],
				candidatePageSize: 50
			}
		],
		...detailOverrides
	};

	return {
		type: "relationship",
		elementId,
		details
	};
}

function createContext(overrides: ContextOverrides = {}): PipelineContext {
	const header: Header = {
		id: "TestForm",
		modelType: "form",
		modelVersion: "1.0.0",
		modelReferences: [
			{ reference: "PersonOverview", modelType: "overview", purpose: "overview" },
			{ reference: "LinkOverview", modelType: "overview", purpose: "overview" },
			{ reference: "LinkForm", modelType: "form", purpose: "form" }
		],
		annotations: [],
		...overrides.header
	};
	const content: { readonly screens: readonly { readonly screenElements: readonly TestScreenElement[] }[] } = {
		screens: [],
		...overrides.content
	};

	return {
		formModel: {
			header,
			content
		},
		formModelId: "TestForm",
		bindings: [],
		migrations: {
			pageSizeMigrations: [],
			rowActionMigrations: [],
			rowActivationMigrations: [],
			overviewLabelMigrations: []
		},
		keepModels: false,
		rolesAnnotations: overrides.rolesAnnotations ?? []
	};
}

function createMalformedBinding_missingRequiredDetails(): BindingModel {
	return {
		type: "relationship",
		elementId: "bad-element",
		details: {
			name: "BadBinding",
			relationshipName: "TestRel",
			targetRole: "Target"
		}
	} as unknown as BindingModel;
}

describe("convertLegacyBinding", () => {
	it("should return a BindingResult with ruModel for DropDownSelection", () => {
		const binding = createBinding();
		const result = convertLegacyBinding(binding, createContext());

		expect(result.ruModel).toBeDefined();
		expect(result.ruModel.header.modelType).toBe("relationship-ui");
		expect(result.ruModel.header.modelVersion).toBe(RUM_VERSION);
		expect(result.ruModel.content.relationshipName).toBe("TestRelationship");
		expect(result.ruModel.content.targetRole).toBe("TargetRole");
	});

	it("should copy roles annotations from context to the RuM header", () => {
		const rolesAnnotations = [{ name: "roles", value: "admin,editor" }];
		const binding = createBinding();
		const result = convertLegacyBinding(binding, createContext({ rolesAnnotations }));

		expect(result.ruModel.header.annotations).toEqual(rolesAnnotations);
		expect(result.ruModel.header.annotations?.[0]).toBe(rolesAnnotations[0]);
	});

	it("should keep RuM header annotations empty when context has no roles", () => {
		const binding = createBinding();
		const result = convertLegacyBinding(binding, createContext());

		expect(result.ruModel.header.annotations).toEqual([]);
	});

	it("should throw BindingConversionError for malformed legacy binding", () => {
		const rolesAnnotations = [{ name: "roles", value: "admin" }];
		const badBinding = createMalformedBinding_missingRequiredDetails();

		expect(() => convertLegacyBinding(badBinding, createContext({ rolesAnnotations }))).toThrowError(
			"Cannot convert legacy binding"
		);
	});

	it("should generate the correct model ID", () => {
		const binding = createBinding();
		const result = convertLegacyBinding(binding, createContext());

		expect(result.ruModel.header.id).toMatch(/^TestForm-binding-TestBinding_RuM$/);
	});

	it("should normalize spaces and underscores in binding name", () => {
		const binding = createBinding({
			name: "detached repeat r_coInsurer"
		});
		const result = convertLegacyBinding(binding, createContext());

		expect(result.ruModel.header.id).toMatch(/^TestForm-binding-detached-repeat-r-coInsurer_RuM$/);
	});

	it("should handle missing binding name via fallback chain", () => {
		const binding = createBinding({
			name: ""
		});
		const result = convertLegacyBinding(binding, createContext());

		expect(result.ruModel.header.id).toMatch(/^TestForm-binding-TestRelationship_RuM$/);
	});

	it("should use default-name when all fallbacks are empty", () => {
		const binding = createBinding({
			name: "",
			relationshipName: "",
			targetRole: "Target",
			components: [{ name: "DropDownSelection", models: [{ name: "PersonOverview", use: "candidate" }] }]
		});

		const result = convertLegacyBinding(binding, createContext());

		expect(result.ruModel.header.id).toMatch(/^TestForm-binding-default-name_RuM$/);
	});

	it("should include modelReferences from component overview refs", () => {
		const binding = createBinding();
		const result = convertLegacyBinding(binding, createContext());

		const refs = result.ruModel.header.modelReferences ?? [];
		expect(refs.length).toBe(1);
		expect(refs[0]).toEqual({
			reference: "PersonOverview",
			modelType: "overview",
			purpose: "overview"
		});
	});

	it("should collect page size migrations", () => {
		const binding = createBinding();
		const result = convertLegacyBinding(binding, createContext());

		expect(result.pageSizeMigrations.length).toBeGreaterThan(0);
		expect(result.pageSizeMigrations[0].overviewModelId).toBe("PersonOverview");
		expect(result.pageSizeMigrations[0].pageSize).toBe(50);
	});

	it("should return binding name and elementId", () => {
		const binding = createBinding();
		const result = convertLegacyBinding(binding, createContext());

		expect(result.bindingName).toBe("TestBinding");
		expect(result.elementId).toBe("test-element");
	});

	it("should propagate conversion failures as BindingConversionError", () => {
		const badBinding = createMalformedBinding_missingRequiredDetails();

		expect(() => convertLegacyBinding(badBinding, createContext())).toThrowError("Cannot convert legacy binding");
	});

	it("should preserve TableList extendParentActivityDescriptor in content modificationConfiguration", () => {
		const binding = createBinding({
			modificationConfiguration: {
				extendParentActivityDescriptor: true
			},
			components: [
				{
					name: "TableList",
					id: "table-list",
					models: [{ name: "LinkOverview", use: "link" }]
				}
			]
		});
		const result = convertLegacyBinding(binding, createContext());

		expect(result.ruModel.content.modificationConfiguration).toEqual({
			extendParentActivityDescriptor: true
		});
	});

	it("should preserve DropDown activity configuration without leaking button labels", () => {
		const binding = createBinding({
			modificationConfiguration: {
				addButtonLabel: [{ locale: "en", text: "Add" }],
				editButtonLabel: [{ locale: "en", text: "Edit" }],
				extendParentActivityDescriptor: true
			}
		});
		const result = convertLegacyBinding(binding, createContext());

		expect(result.ruModel.content.modificationConfiguration).toEqual({
			extendParentActivityDescriptor: true
		});
		expect(result.ruModel.content.component.buttons).toEqual([
			{
				event: "event_add_document",
				icon: { name: "add" },
				labelHidden: true,
				label: [{ locale: "en", text: "Add" }]
			}
		]);
	});

	it("should preserve activityDescriptor in content modificationConfiguration", () => {
		const binding = createBinding({
			modificationConfiguration: {
				activityDescriptor: { model: "SomeModel" }
			}
		});
		const result = convertLegacyBinding(binding, createContext());

		expect(result.ruModel.content.modificationConfiguration).toEqual({
			activityDescriptor: { model: "SomeModel" }
		});
	});

	it("should omit content modificationConfiguration when legacy config only contains button labels", () => {
		const binding = createBinding({
			modificationConfiguration: {
				addButtonLabel: [{ locale: "en", text: "Add" }],
				editButtonLabel: [{ locale: "en", text: "Edit" }]
			}
		});
		const result = convertLegacyBinding(binding, createContext());

		expect(result.ruModel.content.modificationConfiguration).toBeUndefined();
	});

	it("should omit content modificationConfiguration when legacy config is absent", () => {
		const binding = createBinding();
		const result = convertLegacyBinding(binding, createContext());

		expect(result.ruModel.content.modificationConfiguration).toBeUndefined();
	});

	it("should handle DualPaneSelection components", () => {
		const binding = createBinding({
			components: [
				{
					name: "DualPaneSelection",
					id: "test-dualpane",
					models: [
						{ name: "PersonOverview", use: "candidate" },
						{ name: "LinkOverview", use: "link" }
					],
					candidatePageSize: 25
				}
			]
		});
		const result = convertLegacyBinding(binding, createContext());

		expect(result.ruModel.content.component.componentType).toBe("DualPaneSelection");
		expect(result.ruModel.content.component.availableItemsOverviewModel).toBe("PersonOverview");
	});

	it("should emit default DualPane selected row actions without edit when linkFormModel is absent", () => {
		const selectedOverviewId = "CategoryCategory_Child_LinkOverview-overview";
		const binding = createBinding({
			components: [
				{
					name: "DualPaneSelection",
					id: "category-dualpane",
					models: [
						{ name: "PersonOverview", use: "candidate" },
						{ name: selectedOverviewId, use: "link" }
					]
				}
			]
		});
		const context = createContext({
			header: {
				modelReferences: [
					{ reference: "PersonOverview", modelType: "overview", purpose: "overview" },
					{ reference: selectedOverviewId, modelType: "overview", purpose: "overview" }
				]
			}
		});

		const result = convertLegacyBinding(binding, context);

		expect(result.rowActionMigrations).toEqual([
			{
				overviewModelId: selectedOverviewId,
				actionType: "event_delete_link",
				icon: "remove_circle",
				destructive: true
			},
			{
				overviewModelId: selectedOverviewId,
				actionType: "event_restore_link",
				icon: "add_circle",
				destructive: undefined
			},
			{
				overviewModelId: "PersonOverview",
				actionType: "event_add_link",
				icon: "add",
				destructive: undefined
			}
		]);
		expect(result.rowActionMigrations.map((migration) => migration.actionType)).not.toContain(
			"event_edit_link_document"
		);
	});

	it("should emit default DualPane selected row actions with edit when linkFormModel is present", () => {
		const selectedOverviewId = "TeamPerson_Person_LinkOverview-overview";
		const linkFormId = "TeamPerson_LinkForm";
		const binding = createBinding({
			components: [
				{
					name: "DualPaneSelection",
					id: "team-person-dualpane",
					models: [
						{ name: "PersonOverview", use: "candidate" },
						{ name: selectedOverviewId, use: "link" },
						{ name: linkFormId, use: "link" }
					]
				}
			]
		});
		const context = createContext({
			header: {
				modelReferences: [
					{ reference: "PersonOverview", modelType: "overview", purpose: "overview" },
					{ reference: selectedOverviewId, modelType: "overview", purpose: "overview" },
					{ reference: linkFormId, modelType: "form", purpose: "form" }
				]
			}
		});

		const result = convertLegacyBinding(binding, context);

		expect(result.rowActionMigrations).toEqual([
			{
				overviewModelId: selectedOverviewId,
				actionType: "event_delete_link",
				icon: "remove_circle",
				destructive: true
			},
			{
				overviewModelId: selectedOverviewId,
				actionType: "event_restore_link",
				icon: "add_circle",
				destructive: undefined
			},
			{
				overviewModelId: selectedOverviewId,
				actionType: "event_edit_link_document",
				icon: "edit",
				destructive: undefined
			},
			{
				overviewModelId: "PersonOverview",
				actionType: "event_add_link",
				icon: "add",
				destructive: undefined
			}
		]);
	});

	it("should collect DualPane row activations for available and selected overviews", () => {
		const selectedOverviewId = "TeamPerson_Person_LinkOverview-overview";
		const binding = createBinding({
			components: [
				{
					name: "DualPaneSelection",
					id: "team-person-dualpane",
					models: [
						{ name: "PersonOverview", use: "candidate" },
						{ name: selectedOverviewId, use: "link" }
					]
				}
			]
		});

		const result = convertLegacyBinding(binding, createContext());

		expect(result.rowActivationMigrations).toEqual([
			{
				overviewModelId: "PersonOverview",
				activation: { type: "event", event: "event_add_link" }
			},
			{
				overviewModelId: selectedOverviewId,
				activation: { type: "event", event: "event_delete_link" }
			}
		]);
	});

	it("should collect TableList row activations for direct and edit overviews", () => {
		const binding = createBinding({
			components: [
				{
					name: "TableList",
					id: "team-person-tablelist",
					models: [{ name: "DirectSelectedOverview", use: "link" }]
				},
				{
					name: "DualPaneSelection",
					id: "team-person-tablelist-edit",
					models: [
						{ name: "EditAvailableOverview", use: "candidate" },
						{ name: "EditSelectedOverview", use: "link" }
					]
				}
			]
		});
		const context = createContext({
			header: {
				modelReferences: [
					{ reference: "DirectSelectedOverview", modelType: "overview", purpose: "overview" },
					{ reference: "EditAvailableOverview", modelType: "overview", purpose: "overview" },
					{ reference: "EditSelectedOverview", modelType: "overview", purpose: "overview" }
				]
			}
		});

		const result = convertLegacyBinding(binding, context);

		expect(result.rowActivationMigrations).toEqual([
			{
				overviewModelId: "DirectSelectedOverview",
				activation: { type: "non_interactive" }
			},
			{
				overviewModelId: "EditAvailableOverview",
				activation: { type: "event", event: "event_add_link" }
			},
			{
				overviewModelId: "EditSelectedOverview",
				activation: { type: "event", event: "event_delete_link" }
			}
		]);
	});

	it("should collect only direct non-interactive TableList activation without edit configuration", () => {
		const binding = createBinding({
			components: [
				{
					name: "TableList",
					id: "table-list",
					models: [{ name: "LinkOverview", use: "link" }]
				}
			]
		});
		const context = createContext({
			header: {
				modelReferences: [{ reference: "LinkOverview", modelType: "overview", purpose: "overview" }]
			}
		});

		const result = convertLegacyBinding(binding, context);

		expect(result.rowActivationMigrations).toEqual([
			{
				overviewModelId: "LinkOverview",
				activation: { type: "non_interactive" }
			}
		]);
	});

	it("should not collect DropDown row activations", () => {
		const result = convertLegacyBinding(createBinding(), createContext());

		expect(result.rowActivationMigrations).toEqual([]);
	});

	it("should set DualPane header.labels from host form element title", () => {
		const binding = createBinding({
			components: [
				{
					name: "DualPaneSelection",
					id: "test-dualpane",
					models: [
						{ name: "PersonOverview", use: "candidate" },
						{ name: "LinkOverview", use: "link" }
					]
				}
			]
		});
		const context = createContext({
			content: {
				screens: [
					{
						screenElements: [
							{
								id: "test-element",
								title: {
									type: "Multilingual",
									multilingualText: {
										text: [
											{ locale: "en", text: "Relations" },
											{ locale: "de", text: "Beziehungen" }
										]
									}
								}
							}
						]
					}
				]
			}
		});

		const result = convertLegacyBinding(binding, context);

		expect(result.ruModel.header.labels).toEqual([
			{ locale: "en", text: "Relations" },
			{ locale: "de", text: "Beziehungen" }
		]);
	});

	it("should keep TableList header.labels undefined and emit no direct host overview migration", () => {
		const binding = createBinding({
			components: [
				{
					name: "TableList",
					id: "table-list",
					models: [{ name: "LinkOverview", use: "link" }],
					props: {
						selectedItemsTable: {
							label: [{ locale: "en", text: "Legacy Selected" }]
						}
					}
				}
			]
		});
		const context = createContext({
			content: {
				screens: [
					{
						screenElements: [
							{
								id: "test-element",
								title: {
									type: "Multilingual",
									multilingualText: {
										text: [
											{ locale: "en", text: "Host Title" },
											{ locale: "de", text: "Host Titel" }
										]
									}
								}
							}
						]
					}
				]
			}
		});

		const result = convertLegacyBinding(binding, context);

		expect(result.ruModel.header.labels).toBeUndefined();
		expect(result.overviewLabelMigrations).toEqual([]);
	});

	it("should not emit direct host label when host form element title is missing", () => {
		const binding = createBinding({
			components: [
				{
					name: "TableList",
					id: "table-list",
					models: [{ name: "LinkOverview", use: "link" }]
				}
			]
		});

		const result = convertLegacyBinding(binding, createContext());

		expect(result.overviewLabelMigrations).toEqual([]);
	});

	it("should emit ProductBrand DropDown edit button only when linkFormModel resolves", () => {
		const binding = createBinding({
			components: [
				{
					name: "DropDownSelection",
					id: "product-brand-dropdown",
					models: [
						{ name: "PersonOverview", use: "candidate" },
						{ name: "LinkForm", use: "link" }
					]
				}
			]
		});

		const result = convertLegacyBinding(binding, createContext());

		expect(result.ruModel.content.component.linkFormModel).toBe("LinkForm");
		expect(result.ruModel.content.component.buttons).toEqual([
			{
				event: "event_edit_link_document",
				icon: { name: "description" },
				labelHidden: true,
				label: [
					{ locale: "en", text: "Edit additional properties" },
					{ locale: "de", text: "Zusätzliche Eigenschaften bearbeiten" }
				]
			}
		]);
	});

	it("should not emit Category DropDown buttons for link-overview-only models", () => {
		const binding = createBinding({
			components: [
				{
					name: "DropDownSelection",
					id: "category-dropdown",
					models: [
						{ name: "PersonOverview", use: "candidate" },
						{ name: "LinkOverview", use: "link" }
					]
				}
			]
		});

		const result = convertLegacyBinding(binding, createContext());

		expect(result.ruModel.content.component.linkFormModel).toBeUndefined();
		expect(result.ruModel.content.component.buttons).toBeUndefined();
	});

	it("should emit CDM policy-holder DropDown add button without edit when addButtonLabel exists", () => {
		const binding = createBinding({
			modificationConfiguration: {
				addButtonLabel: [
					{ locale: "en", text: "Add new Policy Holder" },
					{ locale: "de", text: "Neuen Policeninhaber hinzufügen" }
				],
				editButtonLabel: [{ locale: "en", text: "Edit Policy Holder" }],
				extendParentActivityDescriptor: true
			},
			components: [
				{
					name: "DropDownSelection",
					id: "policy-holder-dropdown",
					models: [
						{ name: "PersonOverview", use: "candidate" },
						{ name: "LinkOverview", use: "link" }
					]
				}
			]
		});

		const result = convertLegacyBinding(binding, createContext());

		expect(result.ruModel.content.component.linkFormModel).toBeUndefined();
		expect(result.ruModel.content.component.buttons).toEqual([
			{
				event: "event_add_document",
				icon: { name: "add" },
				labelHidden: true,
				label: [
					{ locale: "en", text: "Add new Policy Holder" },
					{ locale: "de", text: "Neuen Policeninhaber hinzufügen" }
				]
			}
		]);
	});

	it("should not emit non-CDM policy-holder DropDown add button without addButtonLabel", () => {
		const binding = createBinding({
			components: [
				{
					name: "DropDownSelection",
					id: "policy-holder-dropdown",
					models: [
						{ name: "PersonOverview", use: "candidate" },
						{ name: "LinkOverview", use: "link" }
					]
				}
			]
		});

		const result = convertLegacyBinding(binding, createContext());

		expect(result.ruModel.content.component.buttons).toBeUndefined();
	});
});

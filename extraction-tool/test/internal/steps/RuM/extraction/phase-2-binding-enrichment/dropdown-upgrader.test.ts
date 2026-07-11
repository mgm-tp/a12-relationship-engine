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

import { RUM_VERSION } from "../../../../../../src/internal/steps/RuM/extraction/constants.js";
import { createDropDownBindingResult } from "../../../../../internal/test-support/binding-result-factory.js";
import type { RelationshipUiModel } from "../../../../../../src/internal/steps/RuM/relationship-ui-model.js";
import { upgradeDropdownBindings } from "../../../../../../src/internal/steps/RuM/extraction/phase-2-binding-enrichment/dropdown-upgrader.js";
import type {
	BindingResult,
	EnrichmentContext
} from "../../../../../../src/internal/steps/RuM/extraction/phase-2-binding-enrichment/types.js";

function createOverviewModel(options?: {
	documentModelId?: string;
	useHeaderReference?: boolean;
	columns?: ReadonlyArray<{ readonly elementRef: string }>;
}): object {
	const useHeaderReference = options?.useHeaderReference ?? true;
	const documentModelId = options?.documentModelId;

	return {
		header: {
			id: "test-overview",
			modelType: "overview",
			modelVersion: "2.0.0",
			...(useHeaderReference && documentModelId
				? {
						modelReferences: [
							{
								purpose: "document-model-for-overview",
								modelType: "document",
								reference: documentModelId
							}
						]
					}
				: {})
		},
		content: {
			...(options?.columns ? { columns: options.columns } : {})
		}
	};
}

function createContext(
	resolveModel: (id: string) => object | undefined = () => undefined,
	overrides?: Partial<EnrichmentContext>
): EnrichmentContext {
	return { resolveModel, ...overrides };
}

function createRelationshipModel(overrides?: {
	relationshipId?: string;
	targetRole?: string;
	sourceRole?: string;
	targetDocumentModel?: string;
	sourceDocumentModel?: string;
}): object {
	const targetRole = overrides?.targetRole ?? "businessPartner";
	const sourceRole = overrides?.sourceRole ?? "address";
	const relationshipId = overrides?.relationshipId ?? "test-relationship";

	return {
		header: {
			id: relationshipId,
			modelType: "relationship",
			modelVersion: RUM_VERSION
		},
		content: {
			entityCharacteristics: [
				{
					role: targetRole,
					documentModel: overrides?.targetDocumentModel ?? "Address-document"
				},
				{
					role: sourceRole,
					documentModel: overrides?.sourceDocumentModel ?? "BusinessPartner-document"
				}
			]
		}
	};
}

function getComponent(binding: BindingResult): RelationshipUiModel.ComponentConfiguration {
	return (binding.relationshipUiModel ?? binding.ruModel).content.component;
}

function createNonDropdownBindingResult(): BindingResult {
	const relationshipUiModel: RelationshipUiModel = {
		header: {
			id: "dual_RuM",
			modelType: "relationship-ui",
			modelVersion: RUM_VERSION
		},
		content: {
			relationshipName: "test",
			targetRole: "test",
			component: {
				componentType: "DualPaneSelection",
				availableItemsOverviewModel: "CandidateOverview",
				selectedItemsOverviewModel: "SelectedOverview"
			}
		}
	};

	return {
		ruModel: relationshipUiModel,
		relationshipUiModel,
		bindingName: "dual-pane",
		elementId: "dual-element",
		relationshipName: "test",
		targetRole: "test",
		pageSizeMigrations: [],
		rowActionMigrations: [],
		rowActivationMigrations: [],
		overviewLabelMigrations: [],
		queryModels: [],
		migrations: {
			pageSizeMigrations: [],
			rowActionMigrations: [],
			rowActivationMigrations: [],
			overviewLabelMigrations: [],
			rowActions: [],
			rowActivations: [],
			modificationConfigFlags: { extendParentActivityDescriptor: false }
		}
	};
}

describe("upgradeDropdownBindings", () => {
	it("should upgrade DropDownSelection with overview refs to query refs", () => {
		const binding = createDropDownBindingResult({
			bindingId: "test",
			availableItemsOverviewModel: "CandidateOverview",
			selectedItemsOverviewModel: "SelectedOverview",
			elementRef: "field_name"
		});
		const context = createContext((id: string) => {
			if (id === "CandidateOverview") {
				return createOverviewModel({ documentModelId: "PersonDM" });
			}

			if (id === "SelectedOverview") {
				return createOverviewModel({ documentModelId: "PersonDM" });
			}

			return undefined;
		});

		const result = upgradeDropdownBindings([binding], context);
		expect(result.updatedBindings).toHaveLength(1);

		const upgradedBinding = result.updatedBindings[0]!;
		const component = getComponent(upgradedBinding);

		expect(component.availableItemsOverviewModel).toBeUndefined();
		expect(component.selectedItemsOverviewModel).toBeUndefined();
		expect(component.availableItemsQueryModel).toBe("test-available-query");
		expect(component.selectedItemQueryModel).toBe("test-selected-query");
		expect(component.elementRef).toBe("field_name");
		expect(upgradedBinding.relationshipUiModel!.header.modelReferences).toEqual([
			{ purpose: "availableItemsQuery", modelType: "query", reference: "test-available-query" },
			{ purpose: "selectedItemQuery", modelType: "query", reference: "test-selected-query" }
		]);

		expect(result.additionalQueryModels).toHaveLength(2);
		const availableQuery = result.additionalQueryModels[0];
		const selectedQuery = result.additionalQueryModels[1];
		expect(availableQuery.header.id).toBe("test-available-query");
		expect(selectedQuery.header.id).toBe("test-selected-query");
		expect(availableQuery.header.annotations).toEqual([]);
		expect(selectedQuery.header.annotations).toEqual([]);
	});

	it("should remove stale overview refs and preserve non-overview refs when upgrading dropdown headers", () => {
		const binding = createDropDownBindingResult({
			bindingId: "test",
			availableItemsOverviewModel: "CandidateOverview",
			selectedItemsOverviewModel: "SelectedOverview",
			modelReferences: [
				{ purpose: "overview", modelType: "overview", reference: "CandidateOverview" },
				{ purpose: "overview", modelType: "overview", reference: "SelectedOverview" },
				{ purpose: "link", modelType: "form", reference: "PostalAddressLinkForm" }
			]
		});
		const context = createContext(() => createOverviewModel({ documentModelId: "Address-document" }));

		const result = upgradeDropdownBindings([binding], context);
		const updatedRefs = result.updatedBindings[0]!.relationshipUiModel!.header.modelReferences;

		expect(updatedRefs).toEqual([
			{ purpose: "link", modelType: "form", reference: "PostalAddressLinkForm" },
			{ purpose: "availableItemsQuery", modelType: "query", reference: "test-available-query" },
			{ purpose: "selectedItemQuery", modelType: "query", reference: "test-selected-query" }
		]);
	});

	it("should copy source form roles annotations to generated dropdown query headers", () => {
		const rolesAnnotations = [{ name: "roles", value: "admin,editor" }];
		const binding = createDropDownBindingResult({
			bindingId: "test",
			availableItemsOverviewModel: "CandidateOverview",
			selectedItemsOverviewModel: "SelectedOverview"
		});
		const context = createContext(
			(id: string) => {
				if (id === "CandidateOverview" || id === "SelectedOverview") {
					return createOverviewModel({ documentModelId: "PersonDM" });
				}

				return undefined;
			},
			{ rolesAnnotations }
		);

		const result = upgradeDropdownBindings([binding], context);

		expect(result.additionalQueryModels.map((query) => query.header.annotations)).toEqual([
			rolesAnnotations,
			rolesAnnotations
		]);
		expect(result.additionalQueryModels[0]?.header.annotations?.[0]).toBe(rolesAnnotations[0]);
	});

	it("should resolve overview document model from header modelReferences", () => {
		const binding = createDropDownBindingResult({
			bindingId: "test",
			availableItemsOverviewModel: "CandidateOverview",
			selectedItemsOverviewModel: "SelectedOverview"
		});
		const context = createContext((id: string) => {
			if (id === "CandidateOverview" || id === "SelectedOverview") {
				return createOverviewModel({ documentModelId: "HeaderRefDM" });
			}

			return undefined;
		});

		const result = upgradeDropdownBindings([binding], context);

		expect(result.additionalQueryModels).toHaveLength(2);
		expect(result.additionalQueryModels[0]?.content.targetDocumentModel).toBe("HeaderRefDM");
	});

	it("should not resolve document model when overview header reference is missing", () => {
		const binding = createDropDownBindingResult({
			bindingId: "test",
			availableItemsOverviewModel: "CandidateOverview",
			selectedItemsOverviewModel: "SelectedOverview"
		});
		const context = createContext(() =>
			createOverviewModel({ documentModelId: "LegacyContentDM", useHeaderReference: false })
		);

		const result = upgradeDropdownBindings([binding], context);

		expect(result.additionalQueryModels).toHaveLength(0);
		expect(result.updatedBindings).toHaveLength(1);
		expect(result.updatedBindings[0]!.relationshipUiModel!.content.component.availableItemsQueryModel).toBeUndefined();
	});

	it("should use candidate page size from migrations (GAP-14)", () => {
		const binding = createDropDownBindingResult({
			bindingId: "test",
			availableItemsOverviewModel: "CandidateOverview",
			selectedItemsOverviewModel: "SelectedOverview",
			pageSizeMigrations: [{ overviewModelId: "CandidateOverview", pageSize: 25 }],
			elementRef: "field_name"
		});
		const context = createContext(() => createOverviewModel({ documentModelId: "PersonDM" }));

		const result = upgradeDropdownBindings([binding], context);
		const availableQuery = result.additionalQueryModels.find((q) => q.header.id === "test-available-query");
		expect(availableQuery).toBeDefined();
		expect(availableQuery?.content.paging?.pageSize).toBe(25);
	});

	it("should fallback to page size 50 when no page size migration exists", () => {
		const binding = createDropDownBindingResult({
			bindingId: "test",
			availableItemsOverviewModel: "CandidateOverview",
			selectedItemsOverviewModel: "SelectedOverview",
			elementRef: "field_name"
		});
		const context = createContext(() => createOverviewModel({ documentModelId: "PersonDM" }));

		const result = upgradeDropdownBindings([binding], context);
		const availableQuery = result.additionalQueryModels.find((q) => q.header.id === "test-available-query");
		expect(availableQuery?.content.paging?.pageSize).toBe(50);
	});

	it("should use pageSize=1 for selected query", () => {
		const binding = createDropDownBindingResult({
			bindingId: "test",
			availableItemsOverviewModel: "CandidateOverview",
			selectedItemsOverviewModel: "SelectedOverview",
			elementRef: "field_name"
		});
		const context = createContext(() => createOverviewModel({ documentModelId: "PersonDM" }));

		const result = upgradeDropdownBindings([binding], context);
		const selectedQuery = result.additionalQueryModels.find((q) => q.header.id === "test-selected-query");
		expect(selectedQuery?.content.paging?.pageSize).toBe(1);
	});

	it("should set targetDocumentModel from resolved overview model's documentModelId", () => {
		const binding = createDropDownBindingResult({
			bindingId: "test",
			availableItemsOverviewModel: "CandidateOverview",
			selectedItemsOverviewModel: "SelectedOverview",
			elementRef: "field_name"
		});
		const context = createContext(() => createOverviewModel({ documentModelId: "PersonDM" }));

		const result = upgradeDropdownBindings([binding], context);

		for (const query of result.additionalQueryModels) {
			expect(query.content.targetDocumentModel).toBe("PersonDM");
			expect("entityModelId" in (query.content ?? {})).toBe(false);
			expect("constraints" in (query.content ?? {})).toBe(false);
			expect("pageSize" in (query.content ?? {})).toBe(false);
		}
	});

	it("should skip bindings that already have query refs", () => {
		const binding = createDropDownBindingResult({
			bindingId: "test",
			availableItemsOverviewModel: "CandidateOverview",
			selectedItemsOverviewModel: "SelectedOverview",
			availableItemsQueryModel: "existing-available-query",
			selectedItemQueryModel: "existing-selected-query",
			elementRef: "field_name"
		});
		const context = createContext(() => createOverviewModel({ documentModelId: "PersonDM" }));

		const result = upgradeDropdownBindings([binding], context);
		expect(result.updatedBindings).toHaveLength(1);
		expect(result.additionalQueryModels).toHaveLength(0);

		const component = getComponent(result.updatedBindings[0]!);
		expect(component.availableItemsOverviewModel).toBe("CandidateOverview");
		expect(component.availableItemsQueryModel).toBe("existing-available-query");
	});

	it("should handle missing availableItemsOverviewModel — no upgrade applies", () => {
		// Binding has no availableItemsOverviewModel, so shouldUpgradeBinding returns false.
		const binding = createDropDownBindingResult({
			bindingId: "test"
			// No availableItemsOverviewModel set — not eligible for upgrade
		});
		const context = createContext(() => createOverviewModel({ documentModelId: "PersonDM" }));

		const result = upgradeDropdownBindings([binding], context);
		expect(result.updatedBindings).toHaveLength(1);
		expect(result.additionalQueryModels).toHaveLength(0);

		const component = getComponent(result.updatedBindings[0]!);
		expect(component.availableItemsQueryModel).toBeUndefined();
	});

	it("should handle missing elementRef gracefully by falling back to empty string", () => {
		// Binding has no elementRef, component has no elementRef, overview has no columns.
		// Fallback should produce empty string.
		const binding = createDropDownBindingResult({
			bindingId: "test",
			availableItemsOverviewModel: "CandidateOverview",
			selectedItemsOverviewModel: "SelectedOverview"
			// No elementRef set
		});

		const context = createContext(() => createOverviewModel({ documentModelId: "PersonDM" }));

		const result = upgradeDropdownBindings([binding], context);
		const component = getComponent(result.updatedBindings[0]!);
		expect(component.elementRef).toBe("");
	});

	it("should fallback elementRef to overview model's first column when binding lacks it", () => {
		// Binding has no elementRef, component has no elementRef,
		// but overview model's first column has an elementRef (Q64).
		const binding = createDropDownBindingResult({
			bindingId: "test",
			availableItemsOverviewModel: "CandidateOverview",
			selectedItemsOverviewModel: "SelectedOverview"
			// No elementRef on binding or component
		});

		const context = createContext(() =>
			createOverviewModel({
				documentModelId: "PersonDM",
				columns: [{ elementRef: "person_name" }, { elementRef: "person_role" }]
			})
		);

		const result = upgradeDropdownBindings([binding], context);
		const component = getComponent(result.updatedBindings[0]!);
		expect(component.elementRef).toBe("person_name");
	});

	it("should skip non-DropDownSelection bindings", () => {
		const dualPaneBinding = createNonDropdownBindingResult();

		const context = createContext();
		const result = upgradeDropdownBindings([dualPaneBinding], context);
		expect(result.updatedBindings).toHaveLength(1);
		expect(result.additionalQueryModels).toHaveLength(0);

		const component = getComponent(result.updatedBindings[0]!);
		expect(component.componentType).toBe("DualPaneSelection");
	});

	it("should generate query model IDs from header.id", () => {
		const binding = createDropDownBindingResult({
			bindingId: "my-form-binding-person-selection",
			availableItemsOverviewModel: "CandidateOverview",
			selectedItemsOverviewModel: "SelectedOverview",
			elementRef: "field_name"
		});
		const context = createContext(() => createOverviewModel({ documentModelId: "PersonDM" }));

		const result = upgradeDropdownBindings([binding], context);
		const queryIds = result.additionalQueryModels.map((q) => q.header.id);
		expect(queryIds).toContain("my-form-binding-person-selection-available-query");
		expect(queryIds).toContain("my-form-binding-person-selection-selected-query");
	});

	it("should process multiple DropDown bindings", () => {
		const binding1 = createDropDownBindingResult({
			bindingId: "binding-1",
			availableItemsOverviewModel: "Overview1",
			selectedItemsOverviewModel: "Selected1",
			elementRef: "field_1",
			relationshipName: "rel-1",
			targetRole: "role-1"
		});
		const binding2 = createDropDownBindingResult({
			bindingId: "binding-2",
			availableItemsOverviewModel: "Overview2",
			selectedItemsOverviewModel: "Selected2",
			elementRef: "field_2",
			relationshipName: "rel-2",
			targetRole: "role-2"
		});

		const resolvedModels: Record<string, object> = {
			Overview1: createOverviewModel({ documentModelId: "PersonDM" }),
			Overview2: createOverviewModel({ documentModelId: "AddressDM" }),
			"rel-1": createRelationshipModel({
				relationshipId: "rel-1",
				targetRole: "role-1",
				sourceRole: "role-1-source",
				targetDocumentModel: "PersonDM",
				sourceDocumentModel: "SourcePersonDM"
			}),
			"rel-2": createRelationshipModel({
				relationshipId: "rel-2",
				targetRole: "role-2",
				sourceRole: "role-2-source",
				targetDocumentModel: "AddressDM",
				sourceDocumentModel: "SourceAddressDM"
			})
		};
		const context = createContext((id: string) => resolvedModels[id]);

		const result = upgradeDropdownBindings([binding1, binding2], context);
		expect(result.additionalQueryModels).toHaveLength(4);
		expect(result.updatedBindings).toHaveLength(2);
	});

	it("should not fail on empty bindings array", () => {
		const context = createContext();
		const result = upgradeDropdownBindings([], context);
		expect(result.updatedBindings).toEqual([]);
		expect(result.additionalQueryModels).toEqual([]);
	});

	it("should set modelVersion to QUERY_MODEL_VERSION on generated queries", () => {
		const binding = createDropDownBindingResult({
			bindingId: "test",
			availableItemsOverviewModel: "CandidateOverview",
			selectedItemsOverviewModel: "SelectedOverview",
			elementRef: "field_name"
		});
		const context = createContext(() => createOverviewModel({ documentModelId: "PersonDM" }));

		const result = upgradeDropdownBindings([binding], context);

		for (const query of result.additionalQueryModels) {
			expect(query.header.modelVersion).toBe("0.1.0");
			expect(query.header.modelType).toBe("query");
		}
	});

	it("should generate candidate and selected query models using legacy 0.1.0 dropdown shapes", () => {
		const binding = createDropDownBindingResult({
			bindingId: "test",
			availableItemsOverviewModel: "CandidateOverview",
			selectedItemsOverviewModel: "SelectedOverview",
			relationshipName: "PolicyPostAddress",
			targetRole: "address",
			elementRef: "field_name"
		});

		const context = createContext((id: string) => {
			switch (id) {
				case "CandidateOverview":
					return createOverviewModel({ documentModelId: "Address-document" });
				case "SelectedOverview":
					return createOverviewModel({ documentModelId: "Address-document" });
				case "PolicyPostAddress":
					return createRelationshipModel({
						relationshipId: "PolicyPostAddress",
						targetRole: "address",
						sourceRole: "businessPartner",
						targetDocumentModel: "Address-document",
						sourceDocumentModel: "BusinessPartner-document"
					});
				default:
					return undefined;
			}
		});

		const result = upgradeDropdownBindings([binding], context);
		const availableQuery = result.additionalQueryModels.find((q) => q.header.id === "test-available-query");
		const selectedQuery = result.additionalQueryModels.find((q) => q.header.id === "test-selected-query");

		const expectedPlaceholder = "${BusinessPartner-document, [/__meta/docRef]}";

		for (const query of [availableQuery, selectedQuery]) {
			expect(query?.header.annotations).toEqual([]);
			expect(query?.header.modelReferences).toEqual([
				{
					purpose: "document-model-for-query",
					modelType: "document",
					alias: "DM",
					reference: "Address-document"
				},
				{
					purpose: "relationship-model-for-query",
					modelType: "relationship",
					alias: "RM",
					reference: "PolicyPostAddress"
				}
			]);
			expect(query?.content.targetDocumentModel).toBe("Address-document");
			expect(query?.content.projectionName).toBe("document");
			expect(query?.content.paging?.pageSize).toBe(query?.header.id.endsWith("selected-query") ? 1 : 50);
			expect(query?.content.links).toHaveLength(1);
			expect("constraints" in (query?.content ?? {})).toBe(false);
			expect("pageSize" in (query?.content ?? {})).toBe(false);
			expect(query?.content.links?.[0]).toMatchObject({
				relationshipModel: "PolicyPostAddress",
				targetRole: "businessPartner",
				maxDepth: 1,
				constraint: {
					operator: "exact_match",
					value: expectedPlaceholder
				}
			});
			expect(JSON.stringify(query?.content)).not.toContain("${SourceDM,");
		}

		expect(selectedQuery?.content.constraint).toMatchObject({
			operator: "has",
			relationshipModel: "PolicyPostAddress",
			targetRole: "businessPartner",
			maxDepth: 1,
			constraint: {
				operator: "exact_match",
				value: expectedPlaceholder
			}
		});
		expect(selectedQuery?.content.paging?.pageSize).toBe(1);
	});
});

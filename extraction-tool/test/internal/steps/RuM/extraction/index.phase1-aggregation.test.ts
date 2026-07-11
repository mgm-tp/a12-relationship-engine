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

import { it, vi, expect, describe, beforeEach } from "vitest";

import type { GenericModel, MigrationStepContext } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import { RUM_VERSION } from "../../../../../src/internal/steps/RuM/extraction/constants.js";

const { decorateOverviewsMock } = vi.hoisted(() => ({
	decorateOverviewsMock: vi.fn()
}));

vi.mock("../../../../../src/internal/steps/RuM/extraction/phase-4-overview-decoration/index.js", () => ({
	decorateOverviews: decorateOverviewsMock
}));

import { extractionTransform } from "../../../../../src/internal/steps/RuM/extraction/index.js";
import type { ExtractionState } from "../../../../../src/internal/steps/RuM/extraction/extraction-state.js";
import type { OverviewDecorationContext } from "../../../../../src/internal/steps/RuM/extraction/phase-4-overview-decoration/types.js";

function createModelMap(entries: Array<{ header: { id: string } }>): Map<string, object> {
	return new Map(entries.map((entry) => [entry.header.id, entry as object]));
}

function createMockContext(models: readonly object[]): MigrationStepContext {
	const modelMap = createModelMap(models as Array<{ header: { id: string } }>);
	const workspaceModels = new Map<string, { header: { id: string }; path: string }>();

	for (const [id] of modelMap) {
		workspaceModels.set(id, { header: { id }, path: `${id}.json` });
	}

	return {
		addModel: vi.fn(),
		deleteModel: vi.fn(),
		findResource: vi.fn(),
		findModel: (id: string) => workspaceModels.get(id),
		findModelsByType: vi.fn(),
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

function makeDualPaneBindingEntry(
	bindingName: string,
	relationshipName: string,
	candidateOverviewId: string,
	selectedOverviewId: string,
	candidatePageSize: number,
	availableLabel: string,
	selectedLabel: string
): object {
	return {
		type: "relationship",
		elementId: `section-${bindingName.toLowerCase()}`,
		details: {
			name: bindingName,
			relationshipName,
			targetRole: "targetRole",
			metaInformation: { version: "1.0.0" },
			components: [
				{
					name: "DualPaneSelection",
					id: `${bindingName}-selection`,
					candidatePageSize,
					models: [
						{ name: candidateOverviewId, use: "candidate" },
						{ name: selectedOverviewId, use: "link" }
					],
					props: {
						availableItemsTable: {
							label: [{ locale: "en", text: availableLabel }]
						},
						selectedItemsTable: {
							label: [{ locale: "en", text: selectedLabel }]
						}
					}
				}
			]
		}
	};
}

function makeTableListBindingEntry(
	bindingName: string,
	relationshipName: string,
	directSelectedOverviewId: string,
	editAvailableOverviewId: string,
	editSelectedOverviewId: string
): object {
	return {
		type: "relationship",
		elementId: `section-${bindingName.toLowerCase()}`,
		details: {
			name: bindingName,
			relationshipName,
			targetRole: "targetRole",
			metaInformation: { version: "1.0.0" },
			components: [
				{
					name: "TableList",
					id: `${bindingName}-table-list`,
					models: [{ name: directSelectedOverviewId, use: "link" }]
				},
				{
					name: "DualPaneSelection",
					id: `${bindingName}-edit-selection`,
					models: [
						{ name: editAvailableOverviewId, use: "candidate" },
						{ name: editSelectedOverviewId, use: "link" }
					]
				}
			]
		}
	};
}

function makeFormModel(bindingEntries: object[], documentModelId?: string): GenericModel {
	return {
		header: {
			id: "TestForm",
			modelType: "form",
			modelVersion: "1.0.0",
			modelReferences:
				documentModelId === undefined
					? []
					: [{ modelType: "document", reference: documentModelId, purpose: "data binding" }],
			annotations: [
				{
					name: "bindingConfiguration",
					value: JSON.stringify(bindingEntries)
				}
			]
		},
		content: {
			screens: []
		}
	} as unknown as GenericModel;
}

function makeDocumentModel(id: string, annotations: Array<{ name: string; value: string }> = []): object {
	return {
		header: {
			id,
			modelType: "document",
			modelVersion: "1.0.0",
			annotations
		}
	};
}

function makeOverviewModel(id: string, documentModelId = "Test-document"): object {
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

/** Minimal relationship model fixture for resolveDuplicatesAllowed lookups. */
function makeRelationshipModel(id: string, targetRole: string, sourceRole: string): object {
	return {
		header: {
			id,
			modelType: "relationship",
			modelVersion: "1.0.0"
		},
		content: {
			duplicatesAllowed: false,
			entityCharacteristics: [{ role: targetRole }, { role: sourceRole }]
		}
	};
}

describe("extractionTransform - phase 1 aggregation", () => {
	beforeEach(() => {
		decorateOverviewsMock.mockReset();
	});

	it("should aggregate page-size and overview-label migrations into state before overview decoration", () => {
		const bindingEntries = [
			makeDualPaneBindingEntry(
				"Brand",
				"ProductBrand",
				"Product_Brand_AvailableItemsOverview",
				"Product_Brand_SelectedItemsOverview",
				30,
				"Available products",
				"Selected products"
			),
			makeDualPaneBindingEntry(
				"ContractClaim",
				"ContractClaim",
				"Contract_Claim_AvailableItemsOverview",
				"Contract_Claim_SelectedItemsOverview",
				12,
				"Available claims",
				"Selected claims"
			)
		];
		const formModel = makeFormModel(bindingEntries);
		// Added relationship models — required since resolveDuplicatesAllowed now throws when missing
		const context = createMockContext([
			makeOverviewModel("Product_Brand_AvailableItemsOverview"),
			makeOverviewModel("Product_Brand_SelectedItemsOverview"),
			makeOverviewModel("Contract_Claim_AvailableItemsOverview"),
			makeOverviewModel("Contract_Claim_SelectedItemsOverview"),
			makeRelationshipModel("ProductBrand", "targetRole", "sourceRole"),
			makeRelationshipModel("ContractClaim", "targetRole", "sourceRole")
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

		expect(decorateOverviewsMock).toHaveBeenCalledOnce();

		const [decorationContext] = decorateOverviewsMock.mock.calls[0] as [OverviewDecorationContext, unknown, unknown];

		expect(decorationContext.pageSizeMigrations).toHaveLength(2);
		expect(decorationContext.rowActivationMigrations).toHaveLength(4);
		expect(decorationContext.overviewLabelMigrations).toHaveLength(4);
		expect(decorationContext.pageSizeMigrations).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ overviewModelId: "Product_Brand_AvailableItemsOverview", pageSize: 30 }),
				expect.objectContaining({ overviewModelId: "Contract_Claim_AvailableItemsOverview", pageSize: 12 })
			])
		);
		expect(decorationContext.overviewLabelMigrations).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ overviewModelId: "Product_Brand_AvailableItemsOverview" }),
				expect.objectContaining({ overviewModelId: "Product_Brand_SelectedItemsOverview" }),
				expect.objectContaining({ overviewModelId: "Contract_Claim_AvailableItemsOverview" }),
				expect.objectContaining({ overviewModelId: "Contract_Claim_SelectedItemsOverview" })
			])
		);
		expect(decorationContext.rowActivationMigrations).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					overviewModelId: "Product_Brand_AvailableItemsOverview",
					activation: { type: "event", event: "event_add_link" }
				}),
				expect.objectContaining({
					overviewModelId: "Product_Brand_SelectedItemsOverview",
					activation: { type: "event", event: "event_delete_link" }
				}),
				expect.objectContaining({
					overviewModelId: "Contract_Claim_AvailableItemsOverview",
					activation: { type: "event", event: "event_add_link" }
				}),
				expect.objectContaining({
					overviewModelId: "Contract_Claim_SelectedItemsOverview",
					activation: { type: "event", event: "event_delete_link" }
				})
			])
		);
		expect(decorationContext.isCdm).toBe(false);
	});

	it("should remap TableList row activations into shared ProductBrand clones before overview decoration", () => {
		const bindingEntries = [
			makeTableListBindingEntry(
				"Brand",
				"ProductBrand",
				"Product_Brand_SelectedItemsOverview",
				"Product_Brand_AvailableItemsOverview",
				"Product_Brand_SelectedItemsOverview"
			)
		];
		const formModel = makeFormModel(bindingEntries) as GenericModel & {
			header: { modelReferences: Array<{ modelType: string; reference: string; purpose: string }> };
		};
		formModel.header.modelReferences = [
			{ modelType: "overview", reference: "Product_Brand_SelectedItemsOverview", purpose: "overview" },
			{ modelType: "overview", reference: "Product_Brand_AvailableItemsOverview", purpose: "overview" }
		];
		// Added ProductBrand relationship model — required since resolveDuplicatesAllowed now throws when missing
		const context = createMockContext([
			makeOverviewModel("Product_Brand_SelectedItemsOverview"),
			makeOverviewModel("Product_Brand_SelectedItemsOverview-tableList"),
			makeOverviewModel("Product_Brand_SelectedItemsOverview-edit"),
			makeOverviewModel("Product_Brand_AvailableItemsOverview"),
			makeOverviewModel("Product_Brand_AvailableItemsOverview--ProductBrand"),
			makeRelationshipModel("ProductBrand", "targetRole", "sourceRole")
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

		expect(decorateOverviewsMock).toHaveBeenCalledOnce();

		const [decorationContext, state] = decorateOverviewsMock.mock.calls[0] as [
			OverviewDecorationContext,
			ExtractionState,
			unknown
		];
		const cloneIds = [...decorationContext.cloneMap.values()];

		expect(cloneIds).toEqual(["Product_Brand_SelectedItemsOverview-edit"]);
		expect(cloneIds.every((cloneId) => state.has(cloneId))).toBe(true);
		expect(state.overviewModelIds).toEqual(expect.arrayContaining(cloneIds));
		expect(decorationContext.rowActivationMigrations).toEqual(
			expect.arrayContaining([
				{
					overviewModelId: "Product_Brand_SelectedItemsOverview-tableList",
					activation: { type: "non_interactive" }
				},
				{
					overviewModelId: "Product_Brand_SelectedItemsOverview-edit",
					activation: { type: "event", event: "event_delete_link" }
				},
				{
					overviewModelId: "Product_Brand_AvailableItemsOverview",
					activation: { type: "event", event: "event_add_link" }
				}
			])
		);
	});

	it("should compute isCdm from the source document cdm.queryRoot annotation", () => {
		const bindingEntries = [
			makeDualPaneBindingEntry(
				"ContractClaim",
				"ContractClaim",
				"Contract_Claim_AvailableItemsOverview",
				"Contract_Claim_SelectedItemsOverview",
				12,
				"Available claims",
				"Selected claims"
			)
		];
		const formModel = makeFormModel(bindingEntries, "ContractCDM");
		// Added ContractClaim relationship model — required since resolveDuplicatesAllowed now throws when missing
		const context = createMockContext([
			makeDocumentModel("ContractCDM", [{ name: "cdm.queryRoot", value: "Contract-document" }]),
			makeOverviewModel("Contract_Claim_AvailableItemsOverview"),
			makeOverviewModel("Contract_Claim_SelectedItemsOverview"),
			makeRelationshipModel("ContractClaim", "targetRole", "sourceRole")
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

		expect(decorateOverviewsMock).toHaveBeenCalledOnce();

		const [decorationContext] = decorateOverviewsMock.mock.calls[0] as [OverviewDecorationContext, unknown, unknown];

		expect(decorationContext.isCdm).toBe(true);
	});

	it("should throw invalid workspace error when the source document is unresolved", () => {
		const bindingEntries = [
			makeDualPaneBindingEntry(
				"ContractClaim",
				"ContractClaim",
				"Contract_Claim_AvailableItemsOverview",
				"Contract_Claim_SelectedItemsOverview",
				12,
				"Available claims",
				"Selected claims"
			)
		];
		const formModel = makeFormModel(bindingEntries, "MissingContractCDM");
		// Added ContractClaim relationship model — P3 now throws on missing relationship models before P4's workspace check
		const context = createMockContext([
			makeOverviewModel("Contract_Claim_AvailableItemsOverview"),
			makeOverviewModel("Contract_Claim_SelectedItemsOverview"),
			makeRelationshipModel("ContractClaim", "targetRole", "sourceRole")
		]);
		const logger = {
			log: vi.fn(),
			info: vi.fn(),
			error: vi.fn()
		};

		expect(() => extractionTransform(formModel, logger, context)).toThrow(
			"Invalid workspace! Cannot found MissingContractCDM"
		);
		expect(decorateOverviewsMock).not.toHaveBeenCalled();
	});
});

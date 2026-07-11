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

import type { GenericModel, WorkspaceModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import { OverviewModel } from "../../../../../../src/models/overview-model.js";
import { ModelNotFoundError } from "../../../../../../src/internal/steps/RuM/extraction/model-not-found-error.js";
import { buildOverviewStructure } from "../../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/index.js";
import type { OverviewStructureFinalRuM } from "../../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/types.js";
import {
	RUM_VERSION,
	DOCUMENT_MODEL_VERSION,
	OVERVIEW_MODEL_VERSION
} from "../../../../../../src/internal/steps/RuM/extraction/constants.js";

/** Returns typed overview reference columns from the test output, accepting raw JSON fixture shapes. */
function getOverviewReferenceColumns(
	model: { readonly content?: { readonly columns?: readonly unknown[] } } | undefined
): readonly OverviewModel.ReferenceColumn[] {
	// Raw JSON test fixture may omit optional fields; cast is intentional.
	return (model?.content?.columns ?? []) as readonly OverviewModel.ReferenceColumn[];
}

/** Returns link references for a column via BaseLinkedColumn guard; undefined when absent or column is undefined. */
function getLinkRefs(
	col: OverviewModel.ReferenceColumn | undefined
): readonly OverviewModel.LinkReference[] | undefined {
	if (col === undefined) {
		return undefined;
	}

	if (OverviewModel.BaseLinkedColumn.isAssignableFrom(col)) {
		return col.linkReferences;
	}

	return undefined;
}

function createOverview(id: string, documentId: string): OverviewModel {
	return {
		header: {
			id,
			modelType: "overview",
			modelVersion: OVERVIEW_MODEL_VERSION,
			modelReferences: [
				{
					purpose: "document-model-for-overview",
					modelType: "document",
					reference: documentId
				}
			]
		},
		content: {
			configuration: { enableFilter: true },
			columns: [],
			rowActionGroup: {}
		}
	};
}

function createOverviewWithColumns(
	id: string,
	documentId: string,
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
			modelReferences: [
				{
					purpose: "document-model-for-overview",
					modelType: "document",
					reference: documentId
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

function createQueryBackedOverview(overviewId: string, queryModelId: string): OverviewModel {
	return {
		header: {
			id: overviewId,
			modelType: "overview",
			modelVersion: OVERVIEW_MODEL_VERSION,
			modelReferences: [
				{
					purpose: "query-model-for-overview",
					modelType: "query",
					reference: queryModelId
				}
			]
		},
		content: {
			configuration: { enableFilter: true },
			columns: [],
			rowActionGroup: {}
		}
	};
}

function createQueryModel(id: string, targetDocumentModelId: string): object {
	return {
		header: {
			id,
			modelType: "query",
			modelVersion: "0.1.0"
		},
		content: {
			targetDocumentModel: targetDocumentModelId
		}
	};
}

function createGeneratedDoc(id: string, targetDocumentId: string): object {
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
								}
							]
						}
					}
				]
			}
		}
	};
}

function createUnsupportedGeneratedDoc(id: string): object {
	return {
		header: {
			id,
			modelType: "document",
			modelVersion: OVERVIEW_MODEL_VERSION
		},
		content: {
			modelRoot: {
				rootGroups: []
			}
		}
	};
}

function createDocumentModelWithFieldRefs(id: string, fieldIds: readonly string[]): object {
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
						type: "Group",
						id: "G2",
						name: "linkFields",
						Group: {
							elements: fieldIds.map((fieldId) => ({
								type: "Field",
								id: fieldId,
								Field: {
									fieldType: { type: "StringType" }
								}
							}))
						}
					}
				]
			}
		}
	};
}

function createGeneratedDocWithRelationshipField(id: string, targetDocumentId: string, linkDocumentId: string): object {
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
							elements: [{ id: "I4_root", type: "element", Group: { includeConfig: { reference: targetDocumentId } } }]
						}
					},
					{
						type: "rootGroup",
						id: "relationship-root",
						name: "relationship",
						Group: {
							elements: [
								{ id: "I5_root", type: "element", Group: { includeConfig: { reference: linkDocumentId } } },
								{ id: "I5_field_linkValue", type: "element", Field: { fieldType: { type: "StringType" } } }
							]
						}
					}
				]
			}
		}
	};
}

function createGeneratedDocWithI4I5WrapperPrefixes(
	id: string,
	targetDocumentId: string,
	linkDocumentId: string
): object {
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
							elements: [{ id: "I4", type: "element", Group: { includeConfig: { reference: targetDocumentId } } }]
						}
					},
					{
						type: "rootGroup",
						id: "relationship-root",
						name: "relationship",
						Group: {
							elements: [{ id: "I5", type: "element", Group: { includeConfig: { reference: linkDocumentId } } }]
						}
					}
				]
			}
		}
	};
}

function createRelationshipModel(
	relationshipName: string,
	targetRole: string,
	sourceRole: string,
	duplicatesAllowed: boolean,
	targetDocumentModel?: string,
	sourceDocumentModel?: string
): object {
	return {
		header: {
			id: relationshipName,
			modelType: "relationship",
			modelVersion: OVERVIEW_MODEL_VERSION
		},
		content: {
			duplicatesAllowed,
			entityCharacteristics: [
				{ role: targetRole, ...(targetDocumentModel !== undefined ? { documentModel: targetDocumentModel } : {}) },
				{ role: sourceRole, ...(sourceDocumentModel !== undefined ? { documentModel: sourceDocumentModel } : {}) }
			]
		}
	};
}

function createForm(reference: string, id: string): GenericModel {
	return {
		header: {
			id,
			modelType: "form",
			modelVersion: OVERVIEW_MODEL_VERSION,
			modelReferences: [
				{
					purpose: "document",
					modelType: "document",
					reference
				}
			]
		},
		content: {}
	} as GenericModel;
}

function createWorkspaceFormWithBindingConfiguration(
	id: string,
	bindings: ReadonlyArray<{
		readonly type: string;
		readonly elementId?: string;
		readonly details?: {
			readonly metaInformation?: {
				readonly version?: string;
			};
			readonly name?: string;
			readonly relationshipName?: string;
			readonly targetRole?: string;
			readonly components?: ReadonlyArray<{
				readonly candidatePageSize?: number;
				readonly models?: ReadonlyArray<{ readonly use: string; readonly name: string }>;
			}>;
		};
	}>
): WorkspaceModel {
	const normalizedBindings = bindings.map((binding, index) => ({
		...binding,
		elementId: binding.elementId ?? `${id}-binding-${index}`,
		details:
			binding.details === undefined
				? undefined
				: {
						metaInformation: { version: binding.details.metaInformation?.version ?? "1.0.0" },
						name: binding.details.name ?? `${binding.details.relationshipName ?? "relationship"} Binding`,
						targetRole: binding.details.targetRole ?? "target",
						...binding.details
					}
	}));

	return {
		header: {
			id,
			modelType: "form",
			modelVersion: OVERVIEW_MODEL_VERSION,
			annotations: [{ name: "bindingConfiguration", value: JSON.stringify(normalizedBindings) }]
		},
		path: `${id}.json`
	};
}

function createTableListRuM(overviewId: string, relationshipName: string): OverviewStructureFinalRuM {
	return {
		rumModel: {
			header: {
				id: `${overviewId}-rum`,
				modelType: "relationship-ui",
				modelVersion: RUM_VERSION
			},
			content: {
				relationshipName,
				targetRole: "other",
				component: {
					componentType: "TableList",
					availableItemsOverviewModel: overviewId,
					selectedItemsOverviewModel: overviewId,
					editConfiguration: {
						availableItemsOverviewModel: overviewId,
						selectedItemsOverviewModel: overviewId
					}
				}
			}
		},
		bindingName: `${overviewId}-binding`,
		elementId: "element-1",
		relationshipName,
		targetRole: "other"
	};
}

function createDualPaneRuM(overviewId: string, relationshipName: string): OverviewStructureFinalRuM {
	return {
		rumModel: {
			header: {
				id: `${overviewId}-rum`,
				modelType: "relationship-ui",
				modelVersion: RUM_VERSION
			},
			content: {
				relationshipName,
				targetRole: "other",
				component: {
					componentType: "DualPaneSelection",
					selectedItemsOverviewModel: overviewId
				}
			}
		},
		bindingName: `${overviewId}-binding`,
		elementId: "element-1",
		relationshipName,
		targetRole: "other"
	};
}

describe("buildOverviewStructure", () => {
	it("maps table-list edit clones to the selected-items base query ID and emits -tableList direct clone", () => {
		const overviewId = "ClaimLocation_location_SelectedItemsOverview";
		const relationshipName = "ClaimLocation";
		const models = new Map<string, object>();
		const generatedDoc = createGeneratedDoc(
			"ClaimLocation_location_SelectedItemsOverview____generated",
			"Address-document"
		) as { header: { id: string } };
		const rolesAnnotations = [{ name: "roles", value: "admin" }];
		const sourceOverview = createOverview(overviewId, generatedDoc.header.id) as {
			header: { annotations?: Array<{ name: string; value: string }> };
		};
		models.set(overviewId, {
			...sourceOverview,
			header: {
				...sourceOverview.header,
				annotations: [
					{ name: "source", value: "overview" },
					{ name: "roles", value: "old-role" }
				]
			},
			content: {
				configuration: { enableFilter: true },
				columns: [],
				rowActionGroup: {
					items: [{ id: "delete" }]
				}
			}
		});
		models.set(generatedDoc.header.id, generatedDoc);
		// Added ClaimLocation relationship model — required since resolveDuplicatesAllowed now throws when missing
		models.set(relationshipName, createRelationshipModel(relationshipName, "location", "claim", false));

		const finalRuM = createTableListRuM(overviewId, relationshipName);

		const result = buildOverviewStructure([finalRuM], {
			resolveModel: (id: string): object | undefined => models.get(id),
			keepModels: true,
			formModel: createForm("Claim-document", "Claim-form"),
			sourceDocumentModelId: "Claim-document",
			rolesAnnotations
		});

		const expectedQuery = `${overviewId}-query`;
		expect(result.remappedOverviews.get(`${overviewId}-edit`)?.header.modelReferences).toEqual([
			{
				purpose: "query-model-for-overview",
				modelType: "query",
				reference: expectedQuery
			}
		]);
		expect(result.remappedOverviews.get(`${overviewId}-tableList`)?.header.modelReferences).toEqual([
			{
				purpose: "query-model-for-overview",
				modelType: "query",
				reference: expectedQuery
			}
		]);
		expect(result.remappedOverviews.get(`${overviewId}-edit`)?.header.annotations).toEqual([
			{ name: "source", value: "overview" },
			{ name: "roles", value: "old-role" }
		]);
		expect(result.remappedOverviews.get(`${overviewId}-tableList`)?.header.annotations).toEqual([
			{ name: "source", value: "overview" },
			{ name: "roles", value: "old-role" }
		]);
		expect(
			(result.remappedOverviews.get(`${overviewId}-tableList`)?.content as { rowActionGroup?: object }).rowActionGroup
		).toEqual({});
		expect(result.linkQueryModels.some((query) => query.header.id === expectedQuery)).toBe(true);
		expect(result.linkQueryModels.every((query) => query.header.id !== `${overviewId}-edit-query`)).toBe(true);
	});

	it("generates query models for every GAP-1 relationship context on a candidate overview", () => {
		const overviewId = "Address-overview";
		const generatedDoc = createGeneratedDoc(`${overviewId}____generated`, "Address-document") as {
			header: { id: string };
		};

		const candidateContextOne: OverviewStructureFinalRuM = {
			rumModel: {
				header: {
					id: `${overviewId}-claim-location-rum`,
					modelType: "relationship-ui",
					modelVersion: RUM_VERSION
				},
				content: {
					relationshipName: "ClaimLocation",
					targetRole: "other",
					component: {
						componentType: "TableList",
						availableItemsOverviewModel: overviewId
					}
				}
			},
			bindingName: `${overviewId}-claim-location-binding`,
			elementId: "element-1",
			relationshipName: "ClaimLocation",
			targetRole: "other"
		};

		const candidateContextTwo: OverviewStructureFinalRuM = {
			rumModel: {
				header: {
					id: `${overviewId}-location-rum`,
					modelType: "relationship-ui",
					modelVersion: RUM_VERSION
				},
				content: {
					relationshipName: "Location",
					targetRole: "other",
					component: {
						componentType: "TableList",
						availableItemsOverviewModel: overviewId
					}
				}
			},
			bindingName: `${overviewId}-location-binding`,
			elementId: "element-2",
			relationshipName: "Location",
			targetRole: "other"
		};

		const rolesAnnotations = [{ name: "roles", value: "editor" }];
		const sourceOverview = createOverview(overviewId, generatedDoc.header.id) as {
			header: { annotations?: Array<{ name: string; value: string }> };
		};
		const models = new Map<string, object>([
			[
				overviewId,
				{
					...sourceOverview,
					header: {
						...sourceOverview.header,
						annotations: [
							{ name: "category", value: "candidate" },
							{ name: "roles", value: "old-role" }
						]
					}
				}
			],
			[generatedDoc.header.id, generatedDoc],
			// Added relationship models — required since resolveDuplicatesAllowed now throws when missing
			["ClaimLocation", createRelationshipModel("ClaimLocation", "other", "source", false)],
			["Location", createRelationshipModel("Location", "other", "source", false)]
		]);

		const result = buildOverviewStructure([candidateContextOne, candidateContextTwo], {
			resolveModel: (id: string): object | undefined => models.get(id),
			keepModels: true,
			formModel: createForm("Address-document", "Address-form"),
			sourceDocumentModelId: "Address-document",
			rolesAnnotations
		});

		expect(result.candidateQueryModels.some((query) => query.header.id === `${overviewId}--ClaimLocation-query`)).toBe(
			true
		);
		expect(result.candidateQueryModels.some((query) => query.header.id === `${overviewId}--Location-query`)).toBe(true);
		expect(result.remappedOverviews.get(`${overviewId}--ClaimLocation`)?.header.annotations).toEqual([
			{ name: "category", value: "candidate" },
			{ name: "roles", value: "old-role" }
		]);
		expect(result.remappedOverviews.get(`${overviewId}--Location`)?.header.annotations).toEqual([
			{ name: "category", value: "candidate" },
			{ name: "roles", value: "old-role" }
		]);
		expect(result.candidateQueryModels.map((query) => query.header.annotations)).toEqual([
			rolesAnnotations,
			rolesAnnotations
		]);
	});

	it("generates relationship query models for document-backed candidate overview clones", () => {
		const overviewId = "Address-overview";
		const candidateContextOne: OverviewStructureFinalRuM = {
			rumModel: {
				header: {
					id: `${overviewId}-claim-location-rum`,
					modelType: "relationship-ui",
					modelVersion: RUM_VERSION
				},
				content: {
					relationshipName: "ClaimLocation",
					targetRole: "other",
					component: {
						componentType: "TableList",
						availableItemsOverviewModel: overviewId
					}
				}
			},
			bindingName: `${overviewId}-claim-location-binding`,
			elementId: "element-1",
			relationshipName: "ClaimLocation",
			targetRole: "other"
		};
		const candidateContextTwo: OverviewStructureFinalRuM = {
			rumModel: {
				header: {
					id: `${overviewId}-location-rum`,
					modelType: "relationship-ui",
					modelVersion: RUM_VERSION
				},
				content: {
					relationshipName: "Location",
					targetRole: "other",
					component: {
						componentType: "TableList",
						availableItemsOverviewModel: overviewId
					}
				}
			},
			bindingName: `${overviewId}-location-binding`,
			elementId: "element-2",
			relationshipName: "Location",
			targetRole: "other"
		};
		// Added relationship models — required since resolveDuplicatesAllowed now throws when missing
		const models = new Map<string, object>([
			[overviewId, createOverview(overviewId, "Address-document")],
			["ClaimLocation", createRelationshipModel("ClaimLocation", "other", "source", false)],
			["Location", createRelationshipModel("Location", "other", "source", false)]
		]);

		const result = buildOverviewStructure([candidateContextOne, candidateContextTwo], {
			resolveModel: (id: string): object | undefined => models.get(id),
			keepModels: true,
			formModel: createForm("Address-document", "Address-form"),
			sourceDocumentModelId: "Address-document"
		});

		expect(result.candidateQueryModels.some((query) => query.header.id === `${overviewId}--ClaimLocation-query`)).toBe(
			true
		);
		expect(result.candidateQueryModels.some((query) => query.header.id === `${overviewId}--Location-query`)).toBe(true);
	});

	it("uses canonical -edit clone and shared base query IDs for DualPane selected overviews", () => {
		const overviewId = "ContractClaim_claim_SelectedItemsOverview";
		const relationshipName = "ContractClaim";
		const models = new Map<string, object>();
		const generatedDoc = createGeneratedDoc(
			"ContractClaim_claim_SelectedItemsOverview____generated",
			"BusinessPartner-document"
		) as { header: { id: string } };

		models.set(overviewId, createOverview(overviewId, generatedDoc.header.id));
		models.set(generatedDoc.header.id, generatedDoc);
		// Added ContractClaim relationship model — required since resolveDuplicatesAllowed now throws when missing
		models.set(relationshipName, createRelationshipModel(relationshipName, "claim", "contract", false));

		const finalRuM = createDualPaneRuM(overviewId, relationshipName);

		const result = buildOverviewStructure([finalRuM], {
			resolveModel: (id: string): object | undefined => models.get(id),
			keepModels: true,
			formModel: createForm("Contract-document", "Contract-form"),
			sourceDocumentModelId: "Contract-document"
		});

		expect(result.remappedOverviews.has(`${overviewId}-edit`)).toBe(true);
		expect(result.remappedOverviews.has(`${overviewId}--${relationshipName}`)).toBe(false);
		expect(result.linkQueryModels.some((query) => query.header.id === `${overviewId}-query`)).toBe(true);
		expect(result.linkQueryModels.every((query) => query.header.id !== `${overviewId}-edit-query`)).toBe(true);
		expect(result.remappedOverviews.get(`${overviewId}-edit`)?.header.modelReferences).toEqual([
			{
				purpose: "query-model-for-overview",
				modelType: "query",
				reference: `${overviewId}-query`
			}
		]);
	});

	it("regenerates DualPane -edit clone from remapped source columns and keeps shared query ref", () => {
		const overviewId = "CoInsurerLinks-overview";
		const generatedDocId = `${overviewId}____generated`;
		const models = new Map<string, object>([
			[
				overviewId,
				createOverviewWithColumns(overviewId, generatedDocId, [
					{ id: "col-target", elementRef: "I4_field_targetValue" },
					{ id: "col-link", elementRef: "I5_field_linkValue" }
				])
			],
			[
				generatedDocId,
				createGeneratedDocWithI4I5WrapperPrefixes(generatedDocId, "BusinessPartner-document", "CoInsurer-document")
			],
			["CoInsurer", createRelationshipModel("CoInsurer", "other", "source", true)],
			[
				"CoInsurer-document",
				// Kernel-deserializable format — type: "rootGroup" / type: "element" replaced with proper Group/Field types.
				{
					header: { id: "CoInsurer-document", modelType: "document", modelVersion: DOCUMENT_MODEL_VERSION },
					content: {
						modelRoot: {
							rootGroups: [
								{
									type: "Group",
									id: "link-root",
									name: "link-root",
									Group: {
										repeatability: 1,
										elements: [
											{
												type: "Field",
												id: "field_linkValue",
												name: "field_linkValue",
												Field: { fieldType: { type: "StringType" } }
											}
										]
									}
								}
							]
						}
					}
				}
			]
		]);

		const result = buildOverviewStructure([createDualPaneRuM(overviewId, "CoInsurer")], {
			resolveModel: (id: string): object | undefined => models.get(id),
			keepModels: true,
			formModel: createForm("Contract-document", "Contract-form"),
			sourceDocumentModelId: "Contract-document"
		});

		const remappedSourceColumns = getOverviewReferenceColumns(result.remappedOverviews.get(overviewId));
		const editColumns = getOverviewReferenceColumns(result.remappedOverviews.get(`${overviewId}-edit`));
		expect(remappedSourceColumns.map((column) => column.elementRef)).toEqual(["field_targetValue", "field_linkValue"]);
		expect(editColumns.map((column) => column.elementRef)).toEqual(["field_targetValue", "field_linkValue"]);
		expect(getLinkRefs(remappedSourceColumns[0])).toEqual([
			{ relationship: "CoInsurer", targetRole: "other", type: "CHILD" }
		]);
		expect(getLinkRefs(remappedSourceColumns[1])).toEqual([
			{ relationship: "CoInsurer", targetRole: "other", type: "LINK" }
		]);
		expect(
			editColumns.every(
				(column) =>
					typeof column.elementRef === "string" &&
					!column.elementRef.startsWith("I4_") &&
					!column.elementRef.startsWith("I5_")
			)
		).toBe(true);
		expect(result.remappedOverviews.get(`${overviewId}-edit`)?.header.modelReferences).toEqual([
			{
				purpose: "query-model-for-overview",
				modelType: "query",
				reference: `${overviewId}-query`
			}
		]);
	});

	it("throws when generated-doc analysis has no target document for DualPane -edit clone", () => {
		const overviewId = "Category_Child_Category_SelectedItemsOverview";
		const relationshipName = "CategoryChildCategory";
		const generatedDocId = `${overviewId}____generated`;
		// Added CategoryChildCategory with no documentModel on ChildCategory role so the fallback
		// target resolution returns undefined and the error is thrown for the overview ID, not the relationship.
		const models = new Map<string, object>([
			[overviewId, createOverview(overviewId, generatedDocId)],
			[generatedDocId, createUnsupportedGeneratedDoc(generatedDocId)],
			[relationshipName, createRelationshipModel(relationshipName, "ChildCategory", "ParentCategory", true)]
		]);

		try {
			buildOverviewStructure([createDualPaneRuM(overviewId, relationshipName)], {
				resolveModel: (id: string): object | undefined => models.get(id),
				keepModels: true,
				formModel: createForm("Category-document", "Category-form"),
				sourceDocumentModelId: "Category-document"
			});
			expect.unreachable("Expected ModelNotFoundError to be thrown.");
		} catch (error) {
			expect(error).toBeInstanceOf(ModelNotFoundError);
			expect(error).toMatchObject({
				modelId: overviewId
			});
		}
	});

	it("creates DualPane -edit clone for Category-style inline-field generated doc using relationship model fallback", () => {
		// Mirrors the real CategoryCategory_ChildCategory____generated structure:
		// no includeConfig — fields are inlined directly with "I4_" prefix.
		// The analyzer returns empty targetDocumentModelId; index.ts falls back to
		// the relationship model's ChildCategory characteristic to resolve "Category-document".
		const overviewId = "Category_Child_Category_SelectedItemsOverview";
		const relationshipName = "CategoryCategory";
		const generatedDocId = `${overviewId}____generated`;

		const inlineFieldGeneratedDoc = {
			header: {
				id: generatedDocId,
				modelType: "document",
				modelVersion: "29.4.0"
			},
			content: {
				modelRoot: {
					rootGroups: [
						{
							type: "Group",
							id: "G2",
							name: "target",
							Group: {
								repeatability: 1,
								elements: [
									{
										type: "Group",
										id: "I4_G7",
										name: "Properties",
										Group: {
											repeatability: 1,
											elements: [
												{
													type: "Field",
													id: "I4_F1",
													name: "name",
													Field: { fieldType: { type: "StringType" } }
												}
											]
										}
									}
								]
							}
						}
					]
				}
			}
		};

		// CategoryCategory relationship: ParentCategory + ChildCategory, both documentModel = "Category-document"
		const categoryRelationship = createRelationshipModel(
			relationshipName,
			"ChildCategory",
			"ParentCategory",
			true,
			"Category-document",
			"Category-document"
		);

		const sourceOverview = createOverviewWithColumns(overviewId, generatedDocId, [
			{ id: "column-b854a", elementRef: "I4_F1", sortable: false }
		]);

		const categoryRuM: OverviewStructureFinalRuM = {
			rumModel: {
				header: {
					id: `${overviewId}-rum`,
					modelType: "relationship-ui",
					modelVersion: RUM_VERSION
				},
				content: {
					relationshipName,
					targetRole: "ChildCategory",
					component: {
						componentType: "DualPaneSelection",
						selectedItemsOverviewModel: overviewId
					}
				}
			},
			bindingName: `${overviewId}-binding`,
			elementId: "element-1",
			relationshipName,
			targetRole: "ChildCategory"
		};

		const models = new Map<string, object>([
			[overviewId, sourceOverview],
			[generatedDocId, inlineFieldGeneratedDoc],
			[relationshipName, categoryRelationship]
		]);

		const result = buildOverviewStructure([categoryRuM], {
			resolveModel: (id: string): object | undefined => models.get(id),
			keepModels: true,
			formModel: createForm("Category-document", "Category-form"),
			sourceDocumentModelId: "Category-document"
		});

		// Edit clone must be created via relationship model fallback.
		expect(result.remappedOverviews.has(`${overviewId}-edit`)).toBe(true);

		// Column "I4_F1" must be remapped to "F1" using prefix "I4_" (first segment of "I4_G7").
		const editColumns = getOverviewReferenceColumns(result.remappedOverviews.get(`${overviewId}-edit`));
		expect(editColumns.map((col) => col.elementRef)).toEqual(["F1"]);

		// Edit clone must reference the shared query model (not a separate -edit-query).
		expect(result.remappedOverviews.get(`${overviewId}-edit`)?.header.modelReferences).toEqual([
			{
				purpose: "query-model-for-overview",
				modelType: "query",
				reference: `${overviewId}-query`
			}
		]);

		// A query must be generated for the selected overview.
		expect(result.linkQueryModels.some((query) => query.header.id === `${overviewId}-query`)).toBe(true);

		// The generated query must target Category-document as source (exclude-mode: duplicatesAllowed=true).
		const query = result.linkQueryModels.find((q) => q.header.id === `${overviewId}-query`);
		expect(query?.content.targetDocumentModel).toBe("Category-document");
		expect(query?.content.exclude).toBe(true);
	});

	it("uses per-context duplicatesAllowed for selected query generation", () => {
		const linkOverviewId = "Product_Bundle_SelectedItemsOverview";
		const childOverviewId = "LocationLinks-overview";
		const linkGeneratedDocId = `${linkOverviewId}____generated`;
		const childGeneratedDocId = `${childOverviewId}____generated`;
		const linkGeneratedDoc = createGeneratedDoc(linkGeneratedDocId, "Product-document");
		const childGeneratedDoc = createGeneratedDoc(childGeneratedDocId, "Address-document");
		const linkRuM = createDualPaneRuM(linkOverviewId, "ProductBundle");
		const childRuM = createDualPaneRuM(childOverviewId, "Location");
		const models = new Map<string, object>([
			[linkOverviewId, createOverview(linkOverviewId, linkGeneratedDocId)],
			[childOverviewId, createOverview(childOverviewId, childGeneratedDocId)],
			[linkGeneratedDocId, linkGeneratedDoc],
			[childGeneratedDocId, childGeneratedDoc],
			["ProductBundle", createRelationshipModel("ProductBundle", "other", "source", true)],
			["Location", createRelationshipModel("Location", "other", "source", false)]
		]);

		const result = buildOverviewStructure([linkRuM, childRuM], {
			resolveModel: (id: string): object | undefined => models.get(id),
			keepModels: true,
			formModel: createForm("Contract-document", "Contract-form"),
			sourceDocumentModelId: "Contract-document"
		});

		const linkQuery = result.linkQueryModels.find((query) => query.header.id === `${linkOverviewId}-query`);
		const childQuery = result.linkQueryModels.find((query) => query.header.id === `${childOverviewId}-query`);

		expect(linkQuery?.content.exclude).toBe(true);
		expect(linkQuery?.content.constraint).toEqual({
			operator: "exact_match",
			field: "/__meta/docRef",
			value: "${Contract-document, [/__meta/docRef]}"
		});
		expect(linkQuery?.content.links![0].constraint).toEqual({
			operator: "has",
			relationshipModel: "ProductBundle",
			targetRole: "source",
			constraint: {
				operator: "exact_match",
				field: "/__meta/docRef",
				value: "${Contract-document, [/__meta/docRef]}"
			},
			maxDepth: 1
		});
		expect(childQuery?.content.constraint).toEqual({
			operator: "has",
			relationshipModel: "Location",
			targetRole: "source",
			constraint: {
				operator: "exact_match",
				field: "/__meta/docRef",
				value: "${Contract-document, [/__meta/docRef]}"
			},
			maxDepth: 1
		});
		expect(childQuery?.content.links![0].constraint).toEqual({
			operator: "exact_match",
			field: "/__meta/docRef",
			value: "${Contract-document, [/__meta/docRef]}"
		});
	});

	it("uses relationship source document model for query placeholders when form source differs", () => {
		const overviewId = "ContractClaim_claim_SelectedItemsOverview";
		const generatedDocId = `${overviewId}____generated`;
		const models = new Map<string, object>([
			[overviewId, createOverview(overviewId, generatedDocId)],
			[generatedDocId, createGeneratedDoc(generatedDocId, "Claim-document")],
			[
				"ContractClaim",
				createRelationshipModel("ContractClaim", "claim", "contract", false, "Claim-document", "Contract-document")
			]
		]);

		const result = buildOverviewStructure(
			[
				{
					rumModel: {
						header: {
							id: `${overviewId}-rum`,
							modelType: "relationship-ui",
							modelVersion: RUM_VERSION
						},
						content: {
							relationshipName: "ContractClaim",
							targetRole: "claim",
							component: {
								componentType: "DualPaneSelection",
								selectedItemsOverviewModel: overviewId
							}
						}
					},
					bindingName: `${overviewId}-binding`,
					elementId: "element-1",
					relationshipName: "ContractClaim",
					targetRole: "claim"
				}
			],
			{
				resolveModel: (id: string): object | undefined => models.get(id),
				keepModels: true,
				formModel: createForm("ContractCDM", "ContractCDM-form"),
				sourceDocumentModelId: "ContractCDM"
			}
		);

		const query = result.linkQueryModels.find((queryModel) => queryModel.header.id === `${overviewId}-query`);
		expect(query?.content.links![0].constraint).toEqual({
			operator: "exact_match",
			field: "/__meta/docRef",
			value: "${Contract-document, [/__meta/docRef]}"
		});
		expect(query?.content.constraint).toEqual({
			operator: "has",
			relationshipModel: "ContractClaim",
			targetRole: "contract",
			constraint: {
				operator: "exact_match",
				field: "/__meta/docRef",
				value: "${Contract-document, [/__meta/docRef]}"
			},
			maxDepth: 1
		});
	});

	it("uses relationship context duplicatesAllowed for linkReferences instead of global OverviewStructureContext flag", () => {
		const overviewId = "LocationLinks-overview";
		const generatedDocId = `${overviewId}____generated`;
		const models = new Map<string, object>([
			[
				overviewId,
				createOverviewWithColumns(overviewId, generatedDocId, [{ id: "col-1", elementRef: "I5_field_linkValue" }])
			],
			[
				generatedDocId,
				createGeneratedDocWithRelationshipField(generatedDocId, "Address-document", "Location-document")
			],
			["Location", createRelationshipModel("Location", "other", "source", false)],
			["Location-document", createDocumentModelWithFieldRefs("Location-document", [])]
		]);

		const result = buildOverviewStructure([createDualPaneRuM(overviewId, "Location")], {
			resolveModel: (id: string): object | undefined => models.get(id),
			keepModels: true,
			formModel: createForm("Contract-document", "Contract-form"),
			sourceDocumentModelId: "Contract-document"
		});

		const remappedOverview = result.remappedOverviews.get(overviewId);
		const column = getOverviewReferenceColumns(remappedOverview)[0];

		expect(getLinkRefs(column)).toBeUndefined();
	});

	it("adds LINK references for ProductBrand relationship columns in HAS mode", () => {
		const overviewId = "ProductBrand_Brand_SelectedItemsOverview";
		const generatedDocId = `${overviewId}____generated`;
		const models = new Map<string, object>([
			[overviewId, createOverviewWithColumns(overviewId, generatedDocId, [{ id: "col-1", elementRef: "I5_F5" }])],
			[
				generatedDocId,
				createGeneratedDocWithI4I5WrapperPrefixes(
					generatedDocId,
					"Brand-document",
					"ProductBrand_AdditionalFieldsModel"
				)
			],
			["ProductBrand", createRelationshipModel("ProductBrand", "Brand", "Product", false)],
			[
				"ProductBrand_AdditionalFieldsModel",
				createDocumentModelWithFieldRefs("ProductBrand_AdditionalFieldsModel", ["F5"])
			],
			["Brand-document", createDocumentModelWithFieldRefs("Brand-document", [])]
		]);

		const productBrandRuM = createDualPaneRuM(overviewId, "ProductBrand");
		const result = buildOverviewStructure(
			[
				{
					...productBrandRuM,
					targetRole: "Brand",
					rumModel: {
						...productBrandRuM.rumModel,
						content: {
							...productBrandRuM.rumModel.content,
							targetRole: "Brand"
						}
					}
				}
			],
			{
				resolveModel: (id: string): object | undefined => models.get(id),
				keepModels: true,
				formModel: createForm("Product-document", "Product-form"),
				sourceDocumentModelId: "Product-document"
			}
		);

		const overview = result.remappedOverviews.get(overviewId);
		const editOverview = result.remappedOverviews.get(`${overviewId}-edit`);

		expect(getLinkRefs(getOverviewReferenceColumns(overview)[0])).toEqual([
			{ relationship: "ProductBrand", targetRole: "Product", type: "LINK" }
		]);
		expect(getLinkRefs(getOverviewReferenceColumns(editOverview)[0])).toEqual([
			{ relationship: "ProductBrand", targetRole: "Product", type: "LINK" }
		]);
	});

	it("prunes generated-wrapper columns such as G2_field_* before remap output", () => {
		const overviewId = "Product_Brand_SelectedItemsOverview";
		const generatedDocId = `${overviewId}____generated`;
		const models = new Map<string, object>([
			[
				overviewId,
				createOverviewWithColumns(overviewId, generatedDocId, [
					{ id: "col-1", elementRef: "I4_F1" },
					{ id: "col-2", elementRef: "I5_F5" },
					{ id: "col-3", elementRef: "G2_field_cdaf9" },
					{ id: "col-4", elementRef: "G2_field_65672" }
				])
			],
			[
				generatedDocId,
				createGeneratedDocWithI4I5WrapperPrefixes(
					generatedDocId,
					"Product-document",
					"ProductBrand_AdditionalFieldsModel"
				)
			],
			["ProductBrand", createRelationshipModel("ProductBrand", "Product", "Brand", false)],
			[
				"ProductBrand_AdditionalFieldsModel",
				createDocumentModelWithFieldRefs("ProductBrand_AdditionalFieldsModel", ["F5"])
			],
			["Product-document", createDocumentModelWithFieldRefs("Product-document", [])]
		]);

		const result = buildOverviewStructure([createDualPaneRuM(overviewId, "ProductBrand")], {
			resolveModel: (id: string): object | undefined => models.get(id),
			keepModels: true,
			formModel: createForm("Brand-document", "Brand-form"),
			sourceDocumentModelId: "Brand-document"
		});

		const baseColumns = getOverviewReferenceColumns(result.remappedOverviews.get(overviewId));
		const editColumns = getOverviewReferenceColumns(result.remappedOverviews.get(`${overviewId}-edit`));

		expect(baseColumns.map((column) => column.id)).toEqual(["col-1", "col-2"]);
		expect(editColumns.map((column) => column.id)).toEqual(["col-1", "col-2"]);
	});

	it("does not use first context routing for multi-context candidate overview link refs/interactive stripping", () => {
		const overviewId = "Address-overview";
		const generatedDocId = `${overviewId}____generated`;
		const claimLocationRuM: OverviewStructureFinalRuM = {
			rumModel: {
				header: {
					id: `${overviewId}-claim-location-rum`,
					modelType: "relationship-ui",
					modelVersion: RUM_VERSION
				},
				content: {
					relationshipName: "ClaimLocation",
					targetRole: "other",
					component: {
						componentType: "TableList",
						availableItemsOverviewModel: overviewId
					}
				}
			},
			bindingName: `${overviewId}-claim-location-binding`,
			elementId: "element-1",
			relationshipName: "ClaimLocation",
			targetRole: "other"
		};
		const locationRuM: OverviewStructureFinalRuM = {
			rumModel: {
				header: {
					id: `${overviewId}-location-rum`,
					modelType: "relationship-ui",
					modelVersion: RUM_VERSION
				},
				content: {
					relationshipName: "Location",
					targetRole: "other",
					component: {
						componentType: "TableList",
						availableItemsOverviewModel: overviewId
					}
				}
			},
			bindingName: `${overviewId}-location-binding`,
			elementId: "element-2",
			relationshipName: "Location",
			targetRole: "other"
		};
		const models = new Map<string, object>([
			[
				overviewId,
				createOverviewWithColumns(overviewId, generatedDocId, [
					{ id: "col-candidate", elementRef: "I5_field_linkValue", sortable: true }
				])
			],
			[
				generatedDocId,
				createGeneratedDocWithRelationshipField(generatedDocId, "Address-document", "Location-document")
			],
			["ClaimLocation", createRelationshipModel("ClaimLocation", "other", "source", true)],
			["Location", createRelationshipModel("Location", "other", "source", false)],
			["Location-document", createDocumentModelWithFieldRefs("Location-document", [])]
		]);

		const result = buildOverviewStructure([claimLocationRuM, locationRuM], {
			resolveModel: (id: string): object | undefined => models.get(id),
			keepModels: true,
			formModel: createForm("Contract-document", "Contract-form"),
			sourceDocumentModelId: "Contract-document"
		});

		const column = getOverviewReferenceColumns(result.remappedOverviews.get(overviewId))[0];

		expect(column?.sortable).toBe(true);
		expect(getLinkRefs(column)).toBeUndefined();
	});

	it("strips interactive affordances for LINK context but keeps them for CHILD context", () => {
		const linkOverviewId = "ProductBundleLinks-overview";
		const childOverviewId = "LocationLinks-overview";
		const linkGeneratedDocId = `${linkOverviewId}____generated`;
		const childGeneratedDocId = `${childOverviewId}____generated`;
		const models = new Map<string, object>([
			[
				linkOverviewId,
				{
					header: {
						id: linkOverviewId,
						modelType: "overview",
						modelVersion: OVERVIEW_MODEL_VERSION,
						modelReferences: [
							{
								purpose: "document-model-for-overview",
								modelType: "document",
								reference: linkGeneratedDocId
							}
						]
					},
					content: {
						configuration: {
							enableFilter: true,
							showFullTextSearch: true,
							filterConfiguration: {
								showFilterButton: true,
								showFilterBar: true,
								filterMode: OverviewModel.FilterMode.ALL
							}
						},
						columns: [{ id: "col-link", width: 1, elementRef: "I5_field_linkValue", sortable: true }]
					}
				}
			],
			[
				childOverviewId,
				{
					header: {
						id: childOverviewId,
						modelType: "overview",
						modelVersion: OVERVIEW_MODEL_VERSION,
						modelReferences: [
							{
								purpose: "document-model-for-overview",
								modelType: "document",
								reference: childGeneratedDocId
							}
						]
					},
					content: {
						configuration: {
							enableFilter: true,
							showFullTextSearch: true,
							filterConfiguration: {
								showFilterButton: true,
								showFilterBar: true,
								filterMode: OverviewModel.FilterMode.ALL
							}
						},
						columns: [{ id: "col-child", width: 1, elementRef: "I5_field_linkValue", sortable: true }]
					}
				}
			],
			[
				linkGeneratedDocId,
				createGeneratedDocWithRelationshipField(linkGeneratedDocId, "Address-document", "ProductBundle-document")
			],
			[
				childGeneratedDocId,
				createGeneratedDocWithRelationshipField(childGeneratedDocId, "Address-document", "Location-document")
			],
			["ProductBundle", createRelationshipModel("ProductBundle", "other", "source", true)],
			["Location", createRelationshipModel("Location", "other", "source", false)],
			["ProductBundle-document", createDocumentModelWithFieldRefs("ProductBundle-document", [])],
			["Location-document", createDocumentModelWithFieldRefs("Location-document", [])]
		]);

		const result = buildOverviewStructure(
			[createDualPaneRuM(linkOverviewId, "ProductBundle"), createDualPaneRuM(childOverviewId, "Location")],
			{
				resolveModel: (id: string): object | undefined => models.get(id),
				keepModels: true,
				formModel: createForm("Contract-document", "Contract-form"),
				sourceDocumentModelId: "Contract-document"
			}
		);

		const linkOverview = result.remappedOverviews.get(linkOverviewId);
		const childOverview = result.remappedOverviews.get(childOverviewId);
		const linkColumn = getOverviewReferenceColumns(linkOverview)[0];
		const childColumn = getOverviewReferenceColumns(childOverview)[0];

		expect(linkColumn?.sortable).toBe(false);
		expect(childColumn?.sortable).toBe(true);
		expect(linkOverview?.content.configuration).toEqual({
			enableFilter: false,
			showFullTextSearch: false,
			filterConfiguration: undefined,
			newFilterConfiguration: undefined
		});
		expect(childOverview?.content.configuration).toEqual({
			enableFilter: true,
			showFullTextSearch: true,
			filterConfiguration: {
				showFilterButton: true,
				showFilterBar: true,
				filterMode: OverviewModel.FilterMode.ALL
			}
		});
	});

	it("routes ProductBrand_Product_SelectedItems_DualPane_OM as query-backed edit clone when in TableList editConfiguration", () => {
		// Context: Brand-form TableList uses editConfiguration.selectedItemsOverviewModel pointing to
		// ProductBrand_Product_SelectedItems_DualPane_OM (distinct from the main selectedItemsOverviewModel).
		// The overview still references ProductBrand_Product____generated with includeConfig wrapper refs.
		// This test proves: includeConfig prefix resolution (I4_ / I5_), G2_field_cfb40 pruning,
		// edit clone creation, query-backed routing, and LINK column ref for Manufacturing Site (I5_F5).

		const dualPaneOverviewId = "ProductBrand_Product_SelectedItems_DualPane_OM";
		const generatedDocId = "ProductBrand_Product____generated";
		const relationshipName = "ProductBrand";

		// Faithful reproduction of the source overview: I4_* target columns, I5_F5 LINK column,
		// and stale G2_field_cfb40 wrapper ref that must be pruned.
		const dualPaneOverview = {
			header: {
				id: dualPaneOverviewId,
				modelType: "overview",
				modelVersion: OVERVIEW_MODEL_VERSION,
				modelReferences: [
					{
						purpose: "document-model-for-overview",
						modelType: "document",
						reference: generatedDocId
					}
				]
			},
			content: {
				configuration: { enableFilter: false, pagingSize: 50, showFullTextSearch: false },
				columns: [
					{ id: "column-c2942", width: 1, styles: {}, elementRef: "I4_F4", sortable: false },
					{ id: "column-649a5", width: 1, styles: {}, elementRef: "I4_F5", sortable: false },
					{ id: "column-e530d", width: 1, styles: {}, elementRef: "I4_field_31308", sortable: false },
					{ id: "column-a61e8", width: 1, styles: {}, elementRef: "I5_F5", sortable: false },
					{ id: "column-be004", width: 1, styles: {}, elementRef: "G2_field_cfb40", sortable: false }
				],
				rowActionGroup: {}
			}
		};

		// ProductBrand_Product____generated uses bare I4 / I5 wrapper IDs with includeConfig references.
		// analyzeGeneratedDocumentModel resolves: targetGroupPrefix="I4_", targetDocumentModelId="Product-document",
		// relationshipGroupPrefix="I5_", linkDocumentModelId="ProductBrand_AdditionalFieldsModel".
		const productBrandGeneratedDoc = createGeneratedDocWithI4I5WrapperPrefixes(
			generatedDocId,
			"Product-document",
			"ProductBrand_AdditionalFieldsModel"
		);

		// ProductBrand: targetRole=Product (selected items), sourceRole=Brand (form side), HAS mode.
		const productBrandRelationship = createRelationshipModel(
			relationshipName,
			"Product",
			"Brand",
			false, // duplicatesAllowed=false → HAS mode
			"Product-document",
			"Brand-document"
		);

		// ProductBrand_AdditionalFieldsModel exposes F5 (Manufacturing Site).
		const productBrandAdditionalFields = createDocumentModelWithFieldRefs("ProductBrand_AdditionalFieldsModel", ["F5"]);

		const models = new Map<string, object>([
			[dualPaneOverviewId, dualPaneOverview],
			[generatedDocId, productBrandGeneratedDoc],
			[relationshipName, productBrandRelationship],
			["ProductBrand_AdditionalFieldsModel", productBrandAdditionalFields],
			// Added overview fixtures — buildOverviewStructure now throws when a referenced overview is missing
			[
				"Product_Brand_SelectedItemsOverview-tableList",
				createQueryBackedOverview(
					"Product_Brand_SelectedItemsOverview-tableList",
					"Product_Brand_SelectedItemsOverview-tableList-query"
				)
			],
			[
				"Brand_Product_AvailableItemsOverview--ProductBrand",
				createOverview("Brand_Product_AvailableItemsOverview--ProductBrand", "Product-document")
			]
		]);

		// TableList RuM: main selectedItemsOverviewModel is a pre-migrated table-list overview
		// (already query-backed — buildOverviewStructure now requires it to be present in models).
		// editConfiguration.selectedItemsOverviewModel points to the DualPane_OM to be processed.
		const brandFormRuM: OverviewStructureFinalRuM = {
			rumModel: {
				header: {
					id: "Brand-form-binding-Relations-section-8ec34_RuM",
					modelType: "relationship-ui",
					modelVersion: RUM_VERSION
				},
				content: {
					relationshipName,
					targetRole: "Product",
					component: {
						componentType: "TableList",
						selectedItemsOverviewModel: "Product_Brand_SelectedItemsOverview-tableList",
						editConfiguration: {
							availableItemsOverviewModel: "Brand_Product_AvailableItemsOverview--ProductBrand",
							selectedItemsOverviewModel: dualPaneOverviewId
						}
					}
				}
			},
			bindingName: "Brand-form-binding-Relations-section-8ec34",
			elementId: "element-products",
			relationshipName,
			targetRole: "Product"
		};

		const result = buildOverviewStructure([brandFormRuM], {
			resolveModel: (id: string): object | undefined => models.get(id),
			keepModels: true,
			formModel: createForm("Brand-document", "Brand-form"),
			sourceDocumentModelId: "Brand-document"
		});

		// 1. Edit clone must be created for the DualPane_OM.
		expect(result.remappedOverviews.has(`${dualPaneOverviewId}-edit`)).toBe(true);

		// 2. Edit clone is query-backed via the shared base query (no separate -edit-query).
		expect(result.remappedOverviews.get(`${dualPaneOverviewId}-edit`)?.header.modelReferences).toEqual([
			{
				purpose: "query-model-for-overview",
				modelType: "query",
				reference: `${dualPaneOverviewId}-query`
			}
		]);
		expect(result.linkQueryModels.every((query) => query.header.id !== `${dualPaneOverviewId}-edit-query`)).toBe(true);

		// 3. Columns have stripped refs — no I4_*, I5_*, or G2_* elementRefs remain.
		const editColumns = getOverviewReferenceColumns(result.remappedOverviews.get(`${dualPaneOverviewId}-edit`));
		expect(
			editColumns.every(
				(col) =>
					typeof col.elementRef === "string" &&
					!col.elementRef.startsWith("I4_") &&
					!col.elementRef.startsWith("I5_") &&
					!col.elementRef.startsWith("G2_")
			)
		).toBe(true);

		// 4. G2_field_cfb40 pruned; remaining columns mapped: I4_F4→F4, I4_F5→F5,
		//    I4_field_31308→field_31308, I5_F5→F5 (LINK).
		expect(editColumns.map((col) => col.elementRef)).toEqual(["F4", "F5", "field_31308", "F5"]);

		// 5. Manufacturing Site (I5_F5 → F5) has LINK ref with sourceRole Brand (HAS-mode rule LR-LINK).
		const linkColumn = editColumns.find((col) => getLinkRefs(col) !== undefined);
		expect(linkColumn?.elementRef).toBe("F5");
		expect(getLinkRefs(linkColumn)).toEqual([{ relationship: "ProductBrand", type: "LINK", targetRole: "Brand" }]);

		// 6. Query generated for DualPane_OM (HAS mode).
		expect(result.linkQueryModels.some((query) => query.header.id === `${dualPaneOverviewId}-query`)).toBe(true);

		// 7. Query target/direction: HAS-mode parity with master — targetDocumentModel=Product-document,
		//    links[0].targetRole=Brand, no exclude.
		const query = result.linkQueryModels.find((q) => q.header.id === `${dualPaneOverviewId}-query`);
		expect(query?.content.targetDocumentModel).toBe("Product-document");
		expect(query?.content.exclude).toBeUndefined();
		expect(query?.content.links![0]?.targetRole).toBe("Brand");
	});

	it("creates relationship-specific candidate query models when overview is already query-backed", () => {
		const overviewId = "Address-overview-candidate-new";
		const sourceQueryModelId = `${overviewId}-query`;
		// Added relationship models — required since resolveDuplicatesAllowed now throws when missing
		const models = new Map<string, object>([
			[overviewId, createQueryBackedOverview(overviewId, sourceQueryModelId)],
			[sourceQueryModelId, createQueryModel(sourceQueryModelId, "Address-document")],
			["ClaimLocation", createRelationshipModel("ClaimLocation", "other", "source", false)],
			["Location", createRelationshipModel("Location", "other", "source", false)]
		]);

		const candidateContextOne: OverviewStructureFinalRuM = {
			rumModel: {
				header: {
					id: `${overviewId}-claim-location-rum`,
					modelType: "relationship-ui",
					modelVersion: RUM_VERSION
				},
				content: {
					relationshipName: "ClaimLocation",
					targetRole: "other",
					component: {
						componentType: "TableList",
						availableItemsOverviewModel: overviewId
					}
				}
			},
			bindingName: `${overviewId}-claim-location-binding`,
			elementId: "element-1",
			relationshipName: "ClaimLocation",
			targetRole: "other"
		};

		const candidateContextTwo: OverviewStructureFinalRuM = {
			rumModel: {
				header: {
					id: `${overviewId}-location-rum`,
					modelType: "relationship-ui",
					modelVersion: RUM_VERSION
				},
				content: {
					relationshipName: "Location",
					targetRole: "other",
					component: {
						componentType: "TableList",
						availableItemsOverviewModel: overviewId
					}
				}
			},
			bindingName: `${overviewId}-location-binding`,
			elementId: "element-2",
			relationshipName: "Location",
			targetRole: "other"
		};

		const result = buildOverviewStructure([candidateContextOne, candidateContextTwo], {
			resolveModel: (id: string): object | undefined => models.get(id),
			keepModels: true,
			formModel: createForm("Contract-document", "Contract-form"),
			sourceDocumentModelId: "Contract-document"
		});

		expect(result.remappedOverviews.has(`${overviewId}--ClaimLocation`)).toBe(true);
		expect(result.remappedOverviews.has(`${overviewId}--Location`)).toBe(true);
		expect(result.candidateQueryModels.some((query) => query.header.id === `${overviewId}--ClaimLocation-query`)).toBe(
			true
		);
		expect(result.candidateQueryModels.some((query) => query.header.id === `${overviewId}--Location-query`)).toBe(true);
	});

	it("non-keepModels: shared global candidate overview gets relationship clone and query while base stays document-backed", () => {
		const overviewId = "SharedCandidates-overview";
		const relationshipName = "SharedRelA";
		const generatedDocId = "SharedCandidates____generated";
		const rolesAnnotations = [{ name: "roles", value: "admin,editor" }];
		const sourceOverview = createOverview(overviewId, generatedDocId) as {
			header: { annotations?: Array<{ name: string; value: string }> };
		};
		const models = new Map<string, object>([
			[
				overviewId,
				{
					...sourceOverview,
					header: {
						...sourceOverview.header,
						annotations: [
							{ name: "source", value: "overview" },
							{ name: "roles", value: "old-role" }
						]
					}
				}
			],
			[generatedDocId, createGeneratedDoc(generatedDocId, "Candidate-document")],
			[
				relationshipName,
				createRelationshipModel(relationshipName, "Candidate", "Source", false, "Candidate-document", "Source-document")
			]
		]);
		const candidateRuM: OverviewStructureFinalRuM = {
			rumModel: {
				header: {
					id: `${overviewId}-rum`,
					modelType: "relationship-ui",
					modelVersion: RUM_VERSION
				},
				content: {
					relationshipName,
					targetRole: "Candidate",
					component: {
						componentType: "DualPaneSelection",
						availableItemsOverviewModel: overviewId
					}
				}
			},
			bindingName: `${overviewId}-binding`,
			elementId: "element-1",
			relationshipName,
			targetRole: "Candidate"
		};

		const result = buildOverviewStructure([candidateRuM], {
			resolveModel: (id: string): object | undefined => models.get(id),
			keepModels: false,
			formModel: createForm("Source-document", "Source-form"),
			sourceDocumentModelId: "Source-document",
			globalCandidateRelMap: new Map([[overviewId, new Set([relationshipName, "SharedRelB"])]]),
			rolesAnnotations
		});

		const base = result.remappedOverviews.get(overviewId);
		expect(result.remappedOverviews.has(`${overviewId}--${relationshipName}`)).toBe(true);
		expect(
			result.candidateQueryModels.some((query) => query.header.id === `${overviewId}--${relationshipName}-query`)
		).toBe(true);
		expect(result.remappedOverviews.get(`${overviewId}--${relationshipName}`)?.header.annotations).toEqual([
			{ name: "source", value: "overview" },
			{ name: "roles", value: "old-role" }
		]);
		expect(
			result.candidateQueryModels.find((query) => query.header.id === `${overviewId}--${relationshipName}-query`)
				?.header.annotations
		).toEqual(rolesAnnotations);
		expect(base?.header.modelReferences).toMatchObject([
			{
				purpose: "document-model-for-overview",
				modelType: "document",
				reference: "Candidate-document"
			}
		]);
	});

	it("non-keepModels: unshared global candidate overview stays on base id without relationship clone", () => {
		const overviewId = "UnsharedCandidates-overview";
		const relationshipName = "UnsharedRel";
		const generatedDocId = "UnsharedCandidates____generated";
		const models = new Map<string, object>([
			[overviewId, createOverview(overviewId, generatedDocId)],
			[generatedDocId, createGeneratedDoc(generatedDocId, "Candidate-document")],
			[
				relationshipName,
				createRelationshipModel(relationshipName, "Candidate", "Source", false, "Candidate-document", "Source-document")
			]
		]);
		const candidateRuM: OverviewStructureFinalRuM = {
			rumModel: {
				header: {
					id: `${overviewId}-rum`,
					modelType: "relationship-ui",
					modelVersion: RUM_VERSION
				},
				content: {
					relationshipName,
					targetRole: "Candidate",
					component: {
						componentType: "DualPaneSelection",
						availableItemsOverviewModel: overviewId
					}
				}
			},
			bindingName: `${overviewId}-binding`,
			elementId: "element-1",
			relationshipName,
			targetRole: "Candidate"
		};

		const result = buildOverviewStructure([candidateRuM], {
			resolveModel: (id: string): object | undefined => models.get(id),
			keepModels: false,
			formModel: createForm("Source-document", "Source-form"),
			sourceDocumentModelId: "Source-document",
			globalCandidateRelMap: new Map([[overviewId, new Set([relationshipName])]])
		});

		expect(result.remappedOverviews.has(`${overviewId}--${relationshipName}`)).toBe(false);
		expect(
			result.candidateQueryModels.some((query) => query.header.id === `${overviewId}--${relationshipName}-query`)
		).toBe(false);
		expect(result.candidateQueryModels.some((query) => query.header.id === `${overviewId}-query`)).toBe(true);
	});

	it("non-keepModels: DualPane link/selected overview backed by generated doc is mutated to query-backed in place", () => {
		const overviewId = "TeamPerson_Person_LinkOverview-overview";
		const generatedDocId = "TeamPerson_Person____generated";
		const models = new Map<string, object>([
			[
				overviewId,
				createOverviewWithColumns(overviewId, generatedDocId, [
					{ id: "column-first-name", elementRef: "I4_F3" },
					{ id: "column-link-value", elementRef: "I5_field_04443" },
					{ id: "column-wrapper", elementRef: "G2_field_generated" }
				])
			],
			[
				generatedDocId,
				createGeneratedDocWithI4I5WrapperPrefixes(generatedDocId, "DomainPerson", "TeamPerson-document")
			],
			["TeamPerson", createRelationshipModel("TeamPerson", "Person", "Team", false, "DomainPerson", "DomainTeam")],
			["TeamPerson-document", createDocumentModelWithFieldRefs("TeamPerson-document", ["field_04443"])]
		]);
		const selectedRuM: OverviewStructureFinalRuM = {
			rumModel: {
				header: {
					id: `${overviewId}-rum`,
					modelType: "relationship-ui",
					modelVersion: RUM_VERSION
				},
				content: {
					relationshipName: "TeamPerson",
					targetRole: "Person",
					component: {
						componentType: "DualPaneSelection",
						selectedItemsOverviewModel: overviewId
					}
				}
			},
			bindingName: `${overviewId}-binding`,
			elementId: "element-1",
			relationshipName: "TeamPerson",
			targetRole: "Person"
		};

		const result = buildOverviewStructure([selectedRuM], {
			resolveModel: (id: string): object | undefined => models.get(id),
			keepModels: false,
			formModel: createForm("DomainTeam", "Team-form"),
			sourceDocumentModelId: "DomainTeam"
		});

		const base = result.remappedOverviews.get(overviewId);
		const queryReference = `${overviewId}-query`;
		const modelReferences = base?.header.modelReferences ?? [];
		const baseColumns = getOverviewReferenceColumns(base);
		expect(result.linkQueryModels.some((query) => query.header.id === queryReference)).toBe(true);
		expect(modelReferences).toEqual([
			{
				purpose: "query-model-for-overview",
				modelType: "query",
				reference: queryReference
			}
		]);
		expect(modelReferences.every((reference) => reference.purpose !== "document-model-for-overview")).toBe(true);
		expect(
			baseColumns.every(
				(column) =>
					typeof column.elementRef !== "string" ||
					(!/^I[0-9]+_/.test(column.elementRef) && !column.elementRef.startsWith("G2_"))
			)
		).toBe(true);
		expect(result.deletionList).toContain(generatedDocId);
		expect(result.cloneMap.has(overviewId)).toBe(false);
	});

	it("non-keepModels: TableList same source selected overview keeps direct base and creates edit query-backed clone", () => {
		const overviewId = "TeamPerson_Person_LinkOverview-overview";
		const generatedDocId = "TeamPerson_Person____generated";
		const relationshipName = "TeamPerson";
		const models = new Map<string, object>([
			[
				overviewId,
				createOverviewWithColumns(overviewId, generatedDocId, [
					{ id: "column-first-name", elementRef: "I4_F3" },
					{ id: "column-link-value", elementRef: "I5_field_04443" },
					{ id: "column-wrapper", elementRef: "G2_field_generated" }
				])
			],
			[
				generatedDocId,
				createGeneratedDocWithI4I5WrapperPrefixes(generatedDocId, "DomainPerson", "TeamPerson-document")
			],
			[
				relationshipName,
				createRelationshipModel(relationshipName, "Person", "Team", false, "DomainPerson", "DomainTeam")
			],
			["TeamPerson-document", createDocumentModelWithFieldRefs("TeamPerson-document", ["field_04443"])],
			// Added availableItems overview — buildOverviewStructure now throws when a referenced overview is missing
			[
				"TeamPerson_Person_AvailableItemsOverview",
				createOverview("TeamPerson_Person_AvailableItemsOverview", "DomainPerson")
			]
		]);
		const tableListRuM: OverviewStructureFinalRuM = {
			rumModel: {
				header: {
					id: `${overviewId}-rum`,
					modelType: "relationship-ui",
					modelVersion: RUM_VERSION
				},
				content: {
					relationshipName,
					targetRole: "Person",
					component: {
						componentType: "TableList",
						selectedItemsOverviewModel: overviewId,
						editConfiguration: {
							availableItemsOverviewModel: "TeamPerson_Person_AvailableItemsOverview",
							selectedItemsOverviewModel: overviewId
						}
					}
				}
			},
			bindingName: `${overviewId}-binding`,
			elementId: "element-1",
			relationshipName,
			targetRole: "Person"
		};

		const result = buildOverviewStructure([tableListRuM], {
			resolveModel: (id: string): object | undefined => models.get(id),
			keepModels: false,
			formModel: createForm("DomainTeam", "Team-form"),
			sourceDocumentModelId: "DomainTeam"
		});

		const expectedQueryId = `${overviewId}-query`;
		const base = result.remappedOverviews.get(overviewId);
		const edit = result.remappedOverviews.get(`${overviewId}-edit`);
		const linkQueryIds = result.linkQueryModels.map((query) => query.header.id);
		const expectedQueryRef = {
			purpose: "query-model-for-overview",
			modelType: "query",
			reference: expectedQueryId
		};

		expect(base?.header.modelReferences).toEqual([expectedQueryRef]);
		expect(edit?.header.modelReferences).toEqual([expectedQueryRef]);
		expect(getOverviewReferenceColumns(base).map((column) => column.elementRef)).toEqual(["F3", "field_04443"]);
		expect(getOverviewReferenceColumns(edit).map((column) => column.elementRef)).toEqual(
			getOverviewReferenceColumns(base).map((column) => column.elementRef)
		);
		expect(
			getOverviewReferenceColumns(edit).every(
				(column) =>
					typeof column.elementRef === "string" &&
					!column.elementRef.startsWith("I4_") &&
					!column.elementRef.startsWith("I5_") &&
					!column.elementRef.startsWith("G2_")
			)
		).toBe(true);
		expect(linkQueryIds).toEqual([expectedQueryId]);
		expect(linkQueryIds).not.toContain(`${overviewId}-edit-query`);
		expect(result.deletionList).toContain(generatedDocId);
		expect(result.cloneMap.get(overviewId)).toBe(`${overviewId}-edit`);
		expect(result.remappedOverviews.get(`${overviewId}-tableList`)).toBeUndefined();
	});

	it("non-keepModels: TableList distinct direct and edit selected overviews use base and edit outputs independently", () => {
		const directOverviewId = "Brand_Direct_OM";
		const directGeneratedDocId = "Brand_Direct____generated";
		const editOverviewId = "ProductBrand_Product_SelectedItems_DualPane_OM";
		const editGeneratedDocId = "ProductBrand_Product____generated";
		const relationshipName = "ProductBrand";
		const models = new Map<string, object>([
			[
				directOverviewId,
				createOverviewWithColumns(directOverviewId, directGeneratedDocId, [
					{ id: "direct-product-name", elementRef: "I4_F4" },
					{ id: "direct-link-field", elementRef: "I5_F5" },
					{ id: "direct-wrapper", elementRef: "G2_field_direct" }
				])
			],
			[
				editOverviewId,
				createOverviewWithColumns(editOverviewId, editGeneratedDocId, [
					{ id: "edit-product-name", elementRef: "I4_F4" },
					{ id: "edit-product-sku", elementRef: "I4_F5" },
					{ id: "edit-link-field", elementRef: "I5_F5" },
					{ id: "edit-wrapper", elementRef: "G2_field_cfb40" }
				])
			],
			[
				directGeneratedDocId,
				createGeneratedDocWithI4I5WrapperPrefixes(
					directGeneratedDocId,
					"Product-document",
					"ProductBrand_AdditionalFieldsModel"
				)
			],
			[
				editGeneratedDocId,
				createGeneratedDocWithI4I5WrapperPrefixes(
					editGeneratedDocId,
					"Product-document",
					"ProductBrand_AdditionalFieldsModel"
				)
			],
			[
				relationshipName,
				createRelationshipModel(relationshipName, "Product", "Brand", false, "Product-document", "Brand-document")
			],
			[
				"ProductBrand_AdditionalFieldsModel",
				createDocumentModelWithFieldRefs("ProductBrand_AdditionalFieldsModel", ["F5"])
			],
			// Added availableItems overview — buildOverviewStructure now throws when a referenced overview is missing
			[
				"ProductBrand_Product_AvailableItemsOverview",
				createOverview("ProductBrand_Product_AvailableItemsOverview", "Product-document")
			]
		]);
		const tableListRuM: OverviewStructureFinalRuM = {
			rumModel: {
				header: {
					id: `${relationshipName}-rum`,
					modelType: "relationship-ui",
					modelVersion: RUM_VERSION
				},
				content: {
					relationshipName,
					targetRole: "Product",
					component: {
						componentType: "TableList",
						selectedItemsOverviewModel: directOverviewId,
						editConfiguration: {
							availableItemsOverviewModel: "ProductBrand_Product_AvailableItemsOverview",
							selectedItemsOverviewModel: editOverviewId
						}
					}
				}
			},
			bindingName: `${relationshipName}-binding`,
			elementId: "element-products",
			relationshipName,
			targetRole: "Product"
		};

		const result = buildOverviewStructure([tableListRuM], {
			resolveModel: (id: string): object | undefined => models.get(id),
			keepModels: false,
			formModel: createForm("Brand-document", "Brand-form"),
			sourceDocumentModelId: "Brand-document"
		});

		const directQueryId = `${directOverviewId}-query`;
		const editQueryId = `${editOverviewId}-query`;
		const direct = result.remappedOverviews.get(directOverviewId);
		const edit = result.remappedOverviews.get(`${editOverviewId}-edit`);
		const linkQueryIds = result.linkQueryModels.map((query) => query.header.id);

		expect(direct?.header.modelReferences).toEqual([
			{
				purpose: "query-model-for-overview",
				modelType: "query",
				reference: directQueryId
			}
		]);
		expect(result.remappedOverviews.get(`${directOverviewId}-tableList`)).toBeUndefined();
		expect(result.remappedOverviews.get(`${directOverviewId}-edit`)).toBeUndefined();
		expect(edit?.header.modelReferences).toEqual([
			{
				purpose: "query-model-for-overview",
				modelType: "query",
				reference: editQueryId
			}
		]);
		expect(getOverviewReferenceColumns(edit).map((column) => column.elementRef)).toEqual(["F4", "F5", "F5"]);
		expect(
			getOverviewReferenceColumns(edit).every(
				(column) =>
					typeof column.elementRef === "string" &&
					!column.elementRef.startsWith("I4_") &&
					!column.elementRef.startsWith("I5_") &&
					!column.elementRef.startsWith("G2_")
			)
		).toBe(true);
		expect(linkQueryIds).toEqual([directQueryId, editQueryId]);
		expect(linkQueryIds).not.toContain(`${editOverviewId}-edit-query`);
		expect(result.cloneMap.get(editOverviewId)).toBe(`${editOverviewId}-edit`);
		expect(result.cloneMap.has(directOverviewId)).toBe(false);
		expect(result.deletionList).toEqual(expect.arrayContaining([directGeneratedDocId, editGeneratedDocId]));
	});

	it("non-keepModels: DualPane candidate/available overview stays document-backed to resolved target document", () => {
		const overviewId = "PersonCandidates-overview";
		const generatedDocId = `${overviewId}____generated`;
		const models = new Map<string, object>([
			[overviewId, createOverviewWithColumns(overviewId, generatedDocId, [{ id: "column-name", elementRef: "I4_F3" }])],
			[
				generatedDocId,
				createGeneratedDocWithI4I5WrapperPrefixes(generatedDocId, "DomainPerson", "TeamPerson-document")
			],
			["TeamPerson", createRelationshipModel("TeamPerson", "Person", "Team", false, "DomainPerson", "DomainTeam")],
			// Added selected overview — buildOverviewStructure now throws when a referenced overview is missing
			[
				"TeamPerson_Person_LinkOverview-overview",
				createOverview("TeamPerson_Person_LinkOverview-overview", "DomainPerson")
			]
		]);
		const candidateRuM: OverviewStructureFinalRuM = {
			rumModel: {
				header: {
					id: `${overviewId}-rum`,
					modelType: "relationship-ui",
					modelVersion: RUM_VERSION
				},
				content: {
					relationshipName: "TeamPerson",
					targetRole: "Person",
					component: {
						componentType: "DualPaneSelection",
						availableItemsOverviewModel: overviewId,
						selectedItemsOverviewModel: "TeamPerson_Person_LinkOverview-overview"
					}
				}
			},
			bindingName: `${overviewId}-binding`,
			elementId: "element-1",
			relationshipName: "TeamPerson",
			targetRole: "Person"
		};

		const result = buildOverviewStructure([candidateRuM], {
			resolveModel: (id: string): object | undefined => models.get(id),
			keepModels: false,
			formModel: createForm("DomainTeam", "Team-form"),
			sourceDocumentModelId: "DomainTeam"
		});

		const modelReferences = result.remappedOverviews.get(overviewId)?.header.modelReferences ?? [];
		expect(modelReferences).toHaveLength(1);
		expect(modelReferences[0]).toMatchObject({
			purpose: "document-model-for-overview",
			modelType: "document",
			reference: "DomainPerson"
		});
		expect(modelReferences.some((reference) => reference.purpose === "query-model-for-overview")).toBe(false);
	});

	it("keepModels: DualPane selected continues to use -edit clone and base is not query-backed", () => {
		const overviewId = "LocationLinks-overview";
		const generatedDocId = `${overviewId}____generated`;
		const models = new Map<string, object>([
			[overviewId, createOverview(overviewId, generatedDocId)],
			[generatedDocId, createGeneratedDoc(generatedDocId, "Address-document")],
			[
				"Location",
				createRelationshipModel("Location", "other", "source", false, "Address-document", "Contract-document")
			]
		]);

		const result = buildOverviewStructure([createDualPaneRuM(overviewId, "Location")], {
			resolveModel: (id: string): object | undefined => models.get(id),
			keepModels: true,
			formModel: createForm("Contract-document", "Contract-form"),
			sourceDocumentModelId: "Contract-document"
		});

		const baseReferences = result.remappedOverviews.get(overviewId)?.header.modelReferences ?? [];
		expect(result.cloneMap.get(overviewId)).toBe(`${overviewId}-edit`);
		expect(baseReferences).toHaveLength(1);
		expect(baseReferences[0]).toMatchObject({
			purpose: "document-model-for-overview",
			modelType: "document",
			reference: "Address-document"
		});
		expect(baseReferences.some((reference) => reference.purpose === "query-model-for-overview")).toBe(false);
		expect(result.remappedOverviews.get(`${overviewId}-edit`)?.header.modelReferences).toEqual([
			{
				purpose: "query-model-for-overview",
				modelType: "query",
				reference: `${overviewId}-query`
			}
		]);
	});

	it("non-keepModels: LINK exclude-mode DualPane selected overview is mutated to query-backed in place", () => {
		const overviewId = "CategoryCategory_Child_LinkOverview-overview";
		const generatedDocId = "CategoryCategory_Child____generated";
		const models = new Map<string, object>([
			[
				overviewId,
				createOverviewWithColumns(overviewId, generatedDocId, [
					{ id: "column-child", elementRef: "I4_field_04d07" },
					{ id: "column-link", elementRef: "I5_field_linkValue" }
				])
			],
			[
				generatedDocId,
				createGeneratedDocWithI4I5WrapperPrefixes(generatedDocId, "Category-document", "CategoryCategory-document")
			],
			[
				"CategoryCategory",
				createRelationshipModel(
					"CategoryCategory",
					"ChildCategory",
					"Parent",
					true,
					"Category-document",
					"Category-document"
				)
			],
			["CategoryCategory-document", createDocumentModelWithFieldRefs("CategoryCategory-document", ["field_linkValue"])]
		]);
		const selectedRuM: OverviewStructureFinalRuM = {
			rumModel: {
				header: {
					id: `${overviewId}-rum`,
					modelType: "relationship-ui",
					modelVersion: RUM_VERSION
				},
				content: {
					relationshipName: "CategoryCategory",
					targetRole: "ChildCategory",
					component: {
						componentType: "DualPaneSelection",
						selectedItemsOverviewModel: overviewId
					}
				}
			},
			bindingName: `${overviewId}-binding`,
			elementId: "element-1",
			relationshipName: "CategoryCategory",
			targetRole: "ChildCategory"
		};

		const result = buildOverviewStructure([selectedRuM], {
			resolveModel: (id: string): object | undefined => models.get(id),
			keepModels: false,
			formModel: createForm("Category-document", "Category-form"),
			sourceDocumentModelId: "Category-document"
		});

		const modelReferences = result.remappedOverviews.get(overviewId)?.header.modelReferences ?? [];
		const query = result.linkQueryModels.find((queryModel) => queryModel.header.id === `${overviewId}-query`);
		expect(modelReferences).toEqual([
			{
				purpose: "query-model-for-overview",
				modelType: "query",
				reference: `${overviewId}-query`
			}
		]);
		expect(query?.content.exclude).toBe(true);
		expect(query?.content.links![0]?.targetRole).toBe("ChildCategory");
		expect(result.deletionList).toContain(generatedDocId);
		expect(result.cloneMap.has(overviewId)).toBe(false);
	});

	it("strips search and filter slot elements from plain overviews when configuration flags are false", () => {
		const overviewId = "TeamPerson_Person_AvailableItems_OM";
		const queryModelId = `${overviewId}-query`;
		const targetDocumentId = "Person-document";
		const queryModel = createQueryModel(queryModelId, targetDocumentId);
		const overview = {
			...createQueryBackedOverview(overviewId, queryModelId),
			content: {
				columns: [],
				subHeaderBox: {
					rightSlot: [
						{ type: OverviewModel.ElementType.SEARCH },
						{ type: OverviewModel.ElementType.FILTER },
						{ type: OverviewModel.ElementType.MULTI_SELECTION }
					]
				},
				configuration: {
					showFullTextSearch: false,
					enableFilter: false
				}
			}
		};
		const selectedOverviewId = `${overviewId}-selected`;
		const selectedQueryModelId = `${selectedOverviewId}-query`;
		const models = new Map<string, object>([
			[overviewId, overview],
			[queryModelId, queryModel],
			[selectedOverviewId, createQueryBackedOverview(selectedOverviewId, selectedQueryModelId)],
			[selectedQueryModelId, createQueryModel(selectedQueryModelId, targetDocumentId)],
			["TeamPerson", createRelationshipModel("TeamPerson", "Person", "Team", false)]
		]);
		const availableItemsRuM: OverviewStructureFinalRuM = {
			rumModel: {
				header: {
					id: `${overviewId}-rum`,
					modelType: "relationship-ui",
					modelVersion: RUM_VERSION
				},
				content: {
					relationshipName: "TeamPerson",
					targetRole: "Person",
					component: {
						componentType: "DualPaneSelection",
						availableItemsOverviewModel: overviewId,
						selectedItemsOverviewModel: `${overviewId}-selected`
					}
				}
			},
			bindingName: `${overviewId}-binding`,
			elementId: "element-1",
			relationshipName: "TeamPerson",
			targetRole: "Person"
		};

		const result = buildOverviewStructure([availableItemsRuM], {
			resolveModel: (id: string): object | undefined => models.get(id),
			keepModels: false,
			formModel: createForm(targetDocumentId, "TeamPerson-form"),
			sourceDocumentModelId: "Team-document"
		});

		const remappedOverview = result.remappedOverviews.get(overviewId);
		const rightSlot = (remappedOverview?.content as { subHeaderBox?: { rightSlot?: readonly unknown[] } } | undefined)
			?.subHeaderBox?.rightSlot;

		expect(rightSlot).toEqual([{ type: OverviewModel.ElementType.MULTI_SELECTION }]);
	});

	it("normalizes CUSTOM_LIST filterConfiguration to ALL_COLUMNS on generated-doc path", () => {
		const overviewId = "Claim_Location_SelectedItemsOverview";
		const generatedDocId = `${overviewId}____generated`;
		const models = new Map<string, object>([
			[
				overviewId,
				{
					header: {
						id: overviewId,
						modelType: "overview",
						modelVersion: OVERVIEW_MODEL_VERSION,
						modelReferences: [
							{
								purpose: "document-model-for-overview",
								modelType: "document",
								reference: generatedDocId
							}
						]
					},
					content: {
						columns: [],
						configuration: {
							enableFilter: true,
							showFullTextSearch: true,
							filterConfiguration: {
								showFilterButton: true,
								showFilterBar: false,
								filterMode: OverviewModel.FilterMode.CUSTOM_LIST,
								fields: [{ fieldId: "I4_field_xxx" }]
							}
						}
					}
				}
			],
			[generatedDocId, createGeneratedDoc(generatedDocId, "Address-document")],
			["ClaimLocation", createRelationshipModel("ClaimLocation", "other", "source", false)]
		]);

		const result = buildOverviewStructure([createDualPaneRuM(overviewId, "ClaimLocation")], {
			resolveModel: (id: string): object | undefined => models.get(id),
			keepModels: true,
			formModel: createForm("Claim-document", "Claim-form"),
			sourceDocumentModelId: "Claim-document"
		});

		const remappedOverview = result.remappedOverviews.get(overviewId);
		const filterConfiguration = remappedOverview?.content.configuration?.filterConfiguration;

		expect(filterConfiguration?.filterMode).toBe(OverviewModel.FilterMode.ALL_COLUMNS);
		expect((filterConfiguration as { fields?: unknown } | undefined)?.fields).toBeUndefined();
	});

	it("captures the global candidate page size map in the OverviewStructure result", () => {
		const result = buildOverviewStructure([], {
			resolveModel: () => undefined,
			keepModels: true,
			formModel: createForm("Claim-document", "Claim-form"),
			workspaceModels: [
				createWorkspaceFormWithBindingConfiguration("workspace-form-a", [
					{
						type: "relationship",
						details: {
							relationshipName: "BundleProduct",
							components: [{ candidatePageSize: 20, models: [{ use: "candidate", name: "Candidates-overview" }] }]
						}
					}
				]),
				createWorkspaceFormWithBindingConfiguration("workspace-form-b", [
					{
						type: "relationship",
						details: {
							relationshipName: "ProductCategory",
							components: [{ candidatePageSize: 35, models: [{ use: "candidate", name: "Candidates-overview" }] }]
						}
					}
				])
			]
		});

		expect(result.candidatePageSizeMap.get("Candidates-overview")).toBe(35);
	});

	it("throws ModelNotFoundError when overview model cannot be resolved from workspace", () => {
		const overviewId = "MissingOverview";
		const finalRuM = createDualPaneRuM(overviewId, "PostAddress");
		const models = new Map<string, object>([
			["PostAddress", createRelationshipModel("PostAddress", "target", "source", false)]
		]);

		expect(() =>
			buildOverviewStructure([finalRuM], {
				resolveModel: (id: string): object | undefined => models.get(id),
				keepModels: false,
				formModel: createForm("Source-document", "Source-form"),
				sourceDocumentModelId: "Source-document"
			})
		).toThrow(ModelNotFoundError);
	});

	it("throws ModelNotFoundError when overview resolves to non-overview type", () => {
		const overviewId = "WrongTypeModel";
		const finalRuM = createDualPaneRuM(overviewId, "PostAddress");
		const models = new Map<string, object>([
			["PostAddress", createRelationshipModel("PostAddress", "target", "source", false)],
			[
				overviewId,
				{
					header: { id: overviewId, modelType: "relationship", modelVersion: "4.0.0" },
					content: { duplicatesAllowed: false, entityCharacteristics: [] }
				}
			]
		]);

		expect(() =>
			buildOverviewStructure([finalRuM], {
				resolveModel: (id: string): object | undefined => models.get(id),
				keepModels: false,
				formModel: createForm("Source-document", "Source-form"),
				sourceDocumentModelId: "Source-document"
			})
		).toThrow(ModelNotFoundError);
	});
});

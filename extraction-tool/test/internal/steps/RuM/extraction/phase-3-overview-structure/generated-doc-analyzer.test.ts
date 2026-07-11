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

import type { LegacyGeneratedDocumentModel } from "../../../../../../src/models/legacy-generated-document-model.js";
import { analyzeGeneratedDocumentModel } from "../../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/generated-doc-analyzer.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createGeneratedDoc(overrides: {
	rootGroups: Array<{
		name: string;
		groupId: string;
		elementId?: string;
		elementName?: string;
		documentRef?: string;
	}>;
}): LegacyGeneratedDocumentModel {
	return {
		header: {
			id: "test____generated",
			modelType: "document",
			modelVersion: "28.4.0"
		},
		content: {
			modelRoot: {
				rootGroups: overrides.rootGroups.map((rg) => ({
					type: "Group",
					id: rg.groupId,
					name: rg.name,
					Group: {
						repeatability: 1,
						elements: [
							{
								type: "Group",
								id: rg.elementId ?? "I4",
								name: rg.elementName ?? rg.name,
								Group: {
									repeatability: 1,
									includeConfig: { reference: rg.documentRef ?? `${rg.name}-document` }
								}
							}
						]
					}
				}))
			}
		}
	};
}

// ---------------------------------------------------------------------------
// analyzeGeneratedDocumentModel
// ---------------------------------------------------------------------------

describe("analyzeGeneratedDocumentModel", () => {
	it("should analyze dual-rootGroup generated doc (target + relationship)", () => {
		const doc = createGeneratedDoc({
			rootGroups: [
				{
					name: "target",
					groupId: "G2",
					elementId: "I4",
					elementName: "contract",
					documentRef: "Contract-document"
				},
				{
					name: "relationship",
					groupId: "G3",
					elementId: "I5",
					elementName: "additionalFields",
					documentRef: "CoInsurerAdditionalFields"
				}
			]
		});

		const result = analyzeGeneratedDocumentModel(doc);
		expect(result.targetDocumentModelId).toBe("Contract-document");
		expect(result.linkDocumentModelId).toBe("CoInsurerAdditionalFields");
		expect(result.targetGroupPrefix).toBe("I4_");
		expect(result.relationshipGroupPrefix).toBe("I5_");
	});

	it("should analyze single-rootGroup generated doc (target only)", () => {
		const doc = createGeneratedDoc({
			rootGroups: [
				{
					name: "target",
					groupId: "G2",
					elementId: "I4",
					elementName: "claim",
					documentRef: "Claim-document"
				}
			]
		});

		const result = analyzeGeneratedDocumentModel(doc);
		expect(result.targetDocumentModelId).toBe("Claim-document");
		expect(result.linkDocumentModelId).toBeUndefined();
		expect(result.targetGroupPrefix).toBe("I4_");
		expect(result.relationshipGroupPrefix).toBeUndefined();
	});

	it("should analyze generated doc using includeConfig reference", () => {
		const doc: LegacyGeneratedDocumentModel = {
			header: {
				id: "test____generated",
				modelType: "document",
				modelVersion: "28.4.0"
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
										id: "I4",
										name: "claim",
										Group: {
											repeatability: 1,
											includeConfig: { reference: "Claim-document" }
										}
									}
								]
							}
						}
					]
				}
			}
		};

		const result = analyzeGeneratedDocumentModel(doc);
		expect(result.targetDocumentModelId).toBe("Claim-document");
		expect(result.targetGroupPrefix).toBe("I4_");
		expect(result.linkDocumentModelId).toBeUndefined();
		expect(result.relationshipGroupPrefix).toBeUndefined();
	});

	it("should handle empty rootGroups", () => {
		const doc = {
			header: { id: "test", modelType: "document", modelVersion: "1.0.0" },
			content: {
				modelRoot: {
					rootGroups: [] as Array<{
						type: string;
						id: string;
						name?: string;
						Group: { elements?: unknown[]; repeatability?: number; includeConfig?: { reference: string } };
					}>
				}
			}
		};

		const result = analyzeGeneratedDocumentModel(doc as LegacyGeneratedDocumentModel);
		expect(result.targetDocumentModelId).toBe("");
		expect(result.linkDocumentModelId).toBeUndefined();
		expect(result.targetGroupPrefix).toBe("");
		expect(result.relationshipGroupPrefix).toBeUndefined();
	});

	it("should return empty prefix when group has no nested elements", () => {
		const doc = {
			header: { id: "test____generated", modelType: "document", modelVersion: "28.4.0" },
			content: {
				modelRoot: {
					rootGroups: [
						{
							type: "Group",
							id: "G2",
							name: "target",
							Group: {
								repeatability: 1,
								elements: []
							}
						}
					]
				}
			}
		};

		const result = analyzeGeneratedDocumentModel(doc as LegacyGeneratedDocumentModel);
		expect(result.targetDocumentModelId).toBe("");
		expect(result.targetGroupPrefix).toBe("");
	});

	it("should handle missing rootGroups gracefully", () => {
		const doc = {
			header: { id: "test", modelType: "document", modelVersion: "1.0.0" },
			content: {
				modelRoot: {}
			}
		};

		const result = analyzeGeneratedDocumentModel(doc as LegacyGeneratedDocumentModel);
		expect(result.targetDocumentModelId).toBe("");
		expect(result.linkDocumentModelId).toBeUndefined();
	});

	it("should not include relationship group when only target exists", () => {
		const doc = createGeneratedDoc({
			rootGroups: [
				{
					name: "target",
					groupId: "G2",
					elementId: "I4",
					documentRef: "Claim-document"
				}
			]
		});

		const result = analyzeGeneratedDocumentModel(doc);
		expect(result.linkDocumentModelId).toBeUndefined();
		expect(result.relationshipGroupPrefix).toBeUndefined();
	});

	it("should correctly handle CoInsurer_contract____generated fixture pattern", () => {
		const doc = createGeneratedDoc({
			rootGroups: [
				{
					name: "target",
					groupId: "G2",
					elementId: "I4",
					elementName: "contract",
					documentRef: "Contract-document"
				},
				{
					name: "relationship",
					groupId: "G3",
					elementId: "I5",
					elementName: "additionalFields",
					documentRef: "CoInsurerAdditionalFields"
				}
			]
		});

		const result = analyzeGeneratedDocumentModel(doc);
		expect(result.targetGroupPrefix).toBe("I4_");
		expect(result.relationshipGroupPrefix).toBe("I5_");
		expect(result.targetDocumentModelId).toBe("Contract-document");
		expect(result.linkDocumentModelId).toBe("CoInsurerAdditionalFields");
	});

	it("should extract correct column remapping prefix for inline-field pattern (no includeConfig)", () => {
		// Category-style generated doc: CategoryCategory_ChildCategory____generated
		// The target root group's first element has a compound ID like "I4_G7" (Properties group),
		// and inlines document fields directly ("I4_F1") rather than using includeConfig.
		// The analyzer cannot determine targetDocumentModelId from the doc alone,
		// but must correctly extract targetGroupPrefix = "I4_" for column remapping.
		const doc: LegacyGeneratedDocumentModel = {
			header: {
				id: "CategoryCategory_ChildCategory____generated",
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
													Field: {
														fieldType: { type: "StringType" }
													}
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

		const result = analyzeGeneratedDocumentModel(doc);

		// Prefix must be "I4_" (first segment of "I4_G7"), not "I4_G7_".
		// This is critical so that column elementRef "I4_F1" strips correctly to "F1".
		expect(result.targetGroupPrefix).toBe("I4_");

		// targetDocumentModelId is empty — the analyzer cannot resolve it from the doc alone.
		// The caller (index.ts) uses the relationship model fallback to supply it.
		expect(result.targetDocumentModelId).toBe("");

		expect(result.linkDocumentModelId).toBeUndefined();
		expect(result.relationshipGroupPrefix).toBeUndefined();
	});
});

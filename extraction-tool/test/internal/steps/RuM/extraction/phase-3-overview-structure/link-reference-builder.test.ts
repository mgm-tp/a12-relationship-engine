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

import { OverviewModel } from "../../../../../../src/models/overview-model.js";
import PlainDM from "../../../../../__fixtures__/shared/document-models/PlainDM.json" with { type: "json" };
import type { LegacyGeneratedDocumentModel } from "../../../../../../src/models/legacy-generated-document-model.js";
import type { ColumnClassification } from "../../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/types.js";
import { addLinkReferences } from "../../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/link-reference-builder.js";

// Generated stubs have only includeConfig.reference wrappers — no Field elements
function createGeneratedStub(elements: Array<{ id: string; reference: string }>): LegacyGeneratedDocumentModel {
	return {
		header: { id: "Stub", modelType: "document", modelVersion: "1.0.0" },
		content: {
			modelRoot: {
				rootGroups: [
					{
						type: "Group",
						id: "G3",
						name: "relationship",
						Group: {
							elements: elements.map((el) => ({
								type: "Group" as const,
								id: el.id,
								name: el.id,
								Group: { includeConfig: { reference: el.reference } }
							}))
						}
					}
				]
			}
		}
	};
}

// Raw workspace DM object (deserializable by referenced-document-model-lookup)
function createRawReferencedDm(elements: Array<{ id: string; type: "Field" | "Group"; usageType?: string }>): object {
	return {
		header: { id: "ReferencedDM", modelType: "document", modelVersion: "1.0.0" },
		content: {
			modelRoot: {
				rootGroups: [
					{
						type: "Group",
						id: "G1",
						name: "linkFields",
						Group: {
							repeatability: 1,
							elements: elements.map((el) =>
								el.type === "Field"
									? { type: "Field", id: el.id, name: el.id, Field: { fieldType: { type: "StringType" } } }
									: {
											type: "Group",
											id: el.id,
											name: el.id,
											Group: { repeatability: 1, usageType: el.usageType ?? "attachment", elements: [] }
										}
							)
						}
					}
				]
			}
		}
	};
}

const RELATIONSHIP_NAME = "RelationshipA";
const TARGET_ROLE = "targetRoleA";
const LINK_TARGET_ROLE = "linkTargetRoleA";

/** Returns link references for a column via BaseLinkedColumn guard; undefined when absent. */
function getLinkRefs(col: OverviewModel.ReferenceColumn): readonly OverviewModel.LinkReference[] | undefined {
	if (OverviewModel.BaseLinkedColumn.isAssignableFrom(col)) {
		return col.linkReferences;
	}

	return undefined;
}

/** Asserts all link references in columns have non-empty relationship/targetRole and no fieldPath. */
function assertValidLinkReferenceSchema(columns: readonly OverviewModel.ReferenceColumn[]): void {
	for (const col of columns) {
		const refs = getLinkRefs(col);

		for (const ref of refs ?? []) {
			if (typeof ref === "object" && ref !== null && "fieldPath" in ref) {
				expect(ref.fieldPath).toBeUndefined();
			}

			expect(ref.relationship.trim().length).toBeGreaterThan(0);
			expect(ref.targetRole.trim().length).toBeGreaterThan(0);
		}
	}
}

describe("addLinkReferences", () => {
	it("should add CHILD references for target columns when duplicatesAllowed=true", () => {
		const columns = [
			{ id: "col-1", elementRef: "field_dbbc9", width: 1 },
			{ id: "col-2", elementRef: "field_90cd2", width: 1 }
		];
		const classifications: ColumnClassification[] = [
			{ kind: "target", originalElementId: "field_dbbc9" },
			{ kind: "target", originalElementId: "field_90cd2" }
		];

		const result = addLinkReferences(
			columns,
			classifications,
			undefined,
			true,
			RELATIONSHIP_NAME,
			TARGET_ROLE,
			TARGET_ROLE
		);
		expect(getLinkRefs(result[0])).toEqual([
			{ relationship: RELATIONSHIP_NAME, targetRole: TARGET_ROLE, type: "CHILD" }
		]);
		expect(getLinkRefs(result[1])).toEqual([
			{ relationship: RELATIONSHIP_NAME, targetRole: TARGET_ROLE, type: "CHILD" }
		]);
		assertValidLinkReferenceSchema(result);
	});

	it("should add LINK reference for relationship columns with field in link doc when duplicatesAllowed=true", () => {
		const columns = [{ id: "col-1", elementRef: "field_de37b", width: 1 }];
		const classifications: ColumnClassification[] = [
			{ kind: "relationship", originalElementId: "field_de37b", existsInLinkDoc: true }
		];
		const stub = createGeneratedStub([{ id: "I5", reference: "LinkDoc" }]);
		const rawDm = createRawReferencedDm([{ id: "field_de37b", type: "Field" }]);
		const resolveModel = (ref: string) => (ref === "LinkDoc" ? rawDm : undefined);

		const result = addLinkReferences(
			columns,
			classifications,
			stub,
			true,
			RELATIONSHIP_NAME,
			TARGET_ROLE,
			LINK_TARGET_ROLE,
			resolveModel
		);
		expect(getLinkRefs(result[0])).toEqual([
			{ relationship: RELATIONSHIP_NAME, targetRole: LINK_TARGET_ROLE, type: "LINK" }
		]);
		assertValidLinkReferenceSchema(result);
	});

	it("should NOT add LINK reference for relationship column when field NOT in link doc", () => {
		const columns = [{ id: "col-1", elementRef: "field_missing", width: 1 }];
		const classifications: ColumnClassification[] = [
			{ kind: "relationship", originalElementId: "field_missing", existsInLinkDoc: false }
		];
		const stub = createGeneratedStub([{ id: "I5", reference: "LinkDoc" }]);
		const rawDm = createRawReferencedDm([{ id: "field_de37b", type: "Field" }]);
		const resolveModel = (ref: string) => (ref === "LinkDoc" ? rawDm : undefined);

		const result = addLinkReferences(
			columns,
			classifications,
			stub,
			true,
			RELATIONSHIP_NAME,
			TARGET_ROLE,
			LINK_TARGET_ROLE,
			resolveModel
		);
		expect(getLinkRefs(result[0])).toBeUndefined();
	});

	it("should preserve existing linkReferences when adding refs in duplicatesAllowed=true mode", () => {
		// Cast to ReferenceColumn: the raw fixture has linkReferences (extra property) that the
		// canonical ReferenceColumn type does not declare. The cast is safe — the runtime object
		// has all required ReferenceColumn fields plus linkReferences, which BaseLinkedColumn.isAssignableFrom
		// detects for safe access.
		const columns = [
			{
				id: "col-1",
				elementRef: "field_1",
				width: 1,
				linkReferences: [{ type: "LINK" as const, relationship: "existingRel", targetRole: "existingRole" }]
			} as OverviewModel.ReferenceColumn
		];
		const classifications: ColumnClassification[] = [{ kind: "target", originalElementId: "field_1" }];

		const result = addLinkReferences(
			columns,
			classifications,
			undefined,
			true,
			RELATIONSHIP_NAME,
			TARGET_ROLE,
			LINK_TARGET_ROLE
		);
		const refs = getLinkRefs(result[0]);
		expect(refs).toHaveLength(2);
		expect(refs![0]).toEqual({
			type: "LINK",
			relationship: "existingRel",
			targetRole: "existingRole"
		});
		expect(refs![1]).toEqual({
			relationship: RELATIONSHIP_NAME,
			targetRole: TARGET_ROLE,
			type: "CHILD"
		});
		assertValidLinkReferenceSchema(result);
	});

	it("should add LINK reference for relationship columns when duplicatesAllowed=false", () => {
		const columns = [{ id: "col-1", elementRef: "field_de37b", width: 1 }];
		const classifications: ColumnClassification[] = [
			{ kind: "relationship", originalElementId: "field_de37b", existsInLinkDoc: true }
		];
		const stub = createGeneratedStub([{ id: "I5", reference: "LinkDoc" }]);
		const rawDm = createRawReferencedDm([{ id: "field_de37b", type: "Field" }]);
		const resolveModel = (ref: string) => (ref === "LinkDoc" ? rawDm : undefined);

		const result = addLinkReferences(
			columns,
			classifications,
			stub,
			false,
			RELATIONSHIP_NAME,
			TARGET_ROLE,
			TARGET_ROLE,
			resolveModel
		);
		expect(getLinkRefs(result[0])).toEqual([
			{ relationship: RELATIONSHIP_NAME, targetRole: TARGET_ROLE, type: "LINK" }
		]);
		assertValidLinkReferenceSchema(result);
	});

	it("should not add target refs when duplicatesAllowed=false", () => {
		const columns = [{ id: "col-1", elementRef: "field_dbbc9", width: 1 }];
		const classifications: ColumnClassification[] = [{ kind: "target", originalElementId: "field_dbbc9" }];

		const result = addLinkReferences(
			columns,
			classifications,
			undefined,
			false,
			RELATIONSHIP_NAME,
			TARGET_ROLE,
			TARGET_ROLE
		);
		expect(getLinkRefs(result[0])).toBeUndefined();
	});

	it("should return original columns when sizes mismatch", () => {
		const columns = [{ id: "col-1", elementRef: "field_1", width: 1 }];
		const classifications: ColumnClassification[] = [];

		const result = addLinkReferences(
			columns,
			classifications,
			undefined,
			false,
			RELATIONSHIP_NAME,
			TARGET_ROLE,
			LINK_TARGET_ROLE
		);
		expect(result).toBe(columns);
	});

	it("should not add refs when relationship metadata is missing", () => {
		const columns = [{ id: "col-1", elementRef: "field_de37b", width: 1 }];
		const classifications: ColumnClassification[] = [
			{ kind: "relationship", originalElementId: "field_de37b", existsInLinkDoc: true }
		];

		const result = addLinkReferences(columns, classifications, undefined, true, "", "", "");
		expect(getLinkRefs(result[0])).toBeUndefined();
	});

	it("HAS mode (duplicatesAllowed=false) LINK column gets linkTargetRole (source role) — ProductBrand-like fixture", () => {
		// ProductBrand Manufacturing Site: items role = "Product", source/form role = "Brand"
		// LINK targetRole must equal the query's links[0].targetRole = sourceRole = "Brand"
		const columns = [{ id: "col-1", elementRef: "F5", width: 1 }];
		const classifications: ColumnClassification[] = [
			{ kind: "relationship", originalElementId: "F5", existsInLinkDoc: true }
		];
		const stub = createGeneratedStub([{ id: "I5", reference: "BrandLinkDoc" }]);
		const rawDm = createRawReferencedDm([{ id: "F5", type: "Field" }]);
		const resolveModel = (ref: string) => (ref === "BrandLinkDoc" ? rawDm : undefined);

		const result = addLinkReferences(
			columns,
			classifications,
			stub,
			false, // HAS mode (duplicatesAllowed=false)
			"ProductBrand",
			"Product", // targetRole = items role (NOT used for LINK)
			"Brand", // linkTargetRole = source/form role (used for LINK)
			resolveModel
		);

		expect(getLinkRefs(result[0])).toEqual([{ relationship: "ProductBrand", targetRole: "Brand", type: "LINK" }]);
		assertValidLinkReferenceSchema(result);
	});

	it("exclude mode (duplicatesAllowed=true) LINK column gets items role — CoInsurer-like fixture", () => {
		// CoInsurer: items role = "businessPartner", source role = "contract"
		// LINK targetRole must equal the query's links[0].targetRole = itemsRole = "businessPartner"
		const columns = [
			{ id: "col-target", elementRef: "field_4e3fe", width: 1 },
			{ id: "col-link", elementRef: "field_de37b", width: 1 }
		];
		const classifications: ColumnClassification[] = [
			{ kind: "target", originalElementId: "field_4e3fe" },
			{ kind: "relationship", originalElementId: "field_de37b", existsInLinkDoc: true }
		];
		const stub = createGeneratedStub([{ id: "I5", reference: "CoInsurerLinkDoc" }]);
		const rawDm = createRawReferencedDm([{ id: "field_de37b", type: "Field" }]);
		const resolveModel = (ref: string) => (ref === "CoInsurerLinkDoc" ? rawDm : undefined);

		const result = addLinkReferences(
			columns,
			classifications,
			stub,
			true, // exclude mode (duplicatesAllowed=true)
			"CoInsurer",
			"businessPartner", // targetRole = items role (CHILD uses this)
			"businessPartner", // linkTargetRole = items role (LINK also uses this in exclude mode)
			resolveModel
		);

		// CHILD ref for target column uses targetRole (items role)
		expect(getLinkRefs(result[0])).toEqual([
			{ relationship: "CoInsurer", targetRole: "businessPartner", type: "CHILD" }
		]);
		// LINK ref for relationship column uses linkTargetRole (items role in exclude mode)
		expect(getLinkRefs(result[1])).toEqual([
			{ relationship: "CoInsurer", targetRole: "businessPartner", type: "LINK" }
		]);
		assertValidLinkReferenceSchema(result);
	});

	it("HAS mode CHILD ref is never emitted even when linkTargetRole differs from targetRole", () => {
		// Confirms: HAS mode produces no CHILD refs regardless of role parameters
		const columns = [{ id: "col-1", elementRef: "F4", width: 1 }];
		const classifications: ColumnClassification[] = [{ kind: "target", originalElementId: "F4" }];

		const result = addLinkReferences(
			columns,
			classifications,
			undefined,
			false, // HAS mode
			"ProductBrand",
			"Product",
			"Brand"
		);

		expect(getLinkRefs(result[0])).toBeUndefined();
	});

	it("should not add refs when linkTargetRole is empty", () => {
		const columns = [{ id: "col-1", elementRef: "field_de37b", width: 1 }];
		const classifications: ColumnClassification[] = [
			{ kind: "relationship", originalElementId: "field_de37b", existsInLinkDoc: true }
		];

		const result = addLinkReferences(columns, classifications, undefined, false, RELATIONSHIP_NAME, TARGET_ROLE, "");
		expect(getLinkRefs(result[0])).toBeUndefined();
	});

	it("attachment Group column → LINK ref emitted", () => {
		const columns = [{ id: "col-1", elementRef: "G_attach", width: 1 }];
		const classifications: ColumnClassification[] = [
			{ kind: "relationship", originalElementId: "G_attach", existsInLinkDoc: true }
		];
		const stub = createGeneratedStub([{ id: "I5", reference: "AttachLinkDoc" }]);
		const rawDm = createRawReferencedDm([{ id: "G_attach", type: "Group", usageType: "attachment" }]);
		const resolveModel = (ref: string) => (ref === "AttachLinkDoc" ? rawDm : undefined);

		const result = addLinkReferences(
			columns,
			classifications,
			stub,
			true,
			RELATIONSHIP_NAME,
			TARGET_ROLE,
			LINK_TARGET_ROLE,
			resolveModel
		);
		expect(getLinkRefs(result[0])).toEqual([
			{ relationship: RELATIONSHIP_NAME, targetRole: LINK_TARGET_ROLE, type: "LINK" }
		]);
		assertValidLinkReferenceSchema(result);
	});

	it("multi-select Group column → LINK ref emitted", () => {
		const columns = [{ id: "col-1", elementRef: "G_multisel", width: 1 }];
		const classifications: ColumnClassification[] = [
			{ kind: "relationship", originalElementId: "G_multisel", existsInLinkDoc: true }
		];
		const stub = createGeneratedStub([{ id: "I5", reference: "MultiSelLinkDoc" }]);
		const rawDm = createRawReferencedDm([{ id: "G_multisel", type: "Group", usageType: "multi-select" }]);
		const resolveModel = (ref: string) => (ref === "MultiSelLinkDoc" ? rawDm : undefined);

		const result = addLinkReferences(
			columns,
			classifications,
			stub,
			true,
			RELATIONSHIP_NAME,
			TARGET_ROLE,
			LINK_TARGET_ROLE,
			resolveModel
		);
		expect(getLinkRefs(result[0])).toEqual([
			{ relationship: RELATIONSHIP_NAME, targetRole: LINK_TARGET_ROLE, type: "LINK" }
		]);
		assertValidLinkReferenceSchema(result);
	});

	it("plain Group column (no usageType) → no LINK ref", () => {
		const columns = [{ id: "col-1", elementRef: "G_plain", width: 1 }];
		const classifications: ColumnClassification[] = [
			{ kind: "relationship", originalElementId: "G_plain", existsInLinkDoc: true }
		];
		const stub = createGeneratedStub([{ id: "I5", reference: "PlainLinkDoc" }]);
		// Group with no usageType → elementExistsInReferencedModel returns false (filter won't match)
		const resolveModel = (ref: string) => (ref === "PlainLinkDoc" ? PlainDM : undefined);

		const result = addLinkReferences(
			columns,
			classifications,
			stub,
			true,
			RELATIONSHIP_NAME,
			TARGET_ROLE,
			LINK_TARGET_ROLE,
			resolveModel
		);
		expect(getLinkRefs(result[0])).toBeUndefined();
	});
});

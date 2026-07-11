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

import { QUERY_MODEL_VERSION } from "../../../src/internal/steps/RuM/extraction/constants.js";

import {
	assertChildHasQueryShape,
	assertLinkExcludeQueryShape,
	isDropDownLegacyHasQueryShape,
	assertDropDownLegacyHasQueryShape
} from "./query-shape-validator.js";

function createQueryModel(content: object): object {
	return createQueryModelWithHeader(content, { modelVersion: QUERY_MODEL_VERSION });
}

function createQueryModelWithHeader(content: object, header: object): object {
	return {
		header: {
			modelType: "query",
			...header
		},
		content
	};
}

function createQueryContentOnly(content: object): object {
	return { content };
}

function createExactMatchConstraint(documentModelId = "Contract-document"): object {
	return {
		operator: "exact_match",
		field: "/__meta/docRef",
		value: `\${${documentModelId}, [/__meta/docRef]}`
	};
}

function createHasConstraint(documentModelId = "Contract-document"): object {
	return {
		operator: "has",
		relationshipModel: "CoInsurer",
		targetRole: "contract",
		constraint: createExactMatchConstraint(documentModelId),
		maxDepth: 1
	};
}

function createBaseContent(overrides: object): object {
	return {
		targetDocumentModel: "Contract-document",
		projectionName: "document",
		paging: { pageNumber: 0, pageSize: 50 },
		links: [
			{
				relationshipModel: "CoInsurer",
				targetRole: "businessPartner",
				maxDepth: 1,
				constraint: createExactMatchConstraint()
			}
		],
		...overrides
	};
}

function createValidLinkQuery(): object {
	return createQueryModel(
		createBaseContent({
			exclude: true,
			constraint: createExactMatchConstraint(),
			links: [
				{
					relationshipModel: "CoInsurer",
					targetRole: "businessPartner",
					maxDepth: 1,
					constraint: createHasConstraint()
				}
			]
		})
	);
}

function createValidChildQuery(): object {
	return createQueryModel(createValidChildContent());
}

function createValidChildContent(): object {
	return createBaseContent({
		constraint: createHasConstraint(),
		links: [
			{
				relationshipModel: "CoInsurer",
				targetRole: "contract",
				maxDepth: 1,
				constraint: createExactMatchConstraint()
			}
		]
	});
}

function createDropDownLegacyHasQuery(): object {
	return createQueryModel(createDropDownLegacyHasContent());
}

function createDropDownLegacyHasContent(): object {
	return createBaseContent({
		paging: { pageNumber: 0, pageSize: 1 },
		constraint: createHasConstraint(),
		links: [
			{
				relationshipModel: "CoInsurer",
				targetRole: "contract",
				maxDepth: 1,
				constraint: createExactMatchConstraint()
			}
		]
	});
}

describe("query-shape-validator", () => {
	it("accepts a valid LINK/exclude query shape", () => {
		expect(() => assertLinkExcludeQueryShape(createValidLinkQuery())).not.toThrow();
	});

	it("rejects an invalid LINK/exclude query with a descriptive invariant", () => {
		const invalidLinkQuery = createQueryModel(createBaseContent({ constraint: createHasConstraint() }));

		expect(() => assertLinkExcludeQueryShape(invalidLinkQuery)).toThrow(
			"LINK/exclude invariant broken: content.exclude must be true"
		);
	});

	it("rejects full query shape assertions when the header is missing", () => {
		const queryContent = createBaseContent({
			exclude: true,
			constraint: createExactMatchConstraint(),
			links: [{ constraint: createHasConstraint() }]
		});

		expect(() => assertLinkExcludeQueryShape(createQueryContentOnly(queryContent))).toThrow(
			/query model header must be present/
		);
	});

	it("rejects full query shape assertions when header modelVersion is missing", () => {
		const queryWithoutVersion = createQueryModelWithHeader(createValidChildContent(), {});

		expect(() => assertChildHasQueryShape(queryWithoutVersion)).toThrow(/header\.modelVersion must be present/);
		expect(() =>
			assertDropDownLegacyHasQueryShape(createQueryModelWithHeader(createDropDownLegacyHasContent(), {}))
		).toThrow(/header\.modelVersion must be present/);
	});

	it("rejects full query shape assertions when header modelVersion is wrong", () => {
		const query = createQueryModelWithHeader(createValidChildContent(), { modelVersion: "0.0.0" });

		expect(() => assertChildHasQueryShape(query)).toThrow(
			`query version invariant broken: modelVersion must be ${QUERY_MODEL_VERSION}`
		);
	});

	it("accepts a valid CHILD/has query shape", () => {
		expect(() => assertChildHasQueryShape(createValidChildQuery())).not.toThrow();
	});

	it("rejects a LINK/exclude query in CHILD/has mode", () => {
		expect(() => assertChildHasQueryShape(createValidLinkQuery())).toThrow(
			"CHILD/has invariant broken: content.exclude must be absent"
		);
	});

	it("accepts the DropDown legacy-HAS exception in DropDown mode", () => {
		const query = createDropDownLegacyHasQuery();

		expect(isDropDownLegacyHasQueryShape(query)).toBe(true);
		expect(() => assertDropDownLegacyHasQueryShape(query)).not.toThrow();
	});

	it("rejects the DropDown legacy-HAS exception in non-DropDown CHILD mode", () => {
		expect(() => assertChildHasQueryShape(createDropDownLegacyHasQuery())).toThrow(
			"DropDown legacy-HAS query is only valid in DropDown mode"
		);
	});
});

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

import type { WorkspaceModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import { FORM_MODEL_VERSION } from "../../../../../../src/internal/steps/RuM/extraction/constants.js";
import { buildGlobalCandidatePageSizeMap } from "../../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/global-page-size-map.js";

interface BindingEntry {
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
}

describe("buildGlobalCandidatePageSizeMap", () => {
	it("uses the maximum candidate page size across forms for the same overview", () => {
		const result = buildGlobalCandidatePageSizeMap([
			createForm("form-a", [createRelationshipBinding("BundleProduct", "ProductCandidates-overview", 10)]),
			createForm("form-b", [createRelationshipBinding("ProductCategory", "ProductCandidates-overview", 50)])
		]);

		expect(result.get("ProductCandidates-overview")).toBe(50);
	});

	it("returns an empty map for forms without bindingConfiguration", () => {
		const result = buildGlobalCandidatePageSizeMap([
			{
				header: {
					id: "form-a",
					modelType: "form",
					modelVersion: FORM_MODEL_VERSION
				},
				path: "form-a.json"
			}
		]);

		expect(result.size).toBe(0);
	});

	it("skips malformed JSON in one form and still processes other forms", () => {
		const result = buildGlobalCandidatePageSizeMap([
			createFormWithAnnotation("form-a", "not valid json"),
			createForm("form-b", [createRelationshipBinding("BundleProduct", "ProductCandidates-overview", 25)])
		]);

		expect(result.get("ProductCandidates-overview")).toBe(25);
		expect(result.size).toBe(1);
	});
});

function createForm(id: string, bindings: ReadonlyArray<BindingEntry>): WorkspaceModel {
	return createFormWithAnnotation(id, JSON.stringify(bindings));
}

function createFormWithAnnotation(id: string, value: string): WorkspaceModel {
	return {
		header: {
			id,
			modelType: "form",
			modelVersion: FORM_MODEL_VERSION,
			annotations: [{ name: "bindingConfiguration", value }]
		},
		path: `${id}.json`
	};
}

function createRelationshipBinding(
	relationshipName: string,
	overviewId: string,
	candidatePageSize: number
): BindingEntry {
	return {
		type: "relationship",
		elementId: `${relationshipName}-binding`,
		details: {
			metaInformation: { version: "1.0.0" },
			name: `${relationshipName} Binding`,
			relationshipName,
			targetRole: "target",
			components: [
				{
					candidatePageSize,
					models: [{ use: "candidate", name: overviewId }]
				}
			]
		}
	};
}

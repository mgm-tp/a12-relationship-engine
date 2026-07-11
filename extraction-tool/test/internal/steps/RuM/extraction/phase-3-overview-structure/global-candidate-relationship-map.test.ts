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
import {
	shouldCloneCandidate,
	buildGlobalCandidateRelationshipMap
} from "../../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/global-candidate-relationship-map.js";

interface BindingModelRef {
	readonly use: string;
	readonly name: string;
}

interface BindingComponent {
	readonly name?: string;
	readonly models?: ReadonlyArray<BindingModelRef>;
}

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
		readonly components?: ReadonlyArray<BindingComponent> | null;
	};
}

describe("buildGlobalCandidateRelationshipMap", () => {
	it("returns true for two forms with different relationships referencing the same overview", () => {
		const result = buildGlobalCandidateRelationshipMap([
			createForm("form-a", [createRelationshipBinding("BundleProduct", "ProductCandidates-overview")]),
			createForm("form-b", [createRelationshipBinding("ProductCategory", "ProductCandidates-overview")])
		]);

		expect(Array.from(result.get("ProductCandidates-overview") ?? [])).toEqual(["BundleProduct", "ProductCategory"]);
		expect(shouldCloneCandidate("ProductCandidates-overview", result)).toBe(true);
	});

	it("returns false for one form with one relationship referencing an overview", () => {
		const result = buildGlobalCandidateRelationshipMap([
			createForm("form-a", [createRelationshipBinding("BundleProduct", "ProductCandidates-overview")])
		]);

		expect(Array.from(result.get("ProductCandidates-overview") ?? [])).toEqual(["BundleProduct"]);
		expect(shouldCloneCandidate("ProductCandidates-overview", result)).toBe(false);
	});

	it("returns true for one form with two relationships referencing the same overview", () => {
		const result = buildGlobalCandidateRelationshipMap([
			createForm("form-a", [
				createRelationshipBinding("BundleProduct", "ProductCandidates-overview"),
				createRelationshipBinding("ProductCategory", "ProductCandidates-overview")
			])
		]);

		expect(Array.from(result.get("ProductCandidates-overview") ?? [])).toEqual(["BundleProduct", "ProductCategory"]);
		expect(shouldCloneCandidate("ProductCandidates-overview", result)).toBe(true);
	});

	it("deduplicates the same relationship and returns false for one unique relationship", () => {
		const result = buildGlobalCandidateRelationshipMap([
			createForm("form-a", [
				createRelationshipBinding("BundleProduct", "ProductCandidates-overview"),
				createRelationshipBinding("BundleProduct", "ProductCandidates-overview")
			])
		]);

		expect(Array.from(result.get("ProductCandidates-overview") ?? [])).toEqual(["BundleProduct"]);
		expect(shouldCloneCandidate("ProductCandidates-overview", result)).toBe(false);
	});

	it("skips malformed bindingConfiguration annotations", () => {
		const result = buildGlobalCandidateRelationshipMap([
			createFormWithAnnotation("form-a", "not valid json"),
			createForm("form-b", [createRelationshipBinding("BundleProduct", "ProductCandidates-overview")])
		]);

		expect(Array.from(result.get("ProductCandidates-overview") ?? [])).toEqual(["BundleProduct"]);
		expect(result.size).toBe(1);
	});

	it("skips structurally malformed bindingConfiguration array entries", () => {
		const result = buildGlobalCandidateRelationshipMap([
			createFormWithAnnotation(
				"form-a",
				JSON.stringify([
					null,
					{ type: "relationship", details: null },
					{
						type: "relationship",
						elementId: "broken-null-components",
						details: { relationshipName: "Broken", components: null }
					},
					{
						type: "relationship",
						elementId: "broken-missing-fields",
						details: { relationshipName: "Broken", components: [{ models: null }] }
					},
					{
						type: "relationship",
						elementId: "broken-null-model-name",
						details: {
							metaInformation: { version: "1.0.0" },
							name: "Broken Binding",
							relationshipName: "Broken",
							targetRole: "target",
							components: [{ models: [{ use: "candidate", name: null }] }]
						}
					}
				])
			),
			createForm("form-b", [createRelationshipBinding("BundleProduct", "ProductCandidates-overview")])
		]);

		expect(Array.from(result.get("ProductCandidates-overview") ?? [])).toEqual(["BundleProduct"]);
		expect(result.size).toBe(1);
	});

	it("skips forms without bindingConfiguration annotations", () => {
		const result = buildGlobalCandidateRelationshipMap([
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

	it("skips non-relationship binding entries", () => {
		const result = buildGlobalCandidateRelationshipMap([
			createForm("form-a", [
				{
					type: "document",
					details: {
						relationshipName: "BundleProduct",
						components: [{ models: [{ use: "candidate", name: "ProductCandidates-overview" }] }]
					}
				}
			])
		]);

		expect(result.size).toBe(0);
	});

	it("adds DropDown-like relationship candidate bindings to the global map", () => {
		const result = buildGlobalCandidateRelationshipMap([
			createForm("form-a", [
				createRelationshipBinding("BundleProduct", "ProductCandidates-overview", { componentName: "DropDown" }),
				createRelationshipBinding("ProductCategory", "ProductCandidates-overview")
			])
		]);

		expect(Array.from(result.get("ProductCandidates-overview") ?? [])).toEqual(["BundleProduct", "ProductCategory"]);
		expect(shouldCloneCandidate("ProductCandidates-overview", result)).toBe(true);
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
	options?: { readonly componentName?: string }
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
					name: options?.componentName ?? "DualPane",
					models: [{ use: "candidate", name: overviewId }]
				}
			]
		}
	};
}

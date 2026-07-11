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

import {
	FORM_MODEL_VERSION,
	OVERVIEW_MODEL_VERSION
} from "../../../../../../src/internal/steps/RuM/extraction/constants.js";
import { forEachRelationshipBinding } from "../../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/binding-configuration-scanner.js";

interface BindingModelRef {
	readonly use: string;
	readonly name: string | null;
}

interface BindingComponent {
	readonly name?: string;
	readonly candidatePageSize?: number;
	readonly models?: ReadonlyArray<BindingModelRef> | null;
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
		readonly components?: ReadonlyArray<BindingComponent | null> | null;
	};
}

describe("forEachRelationshipBinding", () => {
	it("skips malformed JSON and continues scanning later forms", () => {
		const relationshipNames: string[] = [];

		forEachRelationshipBinding(
			[
				createFormWithAnnotation("form-a", "not valid json"),
				createForm("form-b", [createRelationshipBinding("BundleProduct", "ProductCandidates-overview")])
			],
			(binding) => {
				relationshipNames.push(binding.relationshipName);
			}
		);

		expect(relationshipNames).toEqual(["BundleProduct"]);
	});

	it("skips malformed annotation entries until it finds a string binding configuration", () => {
		const relationshipNames: string[] = [];

		forEachRelationshipBinding(
			[
				createFormWithAnnotations("form-a", [
					null,
					"bindingConfiguration",
					{ name: "bindingConfiguration", value: 42 },
					{
						name: "bindingConfiguration",
						value: JSON.stringify([createRelationshipBinding("BundleProduct", "ProductCandidates-overview")])
					}
				])
			],
			(binding) => {
				relationshipNames.push(binding.relationshipName);
			}
		);

		expect(relationshipNames).toEqual(["BundleProduct"]);
	});

	it("skips non-relationship and malformed binding entries", () => {
		const relationshipNames: string[] = [];

		forEachRelationshipBinding(
			[
				createForm("form-a", [
					{ type: "document", details: { relationshipName: "Ignored", components: [] } },
					{ type: "relationship" } as BindingEntry,
					{
						type: "relationship",
						elementId: "binding-broken",
						details: { relationshipName: "Broken", components: null }
					},
					createMinimalRelationshipBinding("BundleProduct", "ProductCandidates-overview")
				])
			],
			(binding) => {
				relationshipNames.push(binding.relationshipName);
			}
		);

		expect(relationshipNames).toEqual(["BundleProduct"]);
	});

	it("scans minimal relationship bindings without unrelated legacy binding-model fields", () => {
		const visitedBindings: Array<{
			readonly relationshipName: string;
			readonly componentTypes: readonly string[];
			readonly modelNames: readonly string[];
		}> = [];

		forEachRelationshipBinding(
			[createForm("form-a", [createMinimalRelationshipBinding("BundleProduct", "ProductCandidates-overview")])],
			(binding) => {
				visitedBindings.push({
					relationshipName: binding.relationshipName,
					componentTypes: binding.components.flatMap((component) =>
						typeof component.componentType === "string" ? [component.componentType] : []
					),
					modelNames: binding.components.flatMap(
						(component) => component.models?.map((modelRef) => modelRef.name) ?? []
					)
				});
			}
		);

		expect(visitedBindings).toEqual([
			{
				relationshipName: "BundleProduct",
				componentTypes: ["DualPane"],
				modelNames: ["ProductCandidates-overview"]
			}
		]);
	});

	it("visits relationship bindings in form declaration order across all forms", () => {
		const visited = new Map<string, readonly string[]>();

		forEachRelationshipBinding(
			[
				createOverviewModel("overview-a"),
				createForm("form-a", [
					createRelationshipBinding("BundleProduct", "ProductCandidates-overview"),
					createRelationshipBinding("ProductCategory", "CategoryCandidates-overview")
				]),
				createForm("form-b", [createRelationshipBinding("Location", "LocationCandidates-overview")])
			],
			(binding) => {
				visited.set(
					binding.relationshipName,
					binding.components.flatMap(
						(component) =>
							component.models?.filter((modelRef) => modelRef.use === "candidate").map((modelRef) => modelRef.name) ??
							[]
					)
				);
			}
		);

		expect(Array.from(visited.keys())).toEqual(["BundleProduct", "ProductCategory", "Location"]);
		expect(visited.get("BundleProduct")).toEqual(["ProductCandidates-overview"]);
		expect(visited.get("ProductCategory")).toEqual(["CategoryCandidates-overview"]);
		expect(visited.get("Location")).toEqual(["LocationCandidates-overview"]);
	});

	it("filters malformed components and candidate model refs without failing", () => {
		const visitedBindings: Array<{
			readonly relationshipName: string;
			readonly componentCount: number;
			readonly modelNames: readonly string[];
		}> = [];

		forEachRelationshipBinding(
			[
				createForm("form-a", [
					{
						type: "relationship",
						elementId: "binding-1",
						details: {
							metaInformation: { version: "1.0.0" },
							name: "Bundle Product Binding",
							relationshipName: "BundleProduct",
							targetRole: "product",
							components: [
								null,
								{ name: "DualPane", models: null },
								{
									name: "DualPane",
									candidatePageSize: 25,
									models: [
										{ use: "candidate", name: null },
										{ use: "candidate", name: "ProductCandidates-overview" }
									]
								}
							]
						}
					}
				])
			],
			(binding) => {
				visitedBindings.push({
					relationshipName: binding.relationshipName,
					componentCount: binding.components.length,
					modelNames: binding.components.flatMap(
						(component) => component.models?.map((modelRef) => modelRef.name) ?? []
					)
				});
			}
		);

		expect(visitedBindings).toEqual([
			{
				relationshipName: "BundleProduct",
				componentCount: 2,
				modelNames: ["ProductCandidates-overview"]
			}
		]);
	});
});

function createOverviewModel(id: string): WorkspaceModel {
	return {
		header: {
			id,
			modelType: "overview",
			modelVersion: OVERVIEW_MODEL_VERSION
		},
		path: `${id}.json`
	};
}

function createForm(id: string, bindings: ReadonlyArray<BindingEntry>): WorkspaceModel {
	return createFormWithAnnotation(id, JSON.stringify(bindings));
}

function createFormWithAnnotation(id: string, value: string): WorkspaceModel {
	return createFormWithAnnotations(id, [{ name: "bindingConfiguration", value }]);
}

function createFormWithAnnotations(id: string, annotations: readonly unknown[]): WorkspaceModel {
	return {
		header: {
			id,
			modelType: "form",
			modelVersion: FORM_MODEL_VERSION,
			annotations
		},
		path: `${id}.json`
	};
}

function createRelationshipBinding(relationshipName: string, overviewId: string): BindingEntry {
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
					name: "DualPane",
					models: [{ use: "candidate", name: overviewId }]
				}
			]
		}
	};
}

function createMinimalRelationshipBinding(relationshipName: string, overviewId: string): BindingEntry {
	return {
		type: "relationship",
		details: {
			relationshipName,
			components: [
				{
					name: "DualPane",
					models: [{ use: "candidate", name: overviewId }]
				}
			]
		}
	};
}

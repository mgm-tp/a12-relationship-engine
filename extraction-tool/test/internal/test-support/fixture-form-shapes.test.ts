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

import type { GenericModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import { loadFixtureModel } from "./fixture-context-factory.js";

const FORM_FIXTURE_PATHS = [
	"products/ProductBrand/form.json",
	"products/ProductBundle/form.json",
	"products/CategoryCategory/form.json",
	"scdm/DetachedRepeat/form.json",
	"scdm/ModificationConfig/form.json",
	"scdm/PolicyHolder/form.json"
] as const;

describe("fixture form shapes", () => {
	it("resolve every bindingConfiguration elementId to committed form content", () => {
		for (const fixturePath of FORM_FIXTURE_PATHS) {
			const formModel = loadFixtureModel(fixturePath);
			const bindings = readBindingConfiguration(formModel);
			const elementIds = collectElementIds(readContent(formModel));

			for (const binding of bindings) {
				expect(elementIds, `${fixturePath} must contain ${binding.elementId}`).toContain(binding.elementId);
			}
		}
	});

	it("place SCDM modificationConfiguration on binding details with legacy activityDescriptor shape", () => {
		const modificationConfigBinding = readBindingConfiguration(
			loadFixtureModel("scdm/ModificationConfig/form.json")
		)[0];
		const policyHolderBinding = readBindingConfiguration(loadFixtureModel("scdm/PolicyHolder/form.json"))[0];

		expect(modificationConfigBinding.details.modificationConfiguration).toEqual({
			extendParentActivityDescriptor: true,
			activityDescriptor: { activity: "beneficiary-maintenance" }
		});
		expect(modificationConfigBinding.details.components[0]?.props?.modificationConfiguration).toBeUndefined();
		expect(policyHolderBinding.details.modificationConfiguration).toEqual({
			addButtonLabel: [
				{ locale: "en", text: "Add policy holder" },
				{ locale: "de", text: "Versicherungsnehmer hinzufügen" }
			]
		});
		expect(policyHolderBinding.details.components[0]?.props?.modificationConfiguration).toBeUndefined();
	});

	it("keep DetachedRepeat detailScreen.screenElements present for reference restoration recursion", () => {
		const formModel = loadFixtureModel("scdm/DetachedRepeat/form.json");
		const detachedRepeat = findElement(readContent(formModel), "detached-repeat-items");

		expect(detachedRepeat?.detailScreen?.screenElements).toEqual([]);
	});
});

interface BindingConfiguration {
	readonly elementId: string;
	readonly details: BindingDetails;
}

interface BindingDetails {
	readonly modificationConfiguration?: unknown;
	readonly components: readonly BindingComponent[];
}

interface BindingComponent {
	readonly props?: { readonly modificationConfiguration?: unknown };
}

interface FixtureHeader {
	readonly id: string;
	readonly annotations?: readonly FixtureAnnotation[];
}

interface FixtureAnnotation {
	readonly name: string;
	readonly value: string;
}

interface TraversalElement {
	readonly id?: string;
	readonly screenElements?: readonly TraversalElement[];
	readonly elements?: readonly TraversalElement[];
	readonly sections?: readonly TraversalElement[];
	readonly screens?: readonly TraversalElement[];
	readonly detailScreen?: { readonly screenElements?: readonly TraversalElement[] };
}

function readBindingConfiguration(model: GenericModel): readonly BindingConfiguration[] {
	const header = (model as { readonly header?: FixtureHeader }).header;
	const annotation = header?.annotations?.find((candidate) => candidate.name === "bindingConfiguration");

	if (annotation === undefined) {
		throw new Error(`${header?.id ?? "fixture"} must contain bindingConfiguration`);
	}

	const parsed: unknown = JSON.parse(annotation.value);

	if (!Array.isArray(parsed) || !parsed.every(isBindingConfiguration)) {
		throw new Error(`${header?.id ?? "fixture"} bindingConfiguration has unexpected shape`);
	}

	return parsed;
}

function isBindingConfiguration(value: unknown): value is BindingConfiguration {
	return isRecord(value) && typeof value.elementId === "string" && isBindingDetails(value.details);
}

function isBindingDetails(value: unknown): value is BindingDetails {
	return isRecord(value) && Array.isArray(value.components);
}

function readContent(model: GenericModel): TraversalElement {
	const content = (model as { readonly content?: unknown }).content;

	if (!isRecord(content)) {
		throw new Error("Fixture form must contain object content");
	}

	return content;
}

function collectElementIds(root: TraversalElement): readonly string[] {
	return collectElements(root).flatMap(function mapElementId(element) {
		return element.id === undefined ? [] : [element.id];
	});
}

function findElement(root: TraversalElement, elementId: string): TraversalElement | undefined {
	return collectElements(root).find((element) => element.id === elementId);
}

function collectElements(root: TraversalElement): readonly TraversalElement[] {
	const nested = [root.screens, root.screenElements, root.elements, root.sections, root.detailScreen?.screenElements]
		.filter(isTraversalElementArray)
		.flatMap(function collectNested(elements) {
			return elements.flatMap(function collectOne(element): readonly TraversalElement[] {
				return [element, ...collectElements(element)];
			});
		});

	return nested;
}

function isTraversalElementArray(value: unknown): value is readonly TraversalElement[] {
	return Array.isArray(value) && value.every(isRecord);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

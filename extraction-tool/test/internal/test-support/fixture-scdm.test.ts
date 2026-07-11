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

import type { ModelHeader, GenericModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import {
	FORM_MODEL_VERSION,
	OVERVIEW_MODEL_VERSION,
	RELATIONSHIP_MODEL_VERSION
} from "../../../src/internal/steps/RuM/extraction/constants.js";

import { loadFixtureModel, createFixtureContext } from "./fixture-context-factory.js";

const SCDM_FIXTURE_PATHS = [
	"scdm/DetachedRepeat/form.json",
	"scdm/DetachedRepeat/relationship.json",
	"scdm/ModificationConfig/form.json",
	"scdm/ModificationConfig/relationship.json",
	"scdm/ModificationConfig/overview-selected.json",
	"scdm/PolicyHolder/form.json",
	"scdm/PolicyHolder/relationship.json",
	"scdm/PolicyHolder/overview-available.json"
] as const;

const SCDM_FORM_PATHS = [
	"scdm/DetachedRepeat/form.json",
	"scdm/ModificationConfig/form.json",
	"scdm/PolicyHolder/form.json"
] as const;

describe("SCDM fixtures", () => {
	it("load all committed SCDM fixtures through the fixture context factory", () => {
		const harness = createFixtureContext({ fixturePaths: SCDM_FIXTURE_PATHS });
		const workspaceModels = harness.context.workspace?.models ?? [];

		expect(workspaceModels).toHaveLength(SCDM_FIXTURE_PATHS.length);
		expect(workspaceModels.map((model) => model.header.id)).toEqual([
			"DetachedRepeat-form",
			"DetachedPolicyItem",
			"ModificationConfig-form",
			"PolicyBeneficiary",
			"PolicyBeneficiary_SelectedItemsOverview",
			"PolicyHolder-form",
			"PolicyHolder",
			"PolicyHolder_AvailableItemsOverview"
		]);
	});

	it("use documented fixture model versions", () => {
		const versionsByType = new Map([
			["form", FORM_MODEL_VERSION],
			["overview", OVERVIEW_MODEL_VERSION],
			["relationship", RELATIONSHIP_MODEL_VERSION]
		]);

		for (const fixturePath of SCDM_FIXTURE_PATHS) {
			const header = getHeader(loadFixtureModel(fixturePath));
			const expectedVersion = versionsByType.get(header.modelType);

			expect(header.modelVersion, fixturePath).toBe(expectedVersion);
		}
	});

	it("align binding element IDs with committed form host elements", () => {
		for (const fixturePath of SCDM_FORM_PATHS) {
			const form = loadFixtureModel(fixturePath);
			const elementIds = getBindingElementIds(form);
			const contentIds = collectIds((form as { readonly content?: unknown }).content);

			for (const elementId of elementIds) {
				expect(contentIds, `${fixturePath} missing host element ${elementId}`).toContain(elementId);
			}
		}
	});

	it("keeps DetachedRepeat detailScreen present for element-reference recursion", () => {
		const detachedRepeat = findContentRecord(
			loadFixtureModel("scdm/DetachedRepeat/form.json"),
			"detached-repeat-items"
		);

		expect(detachedRepeat.detailScreen).toEqual({
			id: "detached-repeat-items-detail",
			name: "Detail",
			screenElements: []
		});
	});

	it("places modificationConfiguration on binding details with legacy-compatible values", () => {
		const modificationConfigBinding = getBindingConfiguration(loadFixtureModel("scdm/ModificationConfig/form.json"))[0];
		const policyHolderBinding = getBindingConfiguration(loadFixtureModel("scdm/PolicyHolder/form.json"))[0];

		expect(modificationConfigBinding.details.modificationConfiguration).toEqual({
			extendParentActivityDescriptor: true,
			activityDescriptor: { activity: "beneficiary-maintenance" }
		});
		expect(modificationConfigBinding.details.components[0]?.props).toBeUndefined();
		expect(policyHolderBinding.details.modificationConfiguration).toEqual({
			addButtonLabel: [
				{ locale: "en", text: "Add policy holder" },
				{ locale: "de", text: "Versicherungsnehmer hinzufügen" }
			]
		});
		expect(policyHolderBinding.details.components[0]?.props).toBeUndefined();
	});
});

interface BindingConfiguration {
	readonly elementId: string;
	readonly details: BindingDetails;
}

interface BindingDetails {
	readonly components: readonly BindingComponent[];
	readonly modificationConfiguration?: unknown;
}

interface BindingComponent {
	readonly props?: unknown;
}

function getHeader(model: GenericModel): ModelHeader {
	const header = (model as { readonly header?: unknown }).header;

	if (!isModelHeader(header)) {
		throw new Error("SCDM fixture model must have a valid header");
	}

	return header;
}

function getBindingElementIds(model: GenericModel): readonly string[] {
	return getBindingConfiguration(model).map((binding) => binding.elementId);
}

function getBindingConfiguration(model: GenericModel): readonly BindingConfiguration[] {
	const annotations =
		(model as { readonly header?: { readonly annotations?: readonly unknown[] } }).header?.annotations ?? [];
	const bindingAnnotation = annotations.find(isBindingConfigurationAnnotation);

	if (!bindingAnnotation) {
		throw new Error(`${getHeader(model).id} must include a bindingConfiguration annotation`);
	}

	return JSON.parse(bindingAnnotation.value) as readonly BindingConfiguration[];
}

function findContentRecord(model: GenericModel, id: string): Record<string, unknown> {
	const matchingRecord = collectRecords((model as { readonly content?: unknown }).content).find(
		(record) => record.id === id
	);

	if (!matchingRecord) {
		throw new Error(`${getHeader(model).id} missing content element ${id}`);
	}

	return matchingRecord;
}

function collectIds(value: unknown): readonly string[] {
	return collectRecords(value)
		.map((record) => record.id)
		.filter((id): id is string => typeof id === "string");
}

function collectRecords(value: unknown): readonly Record<string, unknown>[] {
	const records: Record<string, unknown>[] = [];
	collectRecordsInto(value, records);

	return records;
}

function collectRecordsInto(value: unknown, records: Record<string, unknown>[]): void {
	if (Array.isArray(value)) {
		for (const item of value) {
			collectRecordsInto(item, records);
		}
	}

	if (isRecord(value)) {
		records.push(value);

		for (const nested of Object.values(value)) {
			collectRecordsInto(nested, records);
		}
	}
}

function isBindingConfigurationAnnotation(value: unknown): value is { readonly name: string; readonly value: string } {
	return isRecord(value) && value.name === "bindingConfiguration" && typeof value.value === "string";
}

function isModelHeader(value: unknown): value is ModelHeader {
	return (
		isRecord(value) &&
		typeof value.id === "string" &&
		typeof value.modelType === "string" &&
		typeof value.modelVersion === "string"
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

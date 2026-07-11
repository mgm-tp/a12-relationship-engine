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

/**
 * Extraction integration tests: CDM DetachedRepeat annotation extraction.
 *
 * Covers Task 2.11:
 * - DetachedRepeat element derives relationship-ui ref from annotation (P4 restores it)
 * - DetachedRepeat annotation preserved after extraction under keepModels
 * - RuM reference appears in form header modelReferences
 */

import { it, vi, expect, describe } from "vitest";

import type { GenericModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import { extractionTransform } from "../../src/internal/steps/RuM/extraction/index.js";
import { loadFixtureModel, createFixtureContext } from "../internal/test-support/fixture-context-factory.js";

import { isRecord } from "./fixture-utils.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Expected RuM id derived from form id + binding name normalization. */
const EXPECTED_RUM_ID = "DetachedRepeat-form-binding-DetachedPolicyItemBinding_RuM";

/** The DetachedRepeat element id in the fixture form content. */
const DETACHED_ELEMENT_ID = "detached-repeat-items";

/** Annotation name set on DetachedRepeat elements to reference a RuM. */
const RUM_ANNOTATION_KEY = "a12-relationship-ui-model-reference";

const POLICY_DOCUMENT_ID = "Policy-document";

// ---------------------------------------------------------------------------
// Fixture runner
// ---------------------------------------------------------------------------

interface DetachedRepeatResult {
	readonly updatedForm: GenericModel;
	readonly addedModels: readonly GenericModel[];
}

/** Runs extraction on the DetachedRepeat SCDM fixture with keepModels enabled. */
function runDetachedRepeatExtraction(): DetachedRepeatResult {
	const formModel = loadFixtureModel("scdm/DetachedRepeat/form.json");
	const harness = createFixtureContext({
		fixturePaths: ["scdm/DetachedRepeat/relationship.json"],
		// Added overview fixture — buildOverviewStructure now throws when a referenced overview is missing
		models: [makeDocumentModel(POLICY_DOCUMENT_ID), makeOverviewModel("DetachedPolicyItem_AvailableItemsOverview")],
		config: { keepModels: true }
	});
	const updatedForm = extractionTransform(formModel, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, harness.context);

	return { updatedForm, addedModels: harness.getAddedModels() };
}

function makeDocumentModel(id: string): GenericModel {
	return {
		header: { id, modelType: "document", modelVersion: "1.0.0" },
		content: { modelInfo: { name: id }, modelRoot: { rootGroups: [] } }
	} as unknown as GenericModel;
}

/** Minimal overview model fixture for workspace resolution. */
function makeOverviewModel(id: string): GenericModel {
	return {
		header: { id, modelType: "overview", modelVersion: "1.0.0", modelReferences: [] },
		content: { columns: [] }
	} as unknown as GenericModel;
}

// ---------------------------------------------------------------------------
// Inline helpers
// ---------------------------------------------------------------------------

/** Searches all top-level screen elements across all screens for the given id. */
function findScreenElement(form: GenericModel, elementId: string): Record<string, unknown> | undefined {
	const content = (form as { content?: unknown }).content;
	const screens = isRecord(content) && Array.isArray(content.screens) ? (content.screens as readonly unknown[]) : [];

	for (const screen of screens) {
		if (!isRecord(screen)) {
			continue;
		}

		const elements = Array.isArray(screen.screenElements) ? (screen.screenElements as readonly unknown[]) : [];

		for (const el of elements) {
			if (isRecord(el) && el.id === elementId) {
				return el;
			}
		}
	}

	return undefined;
}

/** Returns the string value of a named annotation on an element, or undefined. */
function getAnnotationValue(element: Record<string, unknown>, name: string): string | undefined {
	const annotations = Array.isArray(element.annotations) ? (element.annotations as readonly unknown[]) : [];
	const found = annotations.find((a) => isRecord(a) && a.name === name);

	return isRecord(found) && typeof found.value === "string" ? found.value : undefined;
}

/** Returns modelReference references matching a given purpose from a form's header. */
function getHeaderRefs(form: GenericModel, purpose: string): readonly string[] {
	const header = (form as { header?: unknown }).header;
	const modelRefs =
		isRecord(header) && Array.isArray((header as { modelReferences?: unknown }).modelReferences)
			? ((header as { modelReferences: unknown[] }).modelReferences as readonly unknown[])
			: [];

	return modelRefs.flatMap((ref) =>
		isRecord(ref) && ref.purpose === purpose && typeof ref.reference === "string" ? [ref.reference] : []
	);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CDM DetachedRepeat annotation extraction", () => {
	it("DetachedRepeat element derives relationship-ui ref from annotation", () => {
		const { updatedForm } = runDetachedRepeatExtraction();
		const element = findScreenElement(updatedForm, DETACHED_ELEMENT_ID);

		expect(element).toBeDefined();
		// This fixture's DetachedRepeat uses an authored name ('Detached policy items') and has no legacy
		// autogenerated title that matches the name, so no title-legacy assertion is required here.
		expect(getAnnotationValue(element!, RUM_ANNOTATION_KEY)).toBe(EXPECTED_RUM_ID);
	});

	it("DetachedRepeat annotation preserved after extraction", () => {
		const { updatedForm } = runDetachedRepeatExtraction();
		const element = findScreenElement(updatedForm, DETACHED_ELEMENT_ID);

		expect(element).toBeDefined();
		expect(getAnnotationValue(element!, RUM_ANNOTATION_KEY)).toBeDefined();
		expect(getAnnotationValue(element!, "relationshipUiReference")).toBeUndefined();
	});

	it("DetachedRepeat RuM reference appears in form header modelReferences", () => {
		const { updatedForm } = runDetachedRepeatExtraction();

		expect(getHeaderRefs(updatedForm, "relationship-ui")).toContain(EXPECTED_RUM_ID);
	});
});

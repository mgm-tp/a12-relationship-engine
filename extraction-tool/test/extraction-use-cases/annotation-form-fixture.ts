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

import { vi } from "vitest";

import type { GenericModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import { extractionTransform } from "../../src/internal/steps/RuM/extraction/index.js";
import { loadFixtureModel, createFixtureContext } from "../internal/test-support/fixture-context-factory.js";

import { isRecord } from "./fixture-utils.js";
import { minimalDocumentModel, minimalAvailableOverview } from "./category-category-fixture.js";

/** Minimal screen-element shape used by annotation consistency assertions. */
export interface ScreenElement {
	readonly type: string;
	readonly id?: string;
	readonly reference?: string;
	readonly annotations?: readonly { readonly name?: string; readonly value?: string }[];
	readonly screenElements?: readonly ScreenElement[];
	readonly detailScreen?: { readonly screenElements?: readonly ScreenElement[] };
}

/** Traverses all screen elements in all screens and returns the one matching the given id. */
export function findScreenElementById(form: GenericModel, elementId: string): ScreenElement | undefined {
	const content = isRecord(form) ? form.content : undefined;

	if (!isRecord(content)) {
		return undefined;
	}

	const screens = Array.isArray(content.screens) ? content.screens : [];

	for (const screen of screens) {
		const screenRecord = screen as Record<string, unknown>;
		const elements = Array.isArray(screenRecord.screenElements) ? (screenRecord.screenElements as ScreenElement[]) : [];
		const found = findElementInArray(elements, elementId);

		if (found !== undefined) {
			return found;
		}
	}

	return undefined;
}

function findElementInArray(elements: readonly ScreenElement[], elementId: string): ScreenElement | undefined {
	for (const element of elements) {
		if (element.id === elementId) {
			return element;
		}

		const childElements = element.screenElements ?? element.detailScreen?.screenElements ?? [];
		const found = findElementInArray(childElements, elementId);

		if (found !== undefined) {
			return found;
		}
	}

	return undefined;
}

/** Returns annotation entries from a form header. */
export function formAnnotations(form: GenericModel): ReadonlyArray<{ name?: string; value?: string }> {
	const header = isRecord(form) ? form.header : undefined;

	if (!isRecord(header)) {
		return [];
	}

	return Array.isArray(header.annotations) ? (header.annotations as Array<{ name?: string; value?: string }>) : [];
}

/** Returns modelReferences from a form header. */
export function formModelReferences(
	form: GenericModel
): ReadonlyArray<{ purpose?: string; modelType?: string; reference?: string }> {
	const header = isRecord(form) ? form.header : undefined;

	if (!isRecord(header)) {
		return [];
	}

	return Array.isArray(header.modelReferences)
		? (header.modelReferences as Array<{ purpose?: string; modelType?: string; reference?: string }>)
		: [];
}

/** Runs extraction for a DetachedRepeat form whose relationship-ui annotation uses the legacy name. */
export function runStaleDetachedRepeatAnnotationExtraction(): GenericModel {
	const form = createStaleAnnotationForm();
	const workspaceModels = [
		loadFixtureModel("scdm/DetachedRepeat/relationship.json"),
		form,
		minimalDocumentModel("Policy-document"),
		minimalDocumentModel("PolicyItem-document"),
		minimalAvailableOverview("DetachedPolicyItem_AvailableItemsOverview", "PolicyItem-document")
	];
	const harness = createFixtureContext({ models: workspaceModels, config: { keepModels: true } });

	return extractionTransform(form, { log: vi.fn(), info: vi.fn(), error: vi.fn() }, harness.context);
}

function createStaleAnnotationForm(): GenericModel {
	const form = structuredClone(loadFixtureModel("scdm/DetachedRepeat/form.json")) as MutableForm;
	const screens = Array.isArray(form.content?.screens) ? form.content.screens : [];
	form.content.screens = screens.map((screen) => {
		const screenRecord = screen as Record<string, unknown>;

		return {
			...screenRecord,
			screenElements: Array.isArray(screenRecord.screenElements)
				? (screenRecord.screenElements as Record<string, unknown>[]).map(replaceAnnotationWithStale)
				: screenRecord.screenElements
		};
	});

	return form as unknown as GenericModel;
}

function replaceAnnotationWithStale(element: Record<string, unknown>): Record<string, unknown> {
	if (element.type !== "DetachedRepeat" || !Array.isArray(element.annotations)) {
		return element;
	}

	const annotations = (element.annotations as Array<{ name?: string; value?: string }>).map((annotation) =>
		annotation.name === "a12-relationship-ui-model-reference"
			? { name: "relationshipUiReference", value: annotation.value ?? "stale-rum-id" }
			: annotation
	);

	return { ...element, annotations };
}

interface MutableForm {
	content: { screens: unknown[] };
}

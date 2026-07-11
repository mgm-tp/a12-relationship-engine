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

import { ModelPath } from "@com.mgmtp.a12.base/base-model-api";
import {
	type FormModel,
	isFormModelScreenElement,
	isFormModelDetachedRepeat,
	isFormModelCustomScreenElement
} from "@com.mgmtp.a12.formengine/formengine-core";

import { RELATIONSHIP_UI_MODEL_REFERENCE_ANNOTATION } from "../../../models/index.js";

/**
 * Lightweight index for fast id-based lookups inside a FormModel.
 * Only screens, screen elements, repeats, rows, cells, controls and columns are indexed.
 * @internal
 */
export interface FormModelIndex {
	readonly byId: Record<string, IndexedFormModelNode | undefined>;
	/**
	 * Maps each element's id to the nearest ancestor DetachedRepeat element (if any).
	 * Used to find the groupRef for elements nested inside a DetachedRepeat (e.g. CustomScreenElement for dropdowns).
	 */
	readonly ancestorDetachedRepeatById: Record<string, FormModel.DetachedRepeat | undefined>;
	/**
	 * Maps a relationship UI model reference to the element's id.
	 * Supports both `CustomScreenElement.reference` (priority) and annotation values.
	 */
	readonly elementIdByUiModelId: Record<string, string | undefined>;
	/** Maps each element's id to its serialized ModelPath string. */
	readonly pathById: Record<string, string | undefined>;
}

type IndexedFormModelNode =
	| FormModel.Screen
	| FormModel.ScreenElement
	| FormModel.Row
	| FormModel.CellType
	| FormModel.RepeatOverviewColumn;

/**
 * Builds an index for a given FormModel. Safe to call multiple times; no mutation of the original model.
 */
export function buildFormModelIndex(formModel: FormModel): FormModelIndex {
	const byId: Record<string, IndexedFormModelNode> = {};
	const ancestorDetachedRepeatById: Record<string, FormModel.DetachedRepeat> = {};
	const elementIdByUiModelId: Record<string, string> = {};
	const uiModelIdMatchKindById: Record<string, "reference" | "annotation"> = {};
	const pathById: Record<string, string> = {};

	for (const screen of formModel.content.screens) {
		indexIfHasId(screen, undefined, []);
		const screenPath = getPathForIndexedNode(screen, []);

		for (const screenElement of screen.screenElements ?? []) {
			traverseScreenElement(screenElement, undefined, screenPath);
		}
	}

	function indexIfHasId(
		obj: IndexedFormModelNode,
		currentAncestorRepeat: FormModel.DetachedRepeat | undefined,
		currentPath: ModelPath
	): void {
		if (obj.id.length === 0) {
			return;
		}

		byId[obj.id] = obj;
		pathById[obj.id] = ModelPath.toString(getPathForIndexedNode(obj, currentPath));

		if (currentAncestorRepeat) {
			ancestorDetachedRepeatById[obj.id] = currentAncestorRepeat;
		}

		const customScreenElementUiModelRef = getRelationshipUiModelReference(obj);
		const annotations = obj.annotations;

		if (customScreenElementUiModelRef !== undefined) {
			setUiModelIdMatch(customScreenElementUiModelRef, obj.id, "reference");
		}

		if (Array.isArray(annotations)) {
			for (const annotation of annotations) {
				if (annotation.name === RELATIONSHIP_UI_MODEL_REFERENCE_ANNOTATION && annotation.value) {
					setUiModelIdMatch(annotation.value, obj.id, "annotation");
					break;
				}
			}
		}
	}

	function setUiModelIdMatch(uiModelId: string, elementId: string, matchKind: "reference" | "annotation"): void {
		const existingMatchKind = uiModelIdMatchKindById[uiModelId];

		if (existingMatchKind === "reference" && matchKind === "annotation") {
			return;
		}

		elementIdByUiModelId[uiModelId] = elementId;
		uiModelIdMatchKindById[uiModelId] = matchKind;
	}

	function traverseScreenElement(
		element: FormModel.ScreenElement,
		currentAncestorRepeat: FormModel.DetachedRepeat | undefined,
		currentPath: ModelPath
	): void {
		const nextAncestorRepeat = isFormModelDetachedRepeat(element) ? element : currentAncestorRepeat;

		indexIfHasId(element, currentAncestorRepeat, currentPath);
		const elementPath = getPathForIndexedNode(element, currentPath);

		switch (element.type) {
			case "Section":
			case "MultiColumnSection":
				traverseScreenElements(element.screenElements, nextAncestorRepeat, elementPath);
				break;
			case "ControlGrid":
				traverseRows(element.row, nextAncestorRepeat, elementPath);
				break;
			case "DetachedRepeat":
				traverseRepeatOverviewColumns(element.repeatOverviewColumn, nextAncestorRepeat, elementPath);
				traverseScreenElements(element.detailScreen.screenElements, nextAncestorRepeat, elementPath);
				break;
			case "EmbeddedRepeat":
				traverseRepeatOverviewColumns(element.repeatOverviewColumn, nextAncestorRepeat, elementPath);
				traverseRows(element.controlGrid.row, nextAncestorRepeat, elementPath);
				break;
			case "InlineRepeat":
				traverseRepeatOverviewColumns(element.repeatOverviewColumn, nextAncestorRepeat, elementPath);
				break;
			case "ButtonPanel":
			case "CustomScreenElement":
				break;
		}
	}

	function traverseScreenElements(
		elements: ReadonlyArray<FormModel.ScreenElement> | undefined,
		currentAncestorRepeat: FormModel.DetachedRepeat | undefined,
		currentPath: ModelPath
	): void {
		for (const element of elements ?? []) {
			traverseScreenElement(element, currentAncestorRepeat, currentPath);
		}
	}

	function traverseRows(
		rows: ReadonlyArray<FormModel.Row> | undefined,
		currentAncestorRepeat: FormModel.DetachedRepeat | undefined,
		currentPath: ModelPath
	): void {
		for (const row of rows ?? []) {
			indexIfHasId(row, currentAncestorRepeat, currentPath);
			const rowPath = getPathForIndexedNode(row, currentPath);

			for (const cell of row.cell ?? []) {
				indexIfHasId(cell, currentAncestorRepeat, rowPath);
			}
		}
	}

	function traverseRepeatOverviewColumns(
		columns: ReadonlyArray<FormModel.RepeatOverviewColumn> | undefined,
		currentAncestorRepeat: FormModel.DetachedRepeat | undefined,
		currentPath: ModelPath
	): void {
		for (const column of columns ?? []) {
			indexIfHasId(column, currentAncestorRepeat, currentPath);
		}
	}

	return { byId, ancestorDetachedRepeatById, elementIdByUiModelId, pathById };
}

/**
 * Convenience lookup by id. Returns undefined if not found.
 */
export function findFormElementById(formModel: FormModel, id: string): IndexedFormModelNode | undefined {
	return buildFormModelIndex(formModel).byId[id];
}

/**
 * Resolves the form model path (as a ModelPath string) for the element identified by `elementId`.
 * Returns null when no matching element is found in the given form model.
 */
export function findFormModelElementPath(formModel: FormModel, elementId: string): string | null {
	return buildFormModelIndex(formModel).pathById[elementId] ?? null;
}

/**
 * Finds a form element by relationship UI model reference.
 * Supports `CustomScreenElement.reference` (first) and annotation matches (fallback).
 * Returns the element or undefined if not found.
 */
export function findFormElementByUiModelId(
	formModel: FormModel,
	uiModelId: string
): FormModel.ScreenElement | undefined {
	const index = buildFormModelIndex(formModel);
	const elementId = index.elementIdByUiModelId[uiModelId];
	const element = elementId !== undefined ? index.byId[elementId] : undefined;

	return isFormModelScreenElement(element) ? element : undefined;
}

function getRelationshipUiModelReference(element: unknown): string | undefined {
	if (!isFormModelCustomScreenElement(element)) {
		return undefined;
	}

	return element.reference && element.reference.length > 0 ? element.reference : undefined;
}

function getPathForIndexedNode(element: IndexedFormModelNode, currentPath: ModelPath): ModelPath {
	const pathSegmentName =
		"name" in element && typeof element.name === "string" && element.name.length > 0 ? element.name : element.id;

	return pathSegmentName.length > 0 ? [...currentPath, { elementName: pathSegmentName }] : currentPath;
}

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

import type { FormModel } from "../../../../../models/form-model.js";

/**
 * Restores references on a form model's screen elements after RuM extraction.
 */
export function restoreElementReferences(
	formModel: FormModel,
	referencesByElementId: ReadonlyMap<string, string>,
	logger: { warn: (message: string) => void } = noopLogger
): FormModel {
	if (referencesByElementId.size === 0) {
		return formModel;
	}

	const content = formModel.content;

	let updatedContent = content;
	let modified = false;

	for (const [elementId, rumId] of referencesByElementId) {
		const result = restoreReferenceInScreens(updatedContent.screens, elementId, rumId);

		if (result.changed) {
			updatedContent = { ...updatedContent, screens: result.screens };
			modified = true;
		}

		if (!result.found) {
			logger.warn(`Could not restore reference for form element '${elementId}' to RuM '${rumId}'`);
		}
	}

	if (!modified) {
		return formModel;
	}

	return {
		...formModel,
		content: updatedContent
	};
}

const noopLogger = {
	warn: () => undefined
};

interface ScreenRestoreResult {
	readonly screens: readonly FormModel.Screen[];
	readonly found: boolean;
	readonly changed: boolean;
}

interface ElementRestoreResult {
	readonly element: FormModel.ScreenElement;
	readonly found: boolean;
	readonly changed: boolean;
}

function restoreReferenceInScreens(
	screens: readonly FormModel.Screen[],
	elementId: string,
	rumId: string
): ScreenRestoreResult {
	let found = false;
	let changed = false;
	const updatedScreens = screens.map((screen) => {
		const result = restoreReferenceInElements(screen.screenElements, elementId, rumId);
		found ||= result.found;

		if (!result.changed) {
			return screen;
		}

		changed = true;

		return {
			...screen,
			screenElements: result.elements
		};
	});

	return {
		screens: changed ? updatedScreens : screens,
		found,
		changed
	};
}

function restoreReferenceInElements(
	elements: readonly FormModel.ScreenElement[],
	elementId: string,
	rumId: string
): {
	readonly elements: readonly FormModel.ScreenElement[];
	readonly found: boolean;
	readonly changed: boolean;
} {
	let found = false;
	let changed = false;
	const updatedElements = elements.map((element) => {
		const result = restoreReferenceInElement(element, elementId, rumId);
		found ||= result.found;

		if (!result.changed) {
			return element;
		}

		changed = true;

		return result.element;
	});

	return {
		elements: changed ? updatedElements : elements,
		found,
		changed
	};
}

function restoreReferenceInElement(
	element: FormModel.ScreenElement,
	elementId: string,
	rumId: string
): ElementRestoreResult {
	const directResult = restoreDirectReference(element, elementId, rumId);
	const childResult = restoreReferenceInChildElements(directResult.element, elementId, rumId);

	return {
		element: childResult.element,
		found: directResult.found || childResult.found,
		changed: directResult.changed || childResult.changed
	};
}

function restoreDirectReference(
	element: FormModel.ScreenElement,
	elementId: string,
	rumId: string
): ElementRestoreResult {
	if (element.id !== elementId) {
		return { element, found: false, changed: false };
	}

	const updatedElement = setElementReference(element, rumId);

	return {
		element: updatedElement,
		found: true,
		changed: updatedElement !== element
	};
}

function restoreReferenceInChildElements(
	element: FormModel.ScreenElement,
	elementId: string,
	rumId: string
): ElementRestoreResult {
	if (element.type === "Section" || element.type === "MultiColumnSection") {
		return restoreReferenceInSectionElement(element, elementId, rumId);
	}

	if (element.type === "DetachedRepeat") {
		return restoreReferenceInDetachedRepeat(element, elementId, rumId);
	}

	return { element, found: false, changed: false };
}

function restoreReferenceInSectionElement(
	element: FormModel.Section | FormModel.MultiColumnSection,
	elementId: string,
	rumId: string
): ElementRestoreResult {
	const elements = element.screenElements ?? [];
	const result = restoreReferenceInElements(elements, elementId, rumId);

	if (!result.changed) {
		return { element, found: result.found, changed: false };
	}

	return {
		element: {
			...element,
			screenElements: result.elements
		},
		found: result.found,
		changed: true
	};
}

function restoreReferenceInDetachedRepeat(
	element: FormModel.DetachedRepeat,
	elementId: string,
	rumId: string
): ElementRestoreResult {
	const result = restoreReferenceInElements(element.detailScreen.screenElements, elementId, rumId);

	if (!result.changed) {
		return { element, found: result.found, changed: false };
	}

	return {
		element: {
			...element,
			detailScreen: {
				...element.detailScreen,
				screenElements: result.elements
			}
		},
		found: result.found,
		changed: true
	};
}

/**
 * Detects whether an element title was likely autogenerated from the binding configuration name.
 *
 * A legacy-generated title pattern can be identified when it is multilingual and every locale entry
 * is identical to the element name. This is considered lower-risk cleanup than blindly stripping
 * titles, because authored labels (including Expression titles or mixed locale values) are preserved.
 */
function isLegacyAutogeneratedTitle(element: FormModel.BasicScreenElement): boolean {
	if (element.title === undefined) {
		return false;
	}

	if (element.title.type !== "Multilingual") {
		return false;
	}

	const localeTexts = element.title.multilingualText.text;

	if (localeTexts === undefined || localeTexts.length === 0) {
		return false;
	}

	return localeTexts.every((entry) => entry.text === element.name);
}

function setElementReference(element: FormModel.ScreenElement, rumId: string): FormModel.ScreenElement {
	if (element.type === "CustomScreenElement") {
		const withRef = element.reference !== rumId ? { ...element, reference: rumId } : element;
		const withCleanedTitle = isLegacyAutogeneratedTitle(withRef) ? { ...withRef, title: undefined } : withRef;

		return withCleanedTitle === element ? element : withCleanedTitle;
	}

	if (element.type === "DetachedRepeat") {
		const withAnnotation = setDetachedRepeatAnnotation(element, rumId);
		const withCleanedTitle = isLegacyAutogeneratedTitle(withAnnotation)
			? { ...withAnnotation, title: undefined }
			: withAnnotation;

		return withCleanedTitle === element ? element : withCleanedTitle;
	}

	return element;
}

function setDetachedRepeatAnnotation(element: FormModel.DetachedRepeat, rumId: string): FormModel.DetachedRepeat {
	const rumAnnotationKey = "a12-relationship-ui-model-reference";
	const annotations = element.annotations ?? [];
	const existingAnnotation = annotations.find((annotation) => annotation.name === rumAnnotationKey);

	if (existingAnnotation?.value === rumId) {
		return element;
	}

	const nextAnnotation = { name: rumAnnotationKey, value: rumId };
	const nextAnnotations = annotations.filter((annotation) => annotation.name !== rumAnnotationKey);

	return {
		...element,
		annotations: [...nextAnnotations, nextAnnotation]
	};
}

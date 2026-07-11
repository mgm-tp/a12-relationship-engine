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

import type { LocalizedModelText } from "@com.mgmtp.a12.utils/utils-localization";
import type { GenericModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import { isFormModel } from "../model-accessors/type-guards.js";
import type { FormModel } from "../../../../../models/form-model.js";
import { isValidLocalizedModelText } from "../model-accessors/localization-helpers.js";

interface MultilingualTitleCandidate {
	readonly type?: unknown;
	readonly multilingualText?: unknown;
}

interface MultilingualTextCandidate {
	readonly text?: unknown;
}

function isMultilingualTitleCandidate(value: unknown): value is MultilingualTitleCandidate {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return false;
	}

	if (Reflect.get(value, "type") !== "Multilingual") {
		return false;
	}

	const multilingualText = Reflect.get(value, "multilingualText");

	return multilingualText === undefined || isMultilingualTextCandidate(multilingualText);
}

function isMultilingualTextCandidate(value: unknown): value is MultilingualTextCandidate {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return false;
	}

	return true;
}

function readTitleAsLocalizedText(title: unknown): LocalizedModelText | undefined {
	if (!isMultilingualTitleCandidate(title) || !title.multilingualText) {
		return undefined;
	}

	const multilingualText = title.multilingualText;

	if (!isMultilingualTextCandidate(multilingualText)) {
		return undefined;
	}

	return isValidLocalizedModelText(multilingualText.text) ? multilingualText.text : undefined;
}

function getScreenElements(screen: unknown): readonly FormModel.ScreenElement[] {
	if (screen === null || typeof screen !== "object" || Array.isArray(screen)) {
		return [];
	}

	const screenElements = Reflect.get(screen, "screenElements");

	return Array.isArray(screenElements) ? (screenElements as readonly FormModel.ScreenElement[]) : [];
}

function findElementById(
	elementId: string,
	elements: readonly FormModel.ScreenElement[]
): FormModel.ScreenElement | undefined {
	for (const element of elements) {
		if (element.id === elementId) {
			return element;
		}

		if (element.type === "Section" || element.type === "MultiColumnSection") {
			const foundInSection = findElementById(elementId, element.screenElements ?? []);

			if (foundInSection !== undefined) {
				return foundInSection;
			}
		}

		if (element.type === "DetachedRepeat") {
			const foundInDetailScreen = findElementById(elementId, element.detailScreen.screenElements);

			if (foundInDetailScreen !== undefined) {
				return foundInDetailScreen;
			}
		}
	}

	return undefined;
}

/**
 * Extracts the host form element title for a binding element ID.
 */
export function extractDirectHostLabel(formModel: GenericModel, elementId: string): LocalizedModelText | undefined {
	if (elementId.length === 0) {
		return undefined;
	}

	if (!isFormModel(formModel) || !Array.isArray(formModel.content.screens)) {
		return undefined;
	}

	for (const screen of formModel.content.screens) {
		const hostElement = findElementById(elementId, getScreenElements(screen));

		if (hostElement !== undefined) {
			return readTitleAsLocalizedText(hostElement.title);
		}
	}

	return undefined;
}

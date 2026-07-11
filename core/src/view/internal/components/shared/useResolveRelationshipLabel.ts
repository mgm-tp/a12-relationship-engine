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

import React from "react";
import { useSelector } from "react-redux";

import { LocaleSelectors } from "@com.mgmtp.a12.client/client-core";
import type { LocalizedModelText } from "@com.mgmtp.a12.utils/utils-localization";
import type { Labels, RelationshipModel } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { type DocumentModel, DocumentServiceFactory } from "@com.mgmtp.a12.kernel/kernel-md-facade";

import { ModelSelectors } from "../../../../store/index.js";
import { pickLocalizedText } from "../../languages/index.js";
import type { RelationshipUiModel } from "../../../../models/index.js";

const documentServiceFactory = new DocumentServiceFactory();

/** Resolves a relationship label by title, header, and target-role fallbacks. */
export function resolveRelationshipLabel(
	uiModel: RelationshipUiModel,
	relationshipModel: RelationshipModel | undefined,
	language: string,
	formElementTitle: LocalizedModelText | undefined
): string {
	return (
		pickLocalizedLabel(formElementTitle, language) ??
		pickLocalizedLabel(uiModel.header.labels, language) ??
		pickLocalizedLabel(getTargetRoleLabels(relationshipModel, uiModel.content.targetRole), language) ??
		""
	);
}

/** Resolves a label from a document model field referenced by an elementRef. */
export function resolveElementRefLabel(
	documentModel: DocumentModel,
	elementRef: string,
	language: string
): string | undefined {
	try {
		const searchService = documentServiceFactory.getDocumentModelSearchService(documentModel);
		const path = searchService.getPathById(elementRef);

		if (!path) {
			return undefined;
		}

		const element = searchService.getByPath(path);

		if (element?.type === "Field" && element.label) {
			return pickLocalizedText(element.label as LocalizedModelText, language);
		}
	} catch (_error) {
		return undefined;
	}

	return undefined;
}

/**
 * Resolves the generic relationship label.
 *
 * @internal
 */
export function useResolveRelationshipLabel(uiModel: RelationshipUiModel, activityId: string): string {
	const { language } = useSelector(LocaleSelectors.locale());
	const formElementTitle = useSelector(ModelSelectors.formElementTitle(activityId, uiModel.header.id));
	const relationshipModel = useSelector(ModelSelectors.relationshipModel(uiModel.content.relationshipName));

	return React.useMemo(
		() => resolveRelationshipLabel(uiModel, relationshipModel, language, formElementTitle),
		[uiModel, relationshipModel, language, formElementTitle]
	);
}

function getTargetRoleLabels(
	relationshipModel: RelationshipModel | undefined,
	targetRole: string
): LocalizedModelText | undefined {
	if (!relationshipModel) {
		return undefined;
	}

	const targetEntity = relationshipModel.content.entityCharacteristics.find((ec) => ec.role === targetRole);

	return normalizeLocalizedText(targetEntity?.labels);
}

function pickLocalizedLabel(labels: LocalizedModelText | undefined, language: string): string | undefined {
	if (!labels || labels.length === 0) {
		return undefined;
	}

	const text = pickLocalizedText(labels, language);

	return text && text.length > 0 ? text : undefined;
}

function normalizeLocalizedText(value: Labels[] | null | undefined): LocalizedModelText | undefined {
	if (value === null || value === undefined) {
		return undefined;
	}

	const labels = value.filter(
		(entry): entry is LocalizedModelText[number] => typeof entry.locale === "string" && typeof entry.text === "string"
	);

	return labels.length > 0 ? labels : undefined;
}

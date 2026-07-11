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

import type { OverviewModel } from "../../../../../../src/models/overview-model.js";
import { DOCUMENT_MODEL_VERSION } from "../../../../../../src/internal/steps/RuM/extraction/constants.js";
import { OVERVIEW_MODEL_VERSION } from "../../../../../../src/internal/steps/RuM/extraction/constants.js";
import type { ModelNotFoundError } from "../../../../../../src/internal/steps/RuM/extraction/model-not-found-error.js";
import type { OverviewContext } from "../../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/types.js";
import { remapOverviewWithGeneratedDoc } from "../../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/generated-doc-overview-remapper.js";

function createOverview(id: string, documentId: string): OverviewModel {
	return {
		header: {
			id,
			modelType: "overview",
			modelVersion: OVERVIEW_MODEL_VERSION,
			modelReferences: [
				{
					purpose: "document-model-for-overview",
					modelType: "document",
					reference: documentId
				}
			]
		},
		content: {
			configuration: {
				enableFilter: false
			},
			columns: [],
			rowActionGroup: {
				actions: []
			}
		}
	};
}

function createUnsupportedGeneratedDoc(id: string): object {
	return {
		header: {
			id,
			modelType: "document",
			modelVersion: DOCUMENT_MODEL_VERSION
		},
		content: {
			modelRoot: {
				rootGroups: []
			}
		}
	};
}

const firstContext: OverviewContext = {
	relationshipName: "CategoryChildCategory",
	targetRole: "ChildCategory",
	isLinkOverview: false,
	duplicatesAllowed: false
};

describe("remapOverviewWithGeneratedDoc errors", () => {
	it("throws for missing generated documents", () => {
		const overviewId = "MissingGeneratedDocOverview";

		expect(() =>
			remapOverviewWithGeneratedDoc({
				overview: createOverview(overviewId, "missing-generated-doc"),
				overviewId,
				genDocId: "missing-generated-doc",
				overviewContext: undefined,
				firstContext: undefined,
				resolveModel: () => undefined,
				keepModels: true,
				sourceDocumentModelId: undefined
			})
		).toThrowError(
			expect.objectContaining<Partial<ModelNotFoundError>>({
				name: "ModelNotFoundError",
				modelId: "missing-generated-doc"
			})
		);
	});

	it("throws for generated documents whose target document id remains unresolved", () => {
		const overviewId = "UnresolvableGeneratedDocOverview";
		const generatedDocId = `${overviewId}____generated`;
		// Added CategoryChildCategory with ChildCategory role having no documentModel so the
		// fallback target resolution returns undefined, causing the throw for the overview ID.
		const models = new Map<string, object>([
			[generatedDocId, createUnsupportedGeneratedDoc(generatedDocId)],
			[
				"CategoryChildCategory",
				{
					header: { id: "CategoryChildCategory", modelType: "relationship", modelVersion: "1.0.0" },
					content: {
						duplicatesAllowed: false,
						entityCharacteristics: [{ role: "ChildCategory" }, { role: "ParentCategory" }]
					}
				}
			]
		]);

		expect(() =>
			remapOverviewWithGeneratedDoc({
				overview: createOverview(overviewId, generatedDocId),
				overviewId,
				genDocId: generatedDocId,
				overviewContext: firstContext,
				firstContext,
				resolveModel: (modelId: string) => models.get(modelId),
				keepModels: true,
				sourceDocumentModelId: "Category-document"
			})
		).toThrowError(
			expect.objectContaining<Partial<ModelNotFoundError>>({
				name: "ModelNotFoundError",
				modelId: overviewId
			})
		);
	});
});

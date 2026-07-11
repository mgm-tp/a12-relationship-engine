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
import { ModelNotFoundError } from "../../../../../../src/internal/steps/RuM/extraction/model-not-found-error.js";
import {
	resolveSourceContextFromRelationship,
	getQueryBackedOverviewTargetDocumentModelId
} from "../../../../../../src/internal/steps/RuM/extraction/phase-3-overview-structure/relationship-content-resolver.js";

function createOverview(queryReference?: string): OverviewModel {
	return {
		header: {
			id: "Address-overview",
			modelType: "overview",
			modelVersion: "0.1.0",
			annotations: [],
			modelReferences:
				queryReference === undefined
					? []
					: [{ purpose: "query-model-for-overview", modelType: "query", reference: queryReference }]
		},
		content: {
			configuration: { enableFilter: false },
			columns: [],
			rowActionGroup: {}
		}
	} as OverviewModel;
}

function createRelationshipModel(
	entityCharacteristics: ReadonlyArray<{ role: string; documentModel: string }>
): object {
	return {
		header: {
			id: "PostAddress",
			modelType: "relationship",
			modelVersion: "0.1.0"
		},
		content: {
			duplicatesAllowed: false,
			entityCharacteristics: entityCharacteristics.map((characteristic) => ({
				...characteristic,
				ordered: false,
				linkConstraints: {
					multiplicity: {
						unbounded: true
					}
				}
			}))
		}
	};
}

describe("relationship-content-resolver", () => {
	it("resolves a query-backed overview target document model from canonical targetDocumentModel", () => {
		const overview = createOverview("Address-overview-query");
		const resolveModel = (modelId: string): object | undefined =>
			modelId === "Address-overview-query"
				? {
						header: { id: modelId, modelType: "query", modelVersion: "0.1.0" },
						content: { targetDocumentModel: "Address-document", links: [] }
					}
				: undefined;

		expect(getQueryBackedOverviewTargetDocumentModelId(overview, resolveModel)).toBe("Address-document");
	});

	it("does not treat entityModelId-only query content as a query-backed overview target source", () => {
		const overview = createOverview("legacy-query");
		const resolveModel = (modelId: string): object | undefined =>
			modelId === "legacy-query"
				? {
						header: { id: modelId, modelType: "query", modelVersion: "0.1.0" },
						content: { entityModelId: "Legacy-document", constraints: [], pageSize: 50 }
					}
				: undefined;

		expect(getQueryBackedOverviewTargetDocumentModelId(overview, resolveModel)).toBeUndefined();
	});

	it("returns the source role only when exactly one relationship role differs from the target role", () => {
		const resolveModel = (modelId: string): object | undefined =>
			modelId === "PostAddress"
				? createRelationshipModel([
						{ role: "address", documentModel: "Address-document" },
						{ role: "businessPartner", documentModel: "BusinessPartner-document" }
					])
				: undefined;

		expect(resolveSourceContextFromRelationship(resolveModel, "PostAddress", "address")).toEqual({
			sourceRole: "businessPartner",
			sourceDocumentModelId: "BusinessPartner-document"
		});
	});

	it("treats multiple non-target roles as ambiguous and returns undefined", () => {
		const resolveModel = (modelId: string): object | undefined =>
			modelId === "TriRelationship"
				? createRelationshipModel([
						{ role: "target", documentModel: "Target-document" },
						{ role: "sourceA", documentModel: "SourceA-document" },
						{ role: "sourceB", documentModel: "SourceB-document" }
					])
				: undefined;

		expect(resolveSourceContextFromRelationship(resolveModel, "TriRelationship", "target")).toBeUndefined();
	});

	it("throws ModelNotFoundError when relationship model is missing", () => {
		const resolveModel = (_modelId: string): object | undefined => undefined;

		expect(() => resolveSourceContextFromRelationship(resolveModel, "MissingRelationship", "target")).toThrow(
			ModelNotFoundError
		);
		expect(() => resolveSourceContextFromRelationship(resolveModel, "MissingRelationship", "target")).toThrow(
			"Model not found: MissingRelationship"
		);
	});

	it("throws ModelNotFoundError when resolved model is not a relationship model", () => {
		const nonRelationshipModel = {
			header: { id: "WrongType", modelType: "overview", modelVersion: "0.1.0" },
			content: { columns: [] }
		};
		const resolveModel = (_modelId: string): object => nonRelationshipModel;

		expect(() => resolveSourceContextFromRelationship(resolveModel, "WrongType", "target")).toThrow(ModelNotFoundError);
		expect(() => resolveSourceContextFromRelationship(resolveModel, "WrongType", "target")).toThrow(
			"Model not found: WrongType"
		);
	});
});

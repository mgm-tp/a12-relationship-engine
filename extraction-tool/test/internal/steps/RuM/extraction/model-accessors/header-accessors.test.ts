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

import {
	getHeader,
	getAnnotations,
	getModelReferences,
	findAnnotationByName,
	extractRolesAnnotation,
	replaceRolesAnnotations,
	getDirectDocumentReference
} from "../../../../../../src/internal/steps/RuM/extraction/model-accessors/header-accessors.js";

describe("getHeader", () => {
	it("should return the header when present", () => {
		const model = {
			header: { id: "test-model", modelType: "form", modelVersion: "1.0.0" }
		};
		const result = getHeader(model);
		expect(result).toEqual({ id: "test-model", modelType: "form", modelVersion: "1.0.0" });
	});

	it("should return undefined when header is missing", () => {
		const model = {};
		const result = getHeader(model);
		expect(result).toBeUndefined();
	});

	it("should return undefined when header is null", () => {
		const model = { header: null };
		const result = getHeader(model);
		expect(result).toBeNull();
	});

	it("should handle header with all optional fields", () => {
		const model = {
			header: {
				id: "full-model",
				modelType: "document",
				modelVersion: "2.0.0",
				locales: [{ code: "en" }, { code: "de" }],
				labels: [{ locale: "en", text: "Full Model" }],
				description: "A model with all fields",
				annotations: [{ name: "test-annotation", value: "value1" }],
				modelReferences: [{ modelType: "form", reference: "FormModel" }]
			}
		};
		const result = getHeader(model);
		expect(result).toBeDefined();
		expect(result?.id).toBe("full-model");
		expect(result?.modelType).toBe("document");
		expect(result?.annotations).toHaveLength(1);
		expect(result?.modelReferences).toHaveLength(1);
	});
});

describe("getAnnotations", () => {
	it("should return annotations from header", () => {
		const model = {
			header: {
				id: "test",
				modelType: "form",
				modelVersion: "1.0.0",
				annotations: [
					{ name: "bindingConfiguration", value: "{}" },
					{ name: "roles", value: "test" }
				]
			}
		};
		const result = getAnnotations(model);
		expect(result).toHaveLength(2);
		expect(result[0].name).toBe("bindingConfiguration");
		expect(result[1].name).toBe("roles");
	});

	it("should return empty array when header has no annotations", () => {
		const model = {
			header: { id: "test", modelType: "form", modelVersion: "1.0.0" }
		};
		const result = getAnnotations(model);
		expect(result).toEqual([]);
	});

	it("should return empty array when header is missing", () => {
		const model = {};
		const result = getAnnotations(model);
		expect(result).toEqual([]);
	});

	it("should return empty array when annotations is empty array", () => {
		const model = {
			header: {
				id: "test",
				modelType: "form",
				modelVersion: "1.0.0",
				annotations: []
			}
		};
		const result = getAnnotations(model);
		expect(result).toEqual([]);
	});
});

describe("findAnnotationByName", () => {
	it("should return the first matching annotation when present", () => {
		const matchingAnnotation = { name: "cdm.queryRoot", value: "Contract-document" };
		const model = {
			header: {
				id: "test",
				modelType: "document",
				modelVersion: "1.0.0",
				annotations: [{ name: "roles", value: "admin" }, matchingAnnotation, { name: "cdm.queryRoot", value: "Other" }]
			}
		};

		const result = findAnnotationByName(model, "cdm.queryRoot");

		expect(result).toEqual(matchingAnnotation);
		expect(result).toBe(matchingAnnotation);
	});

	it("should return undefined when the annotation is absent", () => {
		const model = {
			header: {
				id: "test",
				modelType: "document",
				modelVersion: "1.0.0",
				annotations: [{ name: "roles", value: "admin" }]
			}
		};

		expect(findAnnotationByName(model, "cdm.queryRoot")).toBeUndefined();
	});
});

describe("extractRolesAnnotation", () => {
	it("should return only roles annotations while preserving exact objects", () => {
		const rolesAnnotation = { name: "roles", value: "admin,editor", additionalProperty: { keep: true } };
		const model = {
			header: {
				id: "test",
				modelType: "form",
				modelVersion: "1.0.0",
				annotations: [
					{ name: "bindingConfiguration", value: "[]" },
					rolesAnnotation,
					{ name: "role", value: "ignored" }
				]
			}
		};

		const result = extractRolesAnnotation(model);

		expect(result).toEqual([rolesAnnotation]);
		expect(result[0]).toBe(rolesAnnotation);
	});

	it("should return empty array when roles annotations are absent", () => {
		const model = {
			header: {
				id: "test",
				modelType: "form",
				modelVersion: "1.0.0",
				annotations: [{ name: "bindingConfiguration", value: "[]" }]
			}
		};

		const result = extractRolesAnnotation(model);

		expect(result).toEqual([]);
	});
});

describe("replaceRolesAnnotations", () => {
	it("should preserve existing roles and non-role annotations from the source overview", () => {
		const sourceRoles = [{ name: "roles", value: "admin" }];
		const overviewRoles = { name: "roles", value: "old-role" };
		const result = replaceRolesAnnotations([{ name: "category", value: "overview" }, overviewRoles], sourceRoles);

		expect(result).toEqual([{ name: "category", value: "overview" }, overviewRoles]);
		expect(result[1]).toBe(overviewRoles);
	});

	it("should add source form roles when existing annotations have no roles", () => {
		const sourceRoles = [{ name: "roles", value: "admin" }];
		const result = replaceRolesAnnotations([{ name: "category", value: "overview" }], sourceRoles);

		expect(result).toEqual([{ name: "category", value: "overview" }, ...sourceRoles]);
		expect(result[1]).toBe(sourceRoles[0]);
	});
});

describe("getDirectDocumentReference", () => {
	it("should return the direct document reference when present", () => {
		const model = {
			header: {
				id: "test",
				modelType: "form",
				modelVersion: "1.0.0",
				modelReferences: [
					{ modelType: "overview", reference: "SomeOverview" },
					{ modelType: "document", reference: "ContractCDM", purpose: "data binding" }
				]
			}
		};

		expect(getDirectDocumentReference(model)).toBe("ContractCDM");
	});

	it("should return undefined when no direct document reference exists", () => {
		const model = {
			header: {
				id: "test",
				modelType: "form",
				modelVersion: "1.0.0",
				modelReferences: [{ modelType: "overview", reference: "SomeOverview" }]
			}
		};

		expect(getDirectDocumentReference(model)).toBeUndefined();
	});
});

describe("getModelReferences", () => {
	it("should return model references from header", () => {
		const model = {
			header: {
				id: "test",
				modelType: "form",
				modelVersion: "1.0.0",
				modelReferences: [
					{ modelType: "document", reference: "PersonDM" },
					{ modelType: "overview", reference: "PersonOverview" }
				]
			}
		};
		const result = getModelReferences(model);
		expect(result).toHaveLength(2);
		expect(result[0].reference).toBe("PersonDM");
		expect(result[1].reference).toBe("PersonOverview");
	});

	it("should return empty array when header has no modelReferences", () => {
		const model = {
			header: { id: "test", modelType: "form", modelVersion: "1.0.0" }
		};
		const result = getModelReferences(model);
		expect(result).toEqual([]);
	});

	it("should return empty array when header is missing", () => {
		const model = {};
		const result = getModelReferences(model);
		expect(result).toEqual([]);
	});

	it("should handle references with optional fields", () => {
		const model = {
			header: {
				id: "test",
				modelType: "form",
				modelVersion: "1.0.0",
				modelReferences: [{ modelType: "form", reference: "LinkForm", purpose: "link", alias: "LinkFormAlias" }]
			}
		};
		const result = getModelReferences(model);
		expect(result).toHaveLength(1);
		expect(result[0].purpose).toBe("link");
		expect(result[0].alias).toBe("LinkFormAlias");
	});
});

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

import type { Header, Annotation, ModelReference } from "@com.mgmtp.a12.base/base-model-api";

/** Extracts the `Header` from a model object when present. */
export function getHeader(model: object): Header | undefined {
	if (!("header" in model)) {
		return undefined;
	}

	return (model as { header?: Header }).header;
}

/**
 * Checks whether the model exposes a well-formed header shape for header-based access.
 */
export function hasModelHeader(model: object): model is { readonly header: Header } {
	const header = getHeader(model);

	return (
		header !== undefined &&
		typeof header.id === "string" &&
		typeof header.modelType === "string" &&
		typeof header.modelVersion === "string"
	);
}

/** Returns all annotations from the model's header. */
export function getAnnotations(model: object): readonly Annotation[] {
	const header = getHeader(model);

	return header?.annotations ?? [];
}

/** Finds the first header annotation with the given name. */
export function findAnnotationByName(model: object, name: string): Annotation | undefined {
	return getAnnotations(model).find((annotation) => annotation.name === name);
}

/** Extracts `roles` annotations from the model's header. */
export function extractRolesAnnotation(formModel: object): readonly Annotation[] {
	return getAnnotations(formModel).filter((annotation) => annotation.name === "roles");
}

/**
 * Ensures clone annotations have a roles annotation while preserving a source
 * overview's own roles when present. Non-role annotations keep their original
 * order; source form roles are appended only when the clone has no roles.
 */
export function replaceRolesAnnotations(
	annotations: readonly Annotation[] | undefined,
	rolesAnnotations: readonly Annotation[] | undefined
): Annotation[] {
	const existingAnnotations = annotations ?? [];

	if (existingAnnotations.some((annotation) => annotation.name === "roles")) {
		return [...existingAnnotations];
	}

	return [...existingAnnotations, ...(rolesAnnotations ?? [])];
}

/** Returns all model references from the model's header. */
export function getModelReferences(model: object): readonly ModelReference[] {
	const header = getHeader(model);

	return header?.modelReferences ?? [];
}

/** Returns the direct document reference from a model header. */
export function getDirectDocumentReference(model: object): string | undefined {
	return getModelReferences(model).find((reference) => reference.modelType === "document")?.reference;
}

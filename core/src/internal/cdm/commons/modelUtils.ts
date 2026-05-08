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
 * @packageDocumentation
 * @module cdm
 * @experimental
 */
import { type Header } from "@com.mgmtp.a12.base/base-model-api/lib/main/header/index.js";
import { type ModelPath } from "@com.mgmtp.a12.base/base-model-api/lib/main/model/index.js";
import { type DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";
import { DocumentServiceFactory } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/facade.js";

export function queryRootName(documentModel: DocumentModel): string | undefined {
	return resolveHeaderAnnotationOrUndefined(documentModel.header, "cdm.queryRoot");
}

/** @internal */
export function resolveAnnotation(dmElement: DocumentModel.Element, name: string): string {
	const value = resolveAnnotationOrUndefined(dmElement, name);
	if (typeof value !== "string") {
		throw new Error(`Annotation with name "${name}" is not of type string.`);
	}
	return value;
}

/** @internal */
export function resolveAnnotationOrUndefined(dmElement: DocumentModel.Element, name: string): string | undefined {
	return dmElement?.annotations?.find((annotation) => annotation.name === name)?.value;
}

/** @internal */
export function resolveHeaderAnnotation(header: Header, name: string): string {
	const value = resolveHeaderAnnotationOrUndefined(header, name);
	if (typeof value !== "string") {
		throw new Error(`Annotation with name "${name}" is not of type string.`);
	}
	return value;
}

/** @internal */
export function resolveHeaderAnnotationOrUndefined(header: Header, name: string): string | undefined {
	return header.annotations?.find((a) => a.name === name)?.value;
}

/** @internal */
export function deserializeDocumentModel(serializedDM: object): DocumentModel {
	const serializer = new DocumentServiceFactory().getDocumentModelSerializer();
	return serializer.deserialize(JSON.stringify(serializedDM));
}

/** @internal */
export function findModelElementByPath(model: DocumentModel, targetPath: ModelPath): DocumentModel.Element | undefined {
	if (targetPath.length === 0) {
		return model.content.modelRoot;
	}

	return new DocumentServiceFactory().getDocumentModelSearchService(model).getByPath(targetPath);
}

/** @internal */
export function isNonRepeatableGroup(el: DocumentModel.Group | DocumentModel.Field): boolean {
	return el.type === "Group" && el.repeatability === 1;
}

/** @internal */
export function assertIsNonRepeatableGroup(el: DocumentModel.Element): asserts el is DocumentModel.Group {
	if (!isNonRepeatableGroup(el)) {
		throw new Error("Not a non-repeatable group");
	}
}

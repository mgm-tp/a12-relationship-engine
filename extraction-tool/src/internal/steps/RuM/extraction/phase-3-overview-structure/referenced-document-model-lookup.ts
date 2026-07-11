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

import { isModelInstance } from "@com.mgmtp.a12.base/base-model-api";
import type { ModelReference } from "@com.mgmtp.a12.base/base-model-api";
import type { DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import { DocumentServiceFactory } from "@com.mgmtp.a12.kernel/kernel-md-facade";

import { isDocumentModel } from "../model-accessors/type-guards.js";

/** Deserializes a raw workspace document model JSON object into a typed DocumentModel. */
export function deserializeReferencedModel(raw: unknown, resolveModel: (id: string) => unknown): DocumentModel {
	return new DocumentServiceFactory()
		.getDocumentModelSerializer()
		.deserialize(JSON.stringify(mergeTypeDefinitionsFromTdms(raw, resolveModel)));
}

/** Raw typeDefinition entry as stored in document model JSON, before kernel deserialization. */
interface RawTypeDefinition {
	readonly id: string;
	readonly fieldType: unknown;
}

/** Merges typeDefinitions from any TDM referenced via header.modelReferences into the raw model's content.typeDefinitions before deserialization. */
function mergeTypeDefinitionsFromTdms(raw: unknown, resolveModel: (id: string) => unknown): unknown {
	if (!isDocumentModel(raw)) {
		return raw;
	}

	const modelReferences: ModelReference[] | undefined = raw.header.modelReferences;

	if (modelReferences === undefined || modelReferences.length === 0) {
		return raw;
	}

	const tdmReferences = modelReferences.filter((ref) => ref.purpose === "typeDefinitions");

	if (tdmReferences.length === 0) {
		return raw;
	}

	const content = raw.content as { typeDefinitions?: readonly RawTypeDefinition[] };
	const existingTypeDefs: readonly RawTypeDefinition[] = content.typeDefinitions ?? [];
	const injected: RawTypeDefinition[] = [...existingTypeDefs];

	for (const ref of tdmReferences) {
		const tdm = resolveModel(ref.reference);

		if (isModelInstance(tdm) && isDocumentModel(tdm)) {
			const tdmContent = tdm.content as { typeDefinitions?: readonly RawTypeDefinition[] };

			if (tdmContent.typeDefinitions !== undefined) {
				injected.push(...tdmContent.typeDefinitions);
			}
		}
	}

	return {
		...raw,
		content: {
			...raw.content,
			typeDefinitions: injected
		}
	};
}

/** Finds a document model element by id using the kernel search API; returns undefined if not found. */
export function findElementById(documentModel: DocumentModel, id: string): DocumentModel.Element | undefined {
	const searchService = new DocumentServiceFactory().getDocumentModelSearchService(documentModel);
	const path = searchService.getPathById(id);

	if (path === undefined) {
		return undefined;
	}

	return searchService.getByPath(path);
}

/** Returns the usageType of the Group element with the given id, or undefined if not found or not a Group. */
export function getGroupUsageType(documentModel: DocumentModel, elementId: string): string | undefined {
	const element = findElementById(documentModel, elementId);

	if (element === undefined) {
		return undefined;
	}

	if (element.type === "Group") {
		return element.usageType;
	}

	return undefined;
}

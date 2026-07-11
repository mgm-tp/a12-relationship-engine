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

import { DocumentServiceFactory } from "@com.mgmtp.a12.kernel/kernel-md-facade";

import type { FieldPath } from "./types.js";
import { deserializeReferencedModel } from "./referenced-document-model-lookup.js";

/** Builds a FieldPath by resolving each segment of the kernel model path. */
export function buildFieldPathFromDocumentModel(
	elementId: string,
	rawDocumentModel: unknown,
	resolveModel: (id: string) => unknown
): FieldPath | undefined {
	const dm = deserializeReferencedModel(rawDocumentModel, resolveModel);
	const factory = new DocumentServiceFactory();
	const searchService = factory.getDocumentModelSearchService(dm);
	const modelPath = searchService.getPathById(elementId);

	if (modelPath === undefined) {
		return undefined;
	}

	const segments: Array<{ elementId: string; name: string }> = [];

	for (let i = 0; i < modelPath.length; i++) {
		// getByPath on a prefix of a path returned by getPathById always resolves.
		const element = searchService.getByPath(modelPath.slice(0, i + 1));

		if (element === undefined) {
			return undefined;
		}

		segments.push({ elementId: element.id, name: element.name });
	}

	return segments;
}

/** Formats a FieldPath into a slash-separated elementId string (e.g., "group_60e44/field_dbbc9"); returns empty string for undefined or empty path. */
export function formatFieldPath(path: FieldPath | undefined): string {
	if (!path || path.length === 0) {
		return "";
	}

	return path.map((segment) => segment.elementId).join("/");
}

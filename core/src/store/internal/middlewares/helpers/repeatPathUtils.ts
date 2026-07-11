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

import type { ModelPath } from "@com.mgmtp.a12.base/base-model-api";
import {
	type DocumentModel,
	DocumentServiceFactory,
	type EntityInstancePath
} from "@com.mgmtp.a12.kernel/kernel-md-facade";

/**
 * Computes the document instance path for the rows of a repeat element.
 *
 * Walks `modelPath` segment by segment against `context` (the current FE screen path)
 * and resolves each segment to an index: 0 for repeatable groups (the container), 1
 * for non-repeatable groups.
 *
 * @internal
 */
export function makeRowsPathForRepeat(
	documentModel: DocumentModel,
	modelPath: ModelPath,
	context: EntityInstancePath
): EntityInstancePath {
	const documentPath: EntityInstancePath = [];
	const maxPrefix = Math.min(modelPath.length, context.length);

	for (let i = 0; i < maxPrefix; i += 1) {
		if (modelPath[i]?.elementName !== context[i]?.elementName) {
			break;
		}

		documentPath.push(context[i] as EntityInstancePath[number]);
	}

	const modelSearchService = new DocumentServiceFactory().getDocumentModelSearchService(documentModel);

	for (const segment of modelPath.slice(documentPath.length)) {
		const modelPathToSegment = modelPath.slice(0, documentPath.length + 1);
		const modelElement = modelSearchService.getByPath(modelPathToSegment);
		const isRepeatable = modelElement?.type === "Group" && modelElement.repeatability > 1;
		const index = isRepeatable ? 0 : 1;
		documentPath.push({ ...segment, index });
	}

	return documentPath;
}

/**
 * Returns a copy of `baseRowsPath` with the last segment's index replaced by `rowIndex`.
 *
 * @internal
 */
export function applyRowIndex(baseRowsPath: EntityInstancePath, rowIndex: number): EntityInstancePath {
	return baseRowsPath.map((segment, index) =>
		index === baseRowsPath.length - 1 ? { ...segment, index: rowIndex } : segment
	) as EntityInstancePath;
}

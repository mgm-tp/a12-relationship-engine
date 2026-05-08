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
 * @module relationship
 * @experimental
 */
import { type ModelPath } from "@com.mgmtp.a12.base/base-model-api/lib/main/model/index.js";
import { type EntityInstancePath } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";

/**
 * @internal
 */
export function makeRowsPathForRepeat(modelPath: ModelPath, context: EntityInstancePath): EntityInstancePath {
	const documentPath = intersect(modelPath, context);

	modelPath.slice(documentPath.length).forEach((segment, idx, all) => {
		// the last element gets a 0 index, all other indices must default to 1
		const index = idx === all.length - 1 ? 0 : 1;
		documentPath.push({ ...segment, index });
	});

	return documentPath;
}

function intersect(modelPath: ModelPath, context: EntityInstancePath): EntityInstancePath {
	const contextPart = context.slice(0, modelPath.length);
	const index = contextPart.findIndex((e, i) => e.elementName !== modelPath[i].elementName);
	return index < 0 ? contextPart : context.slice(0, index);
}

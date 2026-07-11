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

import type { EntityInstancePath } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import {
	DocumentPath,
	type DocumentDescriptor,
	type FormEngineSagaOptions
} from "@com.mgmtp.a12.formengine/formengine-core";

import { DataHolderSelectors } from "../store/index.js";

/**
 * Creates Form Engine saga options with the RE document-descriptor selector wired in as the default.
 */
export function createRelationshipEngineFormEngineOptions(options?: FormEngineSagaOptions): FormEngineSagaOptions {
	return {
		...options,
		documentDescriptorSelector: createRelationshipEngineDocumentDescriptorSelector(options?.documentDescriptorSelector)
	};
}

/**
 * Resolves the exact document descriptor for a given entity instance path in an RE/CDM activity.
 */
export function createRelationshipEngineDocumentDescriptorSelector(
	override?: FormEngineSagaOptions["documentDescriptorSelector"]
): Required<FormEngineSagaOptions>["documentDescriptorSelector"] {
	return (state: object, activityId: string, documentPath: EntityInstancePath): DocumentDescriptor => {
		const overrideResult = override?.(state, activityId, documentPath);

		if (overrideResult) {
			return overrideResult;
		}

		const result = DataHolderSelectors.documentDescriptor(activityId, documentPath)(state);

		if (!result) {
			const path = DocumentPath.toString(documentPath);
			throw new Error(`Cannot find document descriptor for ${path} for activity ${activityId}`);
		}

		return result;
	};
}

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

import type { ModelGraph } from "@com.mgmtp.a12.dataservices/dataservices-access";
import type { Document, DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import { type Models, findNotRelevantPaths } from "@com.mgmtp.a12.formengine/formengine-core";

import { setValue } from "../setValue.js";
import type { CdmData } from "../cdmData.js";
import { comparePaths } from "../../../shared/utils.js";
import type { EntityInstance } from "../entityInstance.js";
import { assertObject } from "../../../shared/assertion.js";

/**
 * @internal
 *
 * Filters the cdm data by removing not relevant values. This also removes links from the dg.
 *
 * If regular group instances are marked as not relevant, we need to find the relsh group instances of first level
 * links nested within this group instance and remove them from the dg as well.
 *
 * @param originalCdmData
 * @param models the form and document model (cdm) needed to determine not relevant fields
 * @param documentModels the document models loaded for the scene
 * @param modelGraph the model graph containing the relationship models
 * @returns the cdm data with the filtered cdd and dg
 */
export function filterCdmDataByRelevance(
	originalCdmData: CdmData,
	models: Models,
	documentModels: DocumentModel[],
	modelGraph: ModelGraph
): CdmData {
	const cdd = originalCdmData.cddState.cachedCdd?.cdd;
	assertObject(cdd, "Expected a cached cdd to exist.");

	// not relevant field, relsh group and regular group instances
	// sorted to remove the last items first
	const notRelevantPaths = findNotRelevantPaths(cdd as Document, models)
		.sort(comparePaths)
		.reverse();
	const notRelevantEntityInstances: EntityInstance[] = notRelevantPaths.map((path) => ({
		path,
		value: undefined
	}));

	// Since we only remove elements, we don't need to hand in a filtered cdd.
	return notRelevantEntityInstances.reduce(
		(currentData, currentInstance) =>
			setValue(currentData, currentInstance.value, currentInstance.path, documentModels, modelGraph),
		originalCdmData
	);
}

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

import { type ModelGraph } from "@com.mgmtp.a12.dataservices/dataservices-access";
import {
	type DocumentModel,
	type EntityInstancePath,
	type FieldInstanceValue,
	type GroupInstance
} from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";

import { type CdmData } from "./cdmData.js";
import { DocumentQuery } from "./documentQuery.js";
import { type EntityInstance } from "./entityInstance.js";
import { getUpdateValue } from "./getUpdateValue.js";
import { type PresentRelationshipsCache, setValue } from "./setValue.js";

/** @internal */
export function setValuesOfGroupInstance(
	data: CdmData,
	groupInstance: GroupInstance,
	groupInstancePath: EntityInstancePath,
	group: DocumentModel.Group,
	documentModels: DocumentModel[],
	modelGraph: ModelGraph,
	mode?: "initializing",
	cache?: PresentRelationshipsCache
): CdmData {
	const entityInstancesToAdd: EntityInstance[] = [];

	function visitor(visit: {
		path: EntityInstancePath;
		element?: GroupInstance | FieldInstanceValue;
		modelElement: DocumentModel.Element;
	}): void {
		const { path, element, modelElement } = visit;

		const value = getUpdateValue(modelElement.type, element);
		if (value !== undefined) {
			entityInstancesToAdd.push({
				path: [...groupInstancePath, ...path],
				value
			});
		}
	}
	DocumentQuery.walk(groupInstance, group, visitor);

	return entityInstancesToAdd.reduce(
		(currentData: CdmData, currentInstance: EntityInstance, currentIndex: number) =>
			setValue(
				currentData,
				currentInstance.value,
				currentInstance.path,
				documentModels,
				modelGraph,
				mode === "initializing" || currentIndex > 0 ? "heterogeneityTypeUnknown" : undefined,
				cache
			),
		data
	);
}

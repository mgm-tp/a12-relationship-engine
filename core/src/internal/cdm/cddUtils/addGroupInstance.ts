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
import { DocumentPath } from "@com.mgmtp.a12.formengine/formengine-core";
import {
	type DocumentModel,
	type EntityInstancePath,
	type FieldInstanceValue,
	type GroupInstance
} from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/index.js";

import { assertObjectType } from "../../shared/assertion.js";
import { DocumentUtils } from "../../shared/utils.js";

import { findModelElementByPath } from "../commons/modelUtils.js";

import { type CdmData } from "./cdmData.js";
import { type PresentRelationshipsCache } from "./setValue.js";
import { setValuesOfGroupInstance } from "./setValuesOfGroupInstance.js";

/**
 * Adds the provided group instance to the given data by adding it to the dg
 * document determined by the given path and updating the cdd afterwards.
 *
 * The update is achieved by recursively walking over all elements in the
 * provided group instance starting with the instance itself and applying a
 * value change to the data for each element, creating sub documents on the way
 * if needed.
 *
 * @experimental
 * @internal
 */
export function addGroupInstance(
	data: CdmData,
	value: Readonly<GroupInstance> | FieldInstanceValue | undefined,
	path: EntityInstancePath,
	documentModels: DocumentModel[],
	modelGraph: ModelGraph,
	cache?: PresentRelationshipsCache
): CdmData {
	const cdm = data.cddState.cdm;

	assertObjectType(value, DocumentUtils.isGroupInstance, `group not found: ${DocumentPath.toString(path)}`);

	const modelElement = findModelElementByPath(cdm, path);
	if (!modelElement || modelElement.type !== "Group") {
		throw new Error(`Could not find group for path '${path}'`);
	}

	return setValuesOfGroupInstance(data, value, path, modelElement, documentModels, modelGraph, undefined, cache);
}

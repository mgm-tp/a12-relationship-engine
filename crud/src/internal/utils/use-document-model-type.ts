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

import { useSelector } from "react-redux";
import * as React from "react";

import { type ModelGraph } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { OverviewEngineSelectors } from "@com.mgmtp.a12.overviewengine/overviewengine-core";

/** @internal */
export function useDocumentModelType(activityId: string, modelGraph: ModelGraph): ModelGraph.DocumentModel | undefined {
	const modelsState = useSelector(OverviewEngineSelectors.modelsState(activityId));

	return React.useMemo(() => {
		if (!modelsState) {
			return undefined;
		}
		return findDocumentModelType(modelsState.documentModel.header.id, modelGraph);
	}, [modelGraph, modelsState]);
}

/**
 * exported for test
 * @internal
 */
export function findDocumentModelType(dmName: string, modelGraph: ModelGraph): ModelGraph.DocumentModel {
	// when the referenced DM is a CDM, it won't be found in the `documentModels` list of the model graph,
	// so we use its root instead
	const documentModelName =
		modelGraph.composeDocumentModels.find((cdm) => cdm.modelId === dmName)?.rootDocumentModelId ?? dmName;

	const dmType = modelGraph.documentModels.find((dm) => dm.modelId === documentModelName);

	// if not found, modelGraph is either empty or incomplete, just assume default case (no heterogeneity, so no variant selection)
	return dmType ?? { modelId: dmName, relations: null, subTypes: null };
}

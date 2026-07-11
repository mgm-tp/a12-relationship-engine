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

/**
 * Checks if there are multiple non-abstract variants for a document model.
 *
 * * documentModel is concrete and has at least one concrete subType
 * * documentModel is abstract and has at least two concrete subTypes
 */
export function hasVariants(documentModel: ModelGraph.DocumentModel, modelGraph: ModelGraph): boolean {
	const nonAbstractSubTypes = findNonAbstractSubTypesRecursively(documentModel, modelGraph);

	return (
		(!documentModel.abstractModel && nonAbstractSubTypes.length >= 1) ||
		(!!documentModel.abstractModel && nonAbstractSubTypes.length >= 2)
	);
}

/**
 * Recursively finds all non-abstract subtypes of a document model.
 */
function findNonAbstractSubTypesRecursively(
	startType: ModelGraph.DocumentModel,
	modelGraph: ModelGraph
): ModelGraph.DocumentModel[] {
	const subTypes: ModelGraph.DocumentModel[] = [];

	if (startType.subTypes !== null && startType.subTypes.length > 0) {
		for (const subTypeRef of startType.subTypes) {
			const subType = modelGraph.documentModels.find((dm) => dm.modelId === subTypeRef);

			if (!subType) {
				// Skip missing subtypes instead of crashing
				continue;
			}

			if (!subType.abstractModel) {
				subTypes.push(subType);
			}

			subTypes.push(...findNonAbstractSubTypesRecursively(subType, modelGraph));
		}
	}

	return subTypes;
}

/**
 * Gets the concrete document model to use when variants are not applicable.
 * Returns undefined if the model is abstract with no concrete subtypes.
 */
export function getSingleConcreteModel(
	documentModel: ModelGraph.DocumentModel,
	modelGraph: ModelGraph
): string | undefined {
	if (!documentModel.abstractModel) {
		return documentModel.modelId;
	}

	// For abstract models, find the first concrete subtype
	const concreteSubtypes = findNonAbstractSubTypesRecursively(documentModel, modelGraph);

	return concreteSubtypes.length === 1 ? concreteSubtypes[0].modelId : undefined;
}

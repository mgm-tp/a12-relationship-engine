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
 */

import { type RelationshipModel } from "@com.mgmtp.a12.dataservices/dataservices-access";
import {
	type OverviewEngineApi,
	type OverviewEngineState,
	SortingOrder,
	OverviewModel
} from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import { type LocalizedModelText } from "@com.mgmtp.a12.utils/utils-localization/lib/main/index.js";

import { DocumentModelUtils } from "../../../shared/utils.js";
import { getEntityByRole } from "../../../cdm/commons/relationshipModelUtils.js";
import { type Relationship } from "../../relationship.js";

/** @internal */
export function getSortingProps(
	relationshipInstance?: Relationship.CandidateInstance,
	engineModels?: Relationship.OverviewModels
): OverviewEngineState["sorting"] | undefined {
	if (relationshipInstance === undefined || engineModels === undefined || engineModels.loadingState !== "loaded") {
		return undefined;
	}

	const {
		candidateQuery: { sorts }
	} = relationshipInstance;
	if (sorts === undefined) {
		return undefined;
	}

	const {
		documentModel,
		overviewModel: {
			content: { columns }
		}
	} = engineModels;

	return sorts.map(({ path, order }) => {
		const columnIndex = columns.findIndex(
			(col) =>
				OverviewModel.ReferenceColumn.isAssignableFrom(col) &&
				DocumentModelUtils.getElementPathForId(col.elementRef, documentModel) === path
		);
		if (columnIndex < 0) {
			throw new Error(`No column could be found for the path "${path}"`);
		}

		return { order: order === "DESC" ? SortingOrder.DESC : SortingOrder.ASC, path };
	});
}

/** @internal */
export function getFilterProps(
	relationshipInstance?: Relationship.CandidateInstance
): OverviewEngineApi.FilterMap | undefined {
	if (relationshipInstance === undefined) {
		return undefined;
	}

	const {
		candidateQuery: { filter }
	} = relationshipInstance;

	return filter && filter.filters;
}

/** @internal */
export function getCandidatePaginationProps(
	relationshipInstance?: Relationship.CandidateInstance
): OverviewEngineApi.Pagination | undefined {
	if (relationshipInstance === undefined) {
		return undefined;
	}

	const { fullCount, pageNumber, pageSize } = relationshipInstance.candidatePagination;

	return {
		pageCount: Math.ceil((fullCount <= 0 ? 1 : fullCount) / pageSize),
		pageNumber,
		pageSize
	};
}

/** @internal */
export function omitActionColumnWidth(overviewModel: OverviewModel): OverviewModel {
	return {
		...overviewModel,
		content: {
			...overviewModel.content,
			configuration: {
				...overviewModel.content.configuration,
				actionColumnWidth: undefined
			}
		}
	};
}

/**
 * @internal
 */
export function areMaxLinksAdded(
	numberOfLinks: number,
	relationshipModel: RelationshipModel,
	targetRole: string
): boolean {
	const targetEntityCharacteristic = getEntityByRole(relationshipModel, targetRole);
	const multiplicityUpperLimit = targetEntityCharacteristic?.linkConstraints.multiplicity.upperLimit;

	return typeof multiplicityUpperLimit === "number" && numberOfLinks >= multiplicityUpperLimit;
}

/** @internal */
export interface DocumentId {
	readonly documentId: string;
}

export interface LocalizedLabelConfig {
	// we cannot use an index signature since this structure can be described in a picus model
	readonly label?: LocalizedModelText;
}

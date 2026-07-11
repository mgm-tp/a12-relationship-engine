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

import { OverviewModel } from "../../../../../models/overview-model.js";
import { ATTACHMENT_USAGE_TYPE, MULTI_SELECT_USAGE_TYPE } from "../constants.js";
import type { LegacyGeneratedDocumentModel } from "../../../../../models/legacy-generated-document-model.js";

import type { ColumnClassification } from "./types.js";
import { elementExistsInReferencedModel } from "./generated-doc-overview-helpers.js";

/** Adds CHILD/LINK linkReferences to overview columns based on relationship semantics. */
export function addLinkReferences(
	columns: readonly OverviewModel.ReferenceColumn[],
	elementClassifications: readonly ColumnClassification[],
	linkDocModel: LegacyGeneratedDocumentModel | undefined,
	duplicatesAllowed: boolean,
	relationship: string,
	targetRole: string,
	linkTargetRole: string,
	resolveModel?: (id: string) => unknown
): ReadonlyArray<OverviewModel.ReferenceColumn | OverviewModel.LinkColumn.Reference> {
	if (columns.length !== elementClassifications.length) {
		return columns;
	}

	if (relationship.trim().length === 0 || targetRole.trim().length === 0 || linkTargetRole.trim().length === 0) {
		return columns;
	}

	return columns.map((column, index) => {
		const classification = elementClassifications[index];
		const newRefs: OverviewModel.LinkReference[] = [];

		if (classification.kind === "target") {
			if (duplicatesAllowed) {
				newRefs.push({ relationship, targetRole, type: "CHILD" });
			}
		} else if (classification.kind === "relationship") {
			const rootGroups = linkDocModel?.content.modelRoot.rootGroups ?? [];
			const fieldInReferencedDm =
				resolveModel !== undefined
					? rootGroups.some((rootGroup) =>
							(rootGroup.Group?.elements ?? []).some((wrapper) => {
								const ref = wrapper.Group?.includeConfig?.reference;

								if (ref === undefined) {
									return false;
								}

								const rawDm = resolveModel(ref);

								if (rawDm === undefined) {
									return false;
								}

								return elementExistsInReferencedModel(
									rawDm,
									classification.originalElementId,
									[ATTACHMENT_USAGE_TYPE, MULTI_SELECT_USAGE_TYPE],
									resolveModel
								);
							})
						)
					: false;

			if (fieldInReferencedDm) {
				newRefs.push({
					relationship,
					targetRole: linkTargetRole,
					type: "LINK"
				});
			}
		}

		// Merge with existing linkReferences if any
		if (newRefs.length === 0) {
			return column;
		}

		const existingRefs = OverviewModel.BaseLinkedColumn.isAssignableFrom(column) ? column.linkReferences : [];
		const mergedRefs: OverviewModel.LinkReference[] = [...existingRefs, ...newRefs];

		return {
			...column,
			linkReferences: mergedRefs
		};
	});
}

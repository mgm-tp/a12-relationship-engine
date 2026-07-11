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

import type { LegacyGeneratedDocumentModel } from "../../../../../models/legacy-generated-document-model.js";

import type { TypedGeneratedDocAnalysis } from "./types.js";
import { resolveWrapperPrefix } from "./column-classifier.js";

/** Expected rootGroup name for the target document model. */
const TARGET_GROUP_NAME = "target";

/** Expected rootGroup name for the relationship/link document model. */
const RELATIONSHIP_GROUP_NAME = "relationship";

/** Finds a root group by its name. */
function findRootGroupByName(
	rootGroups: readonly LegacyGeneratedDocumentModel.RootGroup[],
	name: string
): LegacyGeneratedDocumentModel.RootGroup | undefined {
	return rootGroups.find((rg) => rg.name === name);
}

function resolveWrapperElementPrefix(group: LegacyGeneratedDocumentModel.RootGroup): string {
	return resolveWrapperPrefix(group.Group?.elements?.[0]?.id);
}

/** Returns the includeConfig reference from a wrapper element's Group, or undefined. */
function resolveGroupDocumentModelId(
	group: LegacyGeneratedDocumentModel.GeneratedDocWrapperElement["Group"] | undefined
): string | undefined {
	// Use ?. defensively — non-conforming legacy fixtures may omit includeConfig at runtime.
	return group?.includeConfig?.reference;
}

/** Resolves the document model ID from a root group's first wrapper element. */
function resolveDocumentModelId(group: LegacyGeneratedDocumentModel.RootGroup): string | undefined {
	const firstElement = group.Group?.elements?.[0];

	if (firstElement === undefined) {
		return undefined;
	}

	return resolveGroupDocumentModelId(firstElement.Group);
}

/** Analyzes a generated document model to identify target/relationship doc model IDs and wrapper element prefixes. */
export function analyzeGeneratedDocumentModel(docModel: LegacyGeneratedDocumentModel): TypedGeneratedDocAnalysis {
	const rootGroups = docModel.content.modelRoot.rootGroups ?? [];

	if (rootGroups.length === 0) {
		return {
			targetDocumentModelId: "",
			targetGroupPrefix: "",
			linkDocumentModelId: undefined,
			relationshipGroupPrefix: undefined
		};
	}

	// Find target group
	const targetGroup = findRootGroupByName(rootGroups, TARGET_GROUP_NAME);
	const targetDocumentModelId = targetGroup ? (resolveDocumentModelId(targetGroup) ?? "") : "";
	const targetGroupPrefix = targetGroup ? resolveWrapperElementPrefix(targetGroup) : "";

	// Find relationship group (may be absent in single-rootGroup docs). Some legacy
	// generated docs place the relationship/link wrapper as a sibling inside the target
	// root group; support that shape without requiring DropDown/TableList-specific logic.
	const relationshipGroup = findRootGroupByName(rootGroups, RELATIONSHIP_GROUP_NAME);
	const fallbackRelationshipElement = relationshipGroup === undefined ? targetGroup?.Group?.elements?.[1] : undefined;
	const linkDocumentModelId = relationshipGroup
		? resolveDocumentModelId(relationshipGroup)
		: fallbackRelationshipElement?.Group !== undefined
			? resolveGroupDocumentModelId(fallbackRelationshipElement.Group)
			: undefined;
	const relationshipGroupPrefix = relationshipGroup
		? resolveWrapperElementPrefix(relationshipGroup)
		: resolveWrapperPrefix(fallbackRelationshipElement?.id);

	return {
		targetDocumentModelId,
		linkDocumentModelId,
		targetGroupPrefix,
		relationshipGroupPrefix: relationshipGroupPrefix.length > 0 ? relationshipGroupPrefix : undefined
	};
}

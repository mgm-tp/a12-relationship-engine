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
 * @module cdm/cdmCommons
 * @experimental
 */

import { type DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";

import { resolveAnnotation, resolveAnnotationOrUndefined } from "../commons/modelUtils.js";

import { type RelationshipGroupAnnotation, type RelationshipGroupInformation } from "./relationshipAnnotations.js";

/** @internal */
export function isRelationshipGroup(element: DocumentModel.Element): boolean {
	return (
		element.type === "Group" &&
		resolveAnnotationOrUndefined(element, "cdm.relationship") !== undefined &&
		resolveAnnotationOrUndefined(element, "cdm.targetDocumentModel") !== undefined
	);
}

/** @internal */
export function dmGroup2RelationshipGroupInfo(relationshipGroup: DocumentModel.Group): RelationshipGroupInformation {
	const relationship = resolveRelationshipGroupAnnotation(relationshipGroup, "cdm.relationship");
	const targetRole = resolveRelationshipGroupAnnotation(relationshipGroup, "cdm.targetRole");
	const sourceRole = resolveRelationshipGroupAnnotation(relationshipGroup, "cdm.sourceRole");
	const targetDocumentModel = resolveRelationshipGroupAnnotation(relationshipGroup, "cdm.targetDocumentModel");
	const multiplicity = relationshipGroup.repeatability;
	const cdmGroupName = relationshipGroup.name;
	return {
		relationship,
		sourceRole,
		targetRole,
		targetDocumentModel,
		cdmGroupName,
		multiplicity
	};
}

function resolveRelationshipGroupAnnotation(
	relationshipGroup: DocumentModel.Group,
	annotation: RelationshipGroupAnnotation
): string {
	return resolveAnnotation(relationshipGroup, annotation);
}

/** @internal */

export function findAllRelationshipGroups(documentModel: DocumentModel): DocumentModel.Group[] {
	return findRelshGroupsRecursively(documentModel.content.modelRoot);

	function findRelshGroupsRecursively(group: DocumentModel.Group): DocumentModel.Group[] {
		const relationshipGroups: DocumentModel.Group[] = [];
		if (isRelationshipGroup(group)) {
			relationshipGroups.push(group);
		}
		for (const element of group.elements) {
			if (element.type === "Group") {
				relationshipGroups.push(...findRelshGroupsRecursively(element));
			}
		}

		return relationshipGroups;
	}
}

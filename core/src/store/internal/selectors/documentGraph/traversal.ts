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

import type { Annotation } from "@com.mgmtp.a12.base/base-model-api";
import type { DocumentModel, EntityInstancePath } from "@com.mgmtp.a12.kernel/kernel-md-facade";

import type { CdmMeta } from "./utils.js";
import { getRelationshipMeta } from "./utils.js";

/** Name of the group that wraps link document data in the CDM model. */
const LINKDOC_GROUPNAME = "relationship";

export interface DocumentBoundary {
	pathIndex: number;
	groupName: string;
	relationshipMeta?: CdmMeta;
	documentModelName: string;
	isCdmNative: boolean;
	isField: boolean;
	/** True when this boundary represents a link document wrapper (LINKDOC_GROUPNAME). */
	isLinkDocument: boolean;
}

/**
 * Walk entity path through the CDM document model, collecting all document boundaries
 * along the path. Returns boundaries ordered from outermost to innermost.
 *
 * Boundary types:
 * - Relationship groups (has cdm.relationship annotations)
 * - Root document group (first non-relationship root group, matched to cdm.queryRoot)
 * - CDM-native groups (other non-relationship root groups)
 * - CDM-native fields/computations (direct children of a relationship group)
 * - Link document groups ("relationship" group inside a relationship group)
 *
 * Returns undefined if any path segment doesn't exist in the model.
 */
export function findDocumentBoundaries(
	cdmModelRoot: DocumentModel.Group,
	cdmHeaderAnnotations: Annotation[] | undefined,
	entityInstancePath: EntityInstancePath
): DocumentBoundary[] | undefined {
	const queryRoot = cdmHeaderAnnotations?.find((a) => a.name === "cdm.queryRoot")?.value;
	const rootGroups = cdmModelRoot.elements;

	if (!rootGroups || rootGroups.length === 0) {
		return undefined;
	}

	const firstNonRelIdx = rootGroups.findIndex(
		(group) => group.type === "Group" && !group.annotations?.some((a) => a.name === "cdm.relationship")
	);

	const ctx: WalkContext = { firstNonRelIdx, queryRoot, boundaries: [] };
	const found = walk(rootGroups, entityInstancePath, 0, true, false, ctx);

	return found ? ctx.boundaries : undefined;
}

interface WalkContext {
	firstNonRelIdx: number;
	queryRoot: string | undefined;
	boundaries: DocumentBoundary[];
}

function walk(
	groups: readonly DocumentModel.Element[],
	path: EntityInstancePath,
	pathIndex: number,
	isTopLevel: boolean,
	isDirectChildOfRel: boolean,
	ctx: WalkContext
): boolean {
	if (pathIndex >= path.length) {
		return true;
	}

	const segment = path[pathIndex];
	const childElement = groups.find((e) => e.name === segment.elementName);

	if (!childElement) {
		return false;
	}

	if (childElement.type !== "Group") {
		if (isDirectChildOfRel) {
			ctx.boundaries.push({
				pathIndex,
				groupName: childElement.name,
				documentModelName: "",
				isCdmNative: true,
				isField: true,
				isLinkDocument: false
			});
		}

		return true;
	}

	const childGroup = childElement;
	const rmMeta = getRelationshipMeta(childGroup);

	if (rmMeta) {
		ctx.boundaries.push({
			pathIndex,
			groupName: childGroup.name,
			relationshipMeta: rmMeta,
			documentModelName: rmMeta.targetDocumentModel,
			isCdmNative: false,
			isField: false,
			isLinkDocument: false
		});

		return walk(childGroup.elements, path, pathIndex + 1, false, true, ctx);
	}

	// Link document wrapper: "relationship" group that is a direct child of a relationship group
	if (isDirectChildOfRel && childGroup.name === LINKDOC_GROUPNAME) {
		ctx.boundaries.push({
			pathIndex,
			groupName: childGroup.name,
			documentModelName: "",
			isCdmNative: false,
			isField: false,
			isLinkDocument: true
		});

		return walk(childGroup.elements, path, pathIndex + 1, false, false, ctx);
	}

	if (isTopLevel) {
		const groupIdx = groups.indexOf(childElement);

		if (groupIdx === ctx.firstNonRelIdx) {
			ctx.boundaries.push({
				pathIndex: -1,
				groupName: childGroup.name,
				documentModelName: ctx.queryRoot ?? "",
				isCdmNative: false,
				isField: false,
				isLinkDocument: false
			});
		} else {
			ctx.boundaries.push({
				pathIndex,
				groupName: childGroup.name,
				documentModelName: "",
				isCdmNative: true,
				isField: false,
				isLinkDocument: false
			});
		}
	}

	return walk(childGroup.elements, path, pathIndex + 1, false, false, ctx);
}

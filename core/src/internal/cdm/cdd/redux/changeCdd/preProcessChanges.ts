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

import type { GroupInstance } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import {
	type Change,
	DocumentPath,
	type GroupAdded,
	type ReadonlyObjectMap
} from "@com.mgmtp.a12.formengine/formengine-core";

import { notUndefined } from "../../../commons/utils.js";
import { assertObjectType } from "../../../../shared/assertion.js";
import { comparePaths, DocumentUtils } from "../../../../shared/utils.js";
import { DOCUMENT_SERVICE } from "../../../cdmCommons/documentService.js";

type GroupAddedPathMap = { [path: string]: { count: number; updated: number } };

const KERNEL_OFFSET = 1;

/**
 * @internal
 *
 * Pre-processes the changes handed via the ChangeCddDocumentPayload.
 *
 * Following mutations are applied:
 *
 * * The path of "GroupAdded" changes is changed from the path of the repeatable
 * group (index 0) or the source of a cloned repeatable group to the path of the
 * added group instance.
 * * The changes are sorted by their path. This is done to prevent "sparse
 * errors" from kernel. "Revert" changes, which have no path, are sorted to the
 * end.
 */
export function preProcessChanges(changeMap: ReadonlyObjectMap<Change>, document: object): Change[] {
	let groupAddedPathMap: GroupAddedPathMap = {};
	const changes = Object.values(changeMap).filter(notUndefined);

	// First pass: counting changes for the same path, e.g. multiple GroupAdded for multi file upload
	changes.filter(isGroupAddedChange).forEach((change) => {
		groupAddedPathMap = countGroupAdded(change, groupAddedPathMap);
	});

	/*
	 * Second pass: processing and sorting

	 * sort changes to prevent "sparse errors" in kernel ( e.g. when updating an index > 1 when empty)

	 * A simple sort over stringified paths is not sufficient since e.g. for
	 * paths differing only by one index, index 10 comes before index 9
	 *
	 * Revert changes are sorted to the end, since they have no path.
	 * This is no issue since a revert change comes alone usually.
	 */
	return changes.map((change) => processChange(change, document, groupAddedPathMap)).sort(compareChanges);
}

function countGroupAdded(change: GroupAdded, groupAddedPathMap: GroupAddedPathMap): GroupAddedPathMap {
	const repeatableGroupPath = DocumentUtils.getGroupInstancesPath(change.path);
	const pathAsString = DocumentPath.toString(repeatableGroupPath);

	return {
		...groupAddedPathMap,
		[pathAsString]: groupAddedPathMap[pathAsString]
			? {
					...groupAddedPathMap[pathAsString],
					count: groupAddedPathMap[pathAsString].count + 1
				}
			: { count: 1, updated: 0 }
	};
}

function processChange(change: Change, document: object, groupAddedPathMap: GroupAddedPathMap): Change {
	return change.type === "GroupAdded"
		? processGroupAdded(change, document as GroupInstance, groupAddedPathMap)
		: change;
}

/**
 * adapt the path of a GroupAdded change to have the instance path of the
 * actual added group instance instead of the group (index 0) or the copy
 * source group instance (index of the source)
 */
function processGroupAdded(
	change: GroupAdded,
	document: GroupInstance,
	groupAddedPathMap: GroupAddedPathMap
): GroupAdded {
	const repeatableGroupPath = wasGroupCopied(change) ? DocumentUtils.getGroupInstancesPath(change.path) : change.path;

	const pathAsString = DocumentPath.toString(repeatableGroupPath);
	const { count, updated } = groupAddedPathMap[pathAsString];

	const repeatableGroupInstance = DOCUMENT_SERVICE.getAssignedObject(document, repeatableGroupPath);
	assertObjectType(
		repeatableGroupInstance,
		DocumentUtils.isGroupInstances,
		`group not found: ${DocumentPath.toString(change.path)}`
	);

	const updatedChange: GroupAdded = {
		...change,
		path: [
			...change.path.slice(0, -1),
			{
				elementName: change.path.slice(-1)[0].elementName,
				index: repeatableGroupInstance.length - count + updated + KERNEL_OFFSET
			}
		]
	};
	groupAddedPathMap[pathAsString].updated++;

	return updatedChange;
}

function isGroupAddedChange(change: Change): change is GroupAdded {
	return change.type === "GroupAdded";
}

function wasGroupCopied(change: GroupAdded): boolean {
	return change.path.at(-1)?.index !== 0;
}

function compareChanges(a: Change, b: Change) {
	if (
		(a.type !== "Revert" && b.type !== "Revert" && comparePaths(a.path, b.path) < 0) ||
		(a.type !== "Revert" && b.type === "Revert")
	) {
		return -1;
	} else if (
		(a.type !== "Revert" && b.type !== "Revert" && comparePaths(a.path, b.path) > 0) ||
		(a.type === "Revert" && b.type !== "Revert")
	) {
		return 1;
	} else {
		return 0;
	}
}

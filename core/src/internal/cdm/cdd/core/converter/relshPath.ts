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
 * @module cdm/cdd
 * @experimental
 */
import type { ModelPath } from "@com.mgmtp.a12.base/base-model-api";
import type { DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade";

import { isNonRepeatableGroup } from "../../../commons/modelUtils.js";
import type { RelshPath } from "../../../../documentGraph/core/index.js";
import { isRelationshipGroup, dmGroup2RelationshipGroupInfo } from "../../../cdmCommons/relationshipGroup.js";

/**
 * @internal
 *
 * Extracts last path segment, e.g. "/CoInsurer/Location" ==> "Location"
 */
export function extractRelshNameFromRelshPath(relshName: RelshPath): string {
	const split = relshName.split("/");

	return split[split.length - 1];
}

/**
 * @internal
 *
 * Find relationship paths in the CDM that end in the given relsh,
 * e.g. `"CoInsured" ==> ["CoInsured", "X/Y/CoInsured"]`.
 * Note that paths don't start with '/'.
 */
export function collectRelshPathsForRelsh(rootGroup: DocumentModel.Group, relshName: string): RelshPath[] {
	const result: string[] = [];
	iterate([], rootGroup);

	return result;

	function iterate(parentPath: string[], group: DocumentModel.Group): void {
		const relshGroupInfo = isRelationshipGroup(group) ? dmGroup2RelationshipGroupInfo(group) : undefined;
		// Add to path only if current group represents an actual relationship, otherwise ignore
		const pathAsArray = relshGroupInfo?.relationship ? [...parentPath, relshGroupInfo.relationship] : parentPath;

		if (relshGroupInfo?.relationship === relshName) {
			result.push(pathAsArray.join("/"));
		} else {
			for (const child of group.elements) {
				if (child.type === "Group") {
					iterate(pathAsArray, child);
				}
			}
		}
	}
}

/**
 * @internal
 *
 * Translates e.g. "/CoInsurer/Location" to "r_coInsurer/r_location"
 */
export function relshPathToModelPath(rootGroup: DocumentModel.Group, relshPath: RelshPath): ModelPath | undefined {
	const pathSegments = (relshPath.length > 0 && relshPath.charAt(0) === "/" ? relshPath.slice(1) : relshPath).split(
		"/"
	);

	return traverse(rootGroup, pathSegments, []);

	function traverse(
		group: DocumentModel.Group,
		remainingPathArray: string[],
		growingModelPath: ModelPath
	): ModelPath | undefined {
		if (remainingPathArray.length === 0 || remainingPathArray[0].length === 0) {
			return growingModelPath;
		}

		const [head, ...tail] = remainingPathArray;
		const subGroups = group.elements.filter((el) => el.type === "Group");

		for (const subGroup of subGroups) {
			const modelPathArg =
				subGroup.annotations?.find(({ name }) => name === "cdm.relationship")?.value === head // Case: found a match, now proceed traversal
					? tail
					: isNonRepeatableGroup(subGroup) // Case: no match, but now try to skip nonRepeatable groups
						? remainingPathArray
						: undefined; // Other cases: skip

			if (modelPathArg !== undefined) {
				const fullModelPath = traverse(subGroup as DocumentModel.Group, modelPathArg, [
					...growingModelPath,
					{ elementName: subGroup.name }
				]);

				if (fullModelPath !== undefined) {
					return fullModelPath;
				}
			}
		}

		// no repeatable group found, or a repeatable group which does not match current path segment
		// ==> end & backtrack
		return undefined;
	}
}

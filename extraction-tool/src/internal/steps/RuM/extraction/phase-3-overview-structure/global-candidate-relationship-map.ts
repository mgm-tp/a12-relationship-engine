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

import type { WorkspaceModel } from "@com.mgmtp.a12.migrationtool/migrationtool-core/types";

import { forEachRelationshipBinding } from "./binding-configuration-scanner.js";

/**
 * Builds a global map of candidate overview IDs to relationship names.
 *
 * Scans form workspace headers captured during the initial workspace scan and
 * records every candidate overview model referenced by relationship bindings.
 */
export function buildGlobalCandidateRelationshipMap(
	workspaceForms: readonly WorkspaceModel[]
): ReadonlyMap<string, ReadonlySet<string>> {
	const relationshipMap = new Map<string, Set<string>>();

	forEachRelationshipBinding(workspaceForms, (binding) => {
		for (const component of binding.components) {
			for (const candidateModel of component.models?.filter((modelRef) => modelRef.use === "candidate") ?? []) {
				addRelationshipName(relationshipMap, candidateModel.name, binding.relationshipName);
			}
		}
	});

	return relationshipMap;
}

/**
 * Determines whether a candidate overview must be cloned for relationship-specific output.
 *
 * @param overviewId - The candidate overview model ID.
 * @param globalMap - The global candidate relationship map.
 * @returns true when at least two unique relationship names reference the overview.
 */
export function shouldCloneCandidate(overviewId: string, globalMap: ReadonlyMap<string, ReadonlySet<string>>): boolean {
	return (globalMap.get(overviewId)?.size ?? 0) >= 2;
}

function addRelationshipName(
	relationshipMap: Map<string, Set<string>>,
	overviewId: string,
	relationshipName: string
): void {
	const existingRelationships = relationshipMap.get(overviewId);

	if (existingRelationships) {
		existingRelationships.add(relationshipName);
	} else {
		relationshipMap.set(overviewId, new Set([relationshipName]));
	}
}

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
 * @module cdm/data-provider
 * @experimental
 */

import { type DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";

import { assertCondition } from "../../../shared/assertion.js";
import { relshPathToModelPath } from "../../cdd/core/index.js";
import { type RelationshipGroupInformation } from "../../cdmCommons/relationshipAnnotations.js";
import { dmGroup2RelationshipGroupInfo, isRelationshipGroup } from "../../cdmCommons/relationshipGroup.js";
import { findModelElementByPath, queryRootName } from "../../commons/modelUtils.js";
import { addToMapOfArrays } from "../../commons/utils.js";

import { CDM_Graph, type CdmRelationship, type DirectedRelationships } from "./CDM_Graph.js";

/** @internal */
export function cdmToGraph(cdm: DocumentModel, relshPath: string): CDM_Graph {
	return relshPath === "" || relshPath === "/" ? graphForCDM(cdm) : graphForSubCDM(cdm, relshPath);
}

function graphForCDM(cdm: DocumentModel): CDM_Graph {
	const rootModelName = queryRootName(cdm);
	if (rootModelName === undefined) {
		throw new Error("CDM missing query root");
	}
	return rmGroup2SMG(cdm.content.modelRoot, rootModelName);
}

function graphForSubCDM(cdm: DocumentModel, relshPath: string): CDM_Graph {
	const modelPath =
		relshPathToModelPath(cdm.content.modelRoot, relshPath[0] === "/" ? relshPath : "/" + relshPath) || [];
	const rmGroup = findModelElementByPath(cdm, modelPath);
	assertCondition(rmGroup !== undefined && rmGroup.type === "Group", `"${modelPath} must be a group"`);
	const { targetDocumentModel } = dmGroup2RelationshipGroupInfo(rmGroup);
	return rmGroup2SMG(rmGroup, targetDocumentModel);
}

function rmGroup2SMG(rmGroup: DocumentModel.Group, smgRootName: string): CDM_Graph {
	const root = CDM_Graph.createSimpleDocModel(smgRootName);
	const relationships: DirectedRelationships = {};
	findAndAddRelationships(rmGroup, smgRootName);
	return { root, relationships };

	function findAndAddRelationships(group: DocumentModel.Group, currentModelId: string): void {
		const relationshipGroups = findRelationshipGroups(group);
		for (const rg of relationshipGroups) {
			const rgInfo = dmGroup2RelationshipGroupInfo(rg);
			addRelationship(currentModelId, rgInfo);
			findAndAddRelationships(rg, rgInfo.targetDocumentModel);
		}
	}

	function findRelationshipGroups(group: DocumentModel.Group): DocumentModel.Group[] {
		const result: DocumentModel.Group[] = [];
		for (const element of group.elements) {
			if (element.type === "Group") {
				if (isRelationshipGroup(element)) {
					result.push(element);
				} else {
					result.push(...findRelationshipGroups(element));
				}
			}
		}
		return result;
	}

	function addRelationship(source: string, rgInfo: RelationshipGroupInformation): void {
		const exists = (relationships[source] ?? []).some((srm) => srm.name === rgInfo.relationship);
		if (!exists) {
			const cdmRelationship: CdmRelationship = {
				name: rgInfo.relationship,
				sourceRole: rgInfo.sourceRole,
				targetRole: rgInfo.targetRole,
				targetDocumentModel: rgInfo.targetDocumentModel
			};
			addToMapOfArrays(relationships, source, cdmRelationship);
		}
	}
}

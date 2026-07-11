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
import type { Relationship } from "@com.mgmtp.a12.dataservices/dataservices-access";

import { assertObject } from "../../shared/assertion.js";
import { queryRootName } from "../commons/modelUtils.js";
import { addMissingPaths } from "../cdd/core/impl/pending.js";
import type { PartialCddState } from "../cdd/core/cddState.js";
import * as DocOps from "../../documentGraph/core/impl/docs.js";
import type { RelshPath } from "../../documentGraph/core/index.js";
import { addLink, addDocument } from "../../documentGraph/core/reducers.js";
import { collectRelshPathsForRelsh } from "../cdd/core/converter/relshPath.js";

import { updateCdd } from "./updateCdd.js";
import type { CdmData } from "./cdmData.js";

/** @internal */
export interface AddLinksToCddArgs {
	readonly linkDescriptor: Relationship.LinkDescriptor;
	readonly targetRole: string;
	readonly linkDoc?: GroupInstance;
	readonly candidateDoc?: GroupInstance;
	readonly targetDoc?: {
		readonly documentModelName: string;
		readonly document: GroupInstance;
	};
}

/** @internal */
export function addLinksToCdd(data: CdmData, args: AddLinksToCddArgs): CdmData {
	const { linkDescriptor, linkDoc, targetRole, targetDoc, candidateDoc } = args;

	const targetDocRef = linkDescriptor.entities.find((entity) => entity.role === targetRole)?.docRef;

	if (targetDocRef === undefined || targetDocRef === null) {
		throw new Error("DocRef for targetRole not found in candidate: " + JSON.stringify(linkDescriptor, undefined, 2));
	}

	const isNormalDm = !queryRootName(data.cddState.cdm);

	// the new document must be added to the dg first before we can link to it
	const previousData = isNormalDm
		? addExistingDocument(data, targetDocRef, targetRole, linkDescriptor, candidateDoc)
		: targetDoc
			? addCreatedDocument(data, targetDocRef, targetDoc)
			: data;

	// if this is not the create & link case, the missing path must be added to load the sub-tree behind the link
	const updatedCddState = targetDoc ? undefined : cddStateWithMissingPath(data, targetDocRef, linkDescriptor);

	const addLinkArgs = { linkDescriptor, linkDoc };

	const dataWithUpdatedLinkAndChangelog: CdmData = {
		...previousData,
		...addLink(previousData, addLinkArgs)
	};

	const dataWithUpdatedCddState = updateCdd(previousData, dataWithUpdatedLinkAndChangelog, updatedCddState);

	return dataWithUpdatedCddState;
}

function addExistingDocument(
	data: CdmData,
	targetDocRef: string,
	targetRole: string,
	linkDescriptor: Relationship.LinkDescriptor,
	candidateDoc?: GroupInstance
): CdmData {
	assertObject(candidateDoc);

	const targetEntity = linkDescriptor.entities.find(
		(e) => e.docRef === targetDocRef && e.role === targetRole
	) as Relationship.LinkEntitySpecResponse;

	// target doc already exists on the server, but not in the DG
	// therefore we only add it here and omit the changelog entry
	const [documentGraph] = DocOps.addDocument(candidateDoc, targetDocRef, targetEntity.modelName, data.documentGraph);

	return {
		...data,
		...documentGraph
	};
}

function addCreatedDocument(
	data: CdmData,
	targetDocRef: string,
	targetDoc: {
		readonly documentModelName: string;
		readonly document: GroupInstance;
	}
): CdmData {
	const addDocumentArgs = {
		elementRef: targetDocRef,
		document: targetDoc.document,
		documentModelName: targetDoc.documentModelName
	};

	return { ...data, ...addDocument(data, addDocumentArgs) };
}

function cddStateWithMissingPath(
	data: CdmData,
	targetDocRef: string,
	linkDescriptor: Relationship.LinkDescriptor
): PartialCddState {
	const relshName = linkDescriptor.relationshipModel;
	const relshPaths: RelshPath[] = collectRelshPathsForRelsh(data.cddState.cdm.content.modelRoot, relshName);

	return addMissingPaths(data.cddState, { relshName, targetDocRef }, relshPaths);
}

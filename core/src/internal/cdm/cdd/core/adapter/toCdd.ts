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

import { merge } from "lodash-es";

import type { DocumentModel, GroupInstance } from "@com.mgmtp.a12.kernel/kernel-md-facade";

import { assertCondition } from "../../../../shared/assertion.js";
import { targetDocRefBySourceDocRef } from "../../../commons/relationshipModelUtils.js";
import { dmGroup2RelationshipGroupInfo } from "../../../cdmCommons/relationshipGroup.js";
import { LINK_ID, T_DOC_REF, getCddDoc, LINKDOC_GROUPNAME } from "../../../cdmCommons/cddTechnical.js";
import type { DocRef, DgDocument, DeepReadonly, DocumentGraph } from "../../../../documentGraph/core/index.js";
import {
	isNonRepeatableGroup,
	assertIsNonRepeatableGroup,
	resolveAnnotationOrUndefined
} from "../../../commons/modelUtils.js";

/**
 * All but the last group of an entry are non-repeatable groups
 * The last group of each entry is a relsh rep!
 */
type LinkInsertionPath = DocumentModel.Group[];

/** @internal */
export function toCdd(
	dg: DeepReadonly<DocumentGraph>,
	rootDocRef: DocRef,
	rootGroup: DocumentModel.Group,
	selectedLinkId?: string
): DeepReadonly<GroupInstance> {
	const cdd = buildCdd(rootGroup, rootDocRef);

	const cddDoc = getCddDoc(dg);

	// merges right into left, mutating left! (which is fine, since left is a newly created object)
	return merge(cdd, cddDoc);

	function buildCdd(currentGroup: DocumentModel.Group, sourceDocRef: DocRef): GroupInstance {
		const dgDoc = dg.documents.byDocRef[sourceDocRef];
		const doc = dgDoc.loadingState === "loaded" ? dgDoc.document : {};
		const docModel = dgDoc.loadingState === "loaded" ? dgDoc.documentModelName : "";

		const targetModel = resolveAnnotationOrUndefined(currentGroup, "cdm.targetDocumentModel");

		const draftCdd = {
			...doc,
			[T_DOC_REF]: sourceDocRef,
			// id and modelId are added here for the form engine to find out
			// the documentId that is used for attachment handling
			id: sourceDocRef,
			modelId: targetModel ?? docModel
		} as GroupInstance;

		// Find out all relsh that are traversed from current group by a single hop
		const lipAA: LinkInsertionPath[][] = currentGroup.elements
			.filter((el): el is DocumentModel.Group => el.type === "Group")
			.map(flattenGroup);

		for (const lip of lipAA.flat()) {
			// lip contains the group nesting (relative to draftCdd) to the "relshRepresentant" group
			embedRelsh(draftCdd, sourceDocRef, lip);
		}

		return draftCdd;
	}

	// Note: draftDoc will be modified.
	function embedRelsh(draftCdd: GroupInstance, sourceDocRef: DocRef, lip: LinkInsertionPath) {
		const unfilteredLinkIds = Array.from(new Set(dg.links.linkIdsByDocId[sourceDocRef] ?? []));
		const unfilteredLinks = unfilteredLinkIds.map((linkId) => dg.links.byId[linkId]);
		const relshRepresentant = lip[lip.length - 1];

		const { sourceRole, relationship } = dmGroup2RelationshipGroupInfo(relshRepresentant);

		let linksForRelsh = unfilteredLinks.filter(
			(link) =>
				link.linkRef.linkDescriptor.relationshipModel === relationship &&
				link.linkRef.linkDescriptor.entities.some((e) => e.docRef === sourceDocRef && e.role === sourceRole)
		);

		if (lip.length === 1 && lip[0].repeatability === 1 && selectedLinkId) {
			const selectedLink = linksForRelsh.find((link) => link.linkRef.id === selectedLinkId);

			if (selectedLink) {
				linksForRelsh = [selectedLink];
			}
		}

		for (const link of linksForRelsh) {
			const targetDocRef = targetDocRefBySourceDocRef(link.linkRef.linkDescriptor, sourceDocRef);

			if (targetDocRef === undefined) {
				continue;
			}

			const linkDgDoc = getLinkDgDocument(dg, link.linkDocRef);
			// Process target and traverse recursively
			const targetDoc = buildCdd(relshRepresentant, targetDocRef);

			const subCdd = {
				...targetDoc,
				[LINK_ID]: link.linkRef.id,
				...(linkDgDoc && {
					[LINKDOC_GROUPNAME]: {
						...linkDgDoc.document,
						[T_DOC_REF]: linkDgDoc.docRef,
						modelId: linkDgDoc.documentModelName
					}
				})
			} as GroupInstance;
			embedSubCdd(draftCdd, lip, subCdd);
		}

		return draftCdd;
	}

	// Note: draftDoc will be modified.
	function embedSubCdd(draftCdd: GroupInstance, lip: LinkInsertionPath, subCdd: GroupInstance) {
		assertCondition(lip.length > 0, "lip must at least have one group");

		// First navigate (and populate if required) to insertion point via lip
		const parentGroups = lip.slice(0, -1);
		const lastGroup = lip[lip.length - 1];
		// parentGroups: contains all but the last group; these groups MUST be non-repeatable!
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const parentGroup: any = parentGroups.reduce(navigateParent, draftCdd);
		let insertionObject = parentGroup[lastGroup.name];

		if (insertionObject === undefined || insertionObject === null) {
			insertionObject = lastGroup.repeatability === 1 ? {} : [];
		}

		if (lastGroup.repeatability === 1) {
			assertCondition(
				typeof insertionObject === "object",
				"insertionObject must be an object according to group metadata"
			);
			parentGroup[lastGroup.name] = { ...insertionObject, ...subCdd };
		} else {
			assertCondition(Array.isArray(insertionObject), "insertionObject must be array according to group metadata");
			parentGroup[lastGroup.name] = [...insertionObject, subCdd];
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function navigateParent(docPointer: any, group: DocumentModel.Group): GroupInstance {
		assertIsNonRepeatableGroup(group);
		let next = docPointer[group.name];

		if (next === undefined || next === null) {
			// Non-Repeatable groups are objects and not arrays!
			next = docPointer[group.name] = {};
		}

		return next as GroupInstance; // Casting is allowed because group is non-repeating!
	}

	// Return one or more LinkInsertionPaths; one for each relsh representant.
	// Note the nesting; this is due to the need to hop over non-repeatable groups that are not relsh reps.
	function flattenGroup(group: DocumentModel.Group): LinkInsertionPath[] {
		if (group.annotations?.find(({ name }) => name === "cdm.relationship")?.value !== undefined) {
			return [[group]];
		} else if (isNonRepeatableGroup(group)) {
			return flattenNonRepeatableNonRepGroup(group);
		} else {
			return [];
		}
	}

	function flattenNonRepeatableNonRepGroup(group: DocumentModel.Group): LinkInsertionPath[] {
		assertCondition(isNonRepeatableGroup(group));
		assertCondition(group.annotations?.find(({ name }) => name === "cdm.relationship")?.value === undefined); // Must not be a relsh representant
		const ngAA: LinkInsertionPath[][] = group.elements
			.filter((el): el is DocumentModel.Group => el.type === "Group")
			.map((subGroup) => {
				const a = flattenGroup(subGroup);

				return a.map((ng) => [subGroup, ...ng]);
			});

		return ngAA.flat();
	}
}

type LoadedDgDoc = DgDocument & {
	readonly loadingState: "loaded";
};

function getLinkDgDocument(dg: DeepReadonly<DocumentGraph>, linkDocRef?: string | null): LoadedDgDoc | undefined {
	const linkDgDoc = linkDocRef ? dg.documents.byDocRef[linkDocRef] : undefined;

	return linkDgDoc?.loadingState === "loaded" ? linkDgDoc : undefined;
}

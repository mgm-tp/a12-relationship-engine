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

import {
	type ModelGraph,
	type Relationship,
	type RelationshipModel
} from "@com.mgmtp.a12.dataservices/dataservices-access";
import { DocumentPath } from "@com.mgmtp.a12.formengine/formengine-core";
import {
	type DocumentModel,
	type EntityInstancePath,
	type FieldInstanceValue,
	type GroupInstance
} from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";

import { assertObject, assertObjectType } from "../../shared/assertion.js";
import { DocumentUtils } from "../../shared/utils.js";
import { type DeepReadonly } from "../../documentGraph/core/index.js";
import { changeDocument, type ChangeDocumentArgs } from "../../documentGraph/core/reducers.js";

import { getDocRefByCddPath } from "../cdd/core/converter/docRefResolver.js";
import { newDocRef } from "../cdd/redux/newDocRef.js";
import { LINK_ID } from "../cdmCommons/cddTechnical.js";
import { DOCUMENT_SERVICE } from "../cdmCommons/documentService.js";
import { findChangeLocation } from "../cdmCommons/findChangeLocation.js";
import { isLinkDocGroup } from "../cdmCommons/linkDocumentGroup.js";
import { dmGroup2RelationshipGroupInfo, isRelationshipGroup } from "../cdmCommons/relationshipGroup.js";
import { findModelElementByPath } from "../commons/modelUtils.js";

import { addLinksToCdd, type AddLinksToCddArgs } from "./addLinksToCdd.js";
import { type CdmData } from "./cdmData.js";
import { type EntityInstance } from "./entityInstance.js";
import { findDocumentGraphDocument } from "./findDocumentGraphDocument.js";
import { getUpdateValue } from "./getUpdateValue.js";
import { removeLinkFromCdd } from "./removeLinkFromCdd.js";
import { unwrapCdmData } from "./unwrapCdmData.js";
import { updateCdd } from "./updateCdd.js";

/**
 * Mutable cache for the `presentRelationships` set, keyed by reference
 * identity of `links.byId`. Create one instance per batch of `setValue`
 * calls and pass it through to avoid re-computing the set on every call.
 *
 * @internal
 */
export interface PresentRelationshipsCache {
	linksById: unknown;
	presentRelationships: Set<string> | undefined;
}

/** @internal */
export function createPresentRelationshipsCache(): PresentRelationshipsCache {
	return { linksById: undefined, presentRelationships: undefined };
}

/**
 * Handles a value change in the cdd by applying the equivalent document change
 * to the DG and updating the cdd afterwards
 *
 * When the changed value is an instance of a relationship group or refers to a
 * link document, a new empty doc is added and linked in the dg. Removing such
 * group instances is currently only supported via the removeLink action at
 * runtime.
 *
 * When the changed value is an instance of a non-relationship group and the
 * input document contains the instance at the change path, a new empty group
 * instance is added to the parent dg document. When the instance is not present
 * in the input document, the group instance is removed from its parent dg
 * document
 *
 * When the changed value is an instance of a field, the value is updated in the
 * parent dg document. If any ancestor of a new, defined field instance is not
 * yet present, it is created like described above before the field value is
 * written.
 *
 * @param mode should be "heterogeneityTypeUnknown", when setValue is called
 * during initialization or for the creation of nested instances after adding a
 * group instance
 *
 * @experimental
 * @internal
 */
export function setValue(
	data: CdmData,
	value: Readonly<GroupInstance> | FieldInstanceValue | undefined,
	path: EntityInstancePath,
	documentModels: DocumentModel[],
	modelGraph: ModelGraph,
	mode?: "heterogeneityTypeUnknown",
	cache?: PresentRelationshipsCache
): CdmData {
	const { instancesToSet, ancestorDocumentsMissing } = determineInstancesToSet(data, value, path, cache);

	return instancesToSet.reduce(
		(currentData, currentInstance) =>
			setValueInternal(
				currentData,
				currentInstance.value,
				currentInstance.path,
				documentModels,
				modelGraph,
				ancestorDocumentsMissing ? "heterogeneityTypeUnknown" : mode
			),
		data
	);
}

/**
 * Determines the instances to add to the cdmData, including instances for any
 * missing ancestor of a to-be-updated field instance and a boolean flag
 * telling if among the missing ancestors are relationship group instances.
 *
 * Ancestors count as missing, when:
 * - the group instance is missing in cdd
 * - a relationship group instance is present in cdd but no doc and link present
 * in dg, i.e. in dg the group instance for the relationship group is only
 * present in the cddDocument e.g. for computed values.
 *
 * Instances for to-many relationship groups are assumed to never be missing,
 * since they are added first in the groupAdded case or when setting initial
 * values.
 *
 * If a field value would be set to undefined and ancestors are missing, an
 * empty list is returned to prevent creating unneeded instances.
 */
function determineInstancesToSet(
	data: CdmData,
	value: Readonly<GroupInstance> | FieldInstanceValue | undefined,
	path: EntityInstancePath,
	cache?: PresentRelationshipsCache
): { instancesToSet: EntityInstance[]; ancestorDocumentsMissing: boolean } {
	const { cdm, cdd } = unwrapCdmData(data);
	const modelElement = getModelElement(cdm, path);
	const presentRelationships = getPresentRelationships(data.documentGraph.links.byId, cache);

	const ancestorPaths = getAncestorPaths(path);
	const pathsOfMissingAncestors = findPathsOfMissingAncestors(ancestorPaths, cdd, cdm, presentRelationships);

	const instancesToSet = wouldOnlyCreateUnneededInstances(pathsOfMissingAncestors, modelElement, value)
		? []
		: [
				...pathsOfMissingAncestors.map((ancestorPath) => ({ path: ancestorPath, value: {} })),
				...(shouldValueBeWritten() ? [{ path, value }] : [])
			];

	return {
		instancesToSet,
		ancestorDocumentsMissing: areAncestorDocumentMissing()
	};

	/**
	 * Checks if the actual instance should be deleted, is still missing or
	 * really needs to be changed.
	 */
	function shouldValueBeWritten(): boolean {
		return (
			value === undefined ||
			missingEntity(path, cdd, cdm, presentRelationships) ||
			DOCUMENT_SERVICE.getAssignedObject(cdd, path) !== value
		);
	}

	/**
	 * Checks if among the missing ancestors is a relationship group for which
	 * the document is missing in the dg. Could occur e.g. for a computed field
	 * in a to-1 related document model.
	 */
	function areAncestorDocumentMissing(): boolean {
		return (
			pathsOfMissingAncestors.length > 0 &&
			pathsOfMissingAncestors
				.map((path) => {
					const modelElement = getModelElement(cdm, path);
					return modelElement.type === "Group" && isRelationshipGroup(modelElement);
				})
				.some(Boolean)
		);
	}
}

function getPresentRelationships(
	linksById: Record<string, { readonly linkRef: { readonly linkDescriptor: { readonly relationshipModel: string } } }>,
	cache?: PresentRelationshipsCache
): Set<string> {
	if (cache && cache.linksById === linksById && cache.presentRelationships) {
		return cache.presentRelationships;
	}
	const result = new Set(Object.values(linksById).map((link) => link.linkRef.linkDescriptor.relationshipModel));
	if (cache) {
		cache.linksById = linksById;
		cache.presentRelationships = result;
	}
	return result;
}

function setValueInternal(
	data: CdmData,
	value: Readonly<GroupInstance> | FieldInstanceValue | undefined,
	path: EntityInstancePath,
	documentModels: DocumentModel[],
	modelGraph: ModelGraph,
	mode?: "heterogeneityTypeUnknown"
): CdmData {
	const { cdm, cdd } = unwrapCdmData(data);
	const modelElement = getModelElement(cdm, path);

	if (isRelationshipGroup(modelElement) && value === undefined) {
		const linkRef = getLinkRef(data, path);
		assertObject(linkRef, "Expected link to exist for relationship group instance to remove.");

		return removeLinkFromCdd(data, linkRef);
	} else if (isRelationshipGroup(modelElement)) {
		const linkInfo = getLinkInfo(path, modelElement as DocumentModel.Group, cdd, cdm);

		if (
			mode === "heterogeneityTypeUnknown" &&
			initializingHeterogeneousRelationship(linkInfo.targetDocumentModelName, modelGraph)
		) {
			throw new Error(
				`Cannot set initial or computed values in document of unknown heterogeneous type at path '${JSON.stringify(
					path
				)}'`
			);
		}

		const newDocument: GroupInstance = {};
		const addLinkArgs: AddLinksToCddArgs = {
			linkDescriptor: linkInfo.linkDescriptor,
			targetRole: linkInfo.targetRole,
			targetDoc: {
				documentModelName: linkInfo.targetDocumentModelName,
				document: newDocument
			}
		};

		return addLinksToCdd(data, addLinkArgs);
	} else {
		// change document in dg
		const changeDocumentArgs = isLinkDocGroup(modelElement, path, cdm)
			? getChangeDocumentArgsForLinkDocGroup(cdd, path)
			: getRegularChangeDocumentArgs(data, documentModels, modelGraph.relationshipModels, path, value);

		const dataWithUpdatedDgAndChangelog: CdmData = {
			...data,
			...changeDocument(data, changeDocumentArgs)
		};

		// update cachedCdd
		return updateCdd(data, dataWithUpdatedDgAndChangelog);
	}
}

function getAncestorPaths(path: EntityInstancePath): EntityInstancePath[] {
	const ancestorPaths: EntityInstancePath[] = [];
	for (let i = 1; i < path.length; i++) {
		ancestorPaths.push(path.slice(0, i));
	}
	return ancestorPaths;
}

function findPathsOfMissingAncestors(
	ancestorPaths: EntityInstancePath[],
	cdd: GroupInstance,
	cdm: DocumentModel,
	presentRelationships: Set<string>
): EntityInstancePath[] {
	return ancestorPaths.filter((path) => missingEntity(path, cdd, cdm, presentRelationships));
}

function missingEntity(
	path: EntityInstancePath,
	cdd: GroupInstance,
	cdm: DocumentModel,
	presentRelationships: Set<string>
): boolean {
	return missingInCdd(path, cdd) || missingLinkInDg(path, cdm, presentRelationships);
}

function missingInCdd(path: EntityInstancePath, cdd: GroupInstance): boolean {
	return DOCUMENT_SERVICE.getAssignedObject(cdd, path) === undefined;
}

/**
 * Determines if a link is not yet present in the dg based on the relationship
 * of the expected link.
 *
 * Since the dg links don't contain the role info, we cannot differentiate
 * between nested usages of the same relationship.
 */
function missingLinkInDg(path: EntityInstancePath, cdm: DocumentModel, presentRelationships: Set<string>): boolean {
	const modelElement = findModelElementByPath(cdm, path);

	if (modelElement?.type !== "Group" || !isRelationshipGroup(modelElement)) {
		return false;
	}
	const rgi = dmGroup2RelationshipGroupInfo(modelElement);

	return !presentRelationships.has(rgi.relationship);
}

function wouldOnlyCreateUnneededInstances(
	pathsOfMissingAncestors: EntityInstancePath[],
	modelElement: DocumentModel.Element,
	value: Readonly<GroupInstance> | FieldInstanceValue | undefined
): boolean {
	return pathsOfMissingAncestors.length > 0 && modelElement.type === "Field" && value === undefined;
}

interface LinkInfo {
	linkDescriptor: Relationship.LinkDescriptor;
	targetRole: string;
	targetDocumentModelName: string;
}
function getLinkInfo(
	path: EntityInstancePath,
	modelElement: DocumentModel.Group,
	cdd: GroupInstance,
	cdm: DocumentModel
): LinkInfo {
	const relationshipGroupInfo = dmGroup2RelationshipGroupInfo(modelElement);
	const sourceDocRef = getDocRefByCddPath(path.slice(0, -1), cdd, cdm);
	assertObject(sourceDocRef, `source doc not found for path=${DocumentPath.toString(path)}`);
	const targetDocRef = newDocRef(relationshipGroupInfo.targetDocumentModel);

	const linkDescriptor: Relationship.LinkDescriptor = {
		relationshipModel: relationshipGroupInfo.relationship,
		entities: [
			{
				docRef: sourceDocRef,
				role: relationshipGroupInfo.sourceRole
			},
			{
				docRef: targetDocRef,
				role: relationshipGroupInfo.targetRole
			}
		]
	};

	return {
		linkDescriptor,
		targetRole: relationshipGroupInfo.targetRole,
		targetDocumentModelName: relationshipGroupInfo.targetDocumentModel
	};
}

function getChangeDocumentArgsForLinkDocGroup(cdd: GroupInstance, path: EntityInstancePath): ChangeDocumentArgs {
	const parentGroupInstance = DOCUMENT_SERVICE.getAssignedObject(cdd, path.slice(0, -1));
	assertObjectType(
		parentGroupInstance,
		DocumentUtils.isGroupInstance,
		"Expected group instance of relationship group to exist."
	);
	return {
		document: {},
		elementRef: parentGroupInstance[LINK_ID] as string
	};
}

function getRegularChangeDocumentArgs(
	data: CdmData,
	documentModels: DocumentModel[],
	relationshipModels: RelationshipModel[],
	path: EntityInstancePath,
	value: Readonly<GroupInstance> | FieldInstanceValue | undefined
): ChangeDocumentArgs {
	const { cdm, cdd, documentGraph } = unwrapCdmData(data);

	const updateValue = getUpdateValue(getModelElement(cdm, path).type, value);
	const { elementRef, pathToInstance, documentModel } = findChangeLocation(
		cdd,
		path,
		cdm,
		documentModels,
		relationshipModels
	);
	const dgDocument = findDocumentGraphDocument(documentGraph, elementRef);

	return {
		document: DOCUMENT_SERVICE.updateEntityInstance(dgDocument, pathToInstance, updateValue, documentModel),
		elementRef
	};
}

function getLinkRef(data: CdmData, path: EntityInstancePath): DeepReadonly<Relationship.LinkRef> | undefined {
	const { cdd, documentGraph } = unwrapCdmData(data);
	const groupInstance = DOCUMENT_SERVICE.getAssignedObject(cdd, path);
	if (!DocumentUtils.isGroupInstance(groupInstance)) {
		return undefined;
	}
	const linkId = groupInstance[LINK_ID];
	if (typeof linkId !== "string") {
		return undefined;
	}
	const dgLink = documentGraph.links.byId[linkId];
	return dgLink?.linkRef;
}

/**
 * Returns the document model element at the given path from the given document model.
 * Throws an error, when no element could be found.
 *
 * @param documentModel the document model
 * @param path the path
 * @returns the document model element
 */
function getModelElement(documentModel: DocumentModel, path: EntityInstancePath): DocumentModel.Element {
	const modelElement = findModelElementByPath(documentModel, path);
	assertObject(modelElement, `Could not find model element in cdm for path '${DocumentPath.toString(path)}'`);
	return modelElement;
}

function initializingHeterogeneousRelationship(targetDocumentModelName: string, modelGraph: ModelGraph): boolean {
	const targetDocumentModel = modelGraph.documentModels.find((dm) => dm.modelId === targetDocumentModelName);
	assertObject(targetDocumentModel, `Could not find '${targetDocumentModelName}' in model graph.`);

	return hasVariants(targetDocumentModel, modelGraph);
}

/**
 * Checks if there are multiple non-abstract variants.
 *
 * * documentModel is concrete and has at least one concrete subType
 * * documentModel is abstract and has at least two concrete subTypes
 */
function hasVariants(documentModel: ModelGraph.DocumentModel, modelGraph: ModelGraph): boolean {
	const nonAbstractSubTypes = findNonAbstractSubTypesRecursively(documentModel, modelGraph);

	return (
		(!documentModel.abstractModel && nonAbstractSubTypes.length >= 1) ||
		(!!documentModel.abstractModel && nonAbstractSubTypes.length >= 2)
	);
}

function findNonAbstractSubTypesRecursively(
	startType: ModelGraph.DocumentModel,
	modelGraph: ModelGraph
): ModelGraph.DocumentModel[] {
	const subTypes: ModelGraph.DocumentModel[] = [];
	if (startType.subTypes !== null && startType.subTypes.length > 0) {
		for (const subTypeRef of startType.subTypes) {
			const subType = modelGraph.documentModels.find((dm) => dm.modelId === subTypeRef);
			assertObject(subType, `Cannot find type "${subTypeRef}" - corrupt Model Graph?`);
			if (!subType.abstractModel) {
				subTypes.push(subType);
			}
			subTypes.push(...findNonAbstractSubTypesRecursively(subType, modelGraph));
		}
	}

	return subTypes;
}

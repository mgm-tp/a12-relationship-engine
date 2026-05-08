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
 * @module relationship
 */
import { type Activity, ModelSelectors } from "@com.mgmtp.a12.client/client-core";
import { type Relationship as RelationshipServerApi } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { type Localizable } from "@com.mgmtp.a12.utils/utils-localization/lib/main/index.js";

import { assertObject } from "../../../../shared/assertion.js";
import { DROP_DOWN_SELECTION } from "../../../constants.js";
import {
	createEntityDisplayLabelLocalizable,
	createUiConfigurationKey,
	createUnknownUiConfigurationKey
} from "../../../localization.js";
import { PaginationUtils } from "../../../paginationUtils.js";
import { Relationship } from "../../../relationship.js";
import { RelationshipSelectors } from "../../../selectors.js";

import { AdapterLink, AdapterLinkSelectors } from "./adapterLinkSelectors.js";

/** @internal */
export interface OwnProps<TplType> {
	readonly activityId: string;
	readonly instanceId: string;
	readonly componentConfiguration: Relationship.ComponentConfiguration;
	readonly TemplateComponent: React.ComponentType<TplType>;
	readonly templateComponentProps?: {};
	readonly disabled?: boolean;
	readonly readonly?: boolean;
}

export interface StateProps {
	readonly candidates: Items<AdapterCandidate[]>;
	readonly links: Items<AdapterLink[]>;
	readonly editLink?: Relationship.LinkWithDocument;

	readonly maxNumberOfLinks?: number;

	readonly label?: Localizable;
	readonly localizableKeyPrefix: string;

	readonly targetRole?: string;

	readonly modificationConfiguration?: Relationship.ModificationConfiguration;

	readonly relationship?: string;
	readonly uiElementId?: string;

	readonly sourceDocRef?: string;
	readonly targetDocRef?: string;
}

/**
 * @internal
 *
 * For all data props, only test a change in loading state, this could be a
 * little bit risky because for some (unknown) reason, the rendering with
 * "loading" state might be skipped.
 */
export function areStatePropsEqual(prevProps: StateProps, curProps: StateProps): boolean {
	return (
		prevProps.localizableKeyPrefix === curProps.localizableKeyPrefix &&
		prevProps.label === curProps.label &&
		prevProps.editLink === curProps.editLink &&
		areLinksEqual(prevProps.links, curProps.links) &&
		prevProps.candidates.loadingState === curProps.candidates.loadingState
	);
}

function areLinksEqual(prev: Items<AdapterLink[]>, cur: Items<AdapterLink[]>): boolean {
	return prev.loadingState === "loaded" && cur.loadingState === "loaded"
		? prev.data.length === cur.data.length && prev.data.every((pd, i) => AdapterLink.equal(pd, cur.data[i]))
		: prev.loadingState === cur.loadingState;
}

export type Items<T> =
	| {
			readonly loadingState: "loaded";
			readonly data: T;
	  }
	| {
			readonly loadingState: "missing" | "loading" | "error";
	  };
/**
 * @internal
 *
 * A convenience function to convert the loaded data from one type to another using the specified convert function.
 * If the data is not loaded, nothing has to be converted.
 * @param items The items before conversion.
 * @param convert The function used to convert the items data from one to another.
 *
 * @returns The items after conversion.
 */
export function retypeItemsData<T, S>(items: Items<T>, convert: (data: T) => S): Items<S> {
	return items.loadingState === "loaded"
		? {
				loadingState: "loaded",
				data: convert(items.data)
			}
		: items;
}

export interface AdapterCandidate extends RelationshipServerApi.Candidate {
	readonly addLinkAllowed: boolean;
}

/** @internal */
export function mapStateToAdapterProps<T>(state: {}, ownProps: OwnProps<T>): StateProps {
	const { activityId, instanceId } = ownProps;

	const emptyStateProps: StateProps = {
		candidates: { loadingState: "missing" },
		links: { loadingState: "missing" },
		localizableKeyPrefix: createUnknownUiConfigurationKey()
	};

	const instance = RelationshipSelectors.relationshipInstance(activityId, instanceId)(state);
	if (instance === undefined) {
		return emptyStateProps;
	}

	const model = ModelSelectors.modelByName(
		instance.uiConfiguration.relationshipName,
		Relationship.isRelationshipModel
	)(state);
	if (model === undefined) {
		return emptyStateProps;
	}

	const entityCharacteristic = model.content.entityCharacteristics.find(
		(e) => e.role === instance.uiConfiguration.targetRole
	);

	const maxNumberOfLinks =
		typeof entityCharacteristic?.linkConstraints.multiplicity.upperLimit === "number"
			? entityCharacteristic?.linkConstraints.multiplicity.upperLimit
			: undefined;

	const linksAndCandidates = getLinksAndCandidates({
		state,
		activityId,
		instance,
		componentId: ownProps.componentConfiguration.id
	});
	if (linksAndCandidates === undefined) {
		return emptyStateProps;
	}

	return {
		links: linksAndCandidates.links,
		candidates: linksAndCandidates.candidates,
		editLink: instance.editLink,
		maxNumberOfLinks,
		localizableKeyPrefix: createUiConfigurationKey(instance.uiConfiguration.name, ownProps.componentConfiguration.id),
		label: entityCharacteristic && createEntityDisplayLabelLocalizable(model.header.id, entityCharacteristic),
		targetRole: instance.uiConfiguration.targetRole
	};
}

function getLinksAndCandidates(params: {
	state: object;
	activityId: string;
	instance: Relationship.Instance;
	componentId: string;
}): { candidates: Items<AdapterCandidate[]>; links: Items<AdapterLink[]> } | undefined {
	const { state, activityId, instance, componentId } = params;

	const linkDataHolder = RelationshipSelectors.linkDataHolder(state, activityId, instance.id);
	const candidateDataHolder = RelationshipSelectors.candidateDataHolder(activityId, instance.id)(state);

	if (!linkDataHolder) {
		throw new Error(`Link data holders found for instanceId ${instance.id}`);
	}

	const getLoadingState = (loadingState: Activity.LoadingState) =>
		loadingState === "without" ? "error" : loadingState;

	const linkLoadingState = getLoadingState(linkDataHolder.loadingState);

	const linksData = AdapterLinkSelectors.linksList(state, activityId, instance.id, componentId);
	const links =
		linkLoadingState === "loaded"
			? {
					data: linksData,
					loadingState: linkLoadingState
				}
			: { loadingState: linkLoadingState };

	if (!candidateDataHolder) {
		return {
			links,
			candidates: {
				loadingState: "missing"
			}
		};
	}

	const candidateLoadingState = getLoadingState(candidateDataHolder.loadingState);
	const candidatesData = selectCandidatesList(state, activityId, instance, componentId);
	return {
		links,
		candidates:
			candidateLoadingState === "loaded"
				? { data: candidatesData, loadingState: candidateLoadingState }
				: { loadingState: candidateLoadingState }
	};
}

function selectCandidatesList(
	state: object,
	activityId: string,
	instance: Relationship.Instance,
	componentId: string
): AdapterCandidate[] {
	const candidatePagination = RelationshipSelectors.candidateDataHolder(activityId, instance.id)(state)?.data
		?.candidatePagination;
	assertObject(candidatePagination);

	const sliceIndices = PaginationUtils.getSlices(candidatePagination);
	if (!sliceIndices) {
		return [];
	}

	let startIndex = sliceIndices.startIndex - candidatePagination.offset;
	let endIndex = sliceIndices.endIndex - candidatePagination.offset;

	if (RelationshipSelectors.componentName(state, activityId, instance.id, componentId) === DROP_DOWN_SELECTION) {
		startIndex = 0;
		endIndex = candidatePagination.limit;
	}

	const mutations = AdapterLinkSelectors.instanceMutations(state, activityId, instance.id);

	const relationshipModel = ModelSelectors.modelByName(
		instance.uiConfiguration.relationshipName,
		Relationship.isRelationshipModel
	)(state);

	return instance.candidates.slice(startIndex, endIndex).map<AdapterCandidate>((candidate) => {
		return {
			...candidate,
			addLinkAllowed: isAddLinkAllowed(candidate, mutations, relationshipModel?.content.duplicatesAllowed)
		};
	});
}

function isAddLinkAllowed(
	candidate: RelationshipServerApi.Candidate,
	mutations: Relationship.Mutation[],
	duplicatesAllowed?: boolean
): boolean {
	if (duplicatesAllowed) {
		return true;
	}

	if (candidate.linkRef.id === undefined) {
		throw new Error("linkRef.id is undefined");
	}

	// An unlinked candidate (linkRef.id === null) is allowed to add if it did not add yet
	if (candidate.linkRef.id === null) {
		return !mutations.some(
			(mutation) =>
				mutation.mutationState === "added" &&
				Relationship.isLinkDescriptorEqual(mutation.link.linkRef.linkDescriptor, candidate.linkRef.linkDescriptor)
		);
	}

	// A linked candidate is allowed to add again if it has been removed
	return mutations.some(
		(mutation) =>
			mutation.mutationState === "removed" &&
			Relationship.isLinkDescriptorEqual(mutation.link.linkRef.linkDescriptor, candidate.linkRef.linkDescriptor)
	);
}

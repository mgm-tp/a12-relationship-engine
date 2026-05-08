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
import { ModelSelectors } from "@com.mgmtp.a12.client/client-core";
import { type OverviewEngineApi } from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import { assertObject, assertUnreachable } from "../../../../shared/assertion.js";
import { DROP_DOWN_SELECTION, DUAL_PANE_SELECTION, TABLE_LIST } from "../../../constants.js";
import { Relationship } from "../../../relationship.js";
import { RelationshipSelectors } from "../../../selectors.js";

export interface AdapterLink extends Relationship.LinkWithDocument {
	readonly mutation?: Relationship.LinkMutationState;
	readonly relinked: boolean;
	/**
	 * Whether the link should be visible
	 */
	readonly visible?: boolean;
}

/** @internal */
export namespace AdapterLink {
	export function equal(al1: AdapterLink, al2: AdapterLink): boolean {
		return (
			al1.linkRef === al2.linkRef &&
			al1.document === al2.document &&
			al1.mutation === al2.mutation &&
			al2.relinked === al2.relinked
		);
	}
}

/** @internal */
export namespace AdapterLinkSelectors {
	export function linksList(state: object, activityId: string, instanceId: string, componentId: string): AdapterLink[] {
		const componentName = RelationshipSelectors.componentName(state, activityId, instanceId, componentId);

		switch (componentName) {
			case undefined:
				return [];
			case DUAL_PANE_SELECTION:
				return dualPaneLinksList(state, activityId, instanceId);
			case TABLE_LIST:
				return tableListLinksList(state, activityId, instanceId);
			case DROP_DOWN_SELECTION:
				return dropdownLinksList(state, activityId, instanceId);
			default:
				assertUnreachable(componentName);
		}
	}

	function dualPaneLinksList(state: object, activityId: string, instanceId: string): AdapterLink[] {
		const linkInstance = AdapterLinkSelectors.linkInstance(state, activityId, instanceId);
		const pagination = linkInstance.linkPagination;
		const loadedLinks = linkInstance.links;

		const mutations = instanceMutations(state, activityId, instanceId);

		const newLinks = mutations
			.filter((m) => m.mutationState === "added" || m.mutationState === "withdrawn" || m.relinked)
			.map<AdapterLink>((m) => ({
				...m.link,
				mutation: m.mutationState,
				relinked: m.relinked,
				visible: false
			}))
			.map(applyPagination(pagination));

		const unloadedRemovedLinks = mutations
			.filter((m) => !contains(loadedLinks, m.link) && m.mutationState === "removed")
			.map<AdapterLink>((m) => ({
				...m.link,
				mutation: m.mutationState,
				relinked: m.relinked,
				visible: false
			}));

		const existingLinks = loadedLinks
			.filter((link) => !contains(newLinks, link))
			.map<AdapterLink>((link) => {
				return {
					...link,
					mutation: getLinkMutationState(mutations, link),
					relinked: false,
					visible: false
				};
			})
			.map(applyPagination(pagination, newLinks.length + pagination.offset));

		return [...newLinks, ...unloadedRemovedLinks, ...existingLinks].map(applyLinkModification(mutations));
	}
	function tableListLinksList(state: object, activityId: string, instanceId: string): AdapterLink[] {
		const linkInstance = AdapterLinkSelectors.linkInstance(state, activityId, instanceId);
		const pagination = linkInstance.linkPagination;
		const loadedLinks = linkInstance.links;

		const mutations = instanceMutations(state, activityId, instanceId);

		const newLinks = mutations
			.filter((m) => m.mutationState === "added" || m.relinked)
			.map<AdapterLink>((m) => ({ ...m.link, relinked: m.relinked }))
			.map(applyPagination(pagination));

		const existingLinks = loadedLinks
			.filter((link) => !contains(newLinks, link) && getLinkMutationState(mutations, link) !== "removed")
			.map<AdapterLink>((link) => ({ ...link, relinked: false }))
			.map(applyPagination(pagination, newLinks.length + pagination.offset));

		return [...newLinks, ...existingLinks].map(applyLinkModification(mutations));
	}
	function dropdownLinksList(state: object, activityId: string, instanceId: string): AdapterLink[] {
		const linkInstance = AdapterLinkSelectors.linkInstance(state, activityId, instanceId);
		const loadedLinks = linkInstance.links;

		const mutations = instanceMutations(state, activityId, instanceId);

		const newLinks = mutations
			.filter((m) => m.mutationState === "added" || m.relinked)
			.map<AdapterLink>((m) => ({ ...m.link, relinked: m.relinked }));

		const existingLinks = loadedLinks
			.filter((link) => !contains(newLinks, link) && getLinkMutationState(mutations, link) !== "removed")
			.map<AdapterLink>((link) => ({ ...link, relinked: false }));

		return [...newLinks, ...existingLinks].map(applyLinkModification(mutations));
	}
	function contains(linkList: { linkRef: { id: string } }[], link: { linkRef: { id: string } }): boolean {
		return linkList.some((listItem) => listItem.linkRef.id === link.linkRef.id);
	}

	function getLinkMutationState(
		mutations: Relationship.LinkWithMutationMetadata[],
		link: Relationship.LinkWithDocument
	): Relationship.LinkMutationState | undefined {
		return mutations.find((m) => m.link.linkRef.id === link.linkRef.id)?.mutationState;
	}

	export function instanceMutations(state: object, activityId: string, instanceId: string): Relationship.Mutation[] {
		const instance = RelationshipSelectors.relationshipInstance(activityId, instanceId)(state);
		if (instance === undefined) {
			return [];
		}

		const relationshipModel = ModelSelectors.modelByName(
			instance.uiConfiguration.relationshipName,
			Relationship.isRelationshipModel
		)(state);
		if (relationshipModel === undefined) {
			return [];
		}
		return (
			RelationshipSelectors.mutations({
				activityId,
				relationship: relationshipModel.header.id,
				sourceEntity: instance.sourceEntity
			})(state)?.reverse() ?? []
		);
	}
	/** @internal */
	export function mutatedLinksCount(
		state: object,
		activityId: string,
		instanceId: string,
		mutationState: Relationship.LinkMutationState
	): number {
		return instanceMutations(state, activityId, instanceId).filter(
			(mutation) => mutation.mutationState === mutationState
		).length;
	}

	export function linkInstance(state: object, activityId: string, instanceId: string): Relationship.LinkInstance {
		const linkInstance = RelationshipSelectors.linkDataHolder(state, activityId, instanceId)?.data;
		assertObject(linkInstance);

		return linkInstance;
	}
	function applyLinkModification(mutations: Relationship.Mutation[]): (link: AdapterLink) => AdapterLink {
		return (link) => {
			const linkMutation = mutations.find(
				(mutation) => mutation.modified && mutation.link.linkRef.id === link.linkRef.id
			);

			return linkMutation ? { ...link, document: linkMutation.link.document } : link;
		};
	}

	function applyPagination(
		pagination: Relationship.Pagination,
		offset = 0
	): (item: AdapterLink, index: number) => AdapterLink {
		return (item, index) => {
			return { ...item, visible: isVisible({ index: index + offset, ...pagination }) };
		};
	}

	function isVisible(params: { index: number; pageSize: number; pageNumber: number }): boolean {
		const { index, pageSize, pageNumber } = params;
		const startIndex = pageSize * pageNumber;
		const endIndex = startIndex + pageSize;

		return startIndex <= index && index < endIndex;
	}

	export function selectLinkPagination(
		state: object,
		activityId: string,
		instanceId: string
	): OverviewEngineApi.Pagination | undefined {
		const removedLinkCount = mutatedLinksCount(state, activityId, instanceId, "removed");
		const addedLinksCount = mutatedLinksCount(state, activityId, instanceId, "added");
		const withdrawnLinksCount = mutatedLinksCount(state, activityId, instanceId, "withdrawn");

		let additionalLinksCount = 0;
		const componentName = RelationshipSelectors.componentName(state, activityId, instanceId);
		if (componentName === undefined) {
			return undefined;
		}

		if (componentName === DUAL_PANE_SELECTION) {
			additionalLinksCount = addedLinksCount + withdrawnLinksCount;
		} else if (componentName === TABLE_LIST) {
			additionalLinksCount = addedLinksCount - removedLinkCount;
		}

		const { fullCount, pageNumber, pageSize } = linkInstance(state, activityId, instanceId).linkPagination;
		const totalLinks = additionalLinksCount + fullCount;

		return {
			pageCount: Math.ceil((totalLinks <= 0 ? 1 : totalLinks) / pageSize),
			pageNumber,
			pageSize
		};
	}
}

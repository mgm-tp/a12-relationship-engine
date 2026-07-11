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

import type { Relationship } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { type Selector, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";

import { OEDataGraphUtils } from "../OEDataGraphUtils.js";
import type { Changelog, DocumentGraph } from "../state.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";

import { createSelector } from "./selector.js";
import { ChangelogSelectors } from "./changelog.js";
import { DocumentGraphSelectors } from "./documentGraph.js";

/** @internal */
export namespace LinkSelectors {
	/** Parameters for resolving a link between two known entity participants. */
	export interface FindLinkParams {
		readonly relationshipModel: string;
		readonly source: { role: string; docRef: string };
		readonly target: { role: string; docRef: string };
	}

	/** Resolved link tuple: `[linkRef, linkDocument]`; both `undefined` when no link exists. */
	export type FindLinkResult = readonly [linkRef: Relationship.LinkRef | undefined, linkDocument: object | undefined];

	/**
	 * Options for link resolution selectors.
	 * @internal
	 */
	interface FindLinkOptions {
		/** When true, returns the deleted link's `linkRef` and recovers the most recent link document. */
		includeDeleted?: boolean;
	}

	export function findLink(
		activityId: string,
		params: FindLinkParams,
		options?: FindLinkOptions
	): Selector<FindLinkResult> {
		return (state) =>
			findLinkReselect(
				state,
				activityId,
				params.relationshipModel,
				params.source.role,
				params.source.docRef,
				params.target.role,
				params.target.docRef,
				options?.includeDeleted ?? false
			);
	}

	const findLinkReselect = createSelector(
		[
			(state: object, activityId: string) => ChangelogSelectors.changelog(activityId)(state),
			(state: object, activityId: string) => DocumentGraphSelectors.documentGraph(activityId)(state),
			(
				state: object,
				activityId: string,
				relationshipModel: string,
				_sourceRole: string,
				_sourceDocRef: string,
				targetRole: string
			) =>
				ActivitySelectors.activityPropById(activityId, function findLinkDataHolder(a) {
					return a.dataHolders.filter(RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance).find((dh) => {
						return (
							dh.slices.uiConfiguration.relationshipName === relationshipModel &&
							dh.slices.uiConfiguration.targetRole === targetRole
						);
					});
				})(state),
			(
				state: object,
				activityId: string,
				relationshipModel: string,
				_sourceRole: string,
				_sourceDocRef: string,
				targetRole: string
			) =>
				ActivitySelectors.activityPropById(activityId, function findDropdownHolder(a) {
					return a.dataHolders
						.filter(RelationshipEngineDataHolder.DropdownSelectionDataHolder.isInstance)
						.find((dh) => {
							return (
								dh.slices.uiConfiguration.relationshipName === relationshipModel &&
								dh.slices.uiConfiguration.targetRole === targetRole
							);
						});
				})(state),
			(_state: object, _activityId: string, relationshipModel: string) => relationshipModel,
			(_state: object, _activityId: string, _rm: string, sourceRole: string) => sourceRole,
			(_state: object, _activityId: string, _rm: string, _sr: string, sourceDocRef: string) => sourceDocRef,
			(_state: object, _activityId: string, _rm: string, _sr: string, _sd: string, targetRole: string) => targetRole,
			(_state: object, _activityId: string, _rm: string, _sr: string, _sd: string, _tr: string, targetDocRef: string) =>
				targetDocRef,
			(
				_state: object,
				_activityId: string,
				_rm: string,
				_sr: string,
				_sd: string,
				_tr: string,
				_td: string,
				includeDeleted: boolean
			) => includeDeleted
		],
		(
			changelog,
			documentGraph,
			linkDataHolder,
			dropdownDataHolder,
			relationshipModel,
			sourceRole,
			sourceDocRef,
			targetRole,
			targetDocRef,
			includeDeleted
		): FindLinkResult => {
			const params: FindLinkParams = {
				relationshipModel,
				source: { role: sourceRole, docRef: sourceDocRef },
				target: { role: targetRole, docRef: targetDocRef }
			};

			// 1. Changelog (most recent changes first)
			if (changelog) {
				let newestLinkDoc: object | undefined;
				let foundLinkDocChanged = false;

				for (let i = changelog.changes.length - 1; i >= 0; i -= 1) {
					const change = changelog.changes[i];

					if (change.kind === "linkDocChanged") {
						if (!foundLinkDocChanged) {
							const descriptor = change.linkRef.linkDescriptor;

							if (descriptor.relationshipModel === params.relationshipModel && matches(descriptor, params)) {
								newestLinkDoc = change.linkDocument;
								foundLinkDocChanged = true;
							}
						}

						continue;
					}

					if (change.kind !== "linkAdded" && change.kind !== "linkDeleted") {
						continue;
					}

					const { linkDescriptor } = change.linkRef;

					if (linkDescriptor.relationshipModel !== params.relationshipModel) {
						continue;
					}

					if (matches(linkDescriptor, params)) {
						if (change.kind === "linkAdded") {
							return [normalizeEntityOrder(change.linkRef, params.source.role), newestLinkDoc ?? change.linkDocument];
						}

						if (includeDeleted) {
							const deletedLinkRef = change.linkRef;
							const recoveredDoc = recoverDeletedLinkDocumentByParams(changelog.changes, i - 1, params);
							const isPersisted = recoveredDoc === undefined && !hasLinkAddedEntryByParams(changelog.changes, params);

							if (isPersisted) {
								// Fall through to OE data holder lookup below
								break;
							}

							return [normalizeEntityOrder(deletedLinkRef, params.source.role), recoveredDoc];
						}

						return [undefined, undefined];
					}
				}
			}

			// 2. DocumentGraph
			if (documentGraph) {
				for (const link of Object.values(documentGraph.links.byId)) {
					const descriptor = link.linkRef.linkDescriptor;

					if (descriptor.relationshipModel !== params.relationshipModel) {
						continue;
					}

					if (matches(descriptor, params)) {
						const linkDocument = resolveLinkDocument(documentGraph, link);

						return [normalizeEntityOrder(link.linkRef, params.source.role), linkDocument];
					}
				}
			}

			// 3. OE Links
			if (linkDataHolder?.data) {
				const [linkRef, linkDocument] = OEDataGraphUtils.findLinkEntry(linkDataHolder.data, params);

				if (linkRef) {
					return [normalizeEntityOrder(linkRef, params.source.role), linkDocument];
				}
			}

			// 4. Dropdown data holder
			if (dropdownDataHolder?.data?.links) {
				const matchingLink = dropdownDataHolder.data.links.find(function matchesParams(entry) {
					return matches(entry.linkRef.linkDescriptor, params);
				});

				if (matchingLink) {
					return [normalizeEntityOrder(matchingLink.linkRef, params.source.role), matchingLink.linkDocument];
				}
			}

			return [undefined, undefined];
		}
	);

	export function findByDocRef(
		activityId: string,
		docRef: string
	): Selector<{ linkId: string; linkRef: Relationship.LinkRef } | undefined> {
		return (state) => findByDocRefReselect(state, activityId, docRef);
	}

	const findByDocRefReselect = createSelector(
		[
			(state: object, activityId: string) => DocumentGraphSelectors.documentGraph(activityId)(state),
			(_state: object, _activityId: string, docRef: string) => docRef
		],
		(documentGraph, docRef): { linkId: string; linkRef: Relationship.LinkRef } | undefined => {
			if (!docRef) {
				return undefined;
			}

			if (documentGraph) {
				for (const [linkId, link] of Object.entries(documentGraph.links.byId)) {
					if (link.linkDocRef === docRef) {
						return { linkId, linkRef: link.linkRef };
					}
				}
			}

			return undefined;
		}
	);

	export function findLinkById(
		activityId: string,
		linkId: string,
		options?: FindLinkOptions
	): Selector<FindLinkResult> {
		return (state) => findLinkByIdReselect(state, activityId, linkId, options?.includeDeleted ?? false);
	}

	const findLinkByIdReselect = createSelector(
		[
			(state: object, activityId: string) => ChangelogSelectors.changelog(activityId)(state),
			(state: object, activityId: string) => DocumentGraphSelectors.documentGraph(activityId)(state),
			(state: object, activityId: string) =>
				ActivitySelectors.activityPropById(activityId, (a) =>
					a.dataHolders.filter(RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance)
				)(state),
			(state: object, activityId: string) =>
				ActivitySelectors.activityPropById(activityId, (a) =>
					a.dataHolders.filter(RelationshipEngineDataHolder.DropdownSelectionDataHolder.isInstance)
				)(state),
			(_state: object, _activityId: string, linkId: string) => linkId,
			(_state: object, _activityId: string, _linkId: string, includeDeleted: boolean) => includeDeleted
		],
		(changelog, documentGraph, linkDataHolders, dropdownDataHolders, linkId, includeDeleted): FindLinkResult => {
			// 1. Changelog (most recent changes first)
			if (changelog) {
				let newestLinkDoc: object | undefined;
				let foundLinkDocChanged = false;

				for (let i = changelog.changes.length - 1; i >= 0; i -= 1) {
					const change = changelog.changes[i];

					if (change.kind === "linkDocChanged" && change.linkRef.id === linkId) {
						if (!foundLinkDocChanged) {
							newestLinkDoc = change.linkDocument;
							foundLinkDocChanged = true;
						}

						continue;
					}

					if (change.kind !== "linkAdded" && change.kind !== "linkDeleted") {
						continue;
					}

					if (change.linkRef.id === linkId) {
						if (change.kind === "linkAdded") {
							return [change.linkRef, newestLinkDoc ?? change.linkDocument];
						}

						if (includeDeleted) {
							const deletedLinkRef = change.linkRef;
							const recoveredDoc = recoverDeletedLinkDocumentById(changelog.changes, i - 1, linkId);
							const isPersisted = recoveredDoc === undefined && !hasLinkAddedEntry(changelog.changes, linkId);

							if (isPersisted) {
								// Fall through to OE data holder lookup below
								break;
							}

							return [deletedLinkRef, recoveredDoc];
						}

						return [undefined, undefined];
					}
				}
			}

			// 2. DocumentGraph
			if (documentGraph) {
				const link = documentGraph.links.byId[linkId];

				if (link) {
					const linkDocument = resolveLinkDocument(documentGraph, link);

					return [link.linkRef, linkDocument];
				}
			}

			// 3. OE Links
			if (linkDataHolders) {
				for (const dataHolder of linkDataHolders) {
					if (!dataHolder.data) {
						continue;
					}

					const { sourceEntity, uiConfiguration } = dataHolder.slices;

					if (!sourceEntity.docRef) {
						continue;
					}

					const [linkRef, linkDocument] = OEDataGraphUtils.findLinkEntryById(
						dataHolder.data,
						linkId,
						sourceEntity.role,
						sourceEntity.docRef,
						uiConfiguration.relationshipName,
						uiConfiguration.targetRole
					);

					if (linkRef) {
						return [linkRef, linkDocument];
					}
				}
			}

			// 4. Dropdown data holder
			if (dropdownDataHolders) {
				for (const dataHolder of dropdownDataHolders) {
					if (!dataHolder.data?.links) {
						continue;
					}

					const matchingLink = dataHolder.data.links.find((entry) => entry.linkRef.id === linkId);

					if (matchingLink) {
						return [matchingLink.linkRef, matchingLink.linkDocument];
					}
				}
			}

			return [undefined, undefined];
		}
	);

	function hasLinkAddedEntry(changes: readonly Changelog.Change[], linkId: string): boolean {
		return changes.some((c) => c.kind === "linkAdded" && c.linkRef.id === linkId);
	}

	function hasLinkAddedEntryByParams(changes: readonly Changelog.Change[], params: FindLinkParams): boolean {
		return changes.some((c) => {
			if (c.kind !== "linkAdded") {
				return false;
			}

			const descriptor = c.linkRef.linkDescriptor;

			return descriptor.relationshipModel === params.relationshipModel && matches(descriptor, params);
		});
	}

	function recoverDeletedLinkDocumentById(
		changes: readonly Changelog.Change[],
		startIndex: number,
		linkId: string
	): object | undefined {
		for (let i = startIndex; i >= 0; i -= 1) {
			const change = changes[i];

			if (change.kind === "linkDocChanged" && change.linkRef.id === linkId) {
				return change.linkDocument;
			}

			if (change.kind === "linkAdded" && change.linkRef.id === linkId) {
				return change.linkDocument;
			}
		}

		return undefined;
	}

	function recoverDeletedLinkDocumentByParams(
		changes: readonly Changelog.Change[],
		startIndex: number,
		params: FindLinkParams
	): object | undefined {
		for (let i = startIndex; i >= 0; i -= 1) {
			const change = changes[i];

			if (change.kind === "linkDocChanged") {
				const descriptor = change.linkRef.linkDescriptor;

				if (descriptor.relationshipModel === params.relationshipModel && matches(descriptor, params)) {
					return change.linkDocument;
				}
			}

			if (change.kind === "linkAdded") {
				const descriptor = change.linkRef.linkDescriptor;

				if (descriptor.relationshipModel === params.relationshipModel && matches(descriptor, params)) {
					return change.linkDocument;
				}
			}
		}

		return undefined;
	}

	function resolveLinkDocument(documentGraph: DocumentGraph, link: DocumentGraph.Link): object | undefined {
		if (!link.linkDocRef) {
			return undefined;
		}

		const node = documentGraph.documents.byDocRef[link.linkDocRef];

		return node?.loadingState === "loaded" ? (node.document as object) : undefined;
	}

	function matches(descriptor: Relationship.LinkDescriptor, params: FindLinkParams): boolean {
		const hasSource = descriptor.entities.some(
			(e) => e.docRef === params.source.docRef && e.role === params.source.role
		);

		if (!hasSource) {
			return false;
		}

		return descriptor.entities.some((e) => e.docRef === params.target.docRef && e.role === params.target.role);
	}

	function normalizeEntityOrder(linkRef: Relationship.LinkRef, sourceRole: string): Relationship.LinkRef {
		const entities = linkRef.linkDescriptor.entities;

		if (entities[0]?.role === sourceRole) {
			return linkRef;
		}

		return {
			...linkRef,
			linkDescriptor: {
				...linkRef.linkDescriptor,
				entities: [...entities].reverse()
			}
		};
	}
}

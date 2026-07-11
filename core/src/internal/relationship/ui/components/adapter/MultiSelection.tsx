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

import { connect } from "react-redux";
import React, { useContext } from "react";

import { Activity, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import { THUMBNAIL_SLICE } from "@com.mgmtp.a12.client/client-core/a12internal";
import { LocalizerContext } from "@com.mgmtp.a12.utils/utils-localization-react";
import type { Relationship } from "@com.mgmtp.a12.dataservices/dataservices-access";
import type { OverviewEngineApi, OverviewEngineState } from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import { RelationshipActions } from "../../../actions.js";
import { RelationshipSelectors } from "../../../selectors.js";
import type { Relationship as RelationshipClientApi } from "../../../relationship.js";
import { getFilterProps, getSortingProps, getCandidatePaginationProps } from "../util.js";
import type { MultiSelectionItem, MultiSelectionProps, RelationshipDocument } from "../api.js";

import * as RelationshipUiAdapter from "./adapter.js";
import { type AdapterLink, AdapterLinkSelectors } from "./adapterLinkSelectors.js";

export interface StateProps extends RelationshipUiAdapter.StateProps {
	readonly candidatePagination?: OverviewEngineApi.Pagination;
	readonly linkPagination?: OverviewEngineApi.Pagination;
	readonly linksFullCount: number;
	readonly candidateSorting?: OverviewEngineState["sorting"];
	readonly candidatesFilters: OverviewEngineApi.FilterMap;
	readonly linkModels?: RelationshipClientApi.OverviewModels;
	readonly candidateModels?: RelationshipClientApi.OverviewModels;
	readonly editLinkModels?: RelationshipClientApi.FormModels;
	readonly targetRole?: string;
	readonly thumbnails?: Record<string, string>;
}

function areStatePropsEqual(prevProps: StateProps, curProps: StateProps): boolean {
	return (
		RelationshipUiAdapter.areStatePropsEqual(prevProps, curProps) &&
		prevProps.editLinkModels?.loadingState === curProps.editLinkModels?.loadingState &&
		prevProps.candidateModels?.loadingState === curProps.candidateModels?.loadingState &&
		prevProps.linkModels?.loadingState === curProps.linkModels?.loadingState &&
		prevProps.candidatesFilters === curProps.candidatesFilters &&
		prevProps.candidateSorting === curProps.candidateSorting &&
		paginationPropsEqual(prevProps.candidatePagination, curProps.candidatePagination)
	);
}

function paginationPropsEqual(
	prevProps?: OverviewEngineApi.Pagination,
	curProps?: OverviewEngineApi.Pagination
): boolean {
	if (prevProps === undefined && curProps === undefined) {
		return true;
	}

	return (
		prevProps?.pageCount === curProps?.pageCount &&
		prevProps?.pageNumber === curProps?.pageNumber &&
		prevProps?.pageSize === curProps?.pageSize
	);
}

type OwnProps = RelationshipUiAdapter.OwnProps<MultiSelectionProps>;

export interface DispatchProps {
	onAddLink(candidate: RelationshipClientApi.Candidate): void;

	onAddExistingLink(link: RelationshipClientApi.LinkWithDocument): void;
	onRemoveExistingLink(link: RelationshipClientApi.LinkWithDocument): void;

	onCancelEditLink(): void;
	onEditLink(link: RelationshipClientApi.LinkWithDocument): void;
	onSubmitEditNewLink(link: RelationshipClientApi.LinkWithDocument): void;
	onSubmitEditExistingLink(link: RelationshipClientApi.LinkWithDocument): void;

	onCandidatePageChange(pageNumber: number): void;
	onLinkPageChange?(pageNumber: number): void;
	onFilterChange(fieldBasedFilters: OverviewEngineApi.FilterMap): void;

	onSortingChange(sort?: RelationshipClientApi.SortClause): void;
}

/** @internal */
export function MultiSelectionWrapper(props: StateProps & DispatchProps & OwnProps): React.ReactNode {
	const localizer = useContext(LocalizerContext).localizer;

	if (props.linkModels === undefined || props.candidateModels === undefined) {
		return null;
	}

	function onAddAssignment(item: MultiSelectionItem) {
		if (isCandidateMultiSelectionItem(item) && item.selectionAllowed) {
			props.onAddLink(item.candidate as RelationshipClientApi.Candidate);
		}
	}

	function onAddExistingAssignment(item: MultiSelectionItem) {
		if (isLinkMultiSelectionItem(item)) {
			props.onAddExistingLink(item.link);
		}
	}

	function onRemoveExistingAssignment(item: MultiSelectionItem) {
		if (isLinkMultiSelectionItem(item)) {
			props.onRemoveExistingLink(item.link);
		}
	}

	function onEditItem(item: MultiSelectionItem) {
		if (isLinkMultiSelectionItem(item)) {
			props.onEditLink(item.link);
		}
	}

	function onSubmitEditItemDocument(documentJson: object) {
		if (props.editLink && props.links.loadingState === "loaded") {
			const modifiedLink: RelationshipClientApi.LinkWithDocument = {
				...props.editLink,
				document: {
					...props.editLink.document,
					relationship: documentJson
				}
			};

			if (props.links.data.some((link) => link.linkRef.id === props.editLink?.linkRef.id)) {
				props.onSubmitEditExistingLink(modifiedLink);
			} else {
				props.onSubmitEditNewLink(modifiedLink);
			}
		}
	}

	const assignments = RelationshipUiAdapter.retypeItemsData(props.links, (data) =>
		data.map((d) => convertLinkToMultiSelectionItem(d, props.targetRole))
	);

	const availableItems = RelationshipUiAdapter.retypeItemsData(props.candidates, (data) =>
		data.map((d) => convertCandidateToMultiSelectionItem(d, props.targetRole))
	);

	return (
		<props.TemplateComponent
			label={props.label ? localizer(props.label) : undefined}
			localizableKeyPrefix={props.localizableKeyPrefix}
			disabled={props.disabled}
			readonly={props.readonly}
			assignmentModels={props.linkModels}
			availableItemModels={props.candidateModels}
			editItemFormModels={props.editLinkModels}
			assignments={assignments}
			maxNumberOfAssignments={props.maxNumberOfLinks}
			availableItems={availableItems}
			editItemDocumentJson={props.editLink && (props.editLink.document.relationship as object | undefined)}
			onAddAssignment={onAddAssignment}
			onAddExistingAssignment={onAddExistingAssignment}
			onRemoveExistingAssignment={onRemoveExistingAssignment}
			onEditItem={onEditItem}
			onCancelEditItemDocument={props.onCancelEditLink}
			onSubmitEditItemDocument={onSubmitEditItemDocument}
			onAvailableItemsFilterChanged={props.onFilterChange}
			availableItemsFilters={props.candidatesFilters}
			availableItemsPagination={props.candidatePagination}
			onAvailableItemsPageChange={props.onCandidatePageChange}
			assignedItemsPagination={props.linkPagination}
			onAssignedItemsPageChange={props.onLinkPageChange}
			availableItemsSorting={props.candidateSorting}
			onAvailableItemsSortingChange={props.onSortingChange}
			assignedItemsFullCount={props.linksFullCount}
			thumbnails={props.thumbnails}
			{...props.templateComponentProps}
		/>
	);
}

/** @internal */
export interface LinkMultiSelectionItem extends MultiSelectionItem {
	readonly link: RelationshipClientApi.LinkWithDocument;
	readonly originalId?: string;
}

function isLinkMultiSelectionItem(
	singleSelectionItem: MultiSelectionItem | undefined
): singleSelectionItem is LinkMultiSelectionItem {
	return singleSelectionItem !== undefined && (singleSelectionItem as LinkMultiSelectionItem).link !== undefined;
}

/** @internal */
export function convertLinkToMultiSelectionItem(link: AdapterLink, targetRole?: string): LinkMultiSelectionItem {
	return {
		link: link,
		documentJson: {
			id: link.linkRef.id,
			modelId: link.document.modelId as string,
			...link.document
		},
		visible: link.visible,
		mutation: link.mutation,
		reassigned: link.relinked,
		selectionAllowed: true,
		originalId: retrieveTargetDocRef(link.linkRef.linkDescriptor, targetRole)
	};
}

/** @internal */
export interface CandidateMultiSelectionItem extends MultiSelectionItem {
	readonly candidate: Relationship.Candidate;
}

function isCandidateMultiSelectionItem(
	singleSelectionItem: MultiSelectionItem | undefined
): singleSelectionItem is CandidateMultiSelectionItem {
	return (
		singleSelectionItem !== undefined && (singleSelectionItem as CandidateMultiSelectionItem).candidate !== undefined
	);
}

/** @internal */
export function convertCandidateToMultiSelectionItem(
	candidate: RelationshipUiAdapter.AdapterCandidate,
	targetRole?: string
): CandidateMultiSelectionItem {
	return {
		documentJson: {
			...(candidate.document as RelationshipDocument).target,
			id: retrieveTargetDocRef(candidate.linkRef.linkDescriptor, targetRole)
		},
		candidate: candidate,
		reassigned: false,
		visible: true,
		selectionAllowed: candidate.addLinkAllowed
	};
}

/** @internal */
export function retrieveTargetDocRef(linkDescriptor: Relationship.LinkDescriptor, targetRole?: string): string {
	return linkDescriptor.entities.find((e) => e.role === targetRole)?.docRef ?? "";
}

const NO_FILTER = {};

/** @internal */
export const MultiSelectionAdapter = connect<StateProps, DispatchProps, OwnProps, object>(
	function mapStateToProps(state: object, ownProps): StateProps {
		const { activityId, instanceId, componentConfiguration: componentConfig } = ownProps;

		const linkModels = RelationshipSelectors.overviewModels({
			activityId,
			componentConfig,
			resultDocumentModelType: "link"
		})(state);
		const candidateModels = RelationshipSelectors.overviewModels({
			activityId,
			componentConfig,
			resultDocumentModelType: "candidate"
		})(state);
		const editLinkModels = RelationshipSelectors.formModels(componentConfig)(state);

		const coreProps = RelationshipUiAdapter.mapStateToAdapterProps(state, ownProps);

		const relationshipInstance = RelationshipSelectors.relationshipInstance(activityId, instanceId)(state);

		const sorting = getSortingProps(relationshipInstance, candidateModels);
		const filtering = getFilterProps(relationshipInstance);
		const candidatePagination = getCandidatePaginationProps(relationshipInstance);
		const linkPagination = AdapterLinkSelectors.selectLinkPagination(state, activityId, instanceId);

		const targetRole = relationshipInstance?.uiConfiguration.targetRole;
		const thumbnails = ActivitySelectors.activityPropById(
			activityId,
			(a) => Activity.findDefaultDataHolder(a)?.slices[THUMBNAIL_SLICE]
		)(state);

		return {
			...coreProps,
			candidateModels,
			linkModels,
			editLinkModels,
			candidatesFilters: filtering ?? NO_FILTER,
			candidatePagination,
			linkPagination,
			linksFullCount: relationshipInstance?.linkPagination.fullCount ?? 0,
			candidateSorting: sorting,
			targetRole,
			thumbnails
		};
	},
	function mapDispatchToProps(dispatch, ownProps): DispatchProps {
		return {
			onAddLink: (candidate) => {
				dispatch(
					RelationshipActions.Events.addLinkRequested({
						activityId: ownProps.activityId,
						instanceId: ownProps.instanceId,
						candidate: candidate as Relationship.Candidate
					})
				);
			},
			onEditLink: (link) => {
				dispatch(
					RelationshipActions.Commands.setEditLink({
						activityId: ownProps.activityId,
						instanceId: ownProps.instanceId,
						link
					})
				);
			},
			onAddExistingLink: (link) => {
				dispatch(
					RelationshipActions.Commands.restoreLink({
						activityId: ownProps.activityId,
						link
					})
				);
			},
			onCancelEditLink: () => {
				dispatch(
					RelationshipActions.Commands.setEditLink({
						activityId: ownProps.activityId,
						instanceId: ownProps.instanceId
					})
				);
			},
			onSubmitEditExistingLink: (link) => {
				dispatch(
					RelationshipActions.Commands.setEditLink({
						activityId: ownProps.activityId,
						instanceId: ownProps.instanceId
					})
				);
				dispatch(
					RelationshipActions.Commands.modifyLink({
						activityId: ownProps.activityId,
						link
					})
				);
			},
			onSubmitEditNewLink: (link) => {
				dispatch(
					RelationshipActions.Commands.setEditLink({
						activityId: ownProps.activityId,
						instanceId: ownProps.instanceId
					})
				);
				dispatch(
					RelationshipActions.Events.linkAdded({
						activityId: ownProps.activityId,
						instanceId: ownProps.instanceId,
						candidate: {
							document: link.document as Record<string, object>,
							linkRef: link.linkRef
						}
					})
				);
			},
			onRemoveExistingLink: (link) => {
				dispatch(
					RelationshipActions.Commands.deleteLink({
						activityId: ownProps.activityId,
						instanceId: ownProps.instanceId,
						link
					})
				);
			},
			onSortingChange: (sort) => {
				dispatch(
					RelationshipActions.Events.sortChanged({
						activityId: ownProps.activityId,
						instanceId: ownProps.instanceId,
						type: "candidate",
						sort
					})
				);
			},
			onCandidatePageChange: (pageNumber) => {
				dispatch(
					RelationshipActions.Events.pageChanged({
						activityId: ownProps.activityId,
						instanceId: ownProps.instanceId,
						type: "candidate",
						pageNumber
					})
				);
			},
			onLinkPageChange: (pageNumber) => {
				dispatch(
					RelationshipActions.Events.pageChanged({
						activityId: ownProps.activityId,
						instanceId: ownProps.instanceId,
						type: "link",
						pageNumber
					})
				);
			},
			onFilterChange: (uiFilter) => {
				dispatch(
					RelationshipActions.Events.filterChanged({
						activityId: ownProps.activityId,
						instanceId: ownProps.instanceId,
						type: "candidate",
						fieldFilters: uiFilter
					})
				);
			}
		};
	},
	undefined,
	{
		areStatePropsEqual
	}
)(MultiSelectionWrapper);

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
 * @experimental
 */
import { connect } from "react-redux";

import type { FormModel } from "@com.mgmtp.a12.formengine/formengine-core";
import type { GroupInstance } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import type { Relationship } from "@com.mgmtp.a12.dataservices/dataservices-access";
import type { OverviewEngineApi, OverviewEngineState } from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import type { MultiSelectionProps } from "../api.js";
import { RelationshipActions } from "../../../actions.js";
import { RelationshipSelectors } from "../../../selectors.js";
import { CddActions } from "../../../../cdm/cdd/redux/index.js";
import { MultiSelectionWrapper } from "../adapter/MultiSelection.js";
import type { Relationship as RelationshipClientApi } from "../../../relationship.js";
import { getFilterProps, getSortingProps, getCandidatePaginationProps } from "../util.js";

import * as ScdmRelationshipUiAdapter from "./scdm_adapter.js";

interface StateProps extends ScdmRelationshipUiAdapter.StateProps {
	readonly candidateModels?: RelationshipClientApi.OverviewModels;
	readonly candidatePagination?: OverviewEngineApi.Pagination;
	readonly candidateSorting?: OverviewEngineState["sorting"];
	readonly candidatesFilters: OverviewEngineApi.FilterMap;

	readonly targetRole?: string;
}

type OwnProps = ScdmRelationshipUiAdapter.OwnProps<MultiSelectionProps, FormModel.DetachedRepeat>;

interface DispatchProps {
	onAddLink(candidate: RelationshipClientApi.Candidate): void;

	onAddExistingLink(link: RelationshipClientApi.LinkWithDocument): void;
	onRemoveExistingLink(link: RelationshipClientApi.LinkWithDocument): void;

	onCandidatePageChange(pageNumber: number): void;
	onFilterChange(fieldBasedFilters: OverviewEngineApi.FilterMap): void;
	onSortingChange(sort?: RelationshipClientApi.SortClause): void;
}
/** @internal */
export const ScdmMultiSelectionAdapter = connect<StateProps, DispatchProps, OwnProps, object>(
	function mapStateToProps(state: object, ownProps): StateProps {
		const { activityId, config, formModel, formModelElement, componentConfiguration, instanceId } = ownProps;

		const coreProps = ScdmRelationshipUiAdapter.mapStateToAdapterProps(state, ownProps);

		const candidateModels = ScdmRelationshipUiAdapter.modelsSelector(
			activityId,
			formModel,
			formModelElement.id,
			componentConfiguration,
			"candidate"
		)(state);

		const rawCandidates = RelationshipSelectors.candidateDataHolder(activityId, instanceId)(state);
		const candidateSorting = getSortingProps(rawCandidates?.data, candidateModels);
		const candidatesFilters = getFilterProps(rawCandidates?.data) ?? {};
		const candidatePagination = getCandidatePaginationProps(rawCandidates?.data);

		const targetRole = config.targetRole;

		return {
			...coreProps,
			candidateSorting,
			candidatesFilters,
			candidatePagination,
			candidateModels,
			targetRole
		};
	},
	function mapDispatchToProps(dispatch, ownProps): DispatchProps {
		const {
			activityId,
			config: { targetRole }
		} = ownProps;

		return {
			onAddLink: (candidate: RelationshipClientApi.Candidate) => {
				dispatch(
					CddActions.addCddLink({
						activityId,
						linkDescriptor: candidate.linkRef.linkDescriptor,
						candidateDoc: candidate.document.target as GroupInstance,
						targetRole,
						setDirty: true
					})
				);
			},
			onRemoveExistingLink: (link: RelationshipClientApi.LinkWithDocument) => {
				dispatch(
					CddActions.removedCddLink({
						activityId,
						linkRef: link.linkRef as Relationship.LinkRef,
						setDirty: true
					})
				);
			},
			onAddExistingLink() {
				alert("not implemented yet");
			},
			onSortingChange(sort) {
				dispatch(
					RelationshipActions.Events.sortChanged({
						activityId: ownProps.activityId,
						instanceId: ownProps.instanceId,
						type: "candidate",
						sort
					})
				);
			},
			onCandidatePageChange(pageNumber) {
				dispatch(
					RelationshipActions.Events.pageChanged({
						activityId: ownProps.activityId,
						instanceId: ownProps.instanceId,
						type: "candidate",
						pageNumber
					})
				);
			},
			onFilterChange(uiFilter) {
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
	}
)(MultiSelectionWrapper);

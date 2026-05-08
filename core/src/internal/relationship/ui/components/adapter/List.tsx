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

import React, { useContext } from "react";
import { connect } from "react-redux";

import { Activity, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import { type OverviewEngineApi } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import { LocalizerContext } from "@com.mgmtp.a12.utils/utils-localization-react/lib/main/index.js";
import { THUMBNAIL_SLICE } from "@com.mgmtp.a12.client/client-core/lib/core/activity/a12-internal/thumbnails/slice.js";

import { RelationshipActions } from "../../../actions.js";
import { type Relationship } from "../../../relationship.js";
import { RelationshipSelectors } from "../../../selectors.js";

import { type ListItem, type ListProps } from "../api.js";

import * as RelationshipUiAdapter from "./adapter.js";
import { type AdapterLink, AdapterLinkSelectors } from "./adapterLinkSelectors.js";
import { retrieveTargetDocRef } from "./MultiSelection.js";

/** @internal */
export interface StateProps extends RelationshipUiAdapter.StateProps {
	readonly linkModels?: Relationship.OverviewModels;
	readonly targetRole?: string;
	readonly pagination?: OverviewEngineApi.Pagination;
	readonly thumbnails?: Record<string, string>;
}

/** @internal */
export interface WrapperProps extends DispatchProps {
	onLinkClick?(link: AdapterLink): void;
	onCreateAndAddLink?(): void;
}

/** @internal */
export type OwnProps = RelationshipUiAdapter.OwnProps<ListProps>;

interface DispatchProps {
	onPageChange?(pageNumber: number): void;
}

/** @internal */
export function ListWrapper(props: StateProps & OwnProps & WrapperProps): React.ReactNode {
	const localizer = useContext(LocalizerContext).localizer;
	if (props.linkModels === undefined) {
		return null;
	}

	const onItemClick = props.onLinkClick
		? (item: ListItem) => {
				const link =
					props.links.loadingState === "loaded"
						? props.links.data.find((l) => l.linkRef.id === item.documentJson.id)
						: undefined;
				if (link && props.onLinkClick) {
					props.onLinkClick(link);
				}
			}
		: undefined;

	const items = RelationshipUiAdapter.retypeItemsData(props.links, (data) =>
		data.map<ListItem>((l) => ({
			documentJson: {
				id: l.linkRef.id,
				...l.document
			},
			visible: l.visible,
			mutation: l.mutation,
			reassigned: l.relinked,
			originalId: retrieveTargetDocRef(l.linkRef.linkDescriptor, props.targetRole)
		}))
	);

	return (
		<props.TemplateComponent
			items={items}
			itemModels={props.linkModels}
			label={props.label ? localizer(props.label) : undefined}
			localizableKeyPrefix={props.localizableKeyPrefix}
			disabled={props.disabled}
			readonly={props.readonly}
			rowsReadonlyInteractive={false}
			onItemClick={onItemClick}
			onAddItem={props.onCreateAndAddLink}
			onPageChange={props.onPageChange}
			pagination={props.pagination}
			thumbnails={props.thumbnails}
			{...props.templateComponentProps}
		/>
	);
}

/** @internal */
export const ListAdapter = connect<StateProps, {}, OwnProps>(
	function mapStateToProps(state, ownProps): StateProps {
		const { activityId, componentConfiguration: componentConfig, instanceId } = ownProps;

		const linkModels = RelationshipSelectors.overviewModels({
			activityId,
			componentConfig,
			resultDocumentModelType: "link"
		})(state);
		const coreProps = RelationshipUiAdapter.mapStateToAdapterProps(state, ownProps);

		const relationshipInstance = RelationshipSelectors.relationshipInstance(activityId, instanceId)(state);

		const targetRole = relationshipInstance?.uiConfiguration.targetRole;
		const pagination = AdapterLinkSelectors.selectLinkPagination(state, activityId, instanceId);
		const thumbnails = ActivitySelectors.activityPropById(
			activityId,
			(a) => Activity.findDefaultDataHolder(a)?.slices[THUMBNAIL_SLICE]
		)(state);

		return {
			...coreProps,
			pagination,
			linkModels,
			targetRole,
			thumbnails
		};
	},
	function mapDispatchToProps(dispatch, ownProps): DispatchProps {
		return {
			onPageChange: (pageNumber) => {
				dispatch(
					RelationshipActions.Events.pageChanged({
						activityId: ownProps.activityId,
						instanceId: ownProps.instanceId,
						type: "link",
						pageNumber
					})
				);
			}
		};
	}
)(ListWrapper);

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

import React, { useContext, useState } from "react";
import { connect, useDispatch, useSelector } from "react-redux";

import { ModelSelectors } from "@com.mgmtp.a12.client/client-core";
import { type VariantSelectionItem } from "@com.mgmtp.a12.client/client-core/heterogeneity";
import { type Relationship } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { DataServicesSelectors } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { type FormModel } from "@com.mgmtp.a12.formengine/formengine-core";
import { type GroupInstance } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";
import { localizableFromModel } from "@com.mgmtp.a12.utils/utils-localization/lib/main/index.js";
import { LocalizerContext } from "@com.mgmtp.a12.utils/utils-localization-react/lib/main/index.js";
import { Button, addPrefix, noop } from "@com.mgmtp.a12.widgets/widgets-core";

import { assertObject } from "../../../../shared/assertion.js";
import { CddActions } from "../../../../cdm/cdd/redux/index.js";
import { getEntityByRole } from "../../../../cdm/commons/relationshipModelUtils.js";
import {
	descriptorAddEntityButton,
	descriptorEditEntityButton,
	descriptorOpenEntityButton
} from "../../../../cdm/languages/localization.js";
import { RelationshipActions } from "../../../actions.js";
import { type Relationship as RelationshipClientApi } from "../../../relationship.js";
import { RelationshipSelectors } from "../../../selectors.js";
import { isRelationshipModel } from "../../../../shared/RelationshipModel.js";

import { SingleSelectionWrapper } from "../adapter/SingleSelection.js";
import { type SingleSelectionProps } from "../api.js";

import * as ScdmRelationshipUiAdapter from "./scdm_adapter.js";
import { calculateVariantSelectionItems, VariantSelectionModal } from "./variant-selection-modal.js";

interface StateProps extends ScdmRelationshipUiAdapter.StateProps {
	readonly candidateModels?: RelationshipClientApi.OverviewModels;
	readonly candidatesFullCount: number;
	readonly minSearchableTokenSize?: number;
}

interface DispatchProps {
	onSelectLink(candidate: RelationshipClientApi.Candidate): void;
	onRemoveLink(link: RelationshipClientApi.LinkWithDocument): void;
	onSearch(value: string | undefined): void;
	onLoadMore?(): void;
}

type OwnProps = ScdmRelationshipUiAdapter.OwnProps<SingleSelectionProps, FormModel.Control>;

/** @internal */
export const ScdmSingleSelectionAdapter = connect<StateProps, DispatchProps, OwnProps>(
	function mapStateToProps(state, ownProps) {
		const { activityId, formModel, formModelElement, componentConfiguration } = ownProps;
		const coreProps = ScdmRelationshipUiAdapter.mapStateToAdapterProps(state, ownProps);

		const candidateModels: RelationshipClientApi.OverviewModels = ScdmRelationshipUiAdapter.modelsSelector(
			activityId,
			formModel,
			formModelElement.id,
			componentConfiguration,
			"candidate"
		)(state);

		const rawCandidates = RelationshipSelectors.candidateDataHolder(activityId, ownProps.formModelElement.id)(state);
		const candidatesFullCount = rawCandidates?.data?.candidatePagination.fullCount ?? -1;

		const minSearchableTokenSizeStr = DataServicesSelectors.configurationByKey(
			"mgmtp.a12.dataservices.query.simpleSearch.minSearchableTokenSize"
		)(state);

		return {
			...coreProps,
			candidatesFullCount,
			candidateModels,
			minSearchableTokenSize: minSearchableTokenSizeStr ? Number(minSearchableTokenSizeStr) : undefined
		};
	},
	function mapDispatchToProps(dispatch, ownProps): DispatchProps {
		const {
			activityId,
			config: { targetRole }
		} = ownProps;
		return {
			onSelectLink: (candidate) => {
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
			onRemoveLink: (link: RelationshipClientApi.LinkWithDocument) => {
				dispatch(
					CddActions.removedCddLink({
						activityId,
						linkRef: link.linkRef as Relationship.LinkRef,
						setDirty: true
					})
				);
			},
			onLoadMore: () => {
				dispatch(
					RelationshipActions.Events.pageExpanded({
						activityId: ownProps.activityId,
						instanceId: ownProps.instanceId,
						type: "candidate"
					})
				);
			},
			onSearch: (fulltext) => {
				dispatch(
					RelationshipActions.Events.filterChanged({
						activityId: ownProps.activityId,
						instanceId: ownProps.instanceId,
						type: "candidate",
						fulltext
					})
				);
			}
		};
	}
)(SingleSelectionWrapperWrapper);

function SingleSelectionWrapperWrapper(props: StateProps & DispatchProps & OwnProps): React.ReactNode {
	const [showVariantSelection, setShowVariantSelection] = useState(false);

	const localizer = useContext(LocalizerContext).localizer;

	const dispatch = useDispatch();
	const modelGraph = useSelector(ModelSelectors.modelGraph());

	const relationshipModel = useSelector((state) => {
		if (!props.relationship) {
			return undefined;
		} else {
			return ModelSelectors.modelByName(props.relationship, isRelationshipModel)(state);
		}
	});

	if (!relationshipModel) {
		return null;
	}

	let title: string | undefined;
	let onClick: (() => void) | undefined;
	let variantSelectionItems: VariantSelectionItem[] = [];
	let onVariantSelected: (modelName: string) => void = () => {};
	if (
		props.links.loadingState === "loaded" &&
		props.relationship &&
		props.targetRole &&
		props.modificationConfiguration &&
		props.createActivityForNewEntity !== undefined &&
		props.createActivityForExistingEntity !== undefined
	) {
		const { addButtonLabel, editButtonLabel } = props.modificationConfiguration;

		const hasLink = props.links.data.length > 0;
		const targetDocRef = hasLink ? (props.links.data[0].document.t_docRef as string) : undefined;

		variantSelectionItems = calculateVariantSelectionItems(modelGraph, localizer, relationshipModel, props.targetRole);

		onVariantSelected = (modelName) => {
			dispatch(props.createActivityForNewEntity?.(modelName));
		};

		const targetEntity = relationshipModel && getEntityByRole(relationshipModel, props.targetRole);

		const entityLabel =
			(targetEntity && targetEntity.labels
				? localizer({
						key: `${relationshipModel}.content.entityCharacteristics.labels`,
						defaults: {
							en: targetEntity.labels.find((label) => label.locale === "en")?.text ?? undefined,
							de: targetEntity.labels.find((label) => label.locale === "de")?.text ?? undefined
						}
					})
				: undefined) ?? "";

		title =
			localizer(
				...(!props.readonly
					? [
							localizableFromModel(
								`${props.localizableKeyPrefix}.${relationshipModel?.header.id}.single-selection.${
									hasLink ? "edit" : "add"
								}Entity`,
								hasLink ? editButtonLabel : addButtonLabel
							)
						]
					: []),
				hasLink
					? props.readonly
						? descriptorOpenEntityButton(entityLabel)
						: descriptorEditEntityButton(entityLabel)
					: descriptorAddEntityButton(entityLabel)
			) ?? "";

		onClick = targetDocRef
			? () => {
					dispatch(props.createActivityForExistingEntity?.(targetDocRef));
				}
			: !props.readonly
				? () => {
						if (variantSelectionItems.length > 1 || (variantSelectionItems[0].children || []).length > 0) {
							setShowVariantSelection(true);
						} else {
							assertObject(variantSelectionItems[0].documentModelId);
							onVariantSelected(variantSelectionItems[0].documentModelId);
						}
					}
				: undefined;
	}
	return (
		<>
			<SingleSelectionWrapper
				{...props}
				// why doesn't the ScdmSingleSelectionAdapter (above) pass these props?
				onCancelEditLink={noop}
				onEditLink={noop}
				onSubmitEditExistingLink={noop}
				onSubmitEditNewLink={noop}
			/>
			{title !== undefined && onClick !== undefined ? (
				<div className={addPrefix("-u-margin-t-2xs")}>
					<Button label={title} secondary title={title} onClick={onClick} disabled={props.disabled} />
				</div>
			) : null}
			{showVariantSelection ? (
				<VariantSelectionModal
					variantSelectionItems={variantSelectionItems}
					onClose={() => setShowVariantSelection(false)}
					onVariantSelected={onVariantSelected}
				/>
			) : null}
		</>
	);
}

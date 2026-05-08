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
import { Events, FormEngineActions, type FormModel } from "@com.mgmtp.a12.formengine/formengine-core";
import {
	localizableFromModel,
	type LocalizedModelText
} from "@com.mgmtp.a12.utils/utils-localization/lib/main/index.js";
import { LocalizerContext } from "@com.mgmtp.a12.utils/utils-localization-react/lib/main/index.js";

import { assertObject } from "../../../../shared/assertion.js";
import { descriptorTableListAdd, descriptorTableListEdit } from "../../../localization.js";
import { type Relationship } from "../../../relationship.js";
import { isRelationshipModel } from "../../../../shared/RelationshipModel.js";

import { type AdapterLink } from "../adapter/adapterLinkSelectors.js";
import { ListWrapper } from "../adapter/List.js";
import { type ListProps } from "../api.js";
import { areMaxLinksAdded } from "../util.js";

import { makeRowsPathForRepeat } from "./makeRowsPathForRepeat.js";
import * as ScdmRelationshipUiAdapter from "./scdm_adapter.js";
import { calculateVariantSelectionItems, VariantSelectionModal } from "./variant-selection-modal.js";

/** @internal */
interface OwnProps extends ScdmRelationshipUiAdapter.OwnProps<ListProps, FormModel.DetachedRepeat> {
	templateComponentProps?: {
		buttonLabels?: {
			add?: LocalizedModelText;
			edit?: LocalizedModelText;
		};
	};
}

interface DispatchProps {
	onEditLinkedDoc(link: Relationship.LinkWithDocument): void;
	onCreateAndLink(): void;
}

/** @internal */
export const ScdmListAdapter = connect<ScdmRelationshipUiAdapter.StateProps, DispatchProps, OwnProps>(
	function mapStateToProps(state, ownProps) {
		const coreProps = ScdmRelationshipUiAdapter.mapStateToAdapterProps(state, ownProps);

		const linksWithRowIndex =
			coreProps.links.loadingState === "loaded"
				? {
						...coreProps.links,
						data: coreProps.links.data.map((link, index) => ({
							...link,
							index: index + 1
						}))
					}
				: coreProps.links;

		return {
			...coreProps,
			links: linksWithRowIndex
		};
	},
	function mapDispatchToProps(dispatch, ownProps: OwnProps) {
		const { activityId } = ownProps;
		return {
			onEditLinkedDoc: (link: Relationship.LinkWithDocument) => {
				const allRowsPath = makeRowsPathForRepeat(ownProps.formModelElement.groupPath, ownProps.dataContext);
				const rowPath = allRowsPath.map((pe, i) =>
					i === allRowsPath.length - 1 ? { ...pe, index: (link as any).index } : pe
				);
				dispatch(
					FormEngineActions.event({
						activityId: ownProps.activityId,
						engineEvent: Events.Repeat.enterRow({
							repeatFormModelPath: ownProps.formModelElementPath,
							rowPath
						})
					})
				);
			},
			onCreateAndLink() {
				const allRowsPath = makeRowsPathForRepeat(ownProps.formModelElement.groupPath, ownProps.dataContext);
				dispatch(
					FormEngineActions.event({
						activityId,
						engineEvent: Events.Repeat.addRow({
							path: allRowsPath,
							repeatFormModelPath: ownProps.formModelElementPath
						})
					})
				);
			}
		};
	}
)(ListWrapperWrapper);

function ListWrapperWrapper(props: ScdmRelationshipUiAdapter.StateProps & DispatchProps & OwnProps): React.ReactNode {
	const dispatch = useDispatch();
	const localizer = useContext(LocalizerContext).localizer;

	const [showVariantSelection, setShowVariantSelection] = useState(false);

	const modelGraph = useSelector(ModelSelectors.modelGraph());

	const relationshipModel = useSelector((state) => {
		if (!props.relationship) {
			return undefined;
		} else {
			return ModelSelectors.modelByName(props.relationship, isRelationshipModel)(state);
		}
	});

	if (!relationshipModel || !props.targetRole) {
		return null;
	}

	const { templateComponentProps, ...propsWithoutTemplateComponent } = props;

	const variantSelectionItems = calculateVariantSelectionItems(
		modelGraph,
		localizer,
		relationshipModel,
		props.targetRole
	);

	const loadedLinks = props.links.loadingState !== "loaded" ? [] : props.links.data;
	const maxLinksAdded = areMaxLinksAdded(loadedLinks.length, relationshipModel, props.targetRole);

	const mayAdd = props.formModelElement.enableAdd !== false && !maxLinksAdded;

	const dispatchActionForNewEntity = (modelName: string) => {
		if (props.createActivityForNewEntity) {
			dispatch(props.createActivityForNewEntity(modelName));
		}
	};

	const onCreateAndAddLink = props.createActivityForNewEntity
		? () => {
				if (variantSelectionItems.length > 1 || variantSelectionItems[0].children) {
					setShowVariantSelection(true);
				} else {
					assertObject(variantSelectionItems[0].documentModelId);
					dispatchActionForNewEntity(variantSelectionItems[0].documentModelId);
				}
			}
		: props.onCreateAndLink;

	const onLinkClick = props.createActivityForExistingEntity
		? (link: AdapterLink) => {
				dispatch(props.createActivityForExistingEntity?.((link.document as any).t_docRef, link.linkRef.id));
			}
		: props.onEditLinkedDoc;

	const addLabel =
		localizer(
			localizableFromModel(
				`${props.localizableKeyPrefix}.list.addEntity`,
				props.templateComponentProps?.buttonLabels?.add ?? props.modificationConfiguration?.addButtonLabel
			),
			descriptorTableListAdd()
		) ?? "";

	const editLabel =
		localizer(
			localizableFromModel(
				`${props.localizableKeyPrefix}.list.editEntity`,
				props.templateComponentProps?.buttonLabels?.edit ?? props.modificationConfiguration?.editButtonLabel
			),
			descriptorTableListEdit()
		) ?? "";

	return (
		<>
			<ListWrapper
				{...propsWithoutTemplateComponent}
				templateComponentProps={{
					...templateComponentProps,
					addLabel,
					editLabel,
					rowsReadonlyInteractive: true
				}}
				onLinkClick={onLinkClick}
				onCreateAndAddLink={mayAdd ? onCreateAndAddLink : undefined}
			/>
			{showVariantSelection ? (
				<VariantSelectionModal
					variantSelectionItems={variantSelectionItems}
					onClose={() => {
						setShowVariantSelection(false);
					}}
					onVariantSelected={dispatchActionForNewEntity}
				/>
			) : null}
		</>
	);
}

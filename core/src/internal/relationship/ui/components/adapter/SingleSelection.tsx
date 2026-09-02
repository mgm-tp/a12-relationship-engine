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
import React, { useRef, useContext } from "react";

import type { ModelPath } from "@com.mgmtp.a12.base/base-model-api";
import { defaultValueParser } from "@com.mgmtp.a12.formengine/formengine-core";
import { LocalizerContext } from "@com.mgmtp.a12.utils/utils-localization-react";
import type { Relationship } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { DataServicesSelectors } from "@com.mgmtp.a12.dataservices/dataservices-access";
import type { Localizer, ValueConversion } from "@com.mgmtp.a12.utils/utils-localization";
import { ExpressionBuilder, ExpressionInterpreter } from "@com.mgmtp.a12.expression/expression-core";
import { OverviewModel, LocalizableFactory } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import {
	type DocumentModel,
	type GroupInstance,
	DocumentServiceFactory,
	type EntityInstancePath,
	type FieldInstanceValue
} from "@com.mgmtp.a12.kernel/kernel-md-facade";

import { RelationshipActions } from "../../../actions.js";
import { RelationshipSelectors } from "../../../selectors.js";
import { assertCondition } from "../../../../shared/assertion.js";
import { type Converter, createConverter } from "../../../converter.js";
import { Relationship as RelationshipClientApi } from "../../../relationship.js";
import type { SingleSelectionItem, RelationshipDocument, SingleSelectionProps } from "../api.js";

import * as RelationshipUiAdapter from "./adapter.js";

interface StateProps extends RelationshipUiAdapter.StateProps {
	readonly linkModels?: RelationshipClientApi.OverviewModels;
	readonly candidateModels?: RelationshipClientApi.OverviewModels;
	readonly candidatesFullCount: number;
	readonly editLinkModels?: RelationshipClientApi.FormModels;
	readonly minSearchableTokenSize?: number;
}

interface DispatchProps {
	onSelectLink(candidate: RelationshipClientApi.Candidate): void;
	onRemoveLink(link: RelationshipClientApi.LinkWithDocument): void;
	// Atomic replace (cdm case); falls back to onRemoveLink + onSelectLink when absent
	onReplaceLink?(candidate: RelationshipClientApi.Candidate, oldLink: RelationshipClientApi.LinkWithDocument): void;

	onSearch(value: string | undefined): void;

	onLoadMore?(): void;
	onCancelEditLink(): void;
	onEditLink(link: RelationshipClientApi.LinkWithDocument): void;
	onSubmitEditNewLink(link: RelationshipClientApi.LinkWithDocument): void;
	onSubmitEditExistingLink(link: RelationshipClientApi.LinkWithDocument): void;
}

/** @internal */
export function areStatePropsEqual(prevProps: StateProps, curProps: StateProps): boolean {
	return (
		RelationshipUiAdapter.areStatePropsEqual(prevProps, curProps) &&
		prevProps.linkModels?.loadingState === curProps.linkModels?.loadingState &&
		prevProps.candidateModels?.loadingState === curProps.candidateModels?.loadingState &&
		prevProps.editLinkModels?.loadingState === curProps.editLinkModels?.loadingState &&
		prevProps.candidatesFullCount === curProps.candidatesFullCount &&
		prevProps.minSearchableTokenSize === curProps.minSearchableTokenSize
	);
}

type OwnProps = RelationshipUiAdapter.OwnProps<SingleSelectionProps>;

/** @internal */
export function SingleSelectionWrapper(props: StateProps & DispatchProps & OwnProps): React.ReactNode {
	const localizerContext = useContext(LocalizerContext);

	const links =
		props.links.loadingState === "loaded"
			? props.links.data.filter((link) => link.mutation !== "removed" && link.mutation !== "withdrawn")
			: [];

	const linkValueProvider = resolveLinkValueProvider(
		props.linkModels,
		localizerContext.localizer,
		localizerContext.conversion
	);

	// Key on link content signals (id + document reference), not the links array, which is rebuilt by unmemoized selectors on every store notification.
	const selectedItemLabel = links.length > 0 ? linkValueProvider(links[0].document) : undefined;
	const selectedItem = useValueKeyedMemo(
		[props.links.loadingState, links[0]?.linkRef.id, links[0]?.document, props.targetRole, selectedItemLabel] as const,
		() =>
			RelationshipUiAdapter.retypeItemsData(props.links, () =>
				links.length > 0 ? convertLinkToSingleSelectionItem(links[0], linkValueProvider, props.targetRole) : undefined
			)
	);

	const editAssignmentLabel = props.editLink ? linkValueProvider(props.editLink.document) : undefined;
	const editAssignmentItem = useValueKeyedMemo(
		[props.editLink?.linkRef.id, props.editLink?.document, props.targetRole, editAssignmentLabel] as const,
		(): SingleSelectionItem | undefined => {
			if (props.editLink === undefined || editAssignmentLabel === undefined) {
				return undefined;
			}

			return {
				label: editAssignmentLabel,
				docRef: getTargetDocRef(props.editLink.linkRef.linkDescriptor.entities, props.targetRole)
			};
		}
	);

	if (props.linkModels === undefined || props.candidateModels === undefined) {
		return null;
	}

	const candidateValueProvider = createDisplayValueProvider(
		props.candidateModels,
		localizerContext.localizer,
		localizerContext.conversion
	);

	const availableItems = RelationshipUiAdapter.retypeItemsData(props.candidates, (data) =>
		data.map((c) => convertCandidateToSingleSelectionItem(c, candidateValueProvider, props.targetRole))
	);

	function onSelect(item?: SingleSelectionItem) {
		if (selectedItem.loadingState !== "loaded") {
			throw new Error("Item has been selected even if previous hasn't been loaded yet.");
		}

		if (
			selectedItem.data &&
			isCandidateSingleSelectionItem(item) &&
			RelationshipClientApi.isLinkDescriptorEqual(
				selectedItem.data.link.linkRef.linkDescriptor,
				item.candidate.linkRef.linkDescriptor
			)
		) {
			return;
		}

		if (isCandidateSingleSelectionItem(item)) {
			// Replace must be atomic in the cdm case: a computation pass between
			// remove and add would either see both links or an empty
			// group re-creating initial-value instances
			if (props.editLinkModels === undefined && selectedItem.data) {
				if (props.onReplaceLink) {
					props.onReplaceLink(item.candidate as RelationshipClientApi.Candidate, selectedItem.data.link);

					return;
				}

				props.onRemoveLink(selectedItem.data.link);
			}

			props.onSelectLink(item.candidate as RelationshipClientApi.Candidate);
		} else if (selectedItem.data) {
			props.onRemoveLink(selectedItem.data.link);
		}
	}

	function onEditItem(item: SingleSelectionItem) {
		if (isLinkSingleSelectionItem(item)) {
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
				if (links.length > 0) {
					props.onRemoveLink(links[0]);
				}

				props.onSubmitEditNewLink(modifiedLink);
			}
		}
	}

	return (
		<props.TemplateComponent
			label={props.label ? localizerContext.localizer(props.label) : undefined}
			localizableKeyPrefix={props.localizableKeyPrefix}
			disabled={props.disabled}
			readonly={props.readonly}
			items={availableItems}
			itemsFullCount={props.candidatesFullCount}
			selectedItem={selectedItem}
			editItemDocumentJson={props.editLink && (props.editLink.document.relationship as object | undefined)}
			editItem={editAssignmentItem}
			onEditItem={onEditItem}
			onCancelEditItemDocument={props.onCancelEditLink}
			onSubmitEditItemDocument={onSubmitEditItemDocument}
			editItemFormModels={props.editLinkModels}
			onSelectItem={onSelect}
			onSearchItem={props.onSearch}
			onLoadMore={props.onLoadMore}
			minSearchableTokenSize={props.minSearchableTokenSize}
			{...props.templateComponentProps}
		/>
	);
}

// useMemo-alike keyed by shallow value equality, immune to upstream reference churn.
function useValueKeyedMemo<TKey extends readonly unknown[], TValue>(key: TKey, computeValue: () => TValue): TValue {
	const cache = useRef<{ readonly key: TKey; readonly value: TValue } | undefined>(undefined);

	if (cache.current === undefined || !sameShallowKey(cache.current.key, key)) {
		cache.current = { key, value: computeValue() };
	}

	return cache.current.value;
}

function sameShallowKey(previous: readonly unknown[], current: readonly unknown[]): boolean {
	return previous.length === current.length && previous.every((value, index) => value === current[index]);
}

function resolveLinkValueProvider(
	linkModels: RelationshipClientApi.OverviewModels | undefined,
	localizer: Localizer,
	conversion: ValueConversion
): DisplayValueProvider {
	return linkModels === undefined ? () => "" : createDisplayValueProvider(linkModels, localizer, conversion);
}

/** @internal */
export type DisplayValueProvider = (doc: {}) => string;

interface LinkSingleSelectionItem extends SingleSelectionItem {
	readonly link: RelationshipClientApi.LinkWithDocument;
}

function isLinkSingleSelectionItem(
	singleSelectionItem: SingleSelectionItem | undefined
): singleSelectionItem is LinkSingleSelectionItem {
	return singleSelectionItem !== undefined && (singleSelectionItem as LinkSingleSelectionItem).link !== undefined;
}

/** @internal */
export interface CandidateSingleSelectionItem extends SingleSelectionItem {
	readonly candidate: Relationship.Candidate;
}

/** @internal */
export function isCandidateSingleSelectionItem(
	singleSelectionItem: SingleSelectionItem | undefined
): singleSelectionItem is CandidateSingleSelectionItem {
	return (
		singleSelectionItem !== undefined && (singleSelectionItem as CandidateSingleSelectionItem).candidate !== undefined
	);
}

/**
 * Creates a label for a document (similar to OvE) using the first column of the OV model
 * @internal
 */
export function createDisplayValueProvider(
	models: RelationshipClientApi.OverviewModels,
	localizer: Localizer,
	conversion: ValueConversion
): DisplayValueProvider {
	if (models.loadingState !== "loaded" || models.overviewModel.content.columns.length === 0) {
		return () => "";
	}

	const dmSearchService = new DocumentServiceFactory().getDocumentModelSearchService(models.documentModel);

	const columns = models.overviewModel.content.columns;

	const firstColumn = columns.length > 0 ? columns[0] : undefined;

	if (firstColumn === undefined) {
		return () => "";
	}

	const converter = createConverter(conversion, models.documentModel);

	if (OverviewModel.ReferenceColumn.isAssignableFrom(firstColumn)) {
		const fieldPath = dmSearchService.getPathById(firstColumn.elementRef);

		if (fieldPath === undefined) {
			return () => "";
		}

		const field = dmSearchService.getByPath(fieldPath);
		assertCondition(field?.type === "Field", "Expected a field.");
		const fieldType = field.fieldType.type;

		return function displayValueProvider(doc) {
			return formatValue({
				path: fieldPath,
				document: doc,
				documentModel: models.documentModel,
				fieldType,
				localizer,
				converter
			});
		};
	} else if (OverviewModel.ExpressionColumn.isAssignableFrom(firstColumn)) {
		const expressionTree = ExpressionBuilder.build(firstColumn.expression, {
			rootPath: [],
			valueParser: defaultValueParser(models.documentModel)
		});

		return function displayValueProvider(doc) {
			return expressionTree
				? ExpressionInterpreter.format({
						expressionTree,
						localizer,
						documentModel: models.documentModel,
						rootPath: [],
						fieldFormatter: (path: EntityInstancePath) => {
							const field = dmSearchService.getByPath(path);
							assertCondition(field?.type === "Field", "Expected a field.");
							const fieldType = field.fieldType.type;

							return formatValue({
								path,
								document: doc,
								documentModel: models.documentModel,
								fieldType,
								localizer,
								converter
							});
						},
						valueGetter: (path: EntityInstancePath) => {
							const element = dmSearchService.getByPath(path);
							const fieldType = element?.type === "Field" ? element.fieldType.type : undefined;

							return getValue(path, doc, fieldType);
						},
						noMarkup: true
					})
				: "";
		};
	}

	return () => "";
}

function getValue(
	path: ModelPath,
	obj: object | FieldInstanceValue,
	fieldType?: DocumentModel.FieldType["type"]
): object | FieldInstanceValue {
	if (path.length === 0) {
		return obj;
	}

	const next = (obj as GroupInstance)[path[0].elementName];

	if (next === undefined) {
		return fieldType === "BooleanType" ? false : null;
	}

	return getValue(path.slice(1), next, fieldType);
}

function formatValue(options: {
	path: ModelPath;
	document: object;
	documentModel: DocumentModel;
	fieldType: DocumentModel.FieldType["type"];
	localizer: Localizer;
	converter: Converter;
}): string {
	const { path, document, documentModel, fieldType, localizer, converter } = options;

	const value = getValue(path, document, fieldType);

	if (isLocalizableFieldType(fieldType)) {
		return localizer(...LocalizableFactory.createFieldValueLocalizables(value, path, documentModel)) ?? "";
	}

	return converter.formatValue(path, value);
}

function getTargetDocRef(
	entities: Relationship.LinkEntitySpecResponse[] | Relationship.LinkEntitySpec[],
	targetRole?: string
): string {
	const targetEntity = entities.find((e) => e.role === targetRole);
	assertCondition(typeof targetEntity?.docRef === "string", "Expected docRef to exist!");

	return targetEntity.docRef;
}

/** @internal */
export function convertCandidateToSingleSelectionItem(
	candidate: RelationshipUiAdapter.AdapterCandidate,
	valueProvider: DisplayValueProvider,
	targetRole?: string
): CandidateSingleSelectionItem {
	return {
		label: valueProvider((candidate.document as RelationshipDocument).target),
		docRef: getTargetDocRef(candidate.linkRef.linkDescriptor.entities, targetRole),
		candidate
	};
}

/** @internal */
export function convertLinkToSingleSelectionItem(
	link: RelationshipClientApi.LinkWithDocument,
	valueProvider: DisplayValueProvider,
	targetRole?: string
): LinkSingleSelectionItem {
	return {
		label: valueProvider(link.document),
		link,
		docRef: getTargetDocRef(link.linkRef.linkDescriptor.entities, targetRole)
	};
}

/** @internal */
export const SingleSelectionAdapter = connect<StateProps, DispatchProps, OwnProps, object>(
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

		const minSearchableTokenSizeStr = DataServicesSelectors.configurationByKey(
			"mgmtp.a12.dataservices.query.simpleSearch.minSearchableTokenSize"
		)(state);

		return {
			...coreProps,
			linkModels,
			candidateModels,
			editLinkModels,
			candidatesFullCount: relationshipInstance?.candidatePagination.fullCount ?? 0,
			minSearchableTokenSize: minSearchableTokenSizeStr ? Number(minSearchableTokenSizeStr) : undefined
		};
	},
	function mapDispatchToProps(dispatch, ownProps): DispatchProps {
		return {
			onSelectLink: (candidate) => {
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
			onRemoveLink: (link) => {
				dispatch(
					RelationshipActions.Commands.deleteLink({
						activityId: ownProps.activityId,
						instanceId: ownProps.instanceId,
						link: link as RelationshipClientApi.LinkWithDocument
					})
				);
			},
			onSearch: (value: string | undefined) => {
				dispatch(
					RelationshipActions.Events.filterChanged({
						activityId: ownProps.activityId,
						instanceId: ownProps.instanceId,
						type: "candidate",
						fulltext: value
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
			}
		};
	},
	undefined,
	{
		areStatePropsEqual
	}
)(SingleSelectionWrapper);

function isLocalizableFieldType(fieldType: DocumentModel.FieldType["type"]): boolean {
	return ["BooleanType", "ConfirmType", "EnumerationType"].includes(fieldType);
}

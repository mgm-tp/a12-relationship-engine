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

import type React from "react";
import { styled } from "styled-components";
import { Component, useContext } from "react";

import type { DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import { AriaLevelContext } from "@com.mgmtp.a12.formengine/formengine-core";
import { LocalizerContext } from "@com.mgmtp.a12.utils/utils-localization-react";
import { type Localizable, localizableFromModel } from "@com.mgmtp.a12.utils/utils-localization";
import {
	noop,
	Icon,
	Counter,
	addPrefix,
	LayoutGrid,
	ButtonGroup,
	InputElements,
	type CounterProps,
	ContentBoxElements,
	type LayoutGridProps,
	Button as WidgetsButton
} from "@com.mgmtp.a12.widgets/widgets-core";
import {
	type Footer,
	type Heading,
	OverviewModel,
	type TableBody,
	OverviewEngine,
	type FilterButton,
	type TableBodyCell,
	type RowActionGroup,
	DefaultComponentMap,
	type OverviewEngineApi,
	type OverviewEngineState
} from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import type { Relationship } from "../../relationship.js";
import { assertObject } from "../../../shared/assertion.js";
import { DocumentModelUtils } from "../../../shared/utils.js";
import {
	descriptorSelectedItems,
	descriptorAvailableItems,
	descriptorLinkTableEmptyMessage,
	descriptorCandidateTableEmptyMessage
} from "../../localization.js";

import FormEngineModal from "./FormEngineModal.js";
import { ProgressIndicator } from "./ProgressIndicator.js";
import type { MultiSelectionItem, MultiSelectionProps } from "./api.js";
import { type DocumentId, normalizeCssLength, omitActionColumnWidth, type LocalizedLabelConfig } from "./util.js";

const DualPaneSelectionGrid = styled(LayoutGrid.Grid)`
	background-color: ${({ theme }) => theme.colors.background.secondaryBackground};
`;

interface DualPaneSelectionItem extends MultiSelectionItem {
	readonly type: Relationship.LinkMutationState | "existing" | "disabled_candidate" | "candidate";
}

export interface DualPaneSelectionProps extends MultiSelectionProps {
	readonly availableItemsTable?: LocalizedLabelConfig;
	readonly selectedItemsTable?: LocalizedLabelConfig;
	/**
	 * Height of each DualPane column as a CSS length value, passed through directly.
	 * Leave unset to let the column grow with its content.
	 */
	readonly height?: string;
}

const columnSize: LayoutGridProps.ColumnSize = { lg: 6, md: 6, sm: 6 };

function toColumnHeight(height: string | undefined): LayoutGridProps.ColumnHeight | undefined {
	if (height === undefined) {
		return undefined;
	}

	const normalizedHeight = normalizeCssLength(height);

	return { xs: normalizedHeight, sm: normalizedHeight, md: normalizedHeight, lg: normalizedHeight };
}

export function DualPaneSelection(props: DualPaneSelectionProps): React.ReactNode {
	const columnHeight = toColumnHeight(props.height);

	return (
		<>
			{props.editItemFormModels && props.editItemFormModels.loadingState === "loaded" && props.editItemDocumentJson ? (
				<FormEngineModal
					{...props.editItemFormModels}
					readonly={props.readonly}
					document={props.editItemDocumentJson}
					onCancel={props.onCancelEditItemDocument}
					onSubmit={props.onSubmitEditItemDocument}
				/>
			) : undefined}
			<InputElements.Label label={props.label} />
			<DualPaneSelectionGrid noGutter>
				<LayoutGrid.Row>
					<LayoutGrid.Column size={columnSize} verticalAlignment="top" height={columnHeight}>
						<CandidateTable {...props} />
					</LayoutGrid.Column>
					<LayoutGrid.Column size={columnSize} verticalAlignment="top" height={columnHeight}>
						<LinkTable {...props} />
					</LayoutGrid.Column>
				</LayoutGrid.Row>
			</DualPaneSelectionGrid>
		</>
	);
}

function CandidateTable(props: DualPaneSelectionProps): React.ReactNode {
	const localizerContext = useContext(LocalizerContext);

	if (props.availableItemModels.loadingState !== "loaded") {
		return <ProgressIndicator variant="bright" height={200} />;
	}

	const items = props.availableItems.loadingState === "loaded" ? props.availableItems.data : [];

	const candidateOverviewProps = {
		overviewModel: props.availableItemModels.overviewModel,
		documentModel: props.availableItemModels.documentModel,
		disabled: props.disabled,
		readonly: props.readonly
	};

	const onClickAddAssignment = (params: DocumentId) => {
		const item = items.find((e) => e.documentJson.id === params.documentId);

		if (item === undefined) {
			throw new Error(`Could not find document with id ${params.documentId}`);
		}

		props.onAddAssignment(item);
	};

	return (
		<LocalizerContext.Provider
			value={{
				...localizerContext,
				localizer: (...localizable: Localizable[]) => {
					return localizerContext.localizer(
						...localizable.map((l) =>
							l.key === "overviewEngine.noResultFound" ? descriptorCandidateTableEmptyMessage() : l
						)
					);
				}
			}}>
			<DualPaneOverviewTable
				{...candidateOverviewProps}
				onToggleState={!props.readonly ? onClickAddAssignment : noop}
				sorting={props.availableItemsSorting}
				onSortingChange={props.onAvailableItemsSortingChange}
				title={
					localizerContext.localizer(
						localizableFromModel(
							`${props.localizableKeyPrefix}.dual-pane.available-items.title`,
							props.availableItemsTable?.label
						),
						descriptorAvailableItems()
					) ?? ""
				}
				items={items.map<DualPaneSelectionItem>((item) => ({
					...item,
					type: item.selectionAllowed ? "candidate" : "disabled_candidate"
				}))}
				loading={props.availableItems.loadingState !== "loaded"}
				showMutationIcon={false}
				filter={{
					onFilterChanged: props.onAvailableItemsFilterChanged,
					activeFilters: props.availableItemsFilters
				}}
				paging={{
					pageChange: props.onAvailableItemsPageChange,
					pagination: props.availableItemsPagination
				}}
				thumbnails={props.thumbnails}
			/>
		</LocalizerContext.Provider>
	);
}

function LinkTable(props: DualPaneSelectionProps): React.ReactNode {
	const localizerContext = useContext(LocalizerContext);

	if (props.assignmentModels.loadingState !== "loaded") {
		return <ProgressIndicator variant="bright" height={200} />;
	}

	const items = props.assignments.loadingState === "loaded" ? props.assignments.data : [];

	const assignments = items.map<DualPaneSelectionItem>((assignment) => ({
		...assignment,
		type: assignment.mutation === undefined ? "existing" : assignment.mutation
	}));

	const onToggleAssignment = (params: DocumentId) => {
		const assignment = assignments.find((a) => a.documentJson.id === params.documentId);

		if (assignment === undefined) {
			throw new Error(`Could not find document with it ${params.documentId}`);
		}

		if (assignment.type === "existing" || assignment.type === "added") {
			props.onRemoveExistingAssignment(assignment);
		} else if (assignment.type === "removed" || assignment.type === "withdrawn") {
			props.onAddExistingAssignment(assignment);
		}
	};

	const onClickEditAssignment = props.editItemFormModels
		? (assignment: DualPaneSelectionItem) => {
				props.onEditItem(assignment);
			}
		: undefined;

	const linkOverviewProps = {
		overviewModel: props.assignmentModels.overviewModel,
		documentModel: props.assignmentModels.documentModel,
		disabled: props.disabled,
		readonly: props.readonly,
		maxNumberOfLinks: props.maxNumberOfAssignments
	};

	return (
		<LocalizerContext.Provider
			value={{
				...localizerContext,
				localizer: (...localizable: Localizable[]) => {
					return localizerContext.localizer(
						...localizable.map((l) =>
							l.key === "overviewEngine.noResultFound" ? descriptorLinkTableEmptyMessage() : l
						)
					);
				}
			}}>
			<DualPaneOverviewTable
				{...linkOverviewProps}
				onToggleState={props.readonly ? noop : onToggleAssignment}
				onEdit={onClickEditAssignment}
				title={
					localizerContext.localizer(
						localizableFromModel(
							`${props.localizableKeyPrefix}.dual-pane.selected-items.title`,
							props.selectedItemsTable?.label
						),
						descriptorSelectedItems()
					) ?? ""
				}
				items={assignments}
				loading={props.assignments.loadingState !== "loaded"}
				showMutationIcon={true}
				filter={{
					onFilterChanged() {},
					/*
					 * This FilterBar and FilterSelector button has to be added to align the two tables horizontally.
					 * Filtering doesn't work for links, so the widgets are hidden.
					 */
					hideWidget: true,
					activeFilters: {}
				}}
				paging={{
					pageChange: props.onAssignedItemsPageChange,
					pagination: props.assignedItemsPagination,
					fullCount: props.assignedItemsFullCount
				}}
				thumbnails={props.thumbnails}
			/>
		</LocalizerContext.Provider>
	);
}

function getMutationIcon(item: DualPaneSelectionItem): React.ReactNode | undefined {
	if (item.reassigned && (item.type === "added" || item.type === "existing")) {
		return <Icon iconTheme="custom">check_dashed</Icon>;
	} else if (item.type === "removed") {
		return <Icon variant="error">delete_outline</Icon>;
	} else if (item.type === "added") {
		return <Icon>check</Icon>;
	}

	return undefined;
}

interface FilterSettings {
	/** @default false */
	readonly hideWidget?: boolean;
	onFilterChanged(filters: OverviewEngineApi.FilterMap): void;
	readonly activeFilters: OverviewEngineApi.FilterMap;
}

interface PageSettings {
	readonly pagination?: OverviewEngineApi.Pagination;
	pageChange?(page: number): void;
	readonly fullCount?: number;
}

interface DualPaneOverviewTableProps {
	readonly title: string;
	readonly items: DualPaneSelectionItem[];
	readonly overviewModel: OverviewModel;
	readonly documentModel: DocumentModel;
	readonly disabled?: boolean;
	readonly readonly?: boolean;
	readonly loading: boolean;
	readonly showMutationIcon: boolean;
	onToggleState(params: DocumentId): void;
	onEdit?(rowItem: DualPaneSelectionItem): void;
	readonly filter: FilterSettings;
	readonly paging: PageSettings;
	readonly sorting?: OverviewEngineState["sorting"];
	onSortingChange?(sorting?: Relationship.SortClause): void;
	readonly thumbnails?: Record<string, string>;
	readonly maxNumberOfLinks?: number;
}

interface DualPaneOverviewTableState {
	readonly showFilterSelector: boolean;
}

type OverviewHeadingProps = Heading.PropsType & {
	title: string;
	persistedLinkCount?: number;
	addedCandidateCount?: number;
	removedCandidateCount?: number;
	maxLinkCount?: number;
	currentLinkCount?: number;
};

const OverviewHeading: React.ComponentType<OverviewHeadingProps> = (props: OverviewHeadingProps) => {
	const maxLinksExceeded =
		props.maxLinkCount !== undefined &&
		props.currentLinkCount !== undefined &&
		props.currentLinkCount > props.maxLinkCount;

	return (
		<ContentBoxElements.Heading>
			<AriaLevelContext.Consumer>
				{(value) => (
					<ContentBoxElements.Title
						ariaLevel={value.ariaLevel}
						text={
							<>
								{props.title}
								{props.maxLinkCount === undefined && props.persistedLinkCount ? (
									<MarginLeftCounter value={props.persistedLinkCount} />
								) : props.maxLinkCount !== undefined ? (
									<MarginLeftCounter
										value={`${props.currentLinkCount ?? 0}/${props.maxLinkCount}`}
										addonAfter={maxLinksExceeded ? <Icon>bolt</Icon> : null}
										type={maxLinksExceeded ? "destructive" : "default"}
									/>
								) : null}
								{props.addedCandidateCount ? (
									<MarginLeftCounter
										value={props.addedCandidateCount}
										addonAfter={<Icon>done</Icon>}
										type="constructive"
									/>
								) : null}
								{props.removedCandidateCount ? (
									<MarginLeftCounter
										value={props.removedCandidateCount}
										addonAfter={<Icon>delete_outline</Icon>}
										type="destructive"
									/>
								) : null}
							</>
						}
					/>
				)}
			</AriaLevelContext.Consumer>
		</ContentBoxElements.Heading>
	);
};

function MarginLeftCounter(props: CounterProps): React.ReactNode {
	return <Counter {...props} className={addPrefix("-u-margin-l-2xs")} />;
}

/**
 * @internal
 * Export for tests
 */
export class DualPaneOverviewTable extends Component<DualPaneOverviewTableProps, DualPaneOverviewTableState> {
	private overviewModel: OverviewModel;

	constructor(props: DualPaneOverviewTableProps) {
		super(props);

		this.state = {
			showFilterSelector: false
		};

		this.overviewModel = this.props.overviewModel;
		this.overviewModel = this.addFakeRowAction(this.overviewModel);
		this.overviewModel = this.props.showMutationIcon
			? this.addMutationIconColumn(this.overviewModel)
			: this.overviewModel;

		this.overviewModel = omitActionColumnWidth({
			...this.overviewModel,
			content: {
				...this.overviewModel.content,
				configuration: { ...this.overviewModel.content.configuration, enableFilter: true }
			}
		});
	}

	handleColumnClick = (columnIndex: number) => {
		const col = this.props.overviewModel.content.columns[columnIndex];

		if (OverviewModel.ReferenceColumn.isAssignableFrom(col)) {
			const path = DocumentModelUtils.getElementPathForId(col.elementRef, this.props.documentModel);

			if (this.props.onSortingChange) {
				this.props.onSortingChange({
					path,
					order: col.preferredSorting || "ASC"
				});
			}
		}
	};

	Heading: React.ComponentType<Heading.PropsType> = (props) => {
		const removedItemsCount = this.props.items.filter((item) => item.type === "removed").length;
		const existingItemCount = this.props.paging.fullCount ? this.props.paging.fullCount - removedItemsCount : undefined;
		const addedItemCount = this.props.items.filter((item) => item.type === "added").length;
		const removedAndWithdrawnItemsCount = this.props.items.filter(
			(item) => item.type === "removed" || item.type === "withdrawn"
		).length;
		const maxLinkCount = this.props.maxNumberOfLinks;
		const currentLinkCount = this.props.items.length - removedAndWithdrawnItemsCount;

		return (
			<OverviewHeading
				{...props}
				title={this.props.title}
				persistedLinkCount={existingItemCount}
				addedCandidateCount={addedItemCount}
				removedCandidateCount={removedAndWithdrawnItemsCount}
				maxLinkCount={maxLinkCount}
				currentLinkCount={currentLinkCount}
			/>
		);
	};

	Footer: React.ComponentType<Footer.PropsType> = () => (
		<ContentBoxElements.Footer>
			{this.props.paging.pagination && this.props.paging.pagination.pageCount > 1 && this.props.paging.pageChange && (
				<DefaultComponentMap.Pagination
					onChange={this.props.paging.pageChange}
					pageCount={this.props.paging.pagination.pageCount}
					pageSize={this.props.paging.pagination.pageSize}
					pageNumber={this.props.paging.pagination.pageNumber}
				/>
			)}
		</ContentBoxElements.Footer>
	);

	RowActionGroup: React.ComponentType<RowActionGroup.Props> = (props) => {
		const item = this.props.items.find((i) => i.documentJson.id === props.row.id);
		assertObject(item, `Expected DualPaneSelectionItem with id ${props.row.id} to exist`);

		return this.rowActionGroupRenderer(item);
	};

	TableBodyCell: React.ComponentType<TableBodyCell.Props> = (props) => {
		const { columnModel } = props;
		const item = this.props.items.find((i) => i.documentJson.id === props.row.id);
		assertObject(item, `Expected DualPaneSelectionItem with id ${props.row.id} to exist`);

		if (columnModel.id === "dual-pane-icon-column") {
			return getMutationIcon(item) || null;
		} else {
			return <DefaultComponentMap.TableBodyCell {...props} />;
		}
	};

	FilterButton: React.ComponentType<FilterButton.PropsType> = (props) => {
		return this.props.filter.hideWidget ? null : <DefaultComponentMap.FilterButton {...props} />;
	};

	TableBody: React.ComponentType<TableBody.Props> = (props) => {
		if (this.props.loading) {
			return <ProgressIndicator variant="bright" height="100%" />;
		} else {
			return <DefaultComponentMap.TableBody {...props} />;
		}
	};

	render(): React.ReactNode {
		const rowState: OverviewEngineApi.RowState = this.props.items.reduce<OverviewEngineApi.RowState>((r, item) => {
			if (item.type === "removed" || item.type === "withdrawn") {
				return { ...r, [item.documentJson.id]: { useSecondaryColor: true } };
			} else if (item.type === "disabled_candidate") {
				return { ...r, [item.documentJson.id]: { disabled: true } };
			}

			return r;
		}, {});

		return (
			<OverviewEngine
				{...this.props}
				uiState={{ rowState, sorting: this.props.sorting, activeFilters: this.props.filter.activeFilters }}
				rowStyling={this.props.readonly ? () => ({ interactive: false }) : undefined}
				eventHandlers={{
					onColumnClick: this.props.onSortingChange ? this.handleColumnClick : undefined,
					onRowClick: this.props.onToggleState,
					onFilterChange: this.props.filter.onFilterChanged
				}}
				data={this.props.items.filter(({ visible }) => visible).map(({ documentJson }) => documentJson)}
				overviewModel={this.overviewModel}
				documentModel={this.props.documentModel}
				componentMap={{
					...DefaultComponentMap,
					Heading: this.Heading,
					Footer: this.Footer,
					RowActionGroup: this.RowActionGroup,
					TableBodyCell: this.TableBodyCell,
					FilterButton: this.FilterButton,
					TableBody: this.TableBody
				}}
				embedded={true}
			/>
		);
	}

	private addMutationIconColumn(overviewModel: OverviewModel): OverviewModel {
		const iconColumn: OverviewModel.Column[] =
			overviewModel.content.columns.length > 0
				? [
						{
							id: "dual-pane-icon-column",
							name: "dual-pane-icon-column",
							expression: "",
							label: overviewModel.header.locales?.map(({ code }) => ({
								locale: code,
								text: ""
							})),
							width: 0.3,
							pinDirection: "LEFT"
						}
					]
				: [];

		return {
			...overviewModel,
			content: {
				...overviewModel.content,
				columns: [...iconColumn, ...overviewModel.content.columns]
			}
		};
	}

	private addFakeRowAction(overviewModel: OverviewModel): OverviewModel {
		const fakeRowAction: OverviewModel.Button = {
			event: "FAKE",
			icon: { name: "fake" }
		};

		return {
			...overviewModel,
			content: {
				...overviewModel.content,
				rowActionGroup: { actions: [fakeRowAction, fakeRowAction] }
			}
		};
	}

	private rowActionGroupRenderer = (rowItem: DualPaneSelectionItem): React.ReactNode => {
		const toggleIcon = rowItem.type === "added" || rowItem.type === "existing" ? "remove_circle" : "add_circle";

		const editAllowed = rowItem.type === "added" || rowItem.type === "existing";

		return (
			<div className={addPrefix("-u-flex")}>
				<ButtonGroup alignment="right">
					{this.props.onEdit ? (
						<WidgetsButton
							disabled={!editAllowed}
							icon={<Icon>description</Icon>}
							onClick={(event) => {
								if (this.props.onEdit && editAllowed) {
									this.props.onEdit(rowItem);
								}

								event.stopPropagation();
							}}
						/>
					) : undefined}

					{!this.props.readonly && (
						<WidgetsButton
							disabled={rowItem.type === "disabled_candidate"}
							icon={<Icon>{toggleIcon}</Icon>}
							onClick={(event) => {
								this.props.onToggleState({ documentId: rowItem.documentJson.id });
								event.stopPropagation();
							}}
						/>
					)}
				</ButtonGroup>
			</div>
		);
	};
}

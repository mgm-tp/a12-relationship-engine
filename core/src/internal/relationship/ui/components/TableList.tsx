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
import { useState, useContext } from "react";

import { AriaLevelContext } from "@com.mgmtp.a12.formengine/formengine-core";
import { localizableFromModel } from "@com.mgmtp.a12.utils/utils-localization";
import { LocalizerContext } from "@com.mgmtp.a12.utils/utils-localization-react";
import {
	OverviewTable,
	OverviewEngine,
	useOverviewEngineContext
} from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import {
	Button,
	addPrefix,
	ButtonGroup,
	ModalOverlay,
	InputElements,
	ActionContentbox,
	ProgressIndicator,
	ContentBoxElements
} from "@com.mgmtp.a12.widgets/widgets-core";

import {
	descriptorTableListAdd,
	descriptorTableListEdit,
	descriptorTableListEditDialogClose,
	descriptorTableListEditDialogTitle,
	descriptorTableListEditDialogCancel
} from "../../localization.js";

import type { ListItem, ListProps } from "./api.js";
import { EditDialogVetoComponent } from "./EditDialogVetoComponent.js";
import { ProgressIndicator as RelshProgressIndicator } from "./ProgressIndicator.js";
import { normalizeCssLength, omitActionColumnWidth, type LocalizedLabelConfig } from "./util.js";

export interface TableListProps extends ListProps, ModelableEditDialogProps, Pick<EditDialogButtonProps, "editLabel"> {
	readonly editComponent?: React.ComponentType<Record<string, unknown>>;
	readonly editComponentProps?: Record<string, unknown>;
	readonly onBeginEdit?: () => void;
	readonly onFinishEdit?: (cancel: boolean) => void;
	readonly hasChanges?: () => boolean;
	/**
	 * Height of the inline TableList as a CSS length value, passed through directly.
	 * Leave unset for `auto`.
	 */
	readonly height?: string;
}

export interface ModelableEditDialogProps {
	/**
	 * CSS width applied to the edit dialog modal overlay container. Accepts any CSS length
	 * (e.g. `"80%"`, `"900px"`). Replaces the previous numeric `editDialogWidth` prop.
	 */
	readonly editDialogWidth?: string;
	/**
	 * CSS max-width applied to the edit dialog modal overlay container.
	 */
	readonly editDialogMaxWidth?: string;
	/**
	 * CSS max-height applied to the edit dialog modal overlay container.
	 */
	readonly editDialogMaxHeight?: string;
	readonly editDialogTitle?: LocalizedLabelConfig;
	readonly editDialogCancelButtonLabel?: LocalizedLabelConfig;
	readonly editDialogCloseButtonLabel?: LocalizedLabelConfig;
}

export function LinkTableTemplate(props: TableListProps): React.ReactNode {
	if (props.itemModels.loadingState !== "loaded") {
		return <RelshProgressIndicator variant="bright" height={200} />;
	}

	const items: ListItem[] = props.items.loadingState === "loaded" ? props.items.data : [];

	const shownItems = items.filter(
		(item) => item.mutation === undefined || item.mutation === "added" || item.mutation === "existing"
	);

	const overviewProps = {
		overviewModel: omitActionColumnWidth(props.itemModels.overviewModel),
		documentModel: props.itemModels.documentModel,
		disabled: props.disabled,
		rowStyling: props.readonly ? () => ({ interactive: !!props.rowsReadonlyInteractive }) : undefined
	};

	const onRowClick = props.onItemClick
		? (params: { documentId: string; customEvent?: string }) => {
				const item = items.find((i) => i.documentJson.id === params.documentId);

				if (item && props.onItemClick) {
					props.onItemClick(item);
				}
			}
		: undefined;

	return (
		<>
			<InputElements.Label label={props.label} />
			<div
				data-role="relationship-engine-table-list"
				style={{ height: props.height !== undefined ? normalizeCssLength(props.height) : "auto" }}>
				<OverviewEngine
					{...overviewProps}
					data={shownItems.filter((e) => e.visible).map(({ documentJson }) => documentJson)}
					eventHandlers={{ onRowClick, onPageChange: props.onPageChange }}
					thumbnails={props.thumbnails}>
					<OverviewTable />
					<LinkTableFooter {...props} />
					{!props.disabled && props.items.loadingState !== "loaded" ? (
						<RelshProgressIndicator variant="bright" />
					) : undefined}
					{props.disabled ? (
						<ProgressIndicator innerOverlayVariant="bright" outerOverlayVariant="bright" label="" hideLoadingCircle />
					) : undefined}
				</OverviewEngine>
			</div>
		</>
	);
}

function LinkTableFooter(props: TableListProps): React.ReactNode {
	const localizer = useContext(LocalizerContext).localizer;
	const Pagination = useOverviewEngineContext((context) => context.componentMap.Pagination);

	return (
		<div className={addPrefix("-u-flex", "-u-margin-t-sm")}>
			<ButtonGroup alignment="right">
				{!props.readonly && props.editComponent && props.editComponentProps && (
					<EditDialogButton
						{...props}
						editComponent={props.editComponent}
						editComponentProps={props.editComponentProps}
						onOpen={props.onBeginEdit || (() => {})}
						onClose={props.onFinishEdit || (() => {})}
					/>
				)}
				{!props.readonly && props.onAddItem && (
					<Button
						label={props.addLabel ?? localizer(descriptorTableListAdd())}
						onClick={props.onAddItem}
						disabled={props.disabled}
					/>
				)}
			</ButtonGroup>
			{props.onPageChange && props.pagination && props.pagination.pageCount > 1 && (
				<Pagination
					onChange={props.onPageChange}
					pageCount={props.pagination.pageCount}
					pageSize={props.pagination.pageSize}
					pageNumber={props.pagination.pageNumber}
				/>
			)}
		</div>
	);
}

export interface EditDialogButtonProps extends ModelableEditDialogProps {
	readonly editComponent: React.ComponentType<Record<string, unknown>>;
	readonly editComponentProps: Record<string, unknown>;
	readonly onOpen: () => void;
	readonly onClose: (cancel: boolean) => void;
	readonly hasChanges?: () => boolean;
	readonly localizableKeyPrefix: string;
	readonly disabled?: boolean;
	readonly editLabel?: string;
}

function EditDialogButton(props: EditDialogButtonProps): React.ReactNode {
	const [opened, setOpened] = useState(false);
	const [veto, setVeto] = useState(false);

	const localizer = useContext(LocalizerContext).localizer;

	return (
		<>
			<Button
				label={props.editLabel ?? localizer(descriptorTableListEdit())}
				onClick={() => {
					props.onOpen();
					setOpened(true);
				}}
				disabled={props.disabled}
			/>
			{opened && (
				<EditDialog
					onClose={() => {
						props.onClose(false);
						setOpened(false);
					}}
					onCancel={() => {
						if (props.hasChanges?.()) {
							setVeto(true);
						} else {
							props.onClose(true);
							setOpened(false);
						}
					}}
					editDialogWidth={props.editDialogWidth}
					editDialogMaxWidth={props.editDialogMaxWidth}
					editDialogMaxHeight={props.editDialogMaxHeight}
					editDialogTitle={props.editDialogTitle}
					editDialogCancelButtonLabel={props.editDialogCancelButtonLabel}
					editDialogCloseButtonLabel={props.editDialogCloseButtonLabel}
					localizableKeyPrefix={props.localizableKeyPrefix}>
					<props.editComponent {...props.editComponentProps} />
				</EditDialog>
			)}
			{veto && (
				<EditDialogVetoComponent
					onAbort={() => setVeto(false)}
					onDiscard={() => {
						props.onClose(true);
						setVeto(false);
						setOpened(false);
					}}></EditDialogVetoComponent>
			)}
		</>
	);
}

interface EditDialogProps extends ModelableEditDialogProps {
	readonly onClose: () => void;
	readonly onCancel: () => void;
	readonly localizableKeyPrefix: string;
	readonly children?: React.ReactNode;
}
function EditDialog(props: EditDialogProps) {
	const localizer = useContext(LocalizerContext).localizer;

	const header = (
		<ContentBoxElements.Title
			text={
				localizer(
					localizableFromModel(
						`${props.localizableKeyPrefix}.table-list.edit-dialog.title`,
						props.editDialogTitle?.label
					),
					descriptorTableListEditDialogTitle()
				) ?? ""
			}
			ariaLevel={1}
		/>
	);
	const footer = (
		<ContentBoxElements.Footer>
			<ButtonGroup alignment="right">
				<Button
					secondary
					destructive
					label={
						localizer(
							localizableFromModel(
								`${props.localizableKeyPrefix}.table-list.edit-dialog.cancel`,
								props.editDialogCancelButtonLabel?.label
							),
							descriptorTableListEditDialogCancel()
						) ?? ""
					}
					onClick={props.onCancel}
				/>
				<Button
					primary
					label={
						localizer(
							localizableFromModel(
								`${props.localizableKeyPrefix}.table-list.edit-dialog.close`,
								props.editDialogCloseButtonLabel?.label
							),
							descriptorTableListEditDialogClose()
						) ?? ""
					}
					onClick={props.onClose}
				/>
			</ButtonGroup>
		</ContentBoxElements.Footer>
	);

	return (
		<ModalOverlay
			onClose={props.onClose}
			closeOnEsc
			closeOnOutsideClick
			containerAttributes={{
				style: {
					width: props.editDialogWidth,
					maxWidth: props.editDialogMaxWidth,
					maxHeight: props.editDialogMaxHeight
				}
			}}>
			<ActionContentbox padding="24px" headingElements={header} footer={footer}>
				<AriaLevelContext.Provider value={{ ariaLevel: 2 }}>{props.children}</AriaLevelContext.Provider>
			</ActionContentbox>
		</ModalOverlay>
	);
}

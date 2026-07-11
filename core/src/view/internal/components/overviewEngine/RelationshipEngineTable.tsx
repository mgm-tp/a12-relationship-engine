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

import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import type { TableProps, RowEventHandlerGetter } from "@com.mgmtp.a12.widgets/widgets-core";
import {
	DefaultWidgetMap,
	type JSONDocument,
	OverviewEngineSelectors
} from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import { DocumentGraphSelectors } from "../../../../store/index.js";
import { RelationshipEngineActions } from "../../../../store/index.js";
import { useRelationshipEngineComponentContext } from "../../context/ComponentContext.js";
import { ChangelogSelectors, RelationshipEngineDataHolder } from "../../../../store/index.js";

import { patchRowWithLatestChange } from "./draftingRows/liveDocumentPatch.js";
import { toDraftingLink, toDraftingDocument } from "./draftingRows/draftingEntry.js";

const DefaultTable = DefaultWidgetMap.Table as React.FC<TableProps<JSONDocument>>;

/**
 * OE Table widget replacement that:
 * 1. Prepends locally-created (`docAdded`) documents as drafting rows (link panes only).
 * 2. Patches row data with the latest document graph state so edits are reflected immediately.
 *
 * Injected into the OE widgetMap by `OverviewEngine`.
 * @internal
 */
export function RelationshipEngineTable(props: TableProps<JSONDocument>): React.ReactNode {
	const { uiModel, activityId, dataHolderDescriptor } = useRelationshipEngineComponentContext();
	const overviewModel = useSelector(OverviewEngineSelectors.modelsState(activityId))?.overviewModel;
	const dataHolder = useSelector(ActivitySelectors.dataHolderByDescriptor(activityId, dataHolderDescriptor));
	const sourceDocRef = React.useMemo(() => {
		if (dataHolder && RelationshipEngineDataHolder.SelectedItemsDataHolder.isInstance(dataHolder)) {
			return dataHolder.slices.sourceEntity.docRef || undefined;
		}

		return undefined;
	}, [dataHolder]);

	const { data: propsData, rowEventHandlers: propsRowEventHandlers } = props;
	const dispatch = useDispatch();

	const draftingDocumentEntries = useSelector(
		ChangelogSelectors.draftingDocs(activityId, {
			relationshipModel: uiModel.content.relationshipName,
			targetRole: uiModel.content.targetRole,
			sourceDocRef
		})
	);

	const draftingLinkEntries = useSelector(
		ChangelogSelectors.draftingLinks(activityId, {
			relationshipModel: uiModel.content.relationshipName,
			targetRole: uiModel.content.targetRole,
			sourceDocRef
		})
	);

	// Select the document graph for live patching of row data
	const documentGraph = useSelector(DocumentGraphSelectors.documentGraph(activityId));

	const augmentedData = React.useMemo((): typeof propsData => {
		const base = propsData;

		if (!base) {
			return base;
		}

		if (dataHolderDescriptor.type !== "selected") {
			return base;
		}

		// Prepend drafting rows (link panes only): drafting documents first, then drafting links
		const draftingDocRows = draftingDocumentEntries.length === 0 ? [] : draftingDocumentEntries.map(toDraftingDocument);
		const draftingLinkRows = draftingLinkEntries.length === 0 ? [] : draftingLinkEntries.map(toDraftingLink);
		const withDrafting: typeof base =
			draftingDocRows.length === 0 && draftingLinkRows.length === 0
				? base
				: [...draftingDocRows, ...draftingLinkRows, ...(base ?? [])];

		// Patch rows with live document graph data
		if (!documentGraph || !withDrafting) {
			return withDrafting;
		}

		let anyPatched = false;
		const patched = withDrafting.map(function patchRow(row) {
			if (!row) {
				return row;
			}

			const docRef = row.id;
			const dgDoc = documentGraph.documents.byDocRef[docRef];
			const latestDoc = dgDoc?.loadingState === "loaded" ? dgDoc.document : undefined;
			const result = patchRowWithLatestChange(row, latestDoc);

			if (result !== row) {
				anyPatched = true;
			}

			return result;
		});

		return anyPatched ? patched : withDrafting;
	}, [propsData, dataHolderDescriptor.type, draftingDocumentEntries, draftingLinkEntries, documentGraph]);

	// OE's internal row click handler looks up documentId in the DS data array and throws if not found.
	// For drafting rows, intercept the click and dispatch onDraftingRowClicked / onDraftingLinkClicked
	// so the middleware can handle the locally-created document/link appropriately.
	const draftingLinkIdSet = React.useMemo(
		() => new Set(draftingLinkEntries.map((e) => e.linkId)),
		[draftingLinkEntries]
	);

	const rowEventHandlers = React.useMemo((): RowEventHandlerGetter<JSONDocument> | undefined => {
		if (draftingDocumentEntries.length === 0 && draftingLinkEntries.length === 0) {
			return propsRowEventHandlers;
		}

		const rowActivation = overviewModel?.content.rowActivation;
		const draftingDocRefSet = new Set(draftingDocumentEntries.map((e) => e.docRef));

		return (params) => {
			if (params.row.linkId && draftingLinkIdSet.has(params.row.linkId)) {
				const linkId = params.row.linkId;
				const documentId = params.row.id;

				if (rowActivation?.type === "non_interactive") {
					return {};
				}

				return {
					onClick: () => {
						dispatch(
							RelationshipEngineActions.Events.onDraftingLinkClicked({
								activityId,
								documentId,
								linkId,
								dataHolderDescriptor,
								customEvent: rowActivation?.type === "event" ? rowActivation.event : undefined
							})
						);
					}
				};
			}

			if (draftingDocRefSet.has(params.row.id)) {
				const linkId = params.row.linkId;
				const documentId = params.row.id;

				if (rowActivation?.type === "non_interactive") {
					return {};
				}

				return {
					onClick: () => {
						dispatch(
							RelationshipEngineActions.Events.onDraftingRowClicked({
								activityId,
								documentId,
								linkId,
								dataHolderDescriptor,
								customEvent: rowActivation?.type === "event" ? rowActivation.event : undefined
							})
						);
					}
				};
			}

			return propsRowEventHandlers?.(params) ?? {};
		};
	}, [
		draftingDocumentEntries,
		draftingLinkEntries.length,
		overviewModel?.content.rowActivation,
		propsRowEventHandlers,
		draftingLinkIdSet,
		dispatch,
		activityId,
		dataHolderDescriptor
	]);

	if (augmentedData === props.data) {
		return <DefaultTable {...props} />;
	}

	return <DefaultTable {...props} data={augmentedData as JSONDocument[]} rowEventHandlers={rowEventHandlers} />;
}

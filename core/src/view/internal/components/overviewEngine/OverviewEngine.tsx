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
import { useSelector } from "react-redux";

import { Activity, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";
import {
	OverviewActivity,
	OverviewEngineFactories,
	type DataGraph as OEDataGraph,
	type WidgetMap as OEWidgetMap
} from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import type { RelationshipUiModel } from "../../../../models/index.js";
import {
	ModelSelectors,
	OEDataGraphUtils,
	ChangelogSelectors,
	DocumentGraphSelectors
} from "../../../../store/index.js";

import { RelationshipEngineTable } from "./RelationshipEngineTable.js";

/**
 * Props for the OverviewEngine wrapper component.
 * Extends the OE ViewComponent props with RE-specific context so consumers
 * can identify which OE instance they are customizing.
 */
export namespace OverviewEngine {
	export interface Props extends OverviewEngineFactories.ViewComponentProps {
		/** Which pane this OE represents. */
		readonly paneType: "candidate" | "link" | "tableList";
		/** The UI model that owns this OE instance. */
		readonly uiModel: RelationshipUiModel;
	}
}

/**
 * Default OverviewEngine wrapper that delegates to `OverviewEngineFactories.ViewComponent`.
 *
 * Override this slot to wrap/intercept OE rendering (e.g., add context providers,
 * inject toolbars, or apply conditional rendering based on `paneType`).
 */
export function OverviewEngine(props: OverviewEngine.Props): React.ReactNode {
	const { paneType, uiModel, activityId, ...oeProps } = props;

	const findDataHolder = React.useCallback(
		(activity: Activity): Activity.DataHolder | undefined => {
			if (props.dataHolderDescriptor) {
				return activity.dataHolders.find(Activity.DataHolder.hasDescriptor(props.dataHolderDescriptor));
			}

			return Activity.findDefaultDataHolder(activity);
		},
		[props.dataHolderDescriptor]
	);

	const dataHolderDataSelector = React.useMemo(() => {
		return ActivitySelectors.activityPropById(activityId, (activity) => findDataHolder(activity)?.data);
	}, [activityId, findDataHolder]);
	const dataHolderData = useSelector(dataHolderDataSelector);

	const documentListData: OverviewActivity.Data.DocumentListData | undefined = React.useMemo(() => {
		return OverviewActivity.Data.DocumentListData.isInstance(dataHolderData) ? dataHolderData : undefined;
	}, [dataHolderData]);

	const oeDataGraph: OEDataGraph | undefined = React.useMemo(() => {
		const documents = oeProps.data ?? documentListData?.documents;
		const links = oeProps.links ?? documentListData?.links;

		if (!documents) {
			return undefined;
		}

		return { documents, links };
	}, [documentListData?.documents, documentListData?.links, oeProps.data, oeProps.links]);
	const patchedDataGraph = usePatchedOEDataGraph(paneType, uiModel, activityId, oeDataGraph);

	// Inject RelationshipEngineTable for all pane types when a widgetMap exists.
	// Link panes get drafting rows + DG patching via context; candidate panes get DG patching only.
	const widgetMap = React.useMemo((): OEWidgetMap | undefined => {
		if (!oeProps.widgetMap) {
			return oeProps.widgetMap;
		}

		return { ...oeProps.widgetMap, Table: RelationshipEngineTable };
	}, [oeProps.widgetMap]);

	const viewProps = {
		activityId,
		...oeProps,
		widgetMap,
		...(patchedDataGraph && { data: patchedDataGraph.documents, links: patchedDataGraph.links })
	};

	return <OverviewEngineFactories.ViewComponent {...viewProps} />;
}

/**
 * Hook that applies changelog extension and document graph patching to an OE DataGraph.
 *
 * For link/tableList panes: merges client-side added links from the changelog into the data
 * graph, then patches link documents with live data from the document graph.
 * For candidate panes: only document graph patching applies (no changelog extension).
 * Returns the original DataGraph when no modifications are needed.
 */
function usePatchedOEDataGraph(
	paneType: OverviewEngine.Props["paneType"],
	uiModel: RelationshipUiModel,
	activityId: string,
	oeDataGraph: OEDataGraph | undefined
): OEDataGraph | undefined {
	const isLinkPane = paneType === "link" || paneType === "tableList";
	const relationshipModelName = uiModel.content.relationshipName;
	const targetRole = uiModel.content.targetRole;

	const relationshipModelSelector = React.useMemo(
		() => ModelSelectors.relationshipModel(relationshipModelName),
		[relationshipModelName]
	);
	const relationshipModel = useSelector(relationshipModelSelector);

	const addedLinks = useSelector(
		React.useMemo(() => {
			if (!isLinkPane) {
				return () => [];
			}

			return ChangelogSelectors.addedLinks(activityId, relationshipModelName);
		}, [activityId, relationshipModelName, isLinkPane])
	);

	const documentGraph = useSelector(
		React.useMemo(() => {
			if (!isLinkPane || !activityId) {
				return () => undefined;
			}

			return DocumentGraphSelectors.documentGraph(activityId);
		}, [isLinkPane, activityId])
	);

	return React.useMemo(() => {
		if (!oeDataGraph) {
			return undefined;
		}

		let dataGraph = oeDataGraph;

		if (isLinkPane && relationshipModel) {
			dataGraph = OEDataGraphUtils.patchLinks(dataGraph, addedLinks, targetRole, relationshipModel);
		}

		if (documentGraph) {
			dataGraph = OEDataGraphUtils.patchDocuments(dataGraph, documentGraph);
			dataGraph = OEDataGraphUtils.patchLinkDocuments(dataGraph, documentGraph);
		}

		return dataGraph;
	}, [oeDataGraph, documentGraph, isLinkPane, addedLinks, targetRole, relationshipModel]);
}

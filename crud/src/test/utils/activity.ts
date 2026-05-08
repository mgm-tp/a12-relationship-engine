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

import { legacy_configureStore as configureStore, type MockStore } from "redux-mock-store";

import { Activity, type ActivityMap, type View } from "@com.mgmtp.a12.client/client-core";
import { type OverviewEngineApi } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import { type Locale } from "@com.mgmtp.a12.utils/utils-localization/lib/main/index.js";

import { US_LOCALE } from "./localization.js";

export interface TestActivityProps extends Partial<Activity> {
	readonly id: string;
	readonly activityDataHolder?: Partial<Activity.DataHolder>;
	readonly dirtyStateOfActivityDataHolder?: boolean;
}

export function createActivity(props: TestActivityProps): Activity {
	const {
		id,
		initiatingActivityId,
		descriptor,
		cancelConfirmationRequired,
		dataHolders,
		activationTimestamp,
		lock,
		activityDataHolder,
		dirtyStateOfActivityDataHolder
	} = props;

	const activityDescriptor = descriptor !== undefined ? descriptor : { model: "CRUD" };

	const activity: Activity = {
		id,
		descriptor: activityDescriptor,
		activationTimestamp: activationTimestamp || 0,
		dataHolders:
			dataHolders === undefined || dataHolders.length === 0
				? [
						createDataHolder({
							descriptor: activityDescriptor,
							dirty: dirtyStateOfActivityDataHolder,
							...activityDataHolder
						})
					]
				: dataHolders,
		initiatingActivityId,
		cancelConfirmationRequired,
		lock
	};

	return activity;
}

export function createDataHolder<T = {}>(options: Partial<Activity.DataHolder<T>> = {}): Activity.DataHolder<T> {
	const { descriptor, data, datasourceActivityId, loadingState, savingState, dirty, busy, error, slices } = options;

	return {
		descriptor: descriptor || { model: "CRUD" },
		data: data || ({} as T),
		datasourceActivityId,
		loadingState: loadingState || "loaded",
		savingState: savingState || "not_saved",
		dirty: dirty || false,
		busy: busy || false,
		error,
		slices: slices || {}
	};
}

export function setupActivityMap(activities: Activity[]): ActivityMap {
	return activities.reduce((activityMap, activity) => ({ ...activityMap, [activity.id]: activity }), {});
}

export interface DocumentListData {
	/**
	 * List of documents to be displayed in an overview engine. Each
	 * document requires a unique model id.
	 *
	 * When using infinite scrolling the list can be discontinuous.
	 */
	readonly documents: (Activity.Data.Document | undefined)[];

	/**
	 * Total number of documents that are currently loaded in the activity's data.
	 *
	 * When using infinite scrolling, the count can be undefined initially.
	 */
	readonly totalDocumentsCount: number | undefined;

	/**
	 * The results of statistical operations for each column
	 */
	readonly summaryResult?: OverviewEngineApi.SummaryResult;
}

export namespace DocumentListData {
	export function isInstance(data: object | undefined): data is DocumentListData {
		const { documents, totalDocumentsCount }: Partial<DocumentListData> = data || {};

		return (
			Array.isArray(documents) &&
			documents.every((d) => Activity.Data.Document.isInstance(d) || d === undefined) &&
			(typeof totalDocumentsCount === "number" || totalDocumentsCount === undefined)
		);
	}
}

export function createView(
	activityId: string,
	viewName: string,
	initiatingActivityId?: string,
	constraints?: object
): View {
	const activity: Activity = {
		id: activityId,
		descriptor: { model: "CRUD" },
		activationTimestamp: 0,
		dataHolders: [
			{
				descriptor: { model: "CRUD" },
				data: {},
				dirty: false,
				loadingState: "loaded",
				savingState: "saved",
				slices: {}
			}
		],
		initiatingActivityId: initiatingActivityId
	};

	return {
		activityId: activity.id,
		name: viewName,
		constraints
	};
}

export function createStoreWithoutActivities(model: {}, locale: Locale = US_LOCALE): MockStore<object> {
	return configureStore<object>()({
		activities: {},
		models: { applicationModel: model, models: {} },
		locale,
		application: { busy: false }
	});
}

export function createStoreWithActivities(model: {}, activities: {}, locale: Locale = US_LOCALE): MockStore<object> {
	return configureStore<object>()({
		activities,
		models: { applicationModel: model, models: {} },
		locale,
		application: { busy: false }
	});
}

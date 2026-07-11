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

import type { Store, UnknownAction } from "redux";

import { type Activity, ActivitySelectors } from "@com.mgmtp.a12.client/client-core";

import { waitForWithStore } from "./waitFor.js";

interface Options {
	readonly activityId: string;
	readonly descriptor: Activity.DataHolderDescriptor;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	assertCallback(data: any): void;
}

export type WaitForDataFunc = (options: Options) => Promise<boolean | undefined>;

export function waitForDataWithStore(store: Store<object, UnknownAction>): WaitForDataFunc {
	const waitFor = waitForWithStore(store);

	return function waitForData({ activityId, descriptor, assertCallback }) {
		return waitFor((state: object) => {
			const dataHolder = ActivitySelectors.dataHolderByDescriptor(activityId, descriptor)(state);

			if (dataHolder === undefined) {
				throw new Error(noDataHolderFoundError(state, activityId, descriptor));
			}

			assertCallback(dataHolder.data);
		});
	};
}

function noDataHolderFoundError(state: object, activityId: string, descriptor: Activity.DataHolderDescriptor): string {
	const activity = ActivitySelectors.activityById(activityId)(state);
	const dataHolders = (activity && activity.dataHolders) || [];

	return (
		"Could not find a matching data holder for the given descriptor [" +
		JSON.stringify(descriptor, null, 2) +
		"].\n\n" +
		"Here is a list of all data holders for the given activity [id: " +
		activityId +
		"] : " +
		JSON.stringify(dataHolders, null, 2) +
		"."
	);
}

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

import { Activity } from "@com.mgmtp.a12.client/client-core";
import type { Action } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";

import type { RelationshipEngineActions } from "../actions.js";
import { RelationshipEngineDataHolder } from "../dataHolder.js";

export function handleSetDataHolders(
	dataHolders: Activity.DataHolder[],
	action: Action<RelationshipEngineActions.Commands.SetDataHoldersPayload>
): Activity.DataHolder[] {
	const { dataHolders: updatedDataHolders } = action.payload;
	const result: Activity.DataHolder[] = [...dataHolders];

	for (const updatedDh of updatedDataHolders) {
		const idx = result.findIndex(Activity.DataHolder.hasDescriptor(updatedDh.descriptor));
		const { thumbnails, ...updatedDataHolder } = updatedDh;

		if (idx >= 0) {
			result[idx] = ensureBaselineSnapshot({
				...result[idx],
				...updatedDataHolder,
				slices: { ...result[idx].slices, ...updatedDataHolder.slices, thumbnails }
			});
		} else {
			// Very unlikely to happen, but just in case we add a new data holder
			result.push(
				ensureBaselineSnapshot({
					...updatedDataHolder,
					loadingState: "loaded",
					savingState: "not_saved",
					dirty: false,
					slices: { thumbnails }
				})
			);
		}
	}

	return result.map((dh) => {
		const wasUpdated = updatedDataHolders.some((u) => Activity.DataHolder.hasDescriptor(u.descriptor)(dh));

		if (!wasUpdated) {
			return dh;
		}

		return {
			...dh,
			loadingState: dh.loadingState === "loading" ? "loaded" : dh.loadingState,
			busy: false
		};
	});
}

function ensureBaselineSnapshot(dataHolder: Activity.DataHolder): Activity.DataHolder {
	if (!RelationshipEngineDataHolder.DocumentGraphDataHolder.isInstance(dataHolder)) {
		return dataHolder;
	}

	if (dataHolder.slices.initialDocumentGraph || !dataHolder.data) {
		return dataHolder;
	}

	return {
		...dataHolder,
		slices: {
			...dataHolder.slices,
			initialDocumentGraph: structuredClone(dataHolder.data)
		}
	};
}

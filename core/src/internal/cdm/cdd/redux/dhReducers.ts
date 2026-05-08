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
 * @module cdm/cdd
 * @experimental
 */

import { type ActivityReducers } from "@com.mgmtp.a12.client/client-core";

import {
	addCddLink,
	changeCddDocument,
	initAndLoadCandidates,
	merge,
	removedCddLink,
	saveSubActivity,
	setSubActivityData
} from "./actions.js";
import { handleChangeCddDocument } from "./changeCdd/changeCddImpl.js";
import {
	type ScdmDataHolderShape,
	handleCddAddLinks,
	handleInitCandidates,
	handleMergeDg,
	handleSaveSubActivity,
	handleSetSubActivityData,
	handleCddRemoveLinks
} from "./dhReducersImpl.js";

/**
 * Use these reducers for actions on the Composed Data Documents (Cdd)
 * **including (!)** DocumentGraph functionality.
 *
 * Note: **Do not** register DocumentGraph dataReducers together with these as this here is supposed to be a override.
 * This override adds CDD support, like triggering loadData with pending subCdds, Cdd document caching etc.
 */
export const dhReducers: ActivityReducers.DataReducer[] = [
	{
		reduce(dataHolders, action) {
			return initAndLoadCandidates.match(action) ? handleInitCandidates(dataHolders, action) : dataHolders;
		}
	},
	{
		reduce(dataHolders, action, defaultDataHolder) {
			return setSubActivityData.match(action)
				? dataHolders?.map((dh) =>
						dh === defaultDataHolder ? handleSetSubActivityData(dh as ScdmDataHolderShape, action) : dh
					)
				: dataHolders;
		}
	},
	// ===== Wrappers =====
	{
		// MERGE
		reduce(dataHolders, action, defaultDataHolder) {
			return merge.match(action)
				? dataHolders?.map((dh) => (dh === defaultDataHolder ? handleMergeDg(dh as ScdmDataHolderShape, action) : dh))
				: dataHolders;
		}
	},
	{
		// ADD_LINK
		reduce(dataHolders, action, defaultDataHolder) {
			return addCddLink.match(action)
				? dataHolders?.map((dh) =>
						dh === defaultDataHolder ? handleCddAddLinks(dh as ScdmDataHolderShape, action) : dh
					)
				: dataHolders;
		}
	},
	{
		// REMOVE_LINK
		reduce(dataHolders, action, defaultDataHolder) {
			return removedCddLink.match(action)
				? dataHolders?.map((dh) =>
						dh === defaultDataHolder ? handleCddRemoveLinks(dh as ScdmDataHolderShape, action) : dh
					)
				: dataHolders;
		}
	},

	// ===== Implementations =====
	{
		// CHANGE_DOCUMENT
		reduce(dataHolders, action, defaultDataHolder) {
			return changeCddDocument.match(action)
				? dataHolders?.map((dh) =>
						dh === defaultDataHolder ? handleChangeCddDocument(dh as ScdmDataHolderShape, action) : dh
					)
				: dataHolders;
		}
	},
	{
		// SAVE_SUB_ACTIVITY
		reduce(dataHolders, action, defaultDataHolder) {
			return saveSubActivity.match(action)
				? dataHolders?.map((dh) =>
						dh === defaultDataHolder ? handleSaveSubActivity(dh as ScdmDataHolderShape, action) : dh
					)
				: dataHolders;
		}
	}
];

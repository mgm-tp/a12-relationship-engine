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
 * @module documentGraph/redux
 * @experimental
 */

import type { ActivityReducers } from "@com.mgmtp.a12.client/client-core";

import {
	setDg,
	addLink,
	mergeDG,
	removeLink,
	changeLinkDoc,
	changeDocument,
	endTransaction,
	beginTransaction
} from "./actions.js";
import {
	handleSetDg,
	handleAddLink,
	handleMergeDg,
	handleRemoveLink,
	handleChangeLinkDoc,
	handleChangeDocument,
	handleEndTransaction,
	handleBeginTransaction,
	type DgClDataHolderShape,
	type DataHolderReducerExtension
} from "./dhReducersImpl.js";

/**
 * Use these reducers for actions on the pure DocumentGraph functionality;
 * this includes Change Tracking but **excludes** Composed Data Documents (Cdd).
 */
export const dhReducersFactory = (observer: DataHolderReducerExtension): ActivityReducers.DataReducer[] => [
	{
		// SET_DG
		reduce(dataHolders, action, defaultDataHolder) {
			return setDg.match(action)
				? dataHolders?.map((dh) =>
						dh === defaultDataHolder ? handleSetDg(observer)(dh as DgClDataHolderShape, action) : dh
					)
				: dataHolders;
		}
	},
	{
		// MERGE
		reduce(dataHolders, action, defaultDataHolder) {
			return mergeDG.match(action)
				? dataHolders?.map((dh) =>
						dh === defaultDataHolder ? handleMergeDg(observer)(dh as DgClDataHolderShape, action) : dh
					)
				: dataHolders;
		}
	},
	{
		// ADD_LINK
		reduce(dataHolders, action, defaultDataHolder) {
			return addLink.match(action)
				? dataHolders?.map((dh) =>
						dh === defaultDataHolder ? handleAddLink(observer)(dh as DgClDataHolderShape, action) : dh
					)
				: dataHolders;
		}
	},
	{
		// REMOVE_LINK
		reduce(dataHolders, action, defaultDataHolder) {
			return removeLink.match(action)
				? dataHolders?.map((dh) =>
						dh === defaultDataHolder ? handleRemoveLink(observer)(dh as DgClDataHolderShape, action) : dh
					)
				: dataHolders;
		}
	},
	{
		// CHANGE_DOC
		reduce(dataHolders, action, defaultDataHolder) {
			return changeDocument.match(action)
				? dataHolders?.map((dh) =>
						dh === defaultDataHolder ? handleChangeDocument(observer)(dh as DgClDataHolderShape, action) : dh
					)
				: dataHolders;
		}
	},
	{
		// CHANGE_LINKDOC
		reduce(dataHolders, action, defaultDataHolder) {
			return changeLinkDoc.match(action)
				? dataHolders?.map((dh) =>
						dh === defaultDataHolder ? handleChangeLinkDoc(observer)(dh as DgClDataHolderShape, action) : dh
					)
				: dataHolders;
		}
	},
	{
		// BEGIN_TRANSACTION
		reduce(dataHolders, action, defaultDataHolder) {
			return beginTransaction.match(action)
				? dataHolders?.map((dh) =>
						dh === defaultDataHolder ? handleBeginTransaction(observer)(dh as DgClDataHolderShape, action) : dh
					)
				: dataHolders;
		}
	},
	{
		// END_TRANSACTION
		reduce(dataHolders, action, defaultDataHolder) {
			return endTransaction.match(action)
				? dataHolders?.map((dh) =>
						dh === defaultDataHolder ? handleEndTransaction(observer)(dh as DgClDataHolderShape, action) : dh
					)
				: dataHolders;
		}
	}
];

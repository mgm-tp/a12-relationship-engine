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
 */
import { type Action, type AnyAction } from "typescript-fsa";

import { Activity } from "@com.mgmtp.a12.client/client-core";

import { assertCondition, assertObject } from "../../shared/assertion.js";
import { experimentalWarning, isRecord } from "../../shared/utils.js";

import { type DgChangeLogSlice, type DgSlice } from "../core/index.js";
import * as DataReducers from "../core/reducers.js";

import {
	type AddDocumentPayload,
	type AddLinkPayload,
	type BeginTransactionPayload,
	type ChangeDocumentPayload,
	type ChangeLinkDocPayload,
	type EndTransactionPayload,
	type MergeDGPayload,
	type RemoveLinkPayload,
	type SetDGPayload
} from "./actions.js";

export type DgClDataHolderShape = Activity.DataHolder<DgSlice & DgChangeLogSlice>;

export function isSetDgCl(data: unknown): data is DgSlice & DgChangeLogSlice {
	return isRecord(data) && data.documentGraph !== undefined && data.changeLog !== undefined;
}

export function getDgAndClData(activity: Activity): DgSlice & DgChangeLogSlice {
	const defaultDataHolder = Activity.findDefaultDataHolder(activity);
	assertObject(defaultDataHolder, `Expected default dataholder for activity ${activity.id} to exist`);

	const dgClData = defaultDataHolder.data;
	assertCondition(isSetDgCl(dgClData), `Expected dataholder to contain documentGraph and changeLog slices`);
	return dgClData;
}

export type ReducerSignature<T> = (dataHolder: DgClDataHolderShape, action: Action<T>) => DgClDataHolderShape;

export interface DataHolderTuple {
	prev: DgClDataHolderShape;
	next: DgClDataHolderShape;
}

export interface DataHolderReducerExtension {
	(dhs: DataHolderTuple, action: AnyAction): DgClDataHolderShape;
}

//#region ==== Reducer functions ====

export function handleSetDg(observer: DataHolderReducerExtension = nopObserver): ReducerSignature<SetDGPayload> {
	return (dataHolder: DgClDataHolderShape, action: Action<SetDGPayload>) => {
		const newDH: DgClDataHolderShape = {
			...dataHolder,
			loadingState: "loaded",
			dirty: false
		};
		const slices = DataReducers.initialize(action.payload.documentGraph, action.payload.changeLog);
		return observer({ prev: dataHolder, next: updateDataHolder(newDH, slices, action.payload.setDirty) }, action);
	};
}

export function handleMergeDg(observer: DataHolderReducerExtension = nopObserver): ReducerSignature<MergeDGPayload> {
	return (dataHolder: DgClDataHolderShape, action: Action<MergeDGPayload>) => {
		if (!isSetDgCl(dataHolder.data)) {
			return dataHolder;
		}
		const slices = DataReducers.mergeInto(dataHolder.data, action.payload.documentGraph);
		return observer({ prev: dataHolder, next: updateDataHolder(dataHolder, slices) }, action);
	};
}

export function handleAddLink(observer: DataHolderReducerExtension = nopObserver): ReducerSignature<AddLinkPayload> {
	return (dataHolder: DgClDataHolderShape, action: Action<AddLinkPayload>) => {
		if (!isSetDgCl(dataHolder.data)) {
			return dataHolder;
		}
		const slices = DataReducers.addLink(dataHolder.data, action.payload);
		return observer({ prev: dataHolder, next: updateDataHolder(dataHolder, slices, action.payload.setDirty) }, action);
	};
}

export function handleRemoveLink(
	observer: DataHolderReducerExtension = nopObserver
): ReducerSignature<RemoveLinkPayload> {
	return (dataHolder: DgClDataHolderShape, action: Action<RemoveLinkPayload>) => {
		if (!isSetDgCl(dataHolder.data)) {
			return dataHolder;
		}
		const slices = DataReducers.removeLink(dataHolder.data, action.payload.linkRef);
		return observer({ prev: dataHolder, next: updateDataHolder(dataHolder, slices, action.payload.setDirty) }, action);
	};
}

export function handleChangeDocument(
	observer: DataHolderReducerExtension = nopObserver
): ReducerSignature<ChangeDocumentPayload> {
	return (dataHolder, action) => {
		if (!isSetDgCl(dataHolder.data)) {
			return dataHolder;
		}
		const slices = DataReducers.changeDocument(dataHolder.data, action.payload);
		return observer({ prev: dataHolder, next: updateDataHolder(dataHolder, slices) }, action);
	};
}

export function handleAddDocument(
	observer: DataHolderReducerExtension = nopObserver
): ReducerSignature<AddDocumentPayload> {
	return (dataHolder, action) => {
		if (!isSetDgCl(dataHolder.data)) {
			return dataHolder;
		}
		const slices = DataReducers.addDocument(dataHolder.data, action.payload);
		return observer({ prev: dataHolder, next: updateDataHolder(dataHolder, slices) }, action);
	};
}

export function handleChangeLinkDoc(
	observer: DataHolderReducerExtension = nopObserver
): ReducerSignature<ChangeLinkDocPayload> {
	return (dataHolder: DgClDataHolderShape, action: Action<ChangeLinkDocPayload>) => {
		experimentalWarning("handleChangeLinkDoc is not yet implemented.");
		return observer({ prev: dataHolder, next: dataHolder }, action);
	};
}

export function handleBeginTransaction(
	observer: DataHolderReducerExtension = nopObserver
): ReducerSignature<BeginTransactionPayload> {
	return (dataHolder: DgClDataHolderShape, action: Action<BeginTransactionPayload>) => {
		if (!isSetDgCl(dataHolder.data)) {
			return dataHolder;
		}
		const slices = DataReducers.transaction.begin(dataHolder.data, {
			id: action.payload.id
		});
		return observer({ prev: dataHolder, next: updateDataHolder(dataHolder, slices) }, action);
	};
}

export function handleEndTransaction(
	observer: DataHolderReducerExtension = nopObserver
): ReducerSignature<EndTransactionPayload> {
	return (dataHolder: DgClDataHolderShape, action: Action<EndTransactionPayload>) => {
		if (!isSetDgCl(dataHolder.data)) {
			return dataHolder;
		}
		const slices =
			action.payload.outcome === "commit"
				? DataReducers.transaction.commit(dataHolder.data)
				: DataReducers.transaction.rollback(dataHolder.data);
		return observer({ prev: dataHolder, next: updateDataHolder(dataHolder, slices, action.payload.setDirty) }, action);
	};
}

//#endregion

//#region ==== Helper functions ====

export function nopObserver(dhs: DataHolderTuple, action: AnyAction): DgClDataHolderShape {
	return dhs.next;
}

function updateDataHolder(
	dataHolder: DgClDataHolderShape,
	slices: DgSlice & DgChangeLogSlice,
	dirty?: boolean
): DgClDataHolderShape {
	const data = dataHolder.data;
	if (data === undefined) {
		return dataHolder;
	}
	return {
		...dataHolder,
		data: {
			...data,
			...slices
		},
		// if undefined, keep dirty as is
		dirty: dirty ?? dataHolder.dirty
	};
}

//#endregion

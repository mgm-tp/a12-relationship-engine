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

import type { GroupInstance } from "@com.mgmtp.a12.kernel/kernel-md-facade";
import type { Relationship } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { actionCreatorFactory as actionCreatorFactory } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";

import type { ChangeLog, ElementRef, DeepReadonly, DocumentGraph } from "../core/index.js";

const acf = actionCreatorFactory("dg");

interface AbstractPayload {
	readonly activityId: string;
}

//#region ===== DG =====

export const setDg = acf<SetDGPayload>("SET_DG");

export interface SetDGPayload extends AbstractPayload {
	readonly documentGraph: DeepReadonly<DocumentGraph>;
	readonly changeLog?: ChangeLog<DeepReadonly<DocumentGraph>>;
	readonly setDirty?: true;
}

export const mergeDG = acf<MergeDGPayload>("MERGE_DG");

export interface MergeDGPayload extends AbstractPayload {
	readonly documentGraph: DeepReadonly<DocumentGraph>;
}

//#endregion

//#region ===== Link =====

export const addLink = acf<AddLinkPayload>("ADD_LINK");

export interface AddLinkPayload extends AbstractPayload {
	readonly linkDescriptor: DeepReadonly<Relationship.LinkDescriptor>;
	readonly linkDoc?: DeepReadonly<GroupInstance>;
	readonly setDirty?: true;
}

export const removeLink = acf<RemoveLinkPayload>("REMOVE_LINK");

export interface RemoveLinkPayload extends AbstractPayload {
	readonly linkRef: Relationship.LinkRef;
	readonly setDirty?: true;
}

//#endregion

//#region ===== Document =====

export const addDocument = acf<AddDocumentPayload>("ADD_DOC");

export interface AddDocumentPayload extends AbstractPayload {
	elementRef: ElementRef;
	document: GroupInstance;
	documentModelName: string;
}

export const changeDocument = acf<ChangeDocumentPayload>("CHANGE_DOC");

export interface ChangeDocumentPayload extends AbstractPayload {
	elementRef: ElementRef;
	document: GroupInstance;
}

export const changeLinkDoc = acf<ChangeLinkDocPayload>("CHANGE_LINKDOC");

export type ChangeLinkDocPayload = AbstractPayload;

//#endregion

//#region ===== Transactions (using ChangeLog) =====

export const beginTransaction = acf<BeginTransactionPayload>("BEGIN_TRANSACTION");

export interface BeginTransactionPayload extends AbstractPayload {
	readonly id: string;
}

export const endTransaction = acf<EndTransactionPayload>("END_TRANSACTION");

export interface EndTransactionPayload extends AbstractPayload {
	readonly outcome: "commit" | "rollback";
	readonly setDirty?: true;
}

//#endregion

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

import { actionCreatorFactory } from "@com.mgmtp.a12.client/typescript-fsa-redux-5-compat";

/**
 * Copies of the crud action creators, which trigger the real CRUD Sagas.
 */
export namespace CopiedCRUDActions {
	const factory = actionCreatorFactory("CRUD");

	/**
	 * Request the creation of a new document in a new sub-activity. If a sub-activity already exists,
	 * request the cancellation of it.
	 */
	export const createNewDocument = factory<CreateNewDocumentPayload>("CREATE_NEW_DOCUMENT");

	export interface CreateNewDocumentPayload {
		/**
		 * Source activity id
		 */
		readonly activityId: string;

		/** The model the document is based on */
		readonly model: string;
	}

	/**
	 * Request the selection of a row for editing in a sub-activity. If a sub-activity already exists,
	 * request the cancellation of it.
	 */
	export const selectRow = factory<SelectRowPayload>("SELECT_ROW");

	export interface SelectRowPayload {
		/**
		 * Target activity id
		 */
		readonly activityId: string;

		/** The instanceId of the selected row/document */
		readonly instanceId: string;
	}

	/**
	 * Request the deletion of a row/document. If an edit sub-activity is open for the same instance,
	 * request its cancellation first.
	 */
	export const deleteRow = factory<DeleteRowPayload>("DELETE_ROW");

	export interface DeleteRowPayload {
		/**
		 * Target activity id
		 */
		readonly activityId: string;

		/** The instanceId of the row/document to delete */
		readonly instanceId: string;
	}
}

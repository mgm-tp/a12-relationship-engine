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
 * Event name constants for RE-specific Overview Model row actions and event buttons.
 * These are the values used in `RowAction.event` and `EventButton.event` fields of
 * Overview Models that are referenced by a Relationship UI Model.
 *
 * RE middleware observes these events from the Overview Engine and translates them
 * into the corresponding RE actions.
 */
export enum RelationshipEngineEvents {
	/** Row action on the Available Items pane: adds the selected candidate as a link. */
	ADD_LINK = "event_add_link",
	/** Row action on the Selected Items pane: removes the link for the row. */
	DELETE_LINK = "event_delete_link",
	/** Row action on the Selected Items pane: re-adds a locally deleted link. Hidden by default; RE toggles visibility at runtime. */
	RESTORE_LINK = "event_restore_link",
	/** Row action on the Selected Items pane: opens the link document in an edit form. Only applicable when a link form model is configured. */
	EDIT_LINK_DOCUMENT = "event_edit_link_document",
	/** Button that opens the dual pane edit dialog. */
	OPEN_EDIT_MODAL = "event_open_edit_modal",
	/** Button that creates a new document and links it. */
	ADD_DOCUMENT = "event_add_document",
	/** Button for cancelling/closing the edit dialog without saving. */
	CANCEL_EDIT_MODAL = "event_cancel_edit_modal",
	/** Button for submitting/closing the edit dialog with saving. */
	SUBMIT_EDIT_MODAL = "event_submit_edit_modal",
	/** Button for the "open document" action. */
	OPEN_DOCUMENT = "event_open_document"
}

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
 * Event name constants of the events, that are commonly handled by the engines.
 *
 * They can be used to prevent hard-coded event name strings.
 * The engines of the CRUD extension are configured to handle those events by default.
 */
export namespace EventNames {
	/**
	 * Usually used for the event that triggers submission and termination of an activity
	 */
	export const FORM_SUBMIT = "event_submit";
	/**
	 * Usually used for the same purpose of and interchangeable to FORM_SUBMIT above
	 */
	export const FORM_SUBMIT_SAVE = "event_save";
	/**
	 * Usually used for the event that triggers submission of activity data without terminating the activity
	 */
	export const FORM_SAVE = "CRUD::SAVE";
	/**
	 * Usually used for the event that triggers termination of an activity
	 */
	export const FORM_CANCEL = "event_cancel";
	/**
	 * Usually used for the event that triggers the creation of a new overview entry
	 */
	export const OVERVIEW_ADD = "add";
	/**
	 * Usually used for the event that triggers the deletion of an existing overview entry
	 */
	export const OVERVIEW_DELETE = "delete";
}

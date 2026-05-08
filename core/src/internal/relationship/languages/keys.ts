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
 * @module relationship
 */

import { initializeKeys } from "@com.mgmtp.a12.utils/utils-localization/lib/main/index.js";

/**
 * Resource keys for usage with the A12 localization API.
 *
 * Please note that adding new keys to this object is not considered as a breaking change.
 */
export const RESOURCE_KEYS = {
	extension: {
		relationship: {
			component: {
				"progress-indicator": {
					/** Key of the loading indicator text */
					loading: ""
				},
				"dual-pane": {
					/** Key of the label for selected items */
					"selected-items": "",
					/** Key of the label for available items */
					"available-items": "",
					/** Key of the text for an empty candidate table */
					"candidates-empty": "",
					/** Key of the text for an empty link table */
					"links-empty": ""
				},
				"drop-down": {
					/** Key of the button for modifying additional properties of relationships */
					"edit-link": "",
					/**
					 * Key of the text for result count
					 *
					 * Available "placeholder":
					 * * `{resultCount}` - Number of result
					 * * `{totalCount}` - Number of total results
					 */
					"result-count": ""
				},
				"table-list": {
					/** Key of the edit button */
					edit: "",
					"edit-dialog": {
						/** Key of the title of the edit dialog */
						title: "",
						/** Key of the close button of the edit dialog */
						close: "",
						/** Key of the cancel button of the edit dialog */
						cancel: "",
						veto: {
							/** Key of the veto dialog title */
							title: "",
							/** Key of the veto dialog message */
							message: "",
							/** Key of the veto dialog discard button label */
							buttonDiscard: "",
							/** Key of the veto dialog abort button label*/
							buttonAbort: ""
						}
					},
					/** Key of the add button */
					add: ""
				}
			}
		}
	}
};

initializeKeys(RESOURCE_KEYS);

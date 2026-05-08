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
 * @module cdm
 * @experimental
 */

import { initializeKeys } from "@com.mgmtp.a12.utils/utils-localization/lib/main/index.js";

/**
 * Resource keys for usage with the A12 localization API.
 *
 * Please note that adding new keys to this object is not considered as a breaking change.
 */
export const RESOURCE_KEYS = {
	cdm: {
		variant: {
			selection: {
				/** Key of the title for the variant selection model */
				title: "",
				/** Key of the label of the variants for the variant selection model */
				"variant-label": ""
			}
		},
		subActivity: {
			/**
			 * Key of the label for the button to edit the linked entity in a sub activity
			 *
			 * * Available "placeholder":
			 *    * `$entityLabel$` - the label of the entity in the relationship model
			 */
			editEntity: "",
			/**
			 * Key of the label for the button to add a new linked entity and open it a sub activity
			 *
			 * * Available "placeholder":
			 *    * `$entityLabel$` - the label of the entity in the relationship model
			 */
			addEntity: "",
			/**
			 * Key of the label for the button to open the linked entity in a readonly sub activity
			 *
			 * * Available "placeholder":
			 *    * `$entityLabel$` - the label of the entity in the relationship model
			 */
			openEntity: ""
		}
	}
};

initializeKeys(RESOURCE_KEYS);

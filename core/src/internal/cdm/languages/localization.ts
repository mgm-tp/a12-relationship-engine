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

import { type Localizable } from "@com.mgmtp.a12.utils/utils-localization/lib/main/index.js";

import { de_DE } from "./de_DE.js";
import { en_US } from "./en_US.js";
import { RESOURCE_KEYS } from "./keys.js";

/** @internal */
export function descriptorAddEntityButton(entityLabel?: string): Localizable {
	const args = { entityLabel: { type: "plain" as const, value: entityLabel } };

	return {
		key: RESOURCE_KEYS.cdm.subActivity.addEntity,
		defaults: {
			en: en_US.cdm.subActivity.addEntity,
			de: de_DE.cdm.subActivity.addEntity
		},
		args
	};
}

/** @internal */
export function descriptorEditEntityButton(entityLabel?: string): Localizable {
	const args = { entityLabel: { type: "plain" as const, value: entityLabel } };

	return {
		key: RESOURCE_KEYS.cdm.subActivity.editEntity,
		defaults: {
			en: en_US.cdm.subActivity.editEntity,
			de: de_DE.cdm.subActivity.editEntity
		},
		args
	};
}

/** @internal */
export function descriptorOpenEntityButton(entityLabel?: string): Localizable {
	const args = { entityLabel: { type: "plain" as const, value: entityLabel } };

	return {
		key: RESOURCE_KEYS.cdm.subActivity.openEntity,
		defaults: {
			en: en_US.cdm.subActivity.openEntity,
			de: de_DE.cdm.subActivity.openEntity
		},
		args
	};
}

/** @internal */
export function descriptorVariantSelectionTitle(): Localizable {
	return {
		key: RESOURCE_KEYS.cdm.variant.selection.title,
		defaults: {
			en: en_US.cdm.variant.selection.title,
			de: de_DE.cdm.variant.selection.title
		}
	};
}

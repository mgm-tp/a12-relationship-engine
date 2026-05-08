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

import { type EntityCharacteristics } from "@com.mgmtp.a12.dataservices/dataservices-access";
import { type Localizable, type LocalizableArgs } from "@com.mgmtp.a12.utils/utils-localization/lib/main/index.js";

import { RESOURCE_KEYS } from "./languages/index.js";
import { de_DE } from "./languages/de_DE.js";
import { en_US } from "./languages/en_US.js";

const RELATIONSHIP_PREFIX = "relationship";
const RELATIONSHIP_MODEL_PREFIX = `${RELATIONSHIP_PREFIX}.relationshipModel`;
const RELATIONSHIP_UI_CONFIGURATION_PREFIX = `${RELATIONSHIP_PREFIX}.ui-configuration`;

/** @internal */
export function createEntityDisplayLabelLocalizable(
	relationshipName: string,
	entityCharacteristic: EntityCharacteristics
): Localizable {
	return {
		key: `${RELATIONSHIP_MODEL_PREFIX}.${relationshipName}.${entityCharacteristic.role}.labels`,
		defaults: entityCharacteristic.labels?.reduce<Localizable["defaults"]>((acc, cur) => {
			return cur.locale ? { ...acc, [cur.locale]: cur.text ?? undefined } : acc;
		}, {})
	};
}

/** @internal */
export function createUiConfigurationKey(configurationName: string, componentId: string): string {
	return `${RELATIONSHIP_UI_CONFIGURATION_PREFIX}.${configurationName}.${componentId}`;
}

/** @internal */
export function createUnknownUiConfigurationKey(): string {
	return createUiConfigurationKey("unknownConfiguration", "unknownComponent");
}

/** @internal */
export function descriptorResultCount(args: LocalizableArgs): Localizable {
	return {
		key: RESOURCE_KEYS.extension.relationship.component["drop-down"]["result-count"],
		defaults: {
			en: en_US.extension.relationship.component["drop-down"]["result-count"],
			de: de_DE.extension.relationship.component["drop-down"]["result-count"]
		},
		args
	};
}

/** @internal */
export function descriptorLoading(): Localizable {
	return {
		key: RESOURCE_KEYS.extension.relationship.component["progress-indicator"].loading,
		defaults: {
			en: en_US.extension.relationship.component["progress-indicator"].loading,
			de: de_DE.extension.relationship.component["progress-indicator"].loading
		}
	};
}

/** @internal */
export function descriptorEditLink(): Localizable {
	return {
		key: RESOURCE_KEYS.extension.relationship.component["drop-down"]["edit-link"],
		defaults: {
			en: en_US.extension.relationship.component["drop-down"]["edit-link"],
			de: de_DE.extension.relationship.component["drop-down"]["edit-link"]
		}
	};
}

/** @internal */
export function descriptorAvailableItems(): Localizable {
	return {
		key: RESOURCE_KEYS.extension.relationship.component["dual-pane"]["available-items"],
		defaults: {
			en: en_US.extension.relationship.component["dual-pane"]["available-items"],
			de: de_DE.extension.relationship.component["dual-pane"]["available-items"]
		}
	};
}

/** @internal */
export function descriptorSelectedItems(): Localizable {
	return {
		key: RESOURCE_KEYS.extension.relationship.component["dual-pane"]["selected-items"],
		defaults: {
			en: en_US.extension.relationship.component["dual-pane"]["selected-items"],
			de: de_DE.extension.relationship.component["dual-pane"]["selected-items"]
		}
	};
}

/** @internal */
export function descriptorTableListAdd(): Localizable {
	return {
		key: RESOURCE_KEYS.extension.relationship.component["table-list"].add,
		defaults: {
			en: en_US.extension.relationship.component["table-list"].add,
			de: de_DE.extension.relationship.component["table-list"].add
		}
	};
}

/** @internal */
export function descriptorTableListEdit(): Localizable {
	return {
		key: RESOURCE_KEYS.extension.relationship.component["table-list"].edit,
		defaults: {
			en: en_US.extension.relationship.component["table-list"].edit,
			de: de_DE.extension.relationship.component["table-list"].edit
		}
	};
}

/** @internal */
export function descriptorTableListEditDialogTitle(): Localizable {
	return {
		key: RESOURCE_KEYS.extension.relationship.component["table-list"]["edit-dialog"].title,
		defaults: {
			en: en_US.extension.relationship.component["table-list"]["edit-dialog"].title,
			de: de_DE.extension.relationship.component["table-list"]["edit-dialog"].title
		}
	};
}

/** @internal */
export function descriptorTableListEditDialogClose(): Localizable {
	return {
		key: RESOURCE_KEYS.extension.relationship.component["table-list"]["edit-dialog"].close,
		defaults: {
			en: en_US.extension.relationship.component["table-list"]["edit-dialog"].close,
			de: de_DE.extension.relationship.component["table-list"]["edit-dialog"].close
		}
	};
}

/** @internal */
export function descriptorTableListEditDialogCancel(): Localizable {
	return {
		key: RESOURCE_KEYS.extension.relationship.component["table-list"]["edit-dialog"].cancel,
		defaults: {
			en: en_US.extension.relationship.component["table-list"]["edit-dialog"].cancel,
			de: de_DE.extension.relationship.component["table-list"]["edit-dialog"].cancel
		}
	};
}

/** @internal */
export function descriptorTableListEditDialogVetoTitle(): Localizable {
	return {
		key: RESOURCE_KEYS.extension.relationship.component["table-list"]["edit-dialog"].veto.title,
		defaults: {
			en: en_US.extension.relationship.component["table-list"]["edit-dialog"].veto.title,
			de: de_DE.extension.relationship.component["table-list"]["edit-dialog"].veto.title
		}
	};
}

/** @internal */
export function descriptorTableListEditDialogVetoMessage(): Localizable {
	return {
		key: RESOURCE_KEYS.extension.relationship.component["table-list"]["edit-dialog"].veto.message,
		defaults: {
			en: en_US.extension.relationship.component["table-list"]["edit-dialog"].veto.message,
			de: de_DE.extension.relationship.component["table-list"]["edit-dialog"].veto.message
		}
	};
}

/** @internal */
export function descriptorTableListEditDialogVetoAbort(): Localizable {
	return {
		key: RESOURCE_KEYS.extension.relationship.component["table-list"]["edit-dialog"].veto.buttonAbort,
		defaults: {
			en: en_US.extension.relationship.component["table-list"]["edit-dialog"].veto.buttonAbort,
			de: de_DE.extension.relationship.component["table-list"]["edit-dialog"].veto.buttonAbort
		}
	};
}

/** @internal */
export function descriptorTableListEditDialogVetoDiscard(): Localizable {
	return {
		key: RESOURCE_KEYS.extension.relationship.component["table-list"]["edit-dialog"].veto.buttonDiscard,
		defaults: {
			en: en_US.extension.relationship.component["table-list"]["edit-dialog"].veto.buttonDiscard,
			de: de_DE.extension.relationship.component["table-list"]["edit-dialog"].veto.buttonDiscard
		}
	};
}

/** @internal */
export function descriptorCandidateTableEmptyMessage(): Localizable {
	return {
		key: RESOURCE_KEYS.extension.relationship.component["dual-pane"]["candidates-empty"],
		defaults: {
			en: en_US.extension.relationship.component["dual-pane"]["candidates-empty"],
			de: de_DE.extension.relationship.component["dual-pane"]["candidates-empty"]
		}
	};
}

/** @internal */
export function descriptorLinkTableEmptyMessage(): Localizable {
	return {
		key: RESOURCE_KEYS.extension.relationship.component["dual-pane"]["links-empty"],
		defaults: {
			en: en_US.extension.relationship.component["dual-pane"]["links-empty"],
			de: de_DE.extension.relationship.component["dual-pane"]["links-empty"]
		}
	};
}

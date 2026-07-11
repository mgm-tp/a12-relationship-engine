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

import type { Header } from "@com.mgmtp.a12.base/base-model-api";
import type { LocalizedModelText } from "@com.mgmtp.a12.utils/utils-localization";

export interface RelationshipUiModel {
	readonly header: Header;
	readonly content: RelationshipUiModel.Content;
}

export namespace RelationshipUiModel {
	export interface Content {
		readonly relationshipName: string;
		readonly targetRole: string;
		readonly component: ComponentConfiguration;
		readonly modificationConfiguration?: ModificationConfiguration;
		readonly label?: LocalizedModelText;
	}

	export interface ButtonElement {
		readonly event: string;
		readonly label?: LocalizedModelText;
		readonly description?: LocalizedModelText;
		readonly icon?: ButtonIcon;
		readonly destructive?: boolean;
		readonly primary?: boolean;
		readonly labelHidden?: true;
		readonly confirmation?: ButtonConfirmation;
		readonly styles?: ReadonlyArray<string>;
		readonly annotations?: ReadonlyArray<Record<string, unknown>>;
	}

	export interface ButtonIcon {
		readonly name: string;
		readonly theme?: "filled" | "outlined" | "rounded" | "custom";
	}

	export interface ButtonConfirmation {
		readonly title?: LocalizedModelText;
		readonly message?: LocalizedModelText;
	}

	export type ComponentType = "DualPaneSelection" | "DropDownSelection" | "TableList";

	export interface ComponentConfiguration {
		readonly componentType: ComponentType;
		readonly selectedItemsOverviewModel?: string;
		readonly availableItemsOverviewModel?: string;
		readonly linkFormModel?: string;
		readonly editConfiguration?: EditConfiguration;
		readonly availableItemsQueryModel?: string;
		readonly selectedItemQueryModel?: string;
		readonly elementRef?: string;
		readonly buttons?: ReadonlyArray<RelationshipUiModel.ButtonElement>;
		readonly height?: string;
	}

	export interface EditConfiguration {
		readonly availableItemsOverviewModel: string;
		readonly selectedItemsOverviewModel: string;
		readonly dialogTitle?: LocalizedModelText;
		readonly dialogWidth?: string;
		readonly dialogMaxWidth?: string;
		readonly dialogMaxHeight?: string;
		readonly height?: string;
	}

	export interface ModificationConfiguration {
		readonly extendParentActivityDescriptor?: true;
		readonly activityDescriptor?: ActivityDescriptor;
	}

	export interface ActivityDescriptor {
		readonly model?: string;
		readonly instance?: string;
		readonly [key: string]: string | undefined;
	}
}

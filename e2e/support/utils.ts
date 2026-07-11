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

import type { Page } from "@playwright/test";

export namespace Selector {
	export const BUTTON = dataRole("button");

	export const CONTENT_BOX = dataRole("contentbox");
	export const CONTENT_BOX_CONTENT = dataRole("contentbox-content");
	export const CONTENT_BOX_FOOTER = dataRole("contentbox-footer");
	export const CONTENT_BOX_HEADER = dataRole("contentbox-header");
	export const CONTENT_BOX_TITLE = dataRole("contentbox-title");

	export const COUNTER = dataRole("counter");

	export const DROPDOWN_TEXT = dataRole("dropdown-text");
	export const AUTOCOMPLETE_INPUT = `[data-role='autocomplete'] input`;
	export const DROPDOWN_ITEM = `[data-role='dropdown-item']`;
	export const CLEAR_BUTTON = `[data-role='autocomplete'] button[aria-label='Clear text']`;

	export const FILTER_BAR = dataRole("filterbar");
	export const FILTER_CONTENT = dataRole("filter-content");
	export const FILTER_NAME = dataRole("filter-name");
	export const FILTER_OPTIONS = dataRole("filter-options");
	export const FILTER_SELECTOR = dataRole("filter-selector");
	export const FILTER_SELECTOR_ACTION_BAR = dataRole("filter-selector-action-bar");
	export const FILTER_SELECTOR_CONTENT_SECONDARY = dataRole("filter-selector-content-secondary");
	export const FILTER_SELECTOR_CONTENT_PRIMARY = dataRole("filter-selector-content-primary");
	export const FILTER_SELECTOR_LIST_ITEM = dataRole("filter-selector-list-item");

	export const MENU_ITEM = dataRole("menu-item");
	export const MODAL_OVERLAY = dataRole("modal-overlay");

	export const PAGINATION = dataRole("pagination");

	export const PROGRESS_INDICATOR = dataRole("progress-indicator-outer-overlay");

	export const TABLE_BODY_CELL = dataRole("table-body-cell");
	export const TABLE_BODY_ROW = dataRole("table-body-row");
	export const TABLE_HEADER_CELL = dataRole("table-header-cell");
	export const TABLE_HEADER_ROW = dataRole("table-header-row");

	export const TEXT_FIELD_CONTROL = dataRole("text-field-control");

	export function buttonContains(text: string) {
		return `button:contains(${text})`;
	}

	export function selectDropDown(page: Page, text: string) {
		return page.locator(Selector.DROPDOWN_TEXT).getByText(text).locator("..");
	}
}

function dataRole(role: string) {
	return `[data-role="${role}"]`;
}

export enum Showcase {
	PRODUCT_BINDINGS = "#section:Relationships,feature:Form,model:Product",
	BRAND_BINDINGS = "#section:Relationships,feature:Form,model:Brand",
	CATEGORY_BINDINGS = "#section:Relationships,feature:Form,model:Category",
	CONTRACT_CDM = "#section:Relationships,model:ContractCDM,module:ContractCDM",
	BUSINESS_PARTNER = "#section:Relationships,model:BusinessPartner-document,module:BusinessPartner",
	BUSINESS_PARTNER_CDM = "#section:Relationships,model:BusinessPartnerCDM,module:BusinessPartnerCDM",
	CONTRACT_CUSTOM_SORTING = "#section:Relationships,model:Contract-document,module:Contract",
	STANDALONE_RELATIONSHIP = "#section:Relationships,feature:Standalone,model:Product"
}

export function assertCondition(condition: boolean, message?: string): asserts condition {
	if (!condition) {
		throw new Error(message ?? "Generic assertion error - given condition is not met.");
	}
}

export namespace PWUtils {
	export function selectDropDown(page: Page, label: string) {
		return page.locator(Selector.DROPDOWN_TEXT).getByText(label).locator("..");
	}

	export function selectTextFieldByLabel(page: Page, label: string) {
		return page.locator(Selector.TEXT_FIELD_CONTROL).locator("label").getByText(label).locator("..");
	}
}

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

import type { DynamicConfiguration } from "@com.mgmtp.a12.client/client-core";

import type { ViewNGComponents } from "../../../viewNGComponents.js";

const SECTION = "Relationships";
const FEATURE = "Form";

const DETAIL_CONSTRAINTS = { type: "MasterDetail", preferredWidth: 8 };

interface Entity {
	readonly menu: string;
	readonly overviewModel: string;
	readonly detailModel: string;
	readonly formModels: readonly string[];
}

const ENTITIES: readonly Entity[] = [
	{
		menu: "product",
		overviewModel: "Product",
		detailModel: "Product-document",
		formModels: ["Product-form", "Bundle-form"]
	},
	{ menu: "brand", overviewModel: "Brand", detailModel: "Brand-document", formModels: ["Brand-form"] },
	{ menu: "bundle", overviewModel: "Bundle", detailModel: "Bundle-document", formModels: ["Bundle-form"] },
	{ menu: "category", overviewModel: "Category", detailModel: "Category-document", formModels: ["Category-form"] }
];

export function createFormModule({ ShowcaseOverview, RelationshipFormEngine }: ViewNGComponents): DynamicConfiguration {
	return {
		id: "relationships.form",
		flows: ENTITIES.map((entity) => ({
			name: `Relationship ${entity.overviewModel}`,
			scenes: [
				{
					name: `${entity.menu}-overview`,
					matches: (d) =>
						d.section === SECTION && d.feature === FEATURE && d.model === entity.overviewModel && !d.instance,
					sceneChange: {
						onEnter: [
							{ type: "DYNAMIC_CLEAR_REGION", region: "/CONTENT" },
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: ShowcaseOverview,
								models: [{ modelType: "overview", name: `${entity.overviewModel}-overview` }]
							}
						]
					}
				},
				{
					name: `${entity.menu}-detail`,
					matches: (d) =>
						d.section === SECTION && d.feature === FEATURE && d.model === entity.detailModel && !!d.instance,
					sceneChange: {
						onEnter: [
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: RelationshipFormEngine,
								constraints: DETAIL_CONSTRAINTS,
								models: entity.formModels.map((name) => ({ modelType: "form", name }))
							}
						]
					}
				}
			]
		}))
	};
}

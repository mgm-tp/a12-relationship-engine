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

const SECTION = "DataHandling";

export function createCRUDModule({ ShowcaseOverview, RelationshipFormEngine }: ViewNGComponents): DynamicConfiguration {
	return {
		id: "data_handling.crud",
		flows: [
			{
				name: "data_handling.crud",
				scenes: [
					{
						name: "CRUDOverview",
						matches: (d) => d.section === SECTION && d.feature === "CRUD" && d.model === "CRUDExample" && !d.instance,
						sceneChange: {
							onEnter: [
								{ type: "DYNAMIC_CLEAR_REGION", region: "/CONTENT" },
								{
									type: "DYNAMIC_ADD_VIEW",
									region: "/CONTENT",
									component: ShowcaseOverview,
									constraints: { type: "MasterDetail" },
									models: [{ modelType: "overview", name: "CRUD-overview" }]
								}
							]
						}
					},
					{
						name: "CRUDForm",
						matches: (d) =>
							d.section === SECTION && d.feature === "CRUD" && d.model === "CRUD-document" && !!d.instance,
						sceneChange: {
							onEnter: [
								{
									type: "DYNAMIC_ADD_VIEW",
									region: "/CONTENT",
									component: RelationshipFormEngine,
									models: [{ modelType: "form", name: "CRUD-form" }]
								}
							]
						}
					},
					{
						name: "CRUDNewForm",
						matches: (d) =>
							d.section === SECTION && d.feature === "CRUDNEW" && d.model === "CRUDExample" && !!d.instance,
						sceneChange: {
							onEnter: [
								{
									type: "DYNAMIC_ADD_VIEW",
									region: "/CONTENT",
									component: RelationshipFormEngine,
									models: [{ modelType: "form", name: "CRUD-form" }]
								}
							]
						}
					}
				]
			}
		]
	};
}

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

import { OverviewModel } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import { type DocumentModel } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";

export function createOverviewModelMock(id: string): OverviewModel {
	return {
		header: {
			id,
			modelVersion: "0.0.1",
			modelType: "overview"
		},
		content: {
			configuration: {
				showFullTextSearch: true,
				enableFilter: true,
				filterConfiguration: {
					showFilterButton: true,
					showFilterBar: true,
					filterMode: OverviewModel.FilterMode.ALL
				}
			},
			columns: [
				{
					id: "testColumn",
					name: "testColumn",
					elementRef: "testField",
					width: 1
				}
			],
			rowActionGroup: {},
			subHeaderBox: {
				majorElements: [
					{
						type: OverviewModel.ElementType.FILTER
					}
				]
			}
		}
	};
}

export function createDocumentModelMock(): DocumentModel {
	return {
		header: {
			id: "testDocumentModel",
			modelVersion: "0.0.1",
			modelType: "document"
		},
		content: {
			modelInfo: {},
			modelConfig: {
				timeZone: "UTC"
			},
			modelRoot: {
				id: "root",
				type: "Group",
				name: "root",
				repeatability: 1,
				elements: [
					{
						id: "group1",
						type: "Group",
						name: "group1",
						repeatability: 1,
						elements: [
							{
								id: "testField",
								name: "testField",
								type: "Field",
								fieldType: {
									type: "StringType"
								}
							}
						]
					}
				]
			}
		}
	};
}

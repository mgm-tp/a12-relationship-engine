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

import { NEW_INSTANCE_IDENTIFIER, type ApplicationModel } from "@com.mgmtp.a12.client/client-core";

export const model: ApplicationModel = {
	header: {
		id: "CRUD_Test_Model",
		modelType: "application",
		modelVersion: "1.0.0",
		locales: [{ code: "en" }]
	},
	content: {
		region: {
			name: "APP",
			layout: { name: "ApplicationFrame" },
			subRegions: []
		},
		defaultRegion: ["CONTENT"],
		modules: [
			{
				name: "CRUD Module",
				menu: {
					name: "crud",
					label: [{ locale: "en", text: "CRUD" }],
					initialActivity: {
						descriptor: {
							model: "CRUD"
						}
					}
				},
				flows: [
					{
						name: "CRUDFlow1",
						scenes: [
							{
								name: "CRUDOverview",
								description: "Overview of CRUD",
								matchConditions: [
									{
										key: "model",
										mustEqual: "CRUD"
									},
									{
										key: "instance",
										isSet: false
									}
								],
								sceneChange: {
									onEnter: [
										{
											type: "REGION_CLEAR"
										},
										{
											type: "VIEW_ADD",
											name: "OverviewCRUD",
											models: [{ modelType: "overview", name: "CRUD-overview" }]
										}
									]
								}
							},
							{
								name: "CRUDForm",
								description: "Specific Form of CRUD",
								matchConditions: [
									{
										key: "instance",
										isSet: true
									}
								],
								priorScene: "CRUDOverview",
								sceneChange: {
									onEnter: [
										{
											type: "VIEW_ADD",
											name: "FormEngine",
											models: [{ modelType: "form", name: "CRUD-form" }]
										}
									]
								}
							}
						]
					}
				]
			}
		]
	}
};

/**
 * Mock document factory for CRUD models
 */
export function document(i: number): object {
	const result = {
		id: `CRUD-document/${i}`,
		modelId: "CRUD-document",
		root: {
			DummyField: `Field${i}.1`
		}
	};
	return result;
}

export const DATA_FOR_CRUD = {
	id: NEW_INSTANCE_IDENTIFIER,
	modelId: "CRUD-document",
	root: {
		DummyField: `Value1.1`
	}
};

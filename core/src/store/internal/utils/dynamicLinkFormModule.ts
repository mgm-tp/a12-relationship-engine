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

import { FormEngineViews } from "@com.mgmtp.a12.formengine/formengine-core";
import type { DynamicConfiguration } from "@com.mgmtp.a12.client/client-core";
import { NullRegionLayoutNG, ModuleRegistryProvider } from "@com.mgmtp.a12.client/client-core";

type Params = {
	linkFormModel: string;
	linkDocumentModel: string;
};

export function ensureDynamicLinkFormModule(params: Params): void {
	const registry = ModuleRegistryProvider.getInstance();
	const dynamicModule = createDynamicLinkFormModule(params);
	const alreadyRegistered = registry.getAllModules().some((candidate) => candidate.id === dynamicModule.id);

	if (!alreadyRegistered) {
		registry.addModule(dynamicModule);
	}
}

function createDynamicLinkFormModule(params: Params): DynamicConfiguration {
	return {
		id: `dynamic_link_form_module_${params.linkFormModel}`,
		flows: [
			{
				name: `DynamicFlow${params.linkFormModel}`,
				scenes: [
					{
						name: `DynamicScene${params.linkFormModel}`,
						matches: (descriptor) => {
							return (
								descriptor.model === params.linkDocumentModel &&
								descriptor.instance !== undefined &&
								descriptor.dynamicLinkForm !== undefined
							);
						},
						sceneChange: {
							onEnter: [
								{
									type: "DYNAMIC_ADD_VIEW",
									component: FormEngineViews.FormEngine,
									region: "RelationshipEngineLinkFormRegion",
									models: [
										{
											modelType: "form",
											name: params.linkFormModel
										}
									]
								}
							]
						}
					}
				]
			}
		],
		regions: [
			{
				name: "RelationshipEngineLinkFormRegion",
				layout: NullRegionLayoutNG
			}
		]
	};
}

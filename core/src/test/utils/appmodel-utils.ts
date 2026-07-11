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

import type { ApplicationModel } from "@com.mgmtp.a12.client/client-core";

export function createAppModel(options: Partial<ApplicationModel>): ApplicationModel {
	return {
		header: {
			id: "TEST_MODEL",
			modelType: "application",
			modelVersion: "x.x.x"
		},
		content: options.content ? options.content : createContent({})
	};
}

export function createContent(
	content: Partial<ApplicationModel.ApplicationConfiguration>
): ApplicationModel.ApplicationConfiguration {
	return {
		region: content.region || createRegion({}),
		defaultRegion: content.defaultRegion || ["CONTENT"],
		modules: content?.modules || []
	};
}

export function createSubRegions(useMockLayout?: boolean): ApplicationModel.Region[] {
	return [
		{
			name: "CONTENT",
			layout: { name: useMockLayout ? "MasterDetailMock" : "MasterDetail" }
		},
		{ name: "SIDEBAR", layout: { name: useMockLayout ? "Mock" : "Null" } },
		{ name: "MODAL", layout: { name: useMockLayout ? "StackMock" : "Stack" } }
	];
}

export function createRegion(region: Partial<ApplicationModel.Region>): ApplicationModel.Region {
	return {
		name: "APP",
		layout: region.layout || { name: "ApplicationFrame" },
		subRegions: region.subRegions
			? region.subRegions
			: [
					{ name: "CONTENT", layout: { name: "MasterDetailMock" } },
					{ name: "SIDEBAR", layout: { name: "NullMock" } },
					{ name: "MODAL", layout: { name: "StackMock" } }
				]
	};
}

export function createModule(module: Partial<ApplicationModel.Module>): ApplicationModel.Module {
	return {
		name: module.name || "module1",
		menu: module.menu || {
			name: "Menu-1",
			initialActivity: { descriptor: {} }
		},
		flows: module.flows || []
	};
}

export function createScene(options: {
	onEnterDirectives?: ApplicationModel.Directive[];
	matchConditions?: ApplicationModel.MatchCondition[];
	cases?: ApplicationModel.Case[];
}): ApplicationModel.Scene {
	return {
		name: "Main",
		description: "Main Case",
		matchConditions: options.matchConditions || [],
		sceneChange: {
			onEnter: options.onEnterDirectives
		},
		cases: options.cases
	};
}

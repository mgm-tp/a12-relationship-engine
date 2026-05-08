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

import React from "react";

import { FrameFactories, type View } from "@com.mgmtp.a12.client/client-core";
import { CRUDFactories } from "@com.mgmtp.a12.crud/crud-core";
import { FormEngineViews } from "@com.mgmtp.a12.formengine/formengine-core";

import { sortedRelationshipFormEngineProvider } from "./modules/relationships/simpleCDM/index.js";
import { createRelationshipStandaloneViewProvider } from "./modules/relationships/standalone/index.js";
import { ShowcaseOverviewView } from "./views/showcaseOverview/ShowcaseOverviewView.js";

export function createViewProvider() {
	const formEngineViewProvider = createFormEngineViewProvider();
	const overviewEngineViewProvider = createOverviewEngineViewProvider();
	const relationshipStandaloneViewProvider = createRelationshipStandaloneViewProvider();

	return function viewProvider(componentName: string): React.ComponentType<View> {
		return (
			sortedRelationshipFormEngineProvider(componentName) ||
			relationshipStandaloneViewProvider(componentName) ||
			formEngineViewProvider(componentName) ||
			overviewEngineViewProvider(componentName) ||
			CRUDFactories.createCRUDRenderer(componentName) ||
			FrameFactories.viewProvider(componentName) ||
			Placeholder
		);
	};
}

function Placeholder(): React.ReactNode {
	return <div>ERROR: NO CONTAINER FOUND</div>;
}

function createFormEngineViewProvider(): (componentName: string) => React.ComponentType<View> | undefined {
	const components: { [name: string]: React.ComponentType<View> | undefined } = {
		FormEngine(props) {
			return <FormEngineViews.FormEngine {...props} />;
		}
	};

	return function formEngineProvider(name) {
		return components[name];
	};
}

function createOverviewEngineViewProvider(): (componentName: string) => React.ComponentType<View> | undefined {
	const components: { [name: string]: React.ComponentType<View> | undefined } = {
		ShowcaseOverview(props) {
			return <ShowcaseOverviewView {...props} />;
		}
	};
	return function overviewEngineProvider(name) {
		return components[name];
	};
}

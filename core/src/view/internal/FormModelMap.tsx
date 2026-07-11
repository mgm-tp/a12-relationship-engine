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
 * @module extensions/relationship
 */

import type { FormModel } from "@com.mgmtp.a12.formengine/formengine-core";
import type { FormModelMap } from "@com.mgmtp.a12.formengine/formengine-core";

import { Screen } from "./Screen.js";
import type { WidgetMap } from "./widgetMap.js";
import { DetachedRepeat } from "./DetachRepeat.js";
import type { ComponentMap } from "./componentMap.js";
import { CustomScreenElement } from "./CustomScreenElement.js";
import { DefaultWidgetMap, DefaultComponentMap } from "./default.js";
import { RelationshipEngineContextProvider } from "./context/RelationshipEngineContext.js";

/**
 * The form model map for Relationship Engine components.
 * Used as the return type of {@link RelationshipEngineFactories.createFormModelMap}.
 * @experimental
 */
export interface RelationshipEngineFormModelMap extends Partial<FormModelMap> {
	Screen: FormModelMap["Screen"];
	CustomScreenElement: FormModelMap["CustomScreenElement"];
	DetachedRepeat: FormModelMap["DetachedRepeat"];
}

/**
 * Options for customizing RE components via the factory.
 * @experimental
 */
export interface RelationshipEngineFormModelMapOptions {
	/** @internal */
	readonly componentMap?: Partial<ComponentMap>;
	/** @internal */
	readonly widgetMap?: Partial<WidgetMap>;
}

/** @internal */
export function createRelationshipEngineFormModelMap(
	options?: RelationshipEngineFormModelMapOptions
): RelationshipEngineFormModelMap {
	const config = {
		componentMap: { ...DefaultComponentMap, ...options?.componentMap },
		widgetMap: { ...DefaultWidgetMap, ...options?.widgetMap }
	};

	return {
		Screen: {
			component: function ScreenWithDialogs(props: FormModelMap.FormModelComponentProps<FormModel.Screen>) {
				const content = <Screen {...props} />;

				return <RelationshipEngineContextProvider {...config}>{content}</RelationshipEngineContextProvider>;
			}
		},
		CustomScreenElement: {
			component: function CustomSectionWithComponentProvider(
				props: FormModelMap.FormModelComponentProps<FormModel.CustomScreenElement>
			) {
				return <CustomScreenElement {...props} />;
			}
		},
		DetachedRepeat: {
			component: function CustomSectionWithComponentProvider(
				props: FormModelMap.FormModelComponentProps<FormModel.DetachedRepeat>
			) {
				return <DetachedRepeat {...props} />;
			}
		}
	};
}

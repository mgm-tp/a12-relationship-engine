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

import type React from "react";

import { CRUDFormEngineView } from "./components/form-engine.js";
import { CRUDOverviewView } from "./components/overview-engine.js";
import { LegacyRelationshipFormEngineView } from "./components/legacy-relationship-form-engine.js";

/**
 * The CRUD View Components
 *
 * Please note that this extension is useful for analysts / modelers during development phase.
 * It is totally OK to use it in production **as long as it is used as a drop-in component without any customization.**
 */
export namespace CRUDViews {
	/**
	 * The form engine component within the CRUD view.
	 * This view also contains the relationship engine
	 *
	 * Note that this component should only be used as a drop-in component without any customization.
	 * For this reason, it is not possible to pass `formModelMap`/`widgetMap` as props.
	 */
	export const FormEngineView: React.FC<LegacyRelationshipFormEngineView.Props> = LegacyRelationshipFormEngineView;

	/**
	 * The new form engine component which integrate the newer version of Relationship Engine as composable API.
	 * @experimental but expected to replace `FormEngineView` in the near future.
	 */
	export const FormEngineWithRelationshipEngineView: React.FC<CRUDFormEngineView.Props> = CRUDFormEngineView;

	/** The overview engine component within the CRUD view */
	export const OverviewEngineView: React.FC<CRUDOverviewView.Props> = CRUDOverviewView;
}

export { LegacyRelationshipFormEngineView, CRUDFormEngineView, CRUDOverviewView };

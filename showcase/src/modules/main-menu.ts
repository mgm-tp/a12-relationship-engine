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

import type { Dispatch } from "redux";

import type { Activity } from "@com.mgmtp.a12.client/client-core";
import {
	ActivityActions,
	type DynamicMenu,
	ActivitySelectors,
	ApplicationActions,
	type DynamicConfiguration
} from "@com.mgmtp.a12.client/client-core";

/**
 * The application's main menu. Replaces the hard-coded `mainMenu` tree of the former custom
 * `MainMenu` component: the same two container groups ("Data Handling" and "Relationships")
 * with the module menus nested underneath, in the same order. The leaf entries start the
 * matching main activity; the flows that render the scenes live in the individual modules.
 */

function startActivity(descriptor: Activity.Descriptor) {
	return (dispatch: Dispatch) =>
		dispatch(
			ApplicationActions.startMainActivityRequested({
				action: ActivityActions.create({ activityDescriptor: descriptor }),
				descriptor: {}
			})
		);
}

interface LeafEntry {
	readonly id: string;
	readonly labelKey: string;
	readonly descriptor: Activity.Descriptor;
}

function leaf(state: object, entry: LeafEntry): DynamicMenu {
	return {
		id: entry.id,
		label: { key: entry.labelKey },
		selected: ActivitySelectors.activitiesByDescriptor(entry.descriptor)(state).length > 0,
		action: startActivity(entry.descriptor)
	};
}

const CRUD_ENTRIES: readonly LeafEntry[] = [
	{
		id: "menu.data_handling.crud.overview",
		labelKey: "application.menu.crud.overview",
		descriptor: { section: "DataHandling", feature: "CRUD", model: "CRUDExample" }
	},
	{
		id: "menu.data_handling.crud.form",
		labelKey: "application.menu.crud.form",
		descriptor: { section: "DataHandling", feature: "CRUDNEW", model: "CRUDExample", instance: "__NEW__" }
	}
];

const FORM_ENTRIES: readonly LeafEntry[] = [
	{
		id: "menu.relationships.form.product",
		labelKey: "application.menu.form.product",
		descriptor: { section: "Relationships", feature: "Form", model: "Product" }
	},
	{
		id: "menu.relationships.form.brand",
		labelKey: "application.menu.form.brand",
		descriptor: { section: "Relationships", feature: "Form", model: "Brand" }
	},
	{
		id: "menu.relationships.form.bundle",
		labelKey: "application.menu.form.bundle",
		descriptor: { section: "Relationships", feature: "Form", model: "Bundle" }
	},
	{
		id: "menu.relationships.form.category",
		labelKey: "application.menu.form.category",
		descriptor: { section: "Relationships", feature: "Form", model: "Category" }
	}
];

const SCDM_ENTRIES: readonly LeafEntry[] = [
	{
		id: "menu.relationships.scdm.contract",
		labelKey: "application.menu.scdm.contract",
		descriptor: { section: "Relationships", model: "Contract-document", module: "Contract" }
	},
	{
		id: "menu.relationships.scdm.address",
		labelKey: "application.menu.scdm.address",
		descriptor: { section: "Relationships", model: "Address-document", module: "Address" }
	},
	{
		id: "menu.relationships.scdm.claim",
		labelKey: "application.menu.scdm.claim",
		descriptor: { section: "Relationships", model: "Claim-document", module: "Claims" }
	},
	{
		id: "menu.relationships.scdm.coverage",
		labelKey: "application.menu.scdm.coverage",
		descriptor: { section: "Relationships", model: "Coverage-document", module: "Coverage" }
	},
	{
		id: "menu.relationships.scdm.businessPartner",
		labelKey: "application.menu.scdm.businessPartner",
		descriptor: { section: "Relationships", model: "BusinessPartner-document", module: "BusinessPartner" }
	},
	{
		id: "menu.relationships.scdm.businessPartnerCdm",
		labelKey: "application.menu.scdm.businessPartnerCdm",
		descriptor: { section: "Relationships", model: "BusinessPartnerCDM", module: "BusinessPartnerCDM" }
	},
	{
		id: "menu.relationships.scdm.contractCdm",
		labelKey: "application.menu.scdm.contractCdm",
		descriptor: { section: "Relationships", model: "ContractCDM", module: "ContractCDM" }
	},
	{
		id: "menu.relationships.scdm.personCdm",
		labelKey: "application.menu.scdm.personCdm",
		descriptor: { section: "Relationships", model: "NaturalPersonCDMNoRepeatable", module: "PersonCDM" }
	}
];

const STANDALONE_DESCRIPTOR = { section: "Relationships", feature: "Standalone", model: "Product" };

export const MainMenuModule: DynamicConfiguration = {
	id: "MainMenu",
	menus: (state) => [
		{
			id: "menu.data-handling",
			label: { key: "application.menu.dataHandling" },
			children: [
				{
					id: "menu.data_handling.crud",
					label: { key: "application.menu.crud.label" },
					children: CRUD_ENTRIES.map((entry) => leaf(state, entry))
				}
			]
		},
		{
			id: "menu.relationships",
			label: { key: "application.menu.relationships" },
			children: [
				{
					id: "menu.relationships.form",
					label: { key: "application.menu.form.label" },
					children: FORM_ENTRIES.map((entry) => leaf(state, entry))
				},
				{
					id: "menu.relationships.standalone",
					label: { key: "application.menu.standalone" },
					selected: ActivitySelectors.activitiesByDescriptor(STANDALONE_DESCRIPTOR)(state).length > 0,
					action: startActivity(STANDALONE_DESCRIPTOR)
				},
				{
					id: "menu.relationships.scdm",
					label: { key: "application.menu.scdm.label" },
					children: SCDM_ENTRIES.map((entry) => leaf(state, entry))
				}
			]
		}
	]
};

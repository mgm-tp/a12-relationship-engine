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

import {
	initializeKeys,
	type LocalizationTree,
	type LocalizationTreeMap
} from "@com.mgmtp.a12.utils/utils-localization";

const enResourceTree = {
	application: {
		title: "Relationship Engine Showcase",
		menu: {
			dataHandling: "Data Handling",
			relationships: "Relationships",
			overview: {
				label: "Overview",
				bundle: "Bundle",
				infiniteBundle: "Infinite Bundle"
			},
			form: {
				label: "Form",
				product: "Product",
				brand: "Brand",
				bundle: "Bundle",
				category: "Category"
			},
			standalone: "Standalone",
			scdm: {
				label: "Simple CDM",
				contract: "Contract - Custom Sorting",
				address: "Address",
				claim: "Claim",
				coverage: "Coverage",
				businessPartner: "Business Partner",
				businessPartnerCdm: "Business Partner CDM",
				contractCdm: "Contract CDM",
				personCdm: "Person CDM"
			},
			crud: {
				label: "CRUD",
				overview: "Overview",
				form: "CRUD (new form)"
			}
		}
	},
	server: {
		connection: {
			failed: "Bad server connection!"
		}
	},
	warning: "Warning",
	showcase: {
		error: {
			server: {
				title: "Error",
				message: "Something went wrong!",
				link_validation: {
					description: "$message$"
				}
			}
		}
	}
};

const deResourceTree: LocalizationTree = {
	application: {
		menu: {
			dataHandling: "Datenverarbeitung",
			relationships: "Relationships",
			overview: {
				label: "Übersicht",
				bundle: "Bundle",
				infiniteBundle: "Infinite Bundle"
			},
			form: {
				label: "Form",
				product: "Produkt",
				brand: "Marke",
				bundle: "Paket",
				category: "Kategorie"
			},
			standalone: "Standalone",
			scdm: {
				label: "Simple CDM",
				contract: "Vertrag - Custom Sorting",
				address: "Adresse",
				claim: "Anspruch",
				coverage: "Deckung",
				businessPartner: "Geschäftspartner",
				businessPartnerCdm: "Geschäftspartner CDM",
				contractCdm: "Vertrag CDM",
				personCdm: "Person CDM"
			},
			crud: {
				label: "CRUD",
				overview: "Übersicht",
				form: "CRUD (neues Formular)"
			}
		}
	},
	showcase: {
		error: {
			server: {
				title: "Fehler"
			}
		}
	}
};

export const SHOWCASE_RESOURCES: LocalizationTreeMap = { en: enResourceTree, de: deResourceTree };

const SHOWCASE_RESOURCE_KEYS = structuredClone(enResourceTree);

initializeKeys(SHOWCASE_RESOURCE_KEYS);

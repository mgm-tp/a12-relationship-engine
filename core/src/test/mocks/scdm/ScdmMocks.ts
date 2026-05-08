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

export const contractMocks = [
	{
		id: "Contract-document/24",
		modelId: "Contract-document",
		contract: {
			type: "Type 1"
		}
	},
	{
		id: "Contract-document/0815",
		modelId: "Contract-document",
		contract: {
			type: "Type 2 (shallow)"
		}
	}
];

export const addressMocks = [
	{
		id: "Address-document/24",
		modelId: "Address-document",
		address: {
			country: "Germany",
			city: "Berlin",
			street: "Torstraße",
			number: "164"
		}
	},
	{
		id: "Address-document/25",
		modelId: "Address-document",
		address: {
			country: "Germany",
			city: "München",
			street: "Taunusstraße",
			number: "23"
		}
	}
];

export const businessPartnerMocks = [
	{
		id: "BusinessPartner-document/24",
		modelId: "NaturalPerson-document",
		businessPartner: {
			id: "1",
			name: "Dagobert Duck",
			firstName: "Dagobert",
			lastName: "Duck",
			notes: [{ day: new Date(), note: "Important" }]
		}
	},
	{
		id: "BusinessPartner-document/25",
		modelId: "NaturalPerson-document",
		businessPartner: {
			id: "2",
			name: "Mac Moneysac",
			firstName: "Mac",
			lastName: "Moneysac",
			notes: [{ day: new Date(), note: "Not Important" }]
		}
	},
	{
		id: "BusinessPartner-document/26",
		modelId: "LegalEntity-document",
		businessPartner: {
			register: 1337,
			id: "3",
			name: "Google LLC",
			notes: [{ day: new Date(), note: "Important" }]
		}
	},
	{
		id: "BusinessPartner-document/27",
		modelId: "LegalEntity-document",
		businessPartner: {
			register: 1338,
			id: "4",
			name: "Facebook Inc.",
			notes: [{ day: new Date(), note: "Not Important" }]
		}
	}
];

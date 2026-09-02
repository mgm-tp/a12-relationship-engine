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

import type { DynamicFlow, DynamicConfiguration } from "@com.mgmtp.a12.client/client-core";

import type { ViewNGComponents } from "../../../viewNGComponents.js";

const SECTION = "Relationships";

function createFlows({
	ShowcaseOverview,
	FormEngine,
	RelationshipFormEngine,
	SortedRelationshipFormEngine
}: ViewNGComponents): DynamicFlow[] {
	return [
		{
			name: "ContractFlow",
			scenes: [
				{
					name: "ContractOverview",
					matches: (d) =>
						d.section === SECTION && d.model === "Contract-document" && !d.instance && d.module === "Contract",
					sceneChange: {
						onEnter: [
							{ type: "DYNAMIC_CLEAR_REGION", region: "/CONTENT" },
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: ShowcaseOverview,
								constraints: { type: "MasterDetail" },
								models: [{ modelType: "overview", name: "Contract-overview" }]
							}
						]
					}
				},
				{
					name: "ContractForm",
					matches: (d) =>
						d.section === SECTION && d.model === "Contract-document" && !!d.instance && d.module === "Contract",
					sceneChange: {
						onEnter: [
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: SortedRelationshipFormEngine,
								models: [{ modelType: "form", name: "Contract-form", documentModel: "Contract-document" }]
							}
						]
					}
				}
			]
		},
		{
			name: "AddressFlow",
			scenes: [
				{
					name: "AddressOverview",
					matches: (d) =>
						d.section === SECTION && d.model === "Address-document" && !d.instance && d.module === "Address",
					sceneChange: {
						onEnter: [
							{ type: "DYNAMIC_CLEAR_REGION", region: "/CONTENT" },
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: ShowcaseOverview,
								models: [{ modelType: "overview", name: "Address-overview" }]
							}
						]
					}
				},
				{
					name: "AddressForm",
					matches: (d) =>
						d.section === SECTION && d.model === "Address-document" && !!d.instance && d.module === "Address",
					sceneChange: {
						onEnter: [
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: FormEngine,
								models: [{ modelType: "form", name: "Address-form", documentModel: "Address-document" }]
							}
						]
					}
				}
			]
		},
		{
			name: "CoverageFlow",
			scenes: [
				{
					name: "CoverageOverview",
					matches: (d) =>
						d.section === SECTION && d.model === "Coverage-document" && !d.instance && d.module === "Coverage",
					sceneChange: {
						onEnter: [
							{ type: "DYNAMIC_CLEAR_REGION", region: "/CONTENT" },
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: ShowcaseOverview,
								models: [{ modelType: "overview", name: "Coverage-overview" }]
							}
						]
					}
				},
				{
					name: "CoverageForm",
					matches: (d) =>
						d.section === SECTION && d.model === "Coverage-document" && !!d.instance && d.module === "Coverage",
					sceneChange: {
						onEnter: [
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: FormEngine,
								models: [{ modelType: "form", name: "Coverage-form" }]
							}
						]
					}
				}
			]
		},
		{
			name: "ClaimsFlow",
			scenes: [
				{
					name: "ClaimsOverview",
					matches: (d) => d.section === SECTION && d.model === "Claim-document" && !d.instance && d.module === "Claims",
					sceneChange: {
						onEnter: [
							{ type: "DYNAMIC_CLEAR_REGION", region: "/CONTENT" },
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: ShowcaseOverview,
								models: [{ modelType: "overview", name: "Claim-overview" }]
							}
						]
					}
				},
				{
					name: "ClaimForm",
					matches: (d) =>
						d.section === SECTION && d.model === "Claim-document" && !!d.instance && d.module === "Claims",
					sceneChange: {
						onEnter: [
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: FormEngine,
								models: [{ modelType: "form", name: "Claim-form" }]
							}
						]
					}
				}
			]
		},
		{
			name: "BusinessPartnerFlow",
			scenes: [
				{
					name: "BusinessPartnerOverview",
					matches: (d) =>
						d.section === SECTION &&
						d.model === "BusinessPartner-document" &&
						!d.instance &&
						d.module === "BusinessPartner",
					sceneChange: {
						onEnter: [
							{ type: "DYNAMIC_CLEAR_REGION", region: "/CONTENT" },
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: ShowcaseOverview,
								models: [{ modelType: "overview", name: "BusinessPartner-overview" }]
							}
						]
					}
				},
				{
					name: "BusinessPartnerForm",
					matches: (d) => d.section === SECTION && !!d.model && !!d.instance && d.module === "BusinessPartner",
					sceneChange: {
						onEnter: [
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: RelationshipFormEngine,
								models: [
									{ modelType: "form", name: "NaturalPerson-form", documentModel: "NaturalPerson-document" },
									{ modelType: "form", name: "LegalEntity-form", documentModel: "LegalEntity-document" }
								]
							}
						]
					}
				}
			]
		},
		{
			name: "BusinessPartnerCDMFlow",
			scenes: [
				{
					name: "BusinessPartnerCDMOverview",
					matches: (d) =>
						d.section === SECTION &&
						d.model === "BusinessPartnerCDM" &&
						!d.instance &&
						d.module === "BusinessPartnerCDM",
					sceneChange: {
						onEnter: [
							{ type: "DYNAMIC_CLEAR_REGION", region: "/CONTENT" },
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: ShowcaseOverview,
								models: [{ modelType: "overview", name: "BusinessPartnerCDM-overview" }]
							}
						]
					}
				},
				{
					name: "LegalEntityCDMForm",
					matches: (d) =>
						d.section === SECTION &&
						d.model === "LegalEntity-document" &&
						!!d.instance &&
						d.module === "BusinessPartnerCDM",
					sceneChange: {
						onEnter: [
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: RelationshipFormEngine,
								models: [{ modelType: "form", name: "LegalEntityCDM-form" }]
							}
						]
					}
				},
				{
					name: "NaturalPersonCDMForm",
					matches: (d) =>
						d.section === SECTION &&
						d.model === "NaturalPerson-document" &&
						!!d.instance &&
						d.module === "BusinessPartnerCDM",
					sceneChange: {
						onEnter: [
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: RelationshipFormEngine,
								models: [{ modelType: "form", name: "NaturalPersonCDM-form" }]
							}
						]
					}
				},
				{
					name: "BusinessPartnerCDMAddressForm",
					matches: (d) =>
						d.section === SECTION &&
						d.model === "Address-document" &&
						!!d.instance &&
						d.module === "BusinessPartnerCDM",
					sceneChange: {
						onEnter: [
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: RelationshipFormEngine,
								models: [{ modelType: "form", name: "Address-form" }]
							}
						]
					}
				}
			]
		},
		{
			name: "NaturalPersonCDMNoRepeatableFlow",
			scenes: [
				{
					name: "NaturalPersonCDMNoRepeatableOverview",
					matches: (d) =>
						d.section === SECTION &&
						d.model === "NaturalPersonCDMNoRepeatable" &&
						!d.instance &&
						d.module === "PersonCDM",
					sceneChange: {
						onEnter: [
							{ type: "DYNAMIC_CLEAR_REGION", region: "/CONTENT" },
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: ShowcaseOverview,
								models: [{ modelType: "overview", name: "NaturalPersonCDMNoRepeatable-overview" }]
							}
						]
					}
				},
				{
					name: "NaturalPersonCDMNoRepeatableForm",
					matches: (d) =>
						d.section === SECTION && d.model === "NaturalPerson-document" && !!d.instance && d.module === "PersonCDM",
					sceneChange: {
						onEnter: [
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: RelationshipFormEngine,
								models: [{ modelType: "form", name: "NaturalPersonCDMNoRepeatable-form" }]
							}
						]
					}
				},
				{
					name: "PersonCDMAddressForm",
					matches: (d) =>
						d.section === SECTION && d.model === "Address-document" && !!d.instance && d.module === "PersonCDM",
					sceneChange: {
						onEnter: [
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: RelationshipFormEngine,
								models: [{ modelType: "form", name: "Address-form" }]
							}
						]
					}
				}
			]
		},
		{
			name: "ContractCDMFlow",
			scenes: [
				{
					name: "ContractCDMOverview",
					matches: (d) => d.section === SECTION && !d.instance && d.module === "ContractCDM",
					sceneChange: {
						onEnter: [
							{ type: "DYNAMIC_CLEAR_REGION", region: "/CONTENT" },
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: ShowcaseOverview,
								constraints: { type: "MasterDetail" },
								models: [{ modelType: "overview", name: "ContractCDM-overview" }]
							}
						]
					}
				},
				{
					name: "ContractCDMForm",
					matches: (d) =>
						d.section === SECTION && d.model === "Contract-document" && !!d.instance && d.module === "ContractCDM",
					sceneChange: {
						onEnter: [
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: RelationshipFormEngine,
								models: [
									{ modelType: "form", name: "ContractCDM-form" },
									{ modelType: "document", name: "NaturalPerson-document" },
									{ modelType: "document", name: "LegalEntity-document" }
								]
							}
						]
					}
				},
				{
					name: "ContractCDMLegalEntityForm",
					matches: (d) =>
						d.section === SECTION && d.model === "LegalEntity-document" && !!d.instance && d.module === "ContractCDM",
					sceneChange: {
						onEnter: [
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: RelationshipFormEngine,
								models: [{ modelType: "form", name: "LegalEntityCDM-form" }]
							}
						]
					}
				},
				{
					name: "ContractCDMNaturalPersonForm",
					matches: (d) =>
						d.section === SECTION && d.model === "NaturalPerson-document" && !!d.instance && d.module === "ContractCDM",
					sceneChange: {
						onEnter: [
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: RelationshipFormEngine,
								models: [{ modelType: "form", name: "NaturalPersonCDM-form" }]
							}
						]
					}
				},
				{
					name: "ContractCDMAddressForm",
					matches: (d) =>
						d.section === SECTION && d.model === "Address-document" && !!d.instance && d.module === "ContractCDM",
					sceneChange: {
						onEnter: [
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: RelationshipFormEngine,
								models: [{ modelType: "form", name: "Address-form" }]
							}
						]
					}
				},
				{
					name: "ContractCDMCoverageForm",
					matches: (d) =>
						d.section === SECTION && d.model === "Coverage-document" && !!d.instance && d.module === "ContractCDM",
					sceneChange: {
						onEnter: [
							{
								type: "DYNAMIC_ADD_VIEW",
								region: "/CONTENT",
								component: RelationshipFormEngine,
								models: [{ modelType: "form", name: "Coverage-form" }]
							}
						]
					}
				}
			]
		}
	];
}

export function createSimpleCDMModule(views: ViewNGComponents): DynamicConfiguration {
	return {
		id: "relationships.scdm",
		flows: createFlows(views)
	};
}

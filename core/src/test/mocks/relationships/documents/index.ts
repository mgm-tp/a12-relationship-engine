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

import { type Relationship } from "@com.mgmtp.a12.dataservices/dataservices-access";

import * as AddressMocks from "./AddressMocks.js";
import * as BrandMocks from "./BrandMocks.js";
import * as BundleMocks from "./BundleMocks.js";
import * as BusinessPartnerMocks from "./BusinessPartnerMocks.js";
import * as CategoryMocks from "./CategoryMocks.js";
import * as LinkDocumentMocks from "./LinkDocumentMocks.js";
import * as ProductMocks from "./ProductMocks.js";

export const documentByType: {
	[key: string]:
		| {
				id: string;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				[key: string]: any;
		  }[]
		| undefined;
} = {
	Product: ProductMocks.documents,
	Brand: BrandMocks.documents,
	Bundle: BundleMocks.documents,
	ParentCategory: CategoryMocks.documents,
	ChildCategory: CategoryMocks.documents,
	businessPartner: BusinessPartnerMocks.documents,
	address: AddressMocks.documents
};

function getFirstEntity(role: string): Relationship.LinkEntitySpec {
	const documents = documentByType[role];
	return {
		docRef: documents?.[0].id ?? null,
		role: role
	};
}

export const firstProductEntity = getFirstEntity("Product");
export const firstBrandEntity = getFirstEntity("Brand");
export const firstBundleEntity = getFirstEntity("Bundle");
export const firstCategoryEntity = getFirstEntity("ParentCategory");

export const getLinkDocument = LinkDocumentMocks.getLinkDocument;

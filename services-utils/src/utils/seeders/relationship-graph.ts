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

import { Relationship, type DocumentJsonRpc2Request } from "@com.mgmtp.a12.dataservices/dataservices-access";

import {
	linkEntities,
	createBrands,
	seederChance,
	createBundles,
	createProducts,
	createCategories,
	resetSeederChance
} from "../index.js";

const PRODUCT_BUNDLE = "ProductBundle";
const PRODUCT_BRAND = "ProductBrand";

const MIN_BUNDLES_PER_PRODUCT = 0;
const MAX_BUNDLES_PER_PRODUCT = 15;
const BRAND_ASSIGNMENT_LIKELIHOOD = 80;

function sanitizeId(id: string): string {
	return id.replace(/[^A-Za-z0-9]/g, "");
}

function withSanitizedId<T extends DocumentJsonRpc2Request.AddJsonRpc2Request>(request: T): T {
	return { ...request, id: sanitizeId(String(request.id)) };
}

function generateProductBundleFields() {
	const chance = seederChance();
	const date = chance.date({ year: chance.integer({ min: 2015, max: 2026 }) }) as Date;

	return {
		AdditionalFields: {
			quantity: chance.integer({ min: 1, max: 100 }),
			available: date.toISOString().substring(0, 10)
		}
	};
}

function generateProductBrandFields() {
	return {
		AdditionalFields: {
			manufacturingSite: seederChance().pickone(["Local", "Oversea", "China", "Vietnam", "Germany", "USA"])
		}
	};
}

export function createRelationshipGraph(brandCount = 50, productCount = 50, bundleCount = 50, categoryCount = 30) {
	resetSeederChance();

	const categoryRequests = createCategories(categoryCount);
	const brandRequests = createBrands(brandCount).map(withSanitizedId);
	const productRequests = createProducts(productCount).map(withSanitizedId);
	const bundleRequests = createBundles(bundleCount).map(withSanitizedId);

	const chance = seederChance();

	const productBundleLinks = productRequests.flatMap((productRequest, productIndex) => {
		const linkCount = chance.integer({
			min: MIN_BUNDLES_PER_PRODUCT,
			max: Math.min(MAX_BUNDLES_PER_PRODUCT, bundleCount)
		});

		if (linkCount === 0) {
			return [];
		}

		const bundleOffsets = chance.pickset(
			Array.from({ length: bundleCount }, (_, i) => i),
			linkCount
		);

		return bundleOffsets.map((bundleIndex) =>
			linkEntities(
				`product${productIndex}-bundle${bundleIndex}`,
				PRODUCT_BUNDLE,
				[
					{ role: "Product", docRef: `#{#${productRequest.id}.metadata.docRef}` },
					{ role: "Bundle", docRef: `#{#${bundleRequests[bundleIndex].id}.metadata.docRef}` }
				],
				generateProductBundleFields()
			)
		);
	});

	const productBrandLinks = productRequests.flatMap((productRequest, productIndex) => {
		if (!chance.bool({ likelihood: BRAND_ASSIGNMENT_LIKELIHOOD })) {
			return [];
		}

		const brandIndex = chance.integer({ min: 0, max: brandCount - 1 });

		return [
			linkEntities(
				`product${productIndex}-brand${brandIndex}`,
				PRODUCT_BRAND,
				[
					{ role: "Brand", docRef: `#{#${brandRequests[brandIndex].id}.metadata.docRef}` },
					{ role: "Product", docRef: `#{#${productRequest.id}.metadata.docRef}` }
				],
				generateProductBrandFields(),
				Relationship.LinkPosition.TOP
			)
		];
	});

	return [
		...categoryRequests,
		...brandRequests,
		...productRequests,
		...bundleRequests,
		...productBundleLinks,
		...productBrandLinks
	];
}

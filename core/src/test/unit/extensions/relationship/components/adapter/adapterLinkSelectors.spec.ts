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

import { test, expect, describe } from "vitest";

import type { Relationship as RelationshipServerApi } from "@com.mgmtp.a12.dataservices/dataservices-access";

import {
	AdapterLink,
	type AdapterLink as AdapterLinkType
} from "../../../../../../internal/relationship/ui/components/adapter/adapterLinkSelectors.js";

describe("com.mgmtp.a12.relationshipengine-core.relationship-engine.AdapterLink.equal", () => {
	test("treats two links with differing relinked state as unequal", () => {
		const linkRef = createLinkRef();
		const document = {};

		const link = createAdapterLink({ linkRef, document, relinked: false });
		const relinkedLink = createAdapterLink({ linkRef, document, relinked: true });

		expect(AdapterLink.equal(link, relinkedLink)).toBe(false);
	});

	test("treats two otherwise-identical links with the same relinked state as equal", () => {
		const linkRef = createLinkRef();
		const document = {};

		const link = createAdapterLink({ linkRef, document, relinked: false });
		const sameLink = createAdapterLink({ linkRef, document, relinked: false });

		expect(AdapterLink.equal(link, sameLink)).toBe(true);
	});
});

function createAdapterLink(
	overrides: Partial<AdapterLinkType> & Pick<AdapterLinkType, "linkRef" | "document">
): AdapterLinkType {
	return {
		relinked: false,
		...overrides
	};
}

function createLinkRef(): RelationshipServerApi.LinkRef {
	return {
		id: "link-1",
		linkDescriptor: {
			relationshipModel: "testRelationshipModel",
			entities: [{ role: "target", docRef: "doc/1" }]
		}
	};
}

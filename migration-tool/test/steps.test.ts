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

import transform from "../src/internal/steps/version-2.0.0-alpha.2/transform.js";
import type { RelationshipUiModel } from "../src/internal/steps/version-2.0.0-alpha.1/relationship-ui-model.js";

const BASE_MODEL: RelationshipUiModel = {
	header: {
		id: "test-rum",
		modelType: "relationship-ui",
		modelVersion: "2.0.0-alpha.1"
	},
	content: {
		relationshipName: "ProductBrand",
		targetRole: "Product",
		component: {
			componentType: "TableList"
		}
	}
};

const LABEL = [{ locale: "en", text: "Products" }];

describe("@com.mgmtp.a12.relationshipengine/relationshipengine-model-migration steps", () => {
	test("moves content.label to header.labels and bumps the model version", () => {
		const migratedModel = transform({
			...BASE_MODEL,
			content: {
				...BASE_MODEL.content,
				label: LABEL
			}
		});

		expect(migratedModel.header.labels).toEqual(LABEL);
		expect(migratedModel.content).not.toHaveProperty("label");
	});

	test("keeps header.labels untouched when content.label is absent", () => {
		const migratedModel = transform({
			...BASE_MODEL,
			header: {
				...BASE_MODEL.header,
				labels: LABEL
			}
		});

		expect(migratedModel.header.labels).toEqual(LABEL);
		expect(migratedModel.content).not.toHaveProperty("label");
	});

	test("moves an empty content.label array to header.labels unchanged", () => {
		const migratedModel = transform({
			...BASE_MODEL,
			content: {
				...BASE_MODEL.content,
				label: []
			}
		});

		expect(migratedModel.header.labels).toEqual([]);
		expect(migratedModel.content).not.toHaveProperty("label");
	});
});

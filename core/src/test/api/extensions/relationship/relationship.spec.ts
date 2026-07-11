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

import type { Model } from "@com.mgmtp.a12.client/client-core";

import { Relationship } from "../../../../internal/relationship/index.js";

const details: object = {};
const binding: Model.Binding = { type: "any", elementId: "elementId", details };

const uiConfiguration: Relationship.UiConfiguration = {
	name: "name",
	metaInformation: { version: "1.0.0" },
	relationshipName: "relationshipName",
	targetRole: "targetRole",
	components: []
};
const uiConfigurationBinding: Relationship.UiConfigurationBinding = {
	...binding,
	type: "relationship",
	details: uiConfiguration
};

describe("com.mgmtp.a12.relationshipengine-core.lib.extensions.relationship.Relationship", () => {
	describe("UiConfigurationBinding", () => {
		describe("isInstance", () => {
			describe("binding is UiConfigurationBinding alike", () => {
				test(`returns true if in the details the version in the meta information equals "1.0.0"`, () => {
					expect(() => Relationship.UiConfigurationBinding.isInstance(uiConfigurationBinding))
						.to.not.throw()
						.and.be.equal(true);
				});

				test(`throws if in the details the version in the meta information does not equal "1.0.0"`, () => {
					expect(() =>
						Relationship.UiConfigurationBinding.isInstance({
							...uiConfigurationBinding,
							details: {
								...uiConfigurationBinding.details,
								metaInformation: {
									...uiConfigurationBinding.details.metaInformation,
									version: "1.0.1"
								}
							}
						})
					).to.throw();
				});
			});

			test("returns false if binding is not UiConfigurationBinding alike", () => {
				expect(() =>
					Relationship.UiConfigurationBinding.isInstance({
						...uiConfigurationBinding,
						type: binding.type
					})
				)
					.to.not.throw()
					.and.be.equal(false);
				expect(() =>
					Relationship.UiConfigurationBinding.isInstance({
						...uiConfigurationBinding,
						details: binding.details
					})
				)
					.to.not.throw()
					.and.be.equal(false);
			});
		});
	});

	describe("UiConfiguration", () => {
		describe("isInstance", () => {
			describe("configuration is UiConfiguration alike", () => {
				test(`returns true if the version in the meta information equals "1.0.0"`, () => {
					expect(() => Relationship.UiConfiguration.isInstance(uiConfiguration))
						.to.not.throw()
						.and.be.equal(true);
				});

				test(`throws if the version in the meta information does not equal "1.0.0"`, () => {
					expect(() =>
						Relationship.UiConfiguration.isInstance({
							...uiConfiguration,
							metaInformation: {
								...uiConfiguration.metaInformation,
								version: "1.0.1"
							}
						})
					).to.throw();
				});
			});

			test("returns false if configuration is not UiConfiguration alike", () => {
				expect(() => Relationship.UiConfiguration.isInstance(details))
					.to.not.throw()
					.and.be.equal(false);
			});
		});
	});
});

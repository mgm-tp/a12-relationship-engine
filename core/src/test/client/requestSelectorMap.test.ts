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

import { it, expect, describe } from "vitest";

import { Query, type Relationship } from "@com.mgmtp.a12.dataservices/dataservices-access";

import { type RequestSelectorMap, DefaultRequestSelectorMap } from "../../client/index.js";

describe("DefaultRequestSelectorMap", () => {
	describe("queryCandidates", () => {
		it("produces a QUERY request with document projection", () => {
			const config: RequestSelectorMap.QueryCandidatesConfig = {
				activityId: "activity-1",
				id: "req-1",
				targetDocumentModel: "ProductModel",
				paging: { pageSize: 20, pageNumber: 0 },
				constraint: { operator: "exact_match", field: "name", value: "test" },
				sort: [
					{
						field: "name",
						direction: Query.Direction.ASC,
						ignoreCase: false,
						nullHandling: Query.NullHandling.NULLS_LAST
					}
				],
				fields: ["name", "price"]
			};

			const selector = DefaultRequestSelectorMap.queryCandidates(config);
			const request = selector({} as never);

			expect(request.jsonrpc).toBe("2.0");
			expect(request.method).toBe("QUERY");
			expect(request.id).toBe("req-1");
			expect(request.params.query.projectionName).toBe("document");
			expect(request.params.query.targetDocumentModel).toBe("ProductModel");
			expect(request.params.query.paging).toEqual({ pageSize: 20, pageNumber: 0 });
			expect(request.params.query.constraint).toEqual({ operator: "exact_match", field: "name", value: "test" });
			expect(request.params.query.sort).toEqual([
				{
					field: "name",
					direction: Query.Direction.ASC,
					ignoreCase: false,
					nullHandling: Query.NullHandling.NULLS_LAST
				}
			]);
			expect(request.params.query.fields).toEqual(["name", "price"]);
		});
	});

	describe("queryLinks", () => {
		it("produces a QUERY request with document projection", () => {
			const config: RequestSelectorMap.QueryLinksConfig = {
				activityId: "activity-1",
				id: "req-2",
				targetDocumentModel: "ItemModel",
				paging: { pageSize: 10, pageNumber: 1 },
				context: "dropdown"
			};

			const selector = DefaultRequestSelectorMap.queryLinks(config);
			const request = selector({} as never);

			expect(request.method).toBe("QUERY");
			expect(request.params.query.projectionName).toBe("document");
			expect(request.params.query.targetDocumentModel).toBe("ItemModel");
			expect(request.params.query.paging).toEqual({ pageSize: 10, pageNumber: 1 });
		});
	});

	describe("queryDocument", () => {
		it("produces a QUERY request with fixed paging of 1", () => {
			const config: RequestSelectorMap.QueryDocumentConfig = {
				activityId: "activity-1",
				id: "doc-req",
				targetDocumentModel: "CategoryModel",
				constraint: { operator: "exact_match", field: "/__meta/docRef", value: "doc-123" }
			};

			const selector = DefaultRequestSelectorMap.queryDocument(config);
			const request = selector({} as never);

			expect(request.method).toBe("QUERY");
			expect(request.params.query.projectionName).toBe("document");
			expect(request.params.query.paging).toEqual({ pageNumber: 0, pageSize: 1 });
			expect(request.params.query.constraint).toEqual({
				operator: "exact_match",
				field: "/__meta/docRef",
				value: "doc-123"
			});
		});
	});

	describe("queryDocumentGraph", () => {
		it("produces a QUERY request with document-graph projection", () => {
			const config: RequestSelectorMap.QueryDocumentGraphConfig = {
				activityId: "activity-1",
				id: "graph-req",
				targetDocumentModel: "CdmModel",
				paging: { pageSize: 1, pageNumber: 0 },
				fields: ["someGroup"]
			};

			const selector = DefaultRequestSelectorMap.queryDocumentGraph(config);
			const request = selector({} as never);

			expect(request.method).toBe("QUERY");
			expect(request.params.query.projectionName).toBe("document-graph");
			expect(request.params.query.targetDocumentModel).toBe("CdmModel");
			expect(request.params.query.fields).toEqual(["someGroup"]);
		});
	});

	describe("addLink", () => {
		it("produces an ADD_LINK request with the provided linkRef", () => {
			const linkRef: Relationship.LinkRef = {
				id: "link-1",
				linkDescriptor: {
					relationshipModel: "RelModel",
					entities: [
						{ role: "source", docRef: "doc-a" },
						{ role: "target", docRef: "doc-b" }
					]
				}
			};

			const selector = DefaultRequestSelectorMap.addLink({
				activityId: "activity-1",
				id: "add-link-req",
				linkRef,
				linkDocument: { weight: 5 }
			});
			const request = selector({} as never);

			expect(request.method).toBe("ADD_LINK");
			expect(request.id).toBe("add-link-req");
			expect(request.params.linkDescriptor).toBe(linkRef.linkDescriptor);
			expect(request.params.linkDocument).toEqual({ weight: 5 });
		});
	});

	describe("deleteLink", () => {
		it("produces a DELETE_LINK request", () => {
			const linkRef: Relationship.LinkRef = {
				id: "link-2",
				linkDescriptor: {
					relationshipModel: "RelModel",
					entities: [{ role: "source", docRef: "doc-a" }]
				}
			};

			const selector = DefaultRequestSelectorMap.deleteLink({
				activityId: "activity-1",
				id: "del-link-req",
				linkRef
			});
			const request = selector({} as never);

			expect(request.method).toBe("DELETE_LINK");
			expect(request.id).toBe("del-link-req");
			expect(request.params.linkRef).toBe(linkRef);
		});
	});

	describe("custom override", () => {
		it("allows spreading DefaultRequestSelectorMap and overriding specific methods", () => {
			const customRsm: RequestSelectorMap = {
				...DefaultRequestSelectorMap,
				queryCandidates: (config) => () => {
					const baseRequest = DefaultRequestSelectorMap.queryCandidates(config)({} as never);

					return {
						...baseRequest,
						params: {
							...baseRequest.params,
							query: {
								...baseRequest.params.query,
								constraint: {
									operator: "and",
									operands: [
										...(baseRequest.params.query.constraint ? [baseRequest.params.query.constraint] : []),
										{ operator: "exact_match", field: "status", value: "active" }
									]
								}
							}
						}
					};
				}
			};

			const config: RequestSelectorMap.QueryCandidatesConfig = {
				activityId: "activity-1",
				id: "custom-req",
				targetDocumentModel: "Product",
				paging: { pageSize: 10, pageNumber: 0 }
			};

			const request = customRsm.queryCandidates(config)({} as never);

			expect(request.params.query.constraint).toEqual({
				operator: "and",
				operands: [{ operator: "exact_match", field: "status", value: "active" }]
			});
		});
	});
});

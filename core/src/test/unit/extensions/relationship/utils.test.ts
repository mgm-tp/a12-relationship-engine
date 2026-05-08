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

import { describe, test, expect } from "vitest";

import { PaginationUtils } from "../../../../internal/relationship/paginationUtils.js";

/**
 * Alternative implementations of the PaginationUtils functions which are used
 * the straightforward logic with less arithmetic operations.
 * They are believed to be more correct but slower than the original ones.
 */
namespace ReferencePaginationUtils {
	enum ItemState {
		NEW = "new",
		LOADED = "loaded",
		MISSING = "missing"
	}

	interface Item {
		type: ItemState;
		index: number;
		pageNumber: number;
	}

	function createData(params: PaginationUtils.PaginationParams): Item[] {
		const { fullCount, limit, offset, pageSize, newLinksCount = 0 } = params;

		const newLinks: Item[] = Array.from({ length: newLinksCount }).map((_, index) => ({
			index,
			pageNumber: 0,
			type: ItemState.NEW
		}));

		const existingLinks: Item[] = Array.from({ length: fullCount }).map((_, index) => {
			if (offset <= index && index < offset + limit) {
				return { type: ItemState.LOADED, index, pageNumber: 0 };
			}

			return { type: ItemState.MISSING, index, pageNumber: 0 };
		});

		const res = [...newLinks, ...existingLinks];

		let currentPageNumber = 0;
		let itemsOnPage = 0;

		for (let itemIndex = 0; itemIndex < res.length; itemIndex++) {
			res[itemIndex].pageNumber = currentPageNumber;
			itemsOnPage++;

			if (itemsOnPage >= pageSize) {
				itemsOnPage = 0;
				currentPageNumber++;
			}
		}

		return res;
	}

	export function getMaxPageNumber(paginationParams: PaginationUtils.PaginationParams): number {
		const data = createData(paginationParams);

		if (data.length === 0) {
			return 0;
		}

		return data[data.length - 1].pageNumber;
	}

	function getPageItems(data: Item[], pageNumber: number): Item[] {
		return data.filter((item) => item.pageNumber === pageNumber);
	}

	export function getQuery(
		paginationParams: PaginationUtils.PaginationParams,
		pageNumber: number
	): PaginationUtils.PageQuery | undefined {
		const pageItems = getPageItems(createData(paginationParams), pageNumber);

		const missingLinksIndices = pageItems.filter(({ type }) => type === ItemState.MISSING).map(({ index }) => index);

		if (missingLinksIndices.length === 0) {
			return undefined;
		}

		const minIndex = Math.min(...missingLinksIndices);
		const maxIndex = Math.max(...missingLinksIndices);
		if (missingLinksIndices.length === 1) {
			return { offset: minIndex, limit: 1 };
		}

		return { offset: minIndex, limit: maxIndex - minIndex + 1 };
	}

	export function getSlices(
		paginationParams: PaginationUtils.PaginationParams,
		pageNumber?: number
	): { startIndex: number; endIndex: number } | undefined {
		const data = createData(paginationParams);
		const pageData = getPageItems(data, pageNumber ?? paginationParams.pageNumber);

		const neededLinkIndices = pageData
			.filter(({ type }) => type === ItemState.LOADED || type === ItemState.MISSING)
			.map(({ index }) => index);

		if (neededLinkIndices.length === 0) {
			return undefined;
		}

		return {
			startIndex: Math.min(...neededLinkIndices),
			endIndex: Math.max(...neededLinkIndices) + 1
		};
	}
}

describe("com.mgmtp.a12.relationshipengine-core.lib.extensions.relationship.utils", () => {
	describe("getMaxPageNumber", () => {
		test("should work properly", () => {
			const basicParams: PaginationUtils.PaginationParams = {
				newLinksCount: 0,
				pageNumber: 0,
				pageSize: 2,
				offset: 0,
				limit: 2,
				fullCount: 2
			};

			expect(PaginationUtils.getMaxPageNumber(basicParams)).to.be.deep.equal(0);
			expect(PaginationUtils.getMaxPageNumber({ ...basicParams, newLinksCount: 1 })).to.be.deep.equal(1);
			expect(PaginationUtils.getMaxPageNumber({ ...basicParams, newLinksCount: 2 })).to.be.deep.equal(1);
			expect(PaginationUtils.getMaxPageNumber({ ...basicParams, newLinksCount: 3 })).to.be.deep.equal(2);

			expect(PaginationUtils.getMaxPageNumber({ ...basicParams, fullCount: 3 })).to.be.deep.equal(1);
			expect(PaginationUtils.getMaxPageNumber({ ...basicParams, fullCount: 4 })).to.be.deep.equal(1);
			expect(PaginationUtils.getMaxPageNumber({ ...basicParams, fullCount: 5 })).to.be.deep.equal(2);

			expect(PaginationUtils.getMaxPageNumber({ ...basicParams, fullCount: 3, newLinksCount: 2 })).to.be.deep.equal(2);
		});
	});

	describe("getQuery", () => {
		test("should work properly", () => {
			const paginationParams: PaginationUtils.PaginationParams = {
				newLinksCount: 5,
				pageNumber: 2,
				pageSize: 4,

				fullCount: 11,
				offset: 3,
				limit: 4
			};

			expect(PaginationUtils.getQuery(paginationParams, 0)).to.be.deep.equal(undefined);
			expect(PaginationUtils.getQuery(paginationParams, 1)).to.be.deep.equal({
				offset: 0,
				limit: 3
			});
			expect(PaginationUtils.getQuery(paginationParams, 2)).to.be.deep.equal(undefined);
			expect(PaginationUtils.getQuery(paginationParams, 3)).to.be.deep.equal({
				offset: 7,
				limit: 4
			});
			expect(PaginationUtils.getQuery(paginationParams, 4)).to.be.deep.equal(undefined);
		});
	});

	describe("getSlices", () => {
		test("should work properly", () => {
			const paginationParams: PaginationUtils.PaginationParams = {
				pageNumber: 0,
				fullCount: 7,
				pageSize: 4,
				offset: 0,
				limit: 6,
				newLinksCount: 5
			};

			expect(PaginationUtils.getSlices(paginationParams, 0)).to.be.deep.equal(undefined);
			expect(PaginationUtils.getSlices(paginationParams, 1)).to.be.deep.equal({
				startIndex: 0,
				endIndex: 3
			});
			expect(PaginationUtils.getSlices(paginationParams, 2)).to.be.deep.equal({
				startIndex: 3,
				endIndex: 7
			});
			expect(PaginationUtils.getSlices(paginationParams, 3)).to.be.deep.equal(undefined);
			expect(PaginationUtils.getSlices(paginationParams, 4)).to.be.deep.equal(undefined);
		});
	});

	describe("reducePaginationList", () => {
		describe("when the next full count is different", () => {
			test("should return the next list", () => {
				expect(
					PaginationUtils.reducePaginationList(
						{ fullCount: 4, offset: 1, limit: 2, list: ["a", "b"] },
						{ fullCount: 5, offset: 1, limit: 2, list: ["a", "b"] }
					)
				).to.be.deep.equal({ fullCount: 5, offset: 1, limit: 2, list: ["a", "b"] });
			});
		});

		describe("when the next list can unshift to the current one", () => {
			test("should return the unshifted list with adjusted offset and limit", () => {
				expect(
					PaginationUtils.reducePaginationList(
						{ fullCount: 5, offset: 3, limit: 2, list: ["c", "d"] },
						{ fullCount: 5, offset: 1, limit: 2, list: ["a", "b"] }
					)
				).to.be.deep.equal({ fullCount: 5, offset: 1, limit: 4, list: ["a", "b", "c", "d"] });
			});
		});

		describe("when the next list can append to the current one", () => {
			test("should return the appended list with adjusted limit", () => {
				expect(
					PaginationUtils.reducePaginationList(
						{ fullCount: 5, offset: 1, limit: 2, list: ["a", "b"] },
						{ fullCount: 5, offset: 3, limit: 2, list: ["c", "d"] }
					)
				).to.be.deep.equal({ fullCount: 5, offset: 1, limit: 4, list: ["a", "b", "c", "d"] });
			});
		});

		describe("when the next list can not be joined to the current one", () => {
			test("should return the next list", () => {
				expect(
					PaginationUtils.reducePaginationList(
						{ fullCount: 7, offset: 1, limit: 2, list: ["a", "b"] },
						{ fullCount: 7, offset: 4, limit: 2, list: ["d", "e"] }
					)
				).to.be.deep.equal({ fullCount: 7, offset: 4, limit: 2, list: ["d", "e"] });
			});
		});
	});

	test("should work with various pagination parameters", () => {
		for (const pageSize of [1, 2, 4, 6]) {
			for (const pageNumber of [0, 1, 5, 7]) {
				for (const fullCount of [0, 1, 3, 5]) {
					for (let offset = 0; offset < fullCount; offset++) {
						for (let limit = 0; limit <= fullCount; limit++) {
							for (const newLinksCount of [0, 1, 3, 5]) {
								for (const nextPageNumber of [0, 1, 3, 5]) {
									const paginationParams: PaginationUtils.PaginationParams = {
										limit,
										offset,
										pageSize,
										fullCount,
										pageNumber,
										newLinksCount
									};

									const stringParams = JSON.stringify({ paginationParams, nextPageNumber });

									expect(PaginationUtils.getMaxPageNumber(paginationParams)).to.be.equal(
										ReferencePaginationUtils.getMaxPageNumber(paginationParams),
										stringParams
									);

									expect(PaginationUtils.getQuery(paginationParams, nextPageNumber)).to.be.deep.equal(
										ReferencePaginationUtils.getQuery(paginationParams, nextPageNumber),
										stringParams
									);

									expect(PaginationUtils.getSlices(paginationParams, nextPageNumber)).to.be.deep.equal(
										ReferencePaginationUtils.getSlices(paginationParams, nextPageNumber),
										stringParams
									);
								}
							}
						}
					}
				}
			}
		}
	});
});

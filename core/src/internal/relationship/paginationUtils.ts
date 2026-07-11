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

/**
 * @packageDocumentation
 * @module relationship
 */
import type { Relationship } from "./relationship.js";

/** @internal */
export namespace PaginationUtils {
	export interface PaginationParams extends Relationship.Pagination {
		newLinksCount?: number;
	}

	/**
	 * Return the maximum valid page number (zero-index)
	 */
	export function getMaxPageNumber(paginationParams: PaginationParams): number {
		const totalLinks = paginationParams.fullCount + (paginationParams.newLinksCount ?? 0);

		if (totalLinks % paginationParams.pageSize === 0) {
			return Math.max(totalLinks / paginationParams.pageSize - 1, 0);
		}

		return Math.floor(totalLinks / paginationParams.pageSize);
	}

	export interface PageQuery {
		offset: number;
		limit: number;
	}

	/**
	 * Return the page clause to request necessary links for queried page number
	 * @param paginationParams [PaginationParams]
	 * @param pageNumber [number] - the queried zero-index page number
	 *
	 * @returns The page clause, or undefined if no need to send a request
	 *
	 * E.g: N for new links, L for loaded existing links, U for unload existing links
	 * Page | 0 | 1 | 2 | 3
	 * -----+---+---+---
	 *      | N | N | L | U
	 *      | N | U | L | U
	 *      | N | U | L | U
	 *      | N | U | L | U
	 *                ^ we are in the 3rd page (pageNumber = 2)
	 *
	 * paginationParams = {
	 * 			newLinksCount: 5,
	 * 			pageNumber: 2,
	 * 			pageSize: 4,
	 *
	 * 			fullCount: 11,
	 * 			offset: 3,
	 * 			limit: 4
	 *  }
	 *
	 * getQuery(paginationParams, 0) = undefined;
	 * getQuery(paginationParams, 1) = { offset: 0, limit: 3 };
	 * getQuery(paginationParams, 2) = undefined;
	 * getQuery(paginationParams, 3) = { offset: 7, limit: 4 };
	 * getQuery(paginationParams, 4) = undefined;
	 */
	export function getQuery(paginationParams: PaginationParams, pageNumber: number): PageQuery | undefined {
		const nextSlice = getSlices(paginationParams, pageNumber);

		if (!nextSlice) {
			return undefined;
		}

		function toPageQuery(startIndex: number, endIndex: number): PageQuery {
			return {
				offset: startIndex,
				limit: endIndex - startIndex
			};
		}

		const currentSlice = {
			startIndex: paginationParams.offset,
			endIndex: paginationParams.offset + paginationParams.limit
		};
		const result = toPageQuery(nextSlice.startIndex, nextSlice.endIndex);

		if (!currentSlice) {
			return result;
		}

		// Not overlapping
		if (nextSlice.endIndex <= currentSlice.startIndex || currentSlice.endIndex <= nextSlice.startIndex) {
			return result;
		}

		// Next slice belongs to the current slice
		if (currentSlice.startIndex <= nextSlice.startIndex && nextSlice.endIndex <= currentSlice.endIndex) {
			return undefined;
		}

		// Current slice belongs to the next slice
		if (nextSlice.startIndex < currentSlice.startIndex && currentSlice.endIndex < nextSlice.endIndex) {
			return result;
		}

		// Next slice shares the start parts of the current slice
		if (nextSlice.startIndex < currentSlice.startIndex) {
			return toPageQuery(nextSlice.startIndex, currentSlice.startIndex);
		}

		// Next slice shares the end parts of the current slice
		if (nextSlice.startIndex < currentSlice.endIndex) {
			return toPageQuery(currentSlice.endIndex, nextSlice.endIndex);
		}

		throw new Error(JSON.stringify({ currentSlice, nextSlice }));
	}

	/**
	 * Return the start/end index of existing links for the current view
	 * @param paginationParams [PaginationParams]
	 * @param pageNumber [number] - the needed zero-index page number
	 *
	 * @returns The start (inclusive) and end (exclusive) index will be used directly as
	 * the params for existingLinksArrays.slice(...) to get all necessary links for the queried page.
	 * Undefined in case of there is no existing links for the page.
	 *
	 * E.g: N for new links and L/U for loaded/unloaded existing links
	 * Page | 0 | 1 | 2
	 * -----+---+---+---
	 *      | N | N | L
	 *      | N | L | L
	 *      | N | L | L
	 *      | N | L | U
	 *
	 * paginationParams = {
	 * 			pageNumber: 0,
	 * 			fullCount: 7,
	 * 			pageSize: 4,
	 * 			offset: 0,
	 * 			limit: 6,
	 * 			newLinksCount: 5,
	 *  }
	 *
	 * getSlices(paginationParams, 0) = undefined;
	 * getSlices(paginationParams, 1) = {startIndex: 0, endIndex: 3};
	 * getSlices(paginationParams, 2) = {startIndex: 3, endIndex: 7};
	 */
	export function getSlices(
		paginationParams: PaginationParams,
		pageNumber?: number
	): { startIndex: number; endIndex: number } | undefined {
		const { pageSize, fullCount, newLinksCount = 0 } = paginationParams;
		const startIndex = (pageNumber ?? paginationParams.pageNumber) * pageSize - newLinksCount;
		const endIndex = startIndex + pageSize;

		if (fullCount === 0 || startIndex >= fullCount || endIndex < 1) {
			return undefined;
		}

		return {
			startIndex: Math.max(startIndex, 0),
			endIndex: Math.min(endIndex, fullCount)
		};
	}

	type PaginationList<T> = {
		fullCount: number;
		offset: number;
		limit: number;
		list: T[];
	};

	/**
	 * Try to extend the current list if possible
	 * @param currentPaginationList - the current list configuration
	 * @param nextPaginationList - the payload list configuration
	 *
	 * @returns the merged list
	 */
	export function reducePaginationList<T>(
		currentPaginationList: PaginationList<T>,
		nextPaginationList: PaginationList<T>
	): PaginationList<T> {
		if (currentPaginationList.fullCount !== nextPaginationList.fullCount) {
			return nextPaginationList;
		}

		const currentStartIndex = currentPaginationList.offset;
		const currentEndIndex = currentPaginationList.offset + currentPaginationList.limit;

		const nextStartIndex = nextPaginationList.offset;
		const nextEndIndex = nextPaginationList.offset + nextPaginationList.limit;

		if (nextEndIndex === currentStartIndex) {
			return {
				...currentPaginationList,
				offset: nextPaginationList.offset,
				limit: currentPaginationList.limit + nextPaginationList.limit,
				list: [...nextPaginationList.list, ...currentPaginationList.list]
			};
		}

		if (nextStartIndex === currentEndIndex) {
			return {
				...currentPaginationList,
				limit: currentPaginationList.limit + nextPaginationList.limit,
				list: [...currentPaginationList.list, ...nextPaginationList.list]
			};
		}

		return nextPaginationList;
	}
}

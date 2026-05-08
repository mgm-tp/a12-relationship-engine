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
 * @module shared
 * @internal
 */

import {
	type DocumentModel,
	type EntityInstancePath,
	type GroupInstance
} from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/api.js";
import { DocumentServiceFactory } from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/facade.js";
import { ModelPath } from "@com.mgmtp.a12.base/base-model-api/lib/main/model/index.js";

/** @internal */
export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

/**
 * Utility type for the opposite of `DeepReadonly<T>`
 * @internal
 */
export type DeepWriteable<T> = {
	[P in keyof T]: DeepWriteable<T[P]>;
};

type PartitionedItems<T> = [left: T[], right: T[]];

/** @internal */
export function partitionList<T>(list: T[], predicate: (item: T) => boolean): PartitionedItems<T> {
	return list.reduce(
		(result, item) => (predicate(item) ? [result[0].concat(item), result[1]] : [result[0], result[1].concat(item)]),
		[[], []] as PartitionedItems<T>
	);
}

/** @internal */
export namespace DocumentUtils {
	/** @internal */
	export function isGroupInstance(element: unknown): element is GroupInstance {
		return isRecord(element);
	}

	/** @internal */
	export function isGroupInstances(value: unknown): value is readonly GroupInstance[] {
		return Array.isArray(value) && value.every(isGroupInstance);
	}

	/** @internal */
	export function getGroupInstancesPath(groupInstancePath: EntityInstancePath): EntityInstancePath {
		return [
			...groupInstancePath.slice(0, groupInstancePath.length - 1),
			{ elementName: groupInstancePath[groupInstancePath.length - 1].elementName, index: 0 }
		];
	}
}

/** @internal */
export const DocumentModelUtils = {
	getElementPathForId(elementRef: string, documentModel: DocumentModel): string {
		const path = new DocumentServiceFactory().getDocumentModelSearchService(documentModel).getPathById(elementRef);

		if (path === undefined) {
			throw new Error(`Element with ref ${elementRef} could not be found in the DocumentModel`);
		}
		return ModelPath.toString(path);
	}
};

/**
 * @internal
 */
export function comparePaths(a: EntityInstancePath, b: EntityInstancePath) {
	const comparedLength = compareValue(a.length, b.length);
	if (comparedLength) {
		return comparedLength;
	}

	for (let i = 0; i < a.length; i++) {
		const comparedElementName = compareValue(a[i].elementName, b[i].elementName);
		if (comparedElementName) {
			return comparedElementName;
		}

		const comparedIndex = compareValue(a[i].index, b[i].index);
		if (comparedIndex) {
			return comparedIndex;
		}
	}

	return 0;
}

function compareValue<T>(a: T, b: T) {
	return a < b ? -1 : a > b ? 1 : 0;
}

const messageShown = new Set<string>();

/** @internal */
export function experimentalWarning(message?: string) {
	if (message && !messageShown.has(message)) {
		// eslint-disable-next-line no-console
		console.warn(message);
		messageShown.add(message);
	} else if (!message && !messageShown.has("default")) {
		// eslint-disable-next-line no-console
		console.warn("Warning: You are using an experimental API that may change or be removed in future versions.");
		messageShown.add("default");
	}
}

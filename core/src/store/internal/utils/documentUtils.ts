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

import type { ModelPath } from "@com.mgmtp.a12.base/base-model-api";
import {
	type DocumentModel,
	DocumentServiceFactory,
	type EntityInstancePath
} from "@com.mgmtp.a12.kernel/kernel-md-facade";

/** @internal */
export namespace DocumentUtils {
	/**
	 * Document Model shall be required in case path contains repeatable groups, otherwise it can be omitted.
	 */
	export function getField(baseDocument: object, path: EntityInstancePath, documentModel?: DocumentModel): unknown {
		if (path.length === 0 || !isObjectLike(baseDocument)) {
			throw new Error("DocumentUtils.getField requires at least one path segment");
		}

		const isArrayPerSegment = computeArrayFlags(path, documentModel);

		return resolveValue(baseDocument, path, isArrayPerSegment, 0);
	}

	export function setField(
		baseDocument: object,
		path: EntityInstancePath,
		value: unknown,
		documentModel: DocumentModel
	): object {
		if (path.length === 0 || !isObjectLike(baseDocument)) {
			throw new Error("DocumentUtils.setField requires at least one path segment");
		}

		const isArrayPerSegment = computeArrayFlags(path, documentModel);

		return recurse(baseDocument, path, isArrayPerSegment, 0, value);
	}

	/**
	 * Writes a multi-select group's instances un-nested at `path`, unlike {@link setField} which would
	 * write a repeatable group's value into a single array index.
	 */
	export function setGroupInstances(
		baseDocument: object,
		path: EntityInstancePath,
		instances: readonly object[],
		documentModel: DocumentModel
	): object {
		if (path.length === 0 || !isObjectLike(baseDocument)) {
			throw new Error("DocumentUtils.setGroupInstances requires at least one path segment");
		}

		const isArrayPerSegment = withLastSegmentAsSingleValue(computeArrayFlags(path, documentModel));

		return recurse(baseDocument, path, isArrayPerSegment, 0, instances);
	}
}

type ObjectLike = Record<string, unknown>;

function isObjectLike(value: unknown): value is ObjectLike {
	return typeof value === "object" && value !== null;
}

function setObjectKey(parent: ObjectLike, key: string, child: unknown): ObjectLike {
	return { ...parent, [key]: child };
}

function setArrayIndex(arr: readonly unknown[], index: number, child: unknown): unknown[] {
	const length = Math.max(arr.length, index + 1);
	const result = new Array<unknown>(length);

	for (let position = 0; position < length; position++) {
		result[position] = arr[position];
	}

	result[index] = child;

	return result;
}

function computeArrayFlags(path: EntityInstancePath, documentModel: DocumentModel | undefined): boolean[] {
	if (!documentModel) {
		return path.map(() => false);
	}

	const documentModelService = new DocumentServiceFactory().getDocumentModelSearchService(documentModel);
	const flags: boolean[] = [];
	const accumulatedPath: ModelPath = [];

	for (const { elementName } of path) {
		accumulatedPath.push({ elementName });
		const element = documentModelService.getByPath(accumulatedPath);
		flags.push(element?.type === "Group" && element.repeatability > 1);
	}

	return flags;
}

function withLastSegmentAsSingleValue(flags: readonly boolean[]): boolean[] {
	const result = [...flags];

	result[result.length - 1] = false;

	return result;
}

function toArrayIndex(rawIndex: number): number {
	return Math.max(0, rawIndex - 1);
}

function resolveExistingContainer(
	currentObject: ObjectLike,
	elementName: string,
	isArrayElement: boolean,
	arrayIndex: number
): unknown {
	const value = currentObject[elementName];

	if (!isArrayElement) {
		return value;
	}

	return Array.isArray(value) ? value[arrayIndex] : undefined;
}

function writeChild(
	currentObject: ObjectLike,
	elementName: string,
	isArrayElement: boolean,
	arrayIndex: number,
	updatedChild: unknown
): ObjectLike {
	if (!isArrayElement) {
		return setObjectKey(currentObject, elementName, updatedChild);
	}

	const existing = currentObject[elementName];
	const existingArray = Array.isArray(existing) ? existing : [];

	return setObjectKey(currentObject, elementName, setArrayIndex(existingArray, arrayIndex, updatedChild));
}

function resolveValue(
	currentObject: ObjectLike,
	path: EntityInstancePath,
	isArrayPerSegment: readonly boolean[],
	segmentIndex: number
): unknown {
	const segment = path[segmentIndex];
	const isArrayElement = isArrayPerSegment[segmentIndex] === true;
	const arrayIndex = toArrayIndex(segment.index);
	const child = resolveExistingContainer(currentObject, segment.elementName, isArrayElement, arrayIndex);
	const isLastSegment = segmentIndex === path.length - 1;

	if (isLastSegment) {
		return child;
	}

	return isObjectLike(child) ? resolveValue(child, path, isArrayPerSegment, segmentIndex + 1) : undefined;
}

function recurse(
	currentObject: ObjectLike,
	path: EntityInstancePath,
	isArrayPerSegment: readonly boolean[],
	segmentIndex: number,
	value: unknown
): ObjectLike {
	const segment = path[segmentIndex];
	const isArrayElement = isArrayPerSegment[segmentIndex] === true;
	const arrayIndex = toArrayIndex(segment.index);
	const isLastSegment = segmentIndex === path.length - 1;

	if (isLastSegment) {
		return writeChild(currentObject, segment.elementName, isArrayElement, arrayIndex, value);
	}

	const existingContainer = resolveExistingContainer(currentObject, segment.elementName, isArrayElement, arrayIndex);
	const childContainer: ObjectLike = isObjectLike(existingContainer) ? existingContainer : {};

	const updatedChild = recurse(childContainer, path, isArrayPerSegment, segmentIndex + 1, value);

	return writeChild(currentObject, segment.elementName, isArrayElement, arrayIndex, updatedChild);
}

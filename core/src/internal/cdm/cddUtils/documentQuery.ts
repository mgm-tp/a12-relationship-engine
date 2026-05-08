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

import {
	type DocumentModel,
	type EntityInstancePath,
	type FieldInstanceValue,
	type GroupInstance
} from "@com.mgmtp.a12.kernel/kernel-md-facade/lib/main/js/index.js";

import { DocumentUtils } from "../../shared/utils.js";

/**
 * @internal
 * @ignore
 */
export namespace DocumentQuery {
	/** @internal */
	export interface Visitor {
		(visit: {
			path: EntityInstancePath;
			element?: GroupInstance | FieldInstanceValue;
			modelElement: DocumentModel.Element;
		}): void;
	}

	/** @internal */
	export interface DescendPredicate {
		(visit: { path: EntityInstancePath; element?: GroupInstance; modelElement: DocumentModel.Group }): boolean;
	}

	/** @internal */
	export function walk(
		start: GroupInstance | null,
		startModel: DocumentModel.Group,
		visitor: Visitor,
		descend?: DescendPredicate
	): void {
		function walkRecursively(
			element: GroupInstance | FieldInstanceValue | undefined,
			path: EntityInstancePath,
			modelElement: DocumentModel.Element
		): void {
			visitor({ path, element, modelElement });
			if (
				modelElement.type === "Group" &&
				(element === undefined || DocumentUtils.isGroupInstance(element)) &&
				// descend into a non-repeatable group even if it is missing in the document
				(modelElement.repeatability === 1 || element !== undefined) &&
				(descend === undefined || descend({ path, element, modelElement }))
			) {
				for (const childModelElement of modelElement.elements) {
					const child =
						element !== undefined && DocumentUtils.isGroupInstance(element)
							? element[childModelElement.name]
							: undefined;
					if (childModelElement.type === "Group" && childModelElement.repeatability === 1) {
						// unique group - with or without data
						walkRecursively(
							child as GroupInstance,
							[...path, { elementName: childModelElement.name, index: 1 }],
							childModelElement
						);
					} else if (childModelElement.type === "Field") {
						// field
						walkRecursively(
							child as GroupInstance,
							[...path, { elementName: childModelElement.name, index: 1 }],
							childModelElement
						);
					} else if (Array.isArray(child)) {
						/**
						 * Repeatable group with existing data in document.
						 *
						 * Note, that this condition needs to be evaluated after the condition, that
						 * checks for type === "Field" (field instance values can be arrays as well).
						 * Otherwise, date ranges would be interpreted as repeatable group instances.
						 */
						for (let index = 0; index < child.length; index++) {
							walkRecursively(
								child[index],
								[...path, { elementName: childModelElement.name, index: index + 1 }],
								childModelElement
							);
						}
					}
				}
			}
		}
		walkRecursively(start, [], startModel);
	}
}

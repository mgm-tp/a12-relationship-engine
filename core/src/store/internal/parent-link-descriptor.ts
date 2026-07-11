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
 * Structural subtype of `Activity.Descriptor` that a "master" engine
 * can populate to declare an implicit parent → child
 * link the RE child activity should treat as inherited.
 *
 * When all three required fields are present and the `parentRelationshipName`
 * matches a binding on the child, RE synthesizes an inherited `linkAdded`
 * changelog entry during init. The link is visible in the child's form
 * immediately and cannot be removed by the user.
 *
 * For sibling insertion, include `predecessor` to pass the
 * predecessor link reference through to the Data Services ADD_LINK
 * request for correct tree ordering.
 *
 * @experimental
 */
export interface ParentLinkDescriptor {
	/** Parent document reference, e.g. "ParentDocModel/1". */
	readonly parentInstance: string;
	/** Relationship model name linking parent to child. */
	readonly parentRelationshipName: string;
	/** Role of the parent entity in the relationship model. */
	readonly parentRelationshipRole: string;
	/** Optional predecessor link reference for sibling ordering. */
	readonly predecessor?: string;
}

/**
 * @experimental
 */
export namespace ParentLinkDescriptor {
	/**
	 * Returns `true` if `descriptor` has all three `ParentLinkDescriptor` fields
	 * as non-empty strings.
	 *
	 * @experimental
	 */
	export function isAssignableFrom(descriptor: unknown): descriptor is ParentLinkDescriptor {
		return (
			typeof descriptor === "object" &&
			descriptor !== null &&
			typeof (descriptor as Record<string, unknown>).parentInstance === "string" &&
			(descriptor as Record<string, unknown>).parentInstance !== "" &&
			typeof (descriptor as Record<string, unknown>).parentRelationshipName === "string" &&
			(descriptor as Record<string, unknown>).parentRelationshipName !== "" &&
			typeof (descriptor as Record<string, unknown>).parentRelationshipRole === "string" &&
			(descriptor as Record<string, unknown>).parentRelationshipRole !== ""
		);
	}
}

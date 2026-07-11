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
 * Utilities for generating and detecting drafting IDs (link IDs and doc refs)
 * used as placeholders before server-side persistence assigns real IDs.
 *
 * - Link IDs:  `__NEW__/<relationshipModel>/<n>`
 * - Doc refs:  `<modelName>_NEW_<n>`
 */
import { NEW_INSTANCE_IDENTIFIER } from "@com.mgmtp.a12.client/client-core";

import type { Changelog } from "../state.js";

/** @internal */
export function nextDraftingLinkId(relationshipModel: string, changelog?: Changelog): string {
	let nextCounter = 1;

	if (changelog) {
		for (const change of changelog.changes) {
			if (change.kind !== "linkAdded") {
				continue;
			}

			const prefix = `__NEW__/${relationshipModel}/`;

			if (change.linkId.startsWith(prefix)) {
				const tail = change.linkId.substring(prefix.length);
				const asNum = Number.parseInt(tail);

				if (!Number.isNaN(asNum) && asNum >= nextCounter) {
					nextCounter = asNum + 1;
				}
			}
		}
	}

	return `__NEW__/${relationshipModel}/${nextCounter}`;
}

/**
 * Generates a unique drafting doc ref of the form `<baseName>_NEW_<n>`.
 * @internal
 */
export function nextDraftingDocRef(baseName: string, changelog?: Changelog): string {
	let nextCounter = 1;

	if (changelog) {
		const prefix = `${baseName}_NEW_`;

		for (const change of changelog.changes) {
			if (!("docRef" in change)) {
				continue;
			}

			if (change.docRef.startsWith(prefix)) {
				const tail = change.docRef.substring(prefix.length);
				const asNum = Number.parseInt(tail);

				if (!Number.isNaN(asNum) && asNum >= nextCounter) {
					nextCounter = asNum + 1;
				}
			}
		}
	}

	return `${baseName}_NEW_${nextCounter}`;
}

/**
 * Returns `true` if the given docRef is a drafting placeholder (not yet persisted).
 * @internal
 */
export function isDraftingDocRef(docRef: string): boolean {
	return docRef.includes("_NEW_") || docRef.includes(NEW_INSTANCE_IDENTIFIER);
}

/**
 * Extracts the model name from a drafting doc ref of the form `<modelName>_NEW_<n>`.
 * Returns `undefined` if the docRef is not a drafting doc ref.
 * @internal
 */
export function modelNameFromDraftingDocRef(docRef: string): string | undefined {
	const suffixIndex = docRef.indexOf("_NEW_");

	return suffixIndex > 0 ? docRef.substring(0, suffixIndex) : undefined;
}

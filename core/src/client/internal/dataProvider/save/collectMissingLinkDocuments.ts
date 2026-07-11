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

import { select, type SagaGenerator } from "typed-redux-saga";

import type { Changelog } from "../../../../store/index.js";
import { ModelSelectors } from "../../../../store/index.js";
import { ChangelogSelectors } from "../../../../store/index.js";

/**
 * Scans the activity's changelog for `linkAdded` entries that are missing a required link document.
 * A link document is required when the relationship model declares a `linkDocumentModel`.
 * The check is `linkDocument === undefined`; if a document is already present, the entry is skipped.
 *
 * @internal
 */
export function* collectMissingLinkDocuments(activityId: string): SagaGenerator<Changelog.LinkAdded[]> {
	const changelog = yield* select(ChangelogSelectors.changelog(activityId));

	if (!changelog) {
		return [];
	}

	const missing: Changelog.LinkAdded[] = [];

	for (const change of changelog.changes) {
		if (change.kind !== "linkAdded" || change.linkDocument !== undefined) {
			continue;
		}

		const relationshipName = change.linkRef.linkDescriptor.relationshipModel;
		const rm = yield* select(ModelSelectors.relationshipModel(relationshipName));

		if (rm?.content.linkDocumentModel) {
			missing.push(change);
		}
	}

	return missing;
}

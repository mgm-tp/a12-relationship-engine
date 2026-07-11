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

import React from "react";
import { useSelector } from "react-redux";

import type { RowStyleGetter } from "@com.mgmtp.a12.widgets/widgets-core";
import type { JSONDocument } from "@com.mgmtp.a12.overviewengine/overviewengine-core";

import { UiStateSelectors, type ChangelogSelectors } from "../../../../store/index.js";

/**
 * Row styling for the selected items (link) pane.
 *
 * Highlights newly added rows as "success", and removed/withdrawn rows as
 * disabled with "info" variant. In exclude mode, rows are matched by their
 * `linkId` sidecar field rather than the document `id`.
 * @internal
 */
export function useSelectedItemsRowStyling(
	activityId: string,
	lifecycle: ChangelogSelectors.LifecycleSets,
	excludeMode: boolean
): RowStyleGetter<JSONDocument> {
	const selectedItem = useSelector(UiStateSelectors.selectedItem(activityId));

	return React.useCallback(
		({ row }) => {
			const selected = row.linkId === selectedItem?.linkId && row.id === selectedItem?.docRef;
			const id = excludeMode ? row.linkId : row.id;

			if (id === undefined) {
				return { selected };
			}

			if (lifecycle.added.includes(id)) {
				return { selected, highlightVariant: "success" as const };
			}

			if (lifecycle.removed.includes(id) || lifecycle.withdrawn.includes(id)) {
				return { selected, disabled: true, highlightVariant: "info" as const };
			}

			return { selected };
		},
		[excludeMode, lifecycle.added, lifecycle.removed, lifecycle.withdrawn, selectedItem?.docRef, selectedItem?.linkId]
	);
}

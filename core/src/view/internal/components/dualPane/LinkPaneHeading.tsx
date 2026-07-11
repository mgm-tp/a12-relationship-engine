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

import type { Heading } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import { DefaultComponentMap } from "@com.mgmtp.a12.overviewengine/overviewengine-core";
import { Icon, Counter, addPrefix, type CounterProps } from "@com.mgmtp.a12.widgets/widgets-core";

import { ModelSelectors, ChangelogSelectors } from "../../../../store/index.js";
// eslint-disable-next-line no-restricted-imports
import { useRelationshipEngineComponentContext } from "../../../internal/context/ComponentContext.js";

/**
 * Custom Heading component for the link pane that renders lifecycle indicator badges
 * (added count, removed count, max-link status) after the title.
 *
 * Reads `activityId` and `uiModel` from `RelationshipEngineComponentContext` — the
 * component reference itself is stable and can be placed in a memoized componentMap
 * without causing remounts.
 */
export function LinkPaneHeading(props: Heading.PropsType): React.ReactNode {
	const { activityId, uiModel } = useRelationshipEngineComponentContext();
	const { content } = uiModel;
	const excludeMode = useSelector(ModelSelectors.isExcludeMode(activityId, content.relationshipName));
	const lifecycle = useSelector(
		excludeMode
			? ChangelogSelectors.lifecycleStatesByLink(activityId, {
					relationshipModel: content.relationshipName,
					targetRole: content.targetRole
				})
			: ChangelogSelectors.lifecycleStates(activityId, {
					relationshipModel: content.relationshipName,
					targetRole: content.targetRole
				})
	);
	const indicatorData = React.useMemo(
		() => ({
			addedCount: lifecycle.added.length,
			removedAndWithdrawnCount: lifecycle.removed.length + lifecycle.withdrawn.length
		}),
		[lifecycle]
	);
	const badges = renderBadges(indicatorData);

	return (
		<DefaultComponentMap.Heading
			{...props}
			additionalControls={
				<>
					{badges}
					{props.additionalControls}
				</>
			}
		/>
	);
}

function renderBadges(data: {
	addedCount: number;
	removedAndWithdrawnCount: number;
	maxLinkCount?: number;
	currentLinkCount?: number;
}): React.ReactNode {
	const { addedCount, removedAndWithdrawnCount, maxLinkCount, currentLinkCount } = data;
	const maxLinksExceeded =
		maxLinkCount !== undefined && currentLinkCount !== undefined && currentLinkCount > maxLinkCount;

	return (
		<>
			{maxLinkCount !== undefined ? (
				<MarginLeftCounter
					value={`${currentLinkCount ?? 0}/${maxLinkCount}`}
					addonAfter={maxLinksExceeded ? <Icon>bolt</Icon> : null}
					type={maxLinksExceeded ? "destructive" : "default"}
				/>
			) : null}
			{addedCount > 0 ? (
				<MarginLeftCounter value={addedCount} addonAfter={<Icon>done</Icon>} type="constructive" />
			) : null}
			{removedAndWithdrawnCount > 0 ? (
				<MarginLeftCounter
					value={removedAndWithdrawnCount}
					addonAfter={<Icon>delete_outline</Icon>}
					type="destructive"
				/>
			) : null}
		</>
	);
}

function MarginLeftCounter(props: CounterProps): React.ReactNode {
	return <Counter {...props} className={addPrefix("-u-margin-l-2xs")} />;
}

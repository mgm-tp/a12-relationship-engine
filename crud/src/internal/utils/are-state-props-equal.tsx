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

import { ModelPath } from "@com.mgmtp.a12.base/base-model-api";
import type { EngineStore, DefaultStateProps } from "@com.mgmtp.a12.formengine/formengine-core";

/**
 * The state props are re-recreated by the mapping in
 * `FormEngineStateAdapter.mapStateToProps` (and possibly also
 * `defaultMapStateToProps`). Therefore, we need to navigate down in the state
 * props objects until we have some stable props.
 *
 * @internal
 */
export function areStatePropsEqual(
	prevProps: Partial<DefaultStateProps>,
	curProps: Partial<DefaultStateProps>
): boolean {
	if (prevProps.state === undefined || curProps.state === undefined) {
		return prevProps.state === curProps.state;
	}

	if (prevProps.config === undefined || curProps.config === undefined) {
		return prevProps.config === curProps.config;
	}

	return (
		prevProps.state.locale === curProps.state.locale &&
		prevProps.state.data.dirty === curProps.state.data.dirty &&
		prevProps.state.data.document === curProps.state.data.document &&
		isAttachmentStateEqual(prevProps.state.data.attachmentState, curProps.state.data.attachmentState) &&
		prevProps.state.models.documentModel === curProps.state.models.documentModel &&
		prevProps.state.models.formModel === curProps.state.models.formModel &&
		arePropsEqual(prevProps.config, curProps.config) &&
		arePropsEqual(prevProps.state.ui, curProps.state.ui)
	);
}

/**
 * @internal
 *
 * Exported for tests
 */
export function isAttachmentStateEqual(a1?: EngineStore.AttachmentState, a2?: EngineStore.AttachmentState): boolean {
	return !a1 || !a2
		? a1 === a2
		: ModelPath.equal(a1.loading ?? [], a2.loading ?? []) &&
				a1.unassigned?.length === a2.unassigned?.length &&
				(a1.unassigned ?? []).every((id, idx) => id === a2.unassigned?.[idx]) &&
				arePropsEqual(a1.thumbnails ?? {}, a2.thumbnails ?? {});
}

// shortcut so that we don't have to list all props here
function arePropsEqual<T extends object>(d1: T, d2: T): boolean {
	const k1 = Object.keys(d1) as (keyof T)[];
	const k2 = Object.keys(d2);

	return k1.length === k2.length && k1.every((p1) => d1[p1] === d2[p1]);
}

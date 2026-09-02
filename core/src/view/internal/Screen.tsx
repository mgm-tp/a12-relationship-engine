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

import React, { useContext } from "react";
import { useSelector } from "react-redux";

import type { FormModel } from "@com.mgmtp.a12.formengine/formengine-core";
import { ViewViews, ModalRegionUiNG } from "@com.mgmtp.a12.client/client-core";
import { type FormModelMap, DefaultFormModelMap } from "@com.mgmtp.a12.formengine/formengine-core";

import { ModelSelectors, LINK_FORM_REGION } from "../../store/index.js";

import { DialogRenderer } from "./components/dialog/DialogRenderer.js";

/**
 * @internal
 * Custom Screen component that wraps the default Screen and adds the DialogRenderer
 * for relationship engine dialogs (e.g., variant selection).
 *
 * Multiple Screens can be mounted concurrently (one per live form activity), so the
 * link-form region must only be rendered by the Screen whose activity initiated the
 * link form — otherwise every mounted Screen would render its own copy of the same
 * dialog. See `ModelSelectors.isLinkFormRegionOwner`.
 */
export function Screen(props: FormModelMap.FormModelComponentProps<FormModel.Screen>): React.ReactNode {
	const { activityId } = useContext(ViewViews.ActivityContext) ?? {};
	// Direct-initiator match only: the link-form activity's own Screen has
	// activityId === a.id, and an activity is never its own initiator
	// (a.initiatingActivityId !== a.id), so this excludes self-nesting for free.
	const ownsLinkFormRegion = useSelector((state: object) =>
		activityId !== undefined ? ModelSelectors.isLinkFormRegionOwner(activityId)(state) : false
	);

	return (
		<>
			<DefaultFormModelMap.Screen.component {...props} />
			{activityId && <DialogRenderer activityId={activityId} />}
			{ownsLinkFormRegion && <ModalRegionUiNG regionRef={LINK_FORM_REGION} />}
		</>
	);
}
